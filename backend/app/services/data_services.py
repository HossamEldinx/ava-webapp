# services.py

import os
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import json
from collections import OrderedDict 
import re
from datetime import datetime
from .entity import filter_json_entity
from typing import Any, Dict, List, Union

# --- Section 1: Initialization and Configuration ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ENTITY_TYPE_MAP = {
    "LG": "Hauptgruppe",
    "ULG": "Untergruppe",
    "Grundtext": "Grundlegende Regel",
    "UngeteiltePosition": "Einzelne Position",
    "Folgeposition": "Folgeposition"
}

# --- Section 2: Helper Functions ---
def _flatten_text_from_json(obj: Any) -> str:
    if obj is None: return ""
    if isinstance(obj, str): return obj.strip()
    if isinstance(obj, list): return " ".join(_flatten_text_from_json(item) for item in obj)
    if isinstance(obj, dict):
        text_content = _flatten_text_from_json(obj.get("#text", ""))
        if not text_content: return " ".join(_flatten_text_from_json(v) for v in obj.values())
        return text_content
    return ""

def _get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    if not text:
        print("Warning: Attempted to embed empty text. Skipping.")
        return []
    try:
        result = genai.embed_content(model="models/embedding-001", content=text, task_type=task_type)
        return result['embedding']
    except Exception as e:
        print(f"Error getting embedding for text snippet '{text[:50]}...': {e}")
        return []
def _parse_entity_json(entity_json: Any) -> Any:
    """
    Parse entity_json from text to JSON object if it's stored as a string.
    If already a JSON object, return as is.

    Args:
        entity_json: The entity_json field from database (could be string or JSON object)

    Returns:
        Parsed JSON object or the original value if parsing fails
    """
    if entity_json is None:
        return None

    # If it's already a dict, return as is
    if isinstance(entity_json, dict):
        return entity_json

    # If it's a string, try to parse it as JSON
    if isinstance(entity_json, str):
        try:
            return json.loads(entity_json)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse entity_json as JSON: {e}")
            print(f"Raw entity_json (first 100 chars): {entity_json[:100]}...")
            return None

    # For any other type, return as is
    return entity_json

def _parse_entity_json_in_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Parse entity_json field in all results from database queries.

    Args:
        results: List of regulation records from database

    Returns:
        List of regulation records with entity_json parsed to JSON objects
    """
    if not results:
        return results

    for result in results:
        if "entity_json" in result:
            result["entity_json"] = _parse_entity_json(result["entity_json"])

    return results




# Define the desired key order for different object types
# The order of keys in each list determines the output order.
KEY_ORDER_MAP = {
    "LG": [ "lg-eigenschaften", "ulg-liste","@_nr"],
    "ULG": [ "ulg-eigenschaften", "positionen","@_nr"],
    "GT": [ "grundtext", "ungeteilteposition", "folgeposition","@_nr"],
    "POS": [ "pos-eigenschaften","@_ftnr","@_mfv"],
}

def _get_object_type(obj: Dict[str, Any]) -> str:
    """Determines the object type based on its keys."""
    if "@_nr" in obj and "lg-eigenschaften" in obj:
        return "LG"
    if "@_nr" in obj and "ulg-eigenschaften" in obj:
        return "ULG"
    if "@_nr" in obj and ("grundtext" in obj or "ungeteilteposition" in obj or "folgeposition" in obj):
        return "GT"
    if ("@_ftnr" in obj or "@_mfv" in obj) and "pos-eigenschaften" in obj:
        return "POS"
    return "UNKNOWN"

def _preserve_json_order(obj: Union[Dict, List, Any]) -> Union[OrderedDict, List, Any]:
    """
    Creates a clean copy of the object that preserves the original JSON key order,
    while enforcing a specific order for known object types.
    This function recursively processes dictionaries and lists to maintain structure.
    """
    if isinstance(obj, dict):
        ordered_dict = OrderedDict()
        
        # Determine the type of object to see if a specific order should be enforced
        obj_type = _get_object_type(obj)
        
        # Get the predefined key order for this object type, if any
        predefined_order = KEY_ORDER_MAP.get(obj_type, [])

        if predefined_order:
            # First, add the keys that are in our predefined order list
            for key in predefined_order:
                if key in obj:
                    ordered_dict[key] = _preserve_json_order(obj[key])
            
            # Second, add any remaining keys from the original object
            for key, value in obj.items():
                if key not in ordered_dict:
                    ordered_dict[key] = _preserve_json_order(value)
        else:
            # For all other dictionaries, just preserve their natural order
            for key, value in obj.items():
                ordered_dict[key] = _preserve_json_order(value)
        
        # IMPORTANT: Return the OrderedDict itself, not a converted dict
        return ordered_dict
    
    elif isinstance(obj, list):
        # If the object is a list, process each item recursively
        return [_preserve_json_order(item) for item in obj]
    
    else:
        # Return all other data types (strings, numbers, etc.) as is
        return obj
    """
    Creates a clean copy of the object that preserves the original JSON key order.
    This function recursively processes dictionaries and lists to maintain structure.
    """
    if isinstance(obj, dict):
        # Create an OrderedDict to preserve key order
        ordered_dict = OrderedDict()
        
        # For ULG objects, ensure specific order: @_nr, ulg-eigenschaften, positionen
        if "@_nr" in obj and "ulg-eigenschaften" in obj:
            # This is likely a ULG object
            if "@_nr" in obj:
                ordered_dict["@_nr"] = _preserve_json_order(obj["@_nr"])
            if "ulg-eigenschaften" in obj:
                ordered_dict["ulg-eigenschaften"] = _preserve_json_order(obj["ulg-eigenschaften"])
            if "positionen" in obj:
                ordered_dict["positionen"] = _preserve_json_order(obj["positionen"])
            # Add any remaining keys
            for key, value in obj.items():
                if key not in ordered_dict:
                    ordered_dict[key] = _preserve_json_order(value)
        
        # For GT objects, ensure specific order: @_nr, grundtext, folgeposition, etc.
        elif "@_nr" in obj and ("grundtext" in obj or "ungeteilteposition" in obj or "folgeposition" in obj):
            # This is likely a grundtext object
            if "@_nr" in obj:
                ordered_dict["@_nr"] = _preserve_json_order(obj["@_nr"])
            if "grundtext" in obj:
                ordered_dict["grundtext"] = _preserve_json_order(obj["grundtext"])
            if "ungeteilteposition" in obj:
                ordered_dict["ungeteilteposition"] = _preserve_json_order(obj["ungeteilteposition"])
            if "folgeposition" in obj:
                ordered_dict["folgeposition"] = _preserve_json_order(obj["folgeposition"])
            # Add any remaining keys
            for key, value in obj.items():
                if key not in ordered_dict:
                    ordered_dict[key] = _preserve_json_order(value)
        
        # For LG objects, ensure specific order: @_nr, lg-eigenschaften, ulg-liste
        elif "@_nr" in obj and "lg-eigenschaften" in obj:
            # This is likely an LG object
            if "@_nr" in obj:
                ordered_dict["@_nr"] = _preserve_json_order(obj["@_nr"])
            if "lg-eigenschaften" in obj:
                ordered_dict["lg-eigenschaften"] = _preserve_json_order(obj["lg-eigenschaften"])
            if "ulg-liste" in obj:
                ordered_dict["ulg-liste"] = _preserve_json_order(obj["ulg-liste"])
            # Add any remaining keys
            for key, value in obj.items():
                if key not in ordered_dict:
                    ordered_dict[key] = _preserve_json_order(value)
        
        # For position objects, ensure specific order: @_ftnr/@_mfv, pos-eigenschaften
        elif ("@_ftnr" in obj or "@_mfv" in obj) and "pos-eigenschaften" in obj:
            # This is likely a position object
            if "@_ftnr" in obj:
                ordered_dict["@_ftnr"] = _preserve_json_order(obj["@_ftnr"])
            if "@_mfv" in obj:
                ordered_dict["@_mfv"] = _preserve_json_order(obj["@_mfv"])
            if "pos-eigenschaften" in obj:
                ordered_dict["pos-eigenschaften"] = _preserve_json_order(obj["pos-eigenschaften"])
            # Add any remaining keys
            for key, value in obj.items():
                if key not in ordered_dict:
                    ordered_dict[key] = _preserve_json_order(value)
        
        else:
            # For other objects, preserve the natural order
            for key, value in obj.items():
                ordered_dict[key] = _preserve_json_order(value)
        
        return dict(ordered_dict)  # Convert back to regular dict
    
    elif isinstance(obj, list):
        return [_preserve_json_order(item) for item in obj]
    
    else:
        return obj

def process_and_store_data(full_json_payload: List[Dict[str, Any]]):
    documents_to_store = []
    
    # Process data in the exact order it appears in the JSON
    for lg in full_json_payload:
        lg_nr = lg.get("@_nr")
        lg_eigenschaften = lg.get("lg-eigenschaften", {})
        
        # --- Process LG ---
        lg_ueberschrift = lg_eigenschaften.get("ueberschrift", "")
        lg_vorbemerkung = _flatten_text_from_json(lg_eigenschaften.get("vorbemerkung", {}))
        lg_kommentar = _flatten_text_from_json(lg_eigenschaften.get("kommentar", {}))
        
        doc_type_description = ENTITY_TYPE_MAP.get("LG")
        lg_text = f"Dokumententyp: {doc_type_description}. Titel: {lg_ueberschrift}. Vorbemerkung: {lg_vorbemerkung}. Kommentar: {lg_kommentar}"
        
        # Generate full_nr for LG (just the LG number)
        lg_full_nr = lg_nr if lg_nr else ""
        
        # Create a clean copy of LG with preserved order
        lg_clean = _preserve_json_order(lg)
        
        documents_to_store.append({
            "entity_type": "LG", 
            "lg_nr": lg_nr, 
            "ulg_nr": None, 
            "grundtext_nr": None, 
            "position_nr": None,
            "searchable_text": lg_text, 
            "entity_json": lg_clean, 
            "embedding": _get_embedding(lg_text),
            "full_nr": lg_full_nr,
            "short_text": None
        })

        # Process ULGs in order they appear
        ulg_liste = lg.get("ulg-liste", {})
        ulgs = ulg_liste.get("ulg", [])
        if isinstance(ulgs, dict): 
            ulgs = [ulgs]

        for ulg in ulgs:
            ulg_nr = ulg.get("@_nr")
            ulg_eigenschaften = ulg.get("ulg-eigenschaften", {})
            
            # --- Process ULG ---
            ulg_ueberschrift = ulg_eigenschaften.get("ueberschrift", "")
            ulg_vorbemerkung = _flatten_text_from_json(ulg_eigenschaften.get("vorbemerkung", {}))
            ulg_context = f"Hauptgruppe: {lg_ueberschrift}. Untergruppe: {ulg_ueberschrift}"
            
            doc_type_description = ENTITY_TYPE_MAP.get("ULG")
            ulg_text = f"Dokumententyp: {doc_type_description}. {ulg_context}. Vorbemerkung: {ulg_vorbemerkung}"

            # Generate full_nr for ULG (lg_nr + ulg_nr)
            ulg_full_nr = f"{lg_nr}{ulg_nr}" if lg_nr and ulg_nr else ""

            # Create a clean copy of ULG with preserved order
            ulg_clean = _preserve_json_order(ulg)

            documents_to_store.append({
                "entity_type": "ULG", 
                "lg_nr": lg_nr, 
                "ulg_nr": ulg_nr, 
                "grundtext_nr": None, 
                "position_nr": None,
                "searchable_text": ulg_text, 
                "entity_json": ulg_clean, 
                "embedding": _get_embedding(ulg_text),
                "full_nr": ulg_full_nr,
                "short_text": None
            })

            # Process positions in order they appear
            positionen = ulg.get("positionen", {})
            grundtexte = positionen.get("grundtextnr", [])
            if isinstance(grundtexte, dict):
                grundtexte = [grundtexte]
            
            for gt in grundtexte:
                gt_nr = gt.get("@_nr")
                
                # --- Process 'UngeteiltePositionen' first (if they exist) ---
                ungeteilte_positionen = gt.get("ungeteilteposition", [])
                if isinstance(ungeteilte_positionen, dict): 
                    ungeteilte_positionen = [ungeteilte_positionen]
                
                for pos in ungeteilte_positionen:
                    pos_nr = pos.get("@_mfv")
                    pos_eigenschaften = pos.get("pos-eigenschaften", {})
                    pos_text = _flatten_text_from_json(pos_eigenschaften)
                    pos_stichwort = pos_eigenschaften.get("stichwort", "")
                    
                    doc_type_description = ENTITY_TYPE_MAP.get("UngeteiltePosition")
                    searchable_text = f"Dokumententyp: {doc_type_description}. {ulg_context}. Position: {pos_text}"
                    
                    # Generate full_nr for UngeteiltePosition (lg_nr + ulg_nr + gt_nr)
                    ungeteilte_full_nr = f"{lg_nr}{ulg_nr}{gt_nr}" if lg_nr and ulg_nr and gt_nr else ""
                    
                    # Create a clean copy of GT with preserved order
                    gt_clean = _preserve_json_order(gt)
                    
                    documents_to_store.append({
                        "entity_type": "UngeteiltePosition",
                        "lg_nr": lg_nr, 
                        "ulg_nr": ulg_nr, 
                        "grundtext_nr": gt_nr, 
                        "position_nr": pos_nr,
                        "searchable_text": searchable_text,
                        "entity_json": gt_clean,  # Store the entire parent 'gt' object
                        "embedding": _get_embedding(searchable_text),
                        "full_nr": ungeteilte_full_nr,
                        "short_text": pos_stichwort
                    })
                
                # --- Process 'Grundtext' (if it exists) ---
                if "grundtext" in gt:
                    gt_text = _flatten_text_from_json(gt.get("grundtext", {}))
                    grundtext_context = f"{ulg_context}. Grundtext: {gt_text}"
                    
                    doc_type_description_gt = ENTITY_TYPE_MAP.get("Grundtext")
                    searchable_text_gt = f"Dokumententyp: {doc_type_description_gt}. {grundtext_context}"

                    # Generate full_nr for Grundtext (lg_nr + ulg_nr + gt_nr)
                    grundtext_full_nr = f"{lg_nr}{ulg_nr}{gt_nr}" if lg_nr and ulg_nr and gt_nr else ""

                    # Create a clean copy of GT with preserved order
                    gt_clean = _preserve_json_order(gt)

                    documents_to_store.append({
                        "entity_type": "Grundtext", 
                        "lg_nr": lg_nr, 
                        "ulg_nr": ulg_nr, 
                        "grundtext_nr": gt_nr, 
                        "position_nr": None,
                        "searchable_text": searchable_text_gt, 
                        "entity_json": gt_clean,
                        "embedding": _get_embedding(searchable_text_gt),
                        "full_nr": grundtext_full_nr,
                        "short_text": None
                    })
                    
                    # --- Process 'Folgepositionen' (if they exist) ---
                    folgepositionen = gt.get("folgeposition", [])
                    if isinstance(folgepositionen, dict): 
                        folgepositionen = [folgepositionen]
                    
                    for pos in folgepositionen:
                        pos_nr = pos.get("@_ftnr")
                        pos_eigenschaften = pos.get("pos-eigenschaften", {})
                        pos_text = _flatten_text_from_json(pos_eigenschaften)
                        pos_stichwort = pos_eigenschaften.get("stichwort", "")
                        
                        doc_type_description_fp = ENTITY_TYPE_MAP.get("Folgeposition")
                        searchable_text = f"Dokumententyp: {doc_type_description_fp}. {grundtext_context}. {pos_text}"
                        
                        # Generate full_nr for Folgeposition (lg_nr + ulg_nr + gt_nr + pos_nr)
                        folgeposition_full_nr = f"{lg_nr}{ulg_nr}{gt_nr}{pos_nr}" if lg_nr and ulg_nr and gt_nr and pos_nr else ""
                        
                        # Create a clean copy of position with preserved order
                        pos_clean = _preserve_json_order(pos)
                        
                        documents_to_store.append({
                            "entity_type": "Folgeposition", 
                            "lg_nr": lg_nr, 
                            "ulg_nr": ulg_nr, 
                            "grundtext_nr": gt_nr, 
                            "position_nr": pos_nr,
                            "searchable_text": searchable_text, 
                            "entity_json": pos_clean,
                            "embedding": _get_embedding(searchable_text),
                            "full_nr": folgeposition_full_nr,
                            "short_text": pos_stichwort
                        })

    # --- Section 4: Final Database Insertion ---
    valid_documents = [doc for doc in documents_to_store if doc.get("embedding")]
    print(f"Total valid documents to store: {len(valid_documents)}")

    if valid_documents:
        try:
            CHUNK_SIZE = 100
            for i in range(0, len(valid_documents), CHUNK_SIZE):
                chunk = valid_documents[i:i + CHUNK_SIZE]
                print(f"Storing chunk {i // CHUNK_SIZE + 1} of {len(valid_documents) // CHUNK_SIZE + 1}...")
                supabase.table("regulations").insert(chunk).execute()
            print(f"Successfully stored a total of {len(valid_documents)} documents.")
        except Exception as e:
            print(f"An error occurred during the Supabase insert operation: {e}")
            raise
# --- Section 5: AI-Powered Query Analysis Function ---
def analyze_query_with_gemini(query_text: str) -> List[Dict[str, Any]]:
    """
    Analyze natural language query using Gemini Flash 2.5 and convert it to Supabase query.
    
    Args:
        query_text: Natural language query from user (e.g., "i want to build lg 00")
    
    Returns:
        List of matching regulations from the database
    """
    
    # Create a prompt for Gemini to analyze the query
    analysis_prompt = f"""
    You are an expert at analyzing German construction regulation queries and converting them to structured database queries.
    
    Database Schema:
    - Table: regulations
    - Columns: id, entity_type, lg_nr, ulg_nr, grundtext_nr, position_nr, searchable_text, entity_json, embedding, created_at
    - Entity Types: 'LG' (Hauptgruppe), 'ULG' (Untergruppe), 'Grundtext', 'UngeteiltePosition', 'Folgeposition'
    
    User Query: "{query_text}"
    
    Analyze this query and extract the following information in JSON format:
    {{
        "entity_type": "LG|ULG|Grundtext|UngeteiltePosition|Folgeposition|null",
        "lg_nr": "extracted number or null",
        "ulg_nr": "extracted number or null",
        "grundtext_nr": "extracted number or null",
        "position_nr": "extracted number or null",
        "search_terms": ["relevant", "search", "terms"],
        "query_intent": "brief description of what user wants"
    }}
    
    Rules:
    - If query mentions "lg" or "hauptgruppe", set entity_type to "LG"
    - If query mentions "ulg" or "untergruppe", set entity_type to "ULG"
    - Extract numbers that follow entity type indicators (e.g., "lg 00" -> lg_nr: "00")
    - Numbers should be formatted as strings with leading zeros if present
    - If no specific entity type is mentioned, set entity_type to null
    - Extract relevant search terms for text-based searching
    - Return only valid JSON, no additional text
    
    Examples:
    - "i want to build lg 00" -> {{"entity_type": "LG", "lg_nr": "00", "ulg_nr": null, "grundtext_nr": null, "position_nr": null, "search_terms": ["build"], "query_intent": "Find LG 00 regulations"}}
    - "show me ulg 01.02" -> {{"entity_type": "ULG", "lg_nr": "01", "ulg_nr": "02", "grundtext_nr": null, "position_nr": null, "search_terms": ["show"], "query_intent": "Find ULG 01.02 regulations"}}
    """
    
    try:
        # Use Gemini Flash 2.5 model for analysis
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(analysis_prompt)
        
        # Clean the response text - remove markdown code blocks if present
        response_text = response.text.strip()
        print(f"🤖 Raw Gemini response: {response_text}")
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]  # Remove ```json
        if response_text.startswith('```'):
            response_text = response_text[3:]   # Remove ```
        if response_text.endswith('```'):
            response_text = response_text[:-3]  # Remove trailing ```
        
        response_text = response_text.strip()
        print(f"🧹 Cleaned response: {response_text}")
        
        # Parse the JSON response
        analysis_result = json.loads(response_text)
        print(f"🤖 Gemini analysis result: {analysis_result}")
        
        # First, let's check what data exists in the database for debugging
        print(f"🔍 Checking database content...")
        
        # Check if we have any LG records at all
        lg_check = supabase.table("regulations").select("lg_nr, entity_type").eq("entity_type", "LG").limit(5).execute()
        print(f"📋 Sample LG records in database: {[{'lg_nr': r.get('lg_nr'), 'entity_type': r.get('entity_type')} for r in lg_check.data]}")
        
        # Build Supabase query based on analysis
        query_builder = supabase.table("regulations").select("*")
        applied_filters = []
        
        print(f"🔍 Building Supabase query...")
        
        # Apply filters based on extracted information
        if analysis_result.get("entity_type"):
            query_builder = query_builder.eq("entity_type", analysis_result["entity_type"])
            applied_filters.append(f"entity_type = '{analysis_result['entity_type']}'")
        
        if analysis_result.get("lg_nr"):
            # Try both exact match and flexible matching
            lg_nr = analysis_result["lg_nr"]
            
            # First try exact match
            query_builder_exact = query_builder.eq("lg_nr", lg_nr)
            applied_filters.append(f"lg_nr = '{lg_nr}'")
            
            # Also try without leading zeros if it's a number
            if lg_nr.isdigit():
                lg_nr_no_zeros = str(int(lg_nr))
                print(f"🔄 Also trying lg_nr without leading zeros: '{lg_nr_no_zeros}'")
            
        if analysis_result.get("ulg_nr"):
            query_builder = query_builder.eq("ulg_nr", analysis_result["ulg_nr"])
            applied_filters.append(f"ulg_nr = '{analysis_result['ulg_nr']}'")
            
        if analysis_result.get("grundtext_nr"):
            query_builder = query_builder.eq("grundtext_nr", analysis_result["grundtext_nr"])
            applied_filters.append(f"grundtext_nr = '{analysis_result['grundtext_nr']}'")
            
        if analysis_result.get("position_nr"):
            query_builder = query_builder.eq("position_nr", analysis_result["position_nr"])
            applied_filters.append(f"position_nr = '{analysis_result['position_nr']}'")
        
        # Log the constructed query
        if applied_filters:
            print(f"📊 Constructed SQL-like query:")
            print(f"   SELECT * FROM regulations WHERE {' AND '.join(applied_filters)}")
        else:
            print(f"📊 Constructed SQL-like query:")
            print(f"   SELECT * FROM regulations (no filters applied)")
        
        # Execute the query
        print(f"⚡ Executing query...")
        print(query_builder)
        response = query_builder.execute()
        results = response.data
        
        # If no results found with exact match, try alternative approaches
        if not results and analysis_result.get("lg_nr"):
            print(f"🔄 No exact match found, trying alternative searches...")
            
            lg_nr = analysis_result["lg_nr"]
            
            # Try without leading zeros
            if lg_nr.isdigit():
                lg_nr_no_zeros = str(int(lg_nr))
                print(f"🔍 Trying lg_nr = '{lg_nr_no_zeros}'...")
                alt_query = supabase.table("regulations").select("*").eq("entity_type", "LG").eq("lg_nr", lg_nr_no_zeros)
                alt_response = alt_query.execute()
                if alt_response.data:
                    print(f"✅ Found {len(alt_response.data)} results with lg_nr = '{lg_nr_no_zeros}'")
                    results = alt_response.data
            
            # If still no results, try ILIKE search
            if not results:
                print(f"🔍 Trying ILIKE search for lg_nr containing '{lg_nr}'...")
                ilike_query = supabase.table("regulations").select("*").eq("entity_type", "LG").ilike("lg_nr", f"%{lg_nr}%")
                ilike_response = ilike_query.execute()
                if ilike_response.data:
                    print(f"✅ Found {len(ilike_response.data)} results with ILIKE search")
                    results = ilike_response.data
        
        # Add text search if search terms are provided and we still have no results
        if not results:
            search_terms = analysis_result.get("search_terms", [])
            if search_terms:
                print(f"🔍 No results from structured search, trying text search...")
                # Combine search terms for text search
                search_text = " ".join(search_terms)
                text_query = supabase.table("regulations").select("*")
                if analysis_result.get("entity_type"):
                    text_query = text_query.eq("entity_type", analysis_result["entity_type"])
                text_query = text_query.ilike("searchable_text", f"%{search_text}%")
                text_response = text_query.execute()
                if text_response.data:
                    print(f"✅ Found {len(text_response.data)} results with text search")
                    results = text_response.data
        print(f"📈 Final results: Found {len(results)} regulations matching query: '{query_text}'")
        print(f"🎯 Query intent: {analysis_result.get('query_intent', 'Unknown')}")
        
        # NEW LOGIC: If entity_type is not "LG", get LG by lg_nr and use filter_json_entity
        if results and analysis_result.get("entity_type") and analysis_result["entity_type"] != "LG":
            print(f"🔄 Entity type is '{analysis_result['entity_type']}', fetching LG data for filtering...")
            
            # Get lg_nr from the analysis result or from the first result
            lg_nr = analysis_result.get("lg_nr")
            if not lg_nr and results:
                lg_nr = results[0].get("lg_nr")
            
            if lg_nr:
                print(f"🔍 Fetching LG with lg_nr: {lg_nr}")
                
                # Fetch the LG entity from database
                lg_query = supabase.table("regulations").select("*").eq("entity_type", "LG").eq("lg_nr", lg_nr)
                lg_response = lg_query.execute()
                
                if lg_response.data:
                    lg_entity = lg_response.data[0]
                    lg_json = _parse_entity_json(lg_entity.get("entity_json"))

                    if lg_json:
                        print(f"✅ Found LG entity, applying filter_json_entity...")
                        
                        # Prepare parameters for filter_json_entity
                        target_entity_type = analysis_result["entity_type"]
                        target_value = None
                        target_ulg_nr = None
                        target_grundtext_nr = None
                        
                        # Determine target_value and optional parameters based on entity type
                        if target_entity_type == "ULG":
                            target_value = analysis_result.get("ulg_nr")
                            # For ULG, we don't need ulg_nr or grundtext_nr parameters
                        elif target_entity_type == "Grundtext":
                            target_value = analysis_result.get("grundtext_nr")
                            # For Grundtext, we might need ulg_nr if specified
                            target_ulg_nr = analysis_result.get("ulg_nr")
                        elif target_entity_type == "Folgeposition":
                            target_value = analysis_result.get("position_nr")
                            # For Folgeposition, we might need both ulg_nr and grundtext_nr
                            target_ulg_nr = analysis_result.get("ulg_nr")
                            target_grundtext_nr = analysis_result.get("grundtext_nr")
                        
                        if target_value:
                            print(f"🎯 Filtering with: entity_type='{target_entity_type}', target_value='{target_value}', ulg_nr='{target_ulg_nr}', grundtext_nr='{target_grundtext_nr}'")
                            
                            # Apply the filter
                            filtered_json = filter_json_entity(
                                json_input=lg_json,
                                target_entity_type=target_entity_type,
                                target_value=target_value,
                                target_ulg_nr=target_ulg_nr,
                                target_grundtext_nr=target_grundtext_nr
                            )
                            
                            print(f"✅ Successfully filtered LG JSON to {target_entity_type}")
                            
                            # Return both original query results and the filtered JSON as separate objects
                            return {
                                "results": results,
                                "json_response": filtered_json
                            }
                        else:
                            print(f"⚠️ Could not determine target_value for entity_type '{target_entity_type}'")
                    else:
                        print(f"⚠️ LG entity found but no entity_json available")
                else:
                    print(f"⚠️ No LG found with lg_nr: {lg_nr}")
            else:
                print(f"⚠️ Could not determine lg_nr for filtering")
        
        final_json_response = None
        if analysis_result.get("entity_type") == "LG" and results:
            final_json_response = _parse_entity_json(results[0].get("entity_json"))
            print(f"✅ Returning LG entity_json as json_response.")
        
        return {
            "results": results,
            "json_response": final_json_response
        }
        
    except json.JSONDecodeError as e:
        print(f"Error parsing Gemini response as JSON: {e}")
        print(f"Raw response: {response.text if 'response' in locals() else 'No response'}")
        return []
    except Exception as e:
        print(f"Error analyzing query with Gemini: {e}")
        return []

# --- Section 6: Search Function ---
def find_similar_regulations(query: str, threshold: float, count: int) -> List[Dict[str, Any]]:
    """
    Find similar regulations using vector similarity search.
    
    Returns all columns from the regulations table:
    - id, entity_type, lg_nr, ulg_nr, grundtext_nr, position_nr
    - searchable_text, entity_json, embedding, created_at, similarity
    """
    query_embedding = _get_embedding(query, task_type="RETRIEVAL_QUERY")
    if not query_embedding:
        print("Warning: Could not generate embedding for query")
        return []
    
    try:
        response = supabase.rpc('match_regulations', {
            'query_embedding': query_embedding,
            'match_threshold': threshold,
            'match_count': count
        }).execute()
        
        # The RPC function now returns all columns from the regulations table
        results = response.data
        print(f"Found {len(results)} similar regulations")

        # Parse entity_json in all results before returning
        return _parse_entity_json_in_results(results)
    except Exception as e:
        print(f"Error calling RPC function: {e}")
        return []
# --- Section 7: ONLV Empty JSON Utility ---
def get_onlv_empty_json(project_id: Optional[str] = None, boq_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Reads the content of 'backend/onlv_empty.json' and returns it as a dictionary.
    Uses object_pairs_hook to preserve the original key order from the JSON file.
    
    Args:
        project_id: Optional UUID of the project to fetch project information from database
        boq_id: Optional UUID of the BoQ to fetch BoQ information from database
    
    Returns:
        Dictionary containing the ONLV JSON structure with project and BoQ data populated if IDs are provided
    """
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "onlv_empty.json")
    
    # Fetch project data if project_id is provided
    project_data = None
    if project_id:
        try:
            print(f"🔍 Fetching project data for project_id: {project_id}")
            response = supabase.table("projects").select("*").eq("id", project_id).execute()
            if response.data and len(response.data) > 0:
                project_data = response.data[0]
                print(f"✅ Found project: {project_data.get('name', 'Unknown')}")
            else:
                print(f"⚠️ No project found with id: {project_id}")
        except Exception as e:
            print(f"❌ Error fetching project data: {e}")
    
    # Fetch BoQ data if boq_id is provided
    boq_data = None
    if boq_id:
        try:
            print(f"🔍 Fetching BoQ data for boq_id: {boq_id}")
            response = supabase.table("boqs").select("*").eq("id", boq_id).execute()
            if response.data and len(response.data) > 0:
                boq_data = response.data[0]
                print(f"✅ Found BoQ: {boq_data.get('name', 'Unknown')}")
                
                # If no project_id was provided but BoQ has project_id, fetch project data
                if not project_id and boq_data.get("project_id"):
                    try:
                        print(f"🔍 Fetching project data from BoQ's project_id: {boq_data['project_id']}")
                        project_response = supabase.table("projects").select("*").eq("id", boq_data["project_id"]).execute()
                        if project_response.data and len(project_response.data) > 0:
                            project_data = project_response.data[0]
                            print(f"✅ Found project from BoQ: {project_data.get('name', 'Unknown')}")
                            print(f"🔍 Project data from BoQ: nr={project_data.get('nr')}, name={project_data.get('name')}, lv_bezeichnung={project_data.get('lv_bezeichnung')}, auftraggeber={project_data.get('auftraggeber')}")
                    except Exception as e:
                        print(f"❌ Error fetching project data from BoQ: {e}")
            else:
                print(f"⚠️ No BoQ found with id: {boq_id}")
        except Exception as e:
            print(f"❌ Error fetching BoQ data: {e}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Use object_pairs_hook to preserve key order
            from collections import OrderedDict
            onlv_json = json.load(f, object_pairs_hook=OrderedDict)

            # Update 'erstelltam' with current datetime in ISO 8601 format
            current_datetime_iso = datetime.now().isoformat(timespec='seconds') + 'Z'
            if "onlv" in onlv_json and "metadaten" in onlv_json["onlv"]:
                onlv_json["onlv"]["metadaten"]["erstelltam"] = current_datetime_iso
                
                # Use BoQ original_filename if available, otherwise project dateiname, otherwise default
                if boq_data and boq_data.get("original_filename"):
                    onlv_json["onlv"]["metadaten"]["dateiname"] = boq_data["original_filename"]
                elif project_data and project_data.get("dateiname"):
                    onlv_json["onlv"]["metadaten"]["dateiname"] = project_data["dateiname"]
                else:
                    onlv_json["onlv"]["metadaten"]["dateiname"] = "Generated Onlv"

            # Update 'preisbasis' and 'bearbeitungsstand' with current date in YYYY-MM-DD format
            current_date = datetime.now().strftime("%Y-%m-%d")
            if "onlv" in onlv_json and "ausschreibungs-lv" in onlv_json["onlv"] and "kenndaten" in onlv_json["onlv"]["ausschreibungs-lv"]:
                kenndaten = onlv_json["onlv"]["ausschreibungs-lv"]["kenndaten"]
                
                # Update with BoQ and project data if available
                # Priority: BoQ data > Project data > Default values
                
                # LV-Code: Use BoQ lv_code if available, otherwise project nr
                if boq_data and boq_data.get("lv_code"):
                    kenndaten["lvcode"] = str(boq_data["lv_code"])
                    print(f"✅ Set lvcode from BoQ: {boq_data['lv_code']}")
                elif project_data and project_data.get("nr"):
                    kenndaten["lvcode"] = str(project_data["nr"])
                    print(f"✅ Set lvcode from project: {project_data['nr']}")
                
                # Vorhaben (Project name): Always use project name
                if project_data and project_data.get("name"):
                    kenndaten["vorhaben"] = str(project_data["name"])
                    print(f"✅ Set vorhaben from project: {project_data['name']}")
                
                # LV-Bezeichnung: Use BoQ lv_bezeichnung if available, otherwise project lv_bezeichnung
                if boq_data and boq_data.get("lv_bezeichnung"):
                    kenndaten["lvbezeichnung"] = str(boq_data["lv_bezeichnung"])
                    print(f"✅ Set lvbezeichnung from BoQ: {boq_data['lv_bezeichnung']}")
                elif project_data and project_data.get("lv_bezeichnung"):
                    kenndaten["lvbezeichnung"] = str(project_data["lv_bezeichnung"])
                    print(f"✅ Set lvbezeichnung from project: {project_data['lv_bezeichnung']}")
                
                # Auftraggeber: Use project auftraggeber if available
                if project_data and project_data.get("auftraggeber") and "auftraggeber" in kenndaten and "firma" in kenndaten["auftraggeber"]:
                    kenndaten["auftraggeber"]["firma"]["name"] = str(project_data["auftraggeber"])
                    print(f"✅ Set auftraggeber from project: {project_data['auftraggeber']}")
                
                # Set default values for dates and other fields
                if "bearbeitungsstand" in kenndaten:
                    kenndaten["bearbeitungsstand"] = current_date
                if "preisbasis" in kenndaten:
                    kenndaten["preisbasis"] = current_date
                
                # Set default lvbezeichnung if not set from BoQ or project data
                if "lvbezeichnung" in kenndaten and not kenndaten.get("lvbezeichnung"):
                    kenndaten["lvbezeichnung"] = "Trockenbauarbeiten"
                    print(f"✅ Set default lvbezeichnung: Trockenbauarbeiten")
                
                # Debug: Show final kenndaten values
                print(f"🎯 Final kenndaten values:")
                print(f"   lvcode: {kenndaten.get('lvcode')}")
                print(f"   vorhaben: {kenndaten.get('vorhaben')}")
                print(f"   lvbezeichnung: {kenndaten.get('lvbezeichnung')}")
                if "auftraggeber" in kenndaten and "firma" in kenndaten["auftraggeber"]:
                    print(f"   auftraggeber: {kenndaten['auftraggeber']['firma'].get('name')}")
            
            return onlv_json
    except FileNotFoundError:
        print(f"Error: onlv_empty.json not found at {file_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {file_path}: {e}")
        return {}
    except Exception as e:
        print(f"An unexpected error occurred while reading {file_path}: {e}")
        return {}

# --- Section 8: BoQ Helper Functions ---
def get_onlv_empty_json_for_boq(boq_id: str) -> Dict[str, Any]:
    """
    Convenience function to get ONLV empty JSON populated with BoQ data.
    This function automatically fetches the associated project data through the BoQ's project_id.
    
    Args:
        boq_id: UUID of the BoQ to fetch data for
    
    Returns:
        Dictionary containing the ONLV JSON structure with BoQ and project data populated
    """
    return get_onlv_empty_json(boq_id=boq_id)

def get_boq_by_id(boq_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single BoQ record by ID.
    
    Args:
        boq_id: UUID of the BoQ to fetch
    
    Returns:
        BoQ record dictionary or None if not found
    """
    try:
        print(f"🔍 Fetching BoQ with id: {boq_id}")
        response = supabase.table("boqs").select("*").eq("id", boq_id).execute()
        if response.data and len(response.data) > 0:
            boq_data = response.data[0]
            print(f"✅ Found BoQ: {boq_data.get('name', 'Unknown')} (LV-Code: {boq_data.get('lv_code', 'N/A')})")
            return boq_data
        else:
            print(f"⚠️ No BoQ found with id: {boq_id}")
            return None
    except Exception as e:
        print(f"❌ Error fetching BoQ data: {e}")
        return None

def get_boqs_by_project_id(project_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all BoQ records for a specific project.
    
    Args:
        project_id: UUID of the project to fetch BoQs for
    
    Returns:
        List of BoQ records for the project
    """
    try:
        print(f"🔍 Fetching BoQs for project_id: {project_id}")
        response = supabase.table("boqs").select("*").eq("project_id", project_id).order("created_at").execute()
        boqs = response.data
        print(f"✅ Found {len(boqs)} BoQs for project")
        return boqs
    except Exception as e:
        print(f"❌ Error fetching BoQs for project: {e}")
        return []

# --- Section 9: Regulation Number Parser ---
def parse_regulation_number(regulation_nr: str) -> Dict[str, Optional[str]]:
    """
    Parse regulation number format like '003901C' or '003502' by querying the full_nr column.

    Instead of parsing the number into components, this function queries the database
    using the full_nr column to find matching records and returns their components.

    Args:
        regulation_nr: String like '003901C' or '003502'

    Returns:
        Dict with keys: lg_nr, ulg_nr, grundtext_nr, position_nr
    """
    if not regulation_nr or not isinstance(regulation_nr, str):
        return {"lg_nr": None, "ulg_nr": None, "grundtext_nr": None, "position_nr": None}

    # Remove any whitespace
    regulation_nr = regulation_nr.strip()

    # Check if the format is valid (6 digits + optional letter)
    if not re.match(r'^\d{6}[A-Za-z]?$', regulation_nr):
        print(f"Invalid regulation number format: {regulation_nr}")
        return {"lg_nr": None, "ulg_nr": None, "grundtext_nr": None, "position_nr": None}

    try:
        # Query database using full_nr column
        response = supabase.table("regulations").select("lg_nr, ulg_nr, grundtext_nr, position_nr").eq("full_nr", regulation_nr).execute()

        if response.data and len(response.data) > 0:
            # Return the components from the first matching record
            record = response.data[0]
            result = {
                "lg_nr": record.get("lg_nr"),
                "ulg_nr": record.get("ulg_nr"),
                "grundtext_nr": record.get("grundtext_nr"),
                "position_nr": record.get("position_nr")
            }
            print(f"Found regulation components for '{regulation_nr}': {result}")
            return result
        else:
            print(f"No regulation found with full_nr: {regulation_nr}")
            return {"lg_nr": None, "ulg_nr": None, "grundtext_nr": None, "position_nr": None}

    except Exception as e:
        print(f"Error querying regulation by full_nr '{regulation_nr}': {e}")
        return {"lg_nr": None, "ulg_nr": None, "grundtext_nr": None, "position_nr": None}

def find_regulation_by_number(regulation_nr: str) -> List[Dict[str, Any]]:
    """
    Find regulation records by querying the full_nr column directly.

    Args:
        regulation_nr: String like '003901C' or '003502'

    Returns:
        List of matching regulation records from database
    """
    if not regulation_nr or not isinstance(regulation_nr, str):
        return []

    # Remove any whitespace
    regulation_nr = regulation_nr.strip()

    # Check if the format is valid (6 digits + optional letter)
    if not re.match(r'^\d{6}[A-Za-z]?$', regulation_nr):
        print(f"Invalid regulation number format: {regulation_nr}")
        return []

    try:
        # Query database directly using full_nr column
        print(f"🔍 Searching regulations with full_nr = '{regulation_nr}'")

        response = supabase.table("regulations").select("*").eq("full_nr", regulation_nr).execute()
        results = response.data

        print(f"📈 Found {len(results)} regulations matching full_nr: '{regulation_nr}'")

        # If no exact match found, try alternative searches
        if not results:
            print(f"🔄 No exact match found, trying alternative searches...")

            # Try searching without leading zeros for numeric components
            # Extract components for alternative search
            lg_nr = regulation_nr[0:2]
            ulg_nr = regulation_nr[2:4]
            grundtext_nr = regulation_nr[4:6]
            position_nr = regulation_nr[6:].upper() if len(regulation_nr) > 6 else None

            alt_lg_nr = str(int(lg_nr)) if lg_nr.isdigit() else lg_nr
            alt_ulg_nr = str(int(ulg_nr)) if ulg_nr.isdigit() else ulg_nr
            alt_grundtext_nr = str(int(grundtext_nr)) if grundtext_nr.isdigit() else grundtext_nr

            # Create alternative full_nr without leading zeros
            alt_regulation_nr = f"{alt_lg_nr}{alt_ulg_nr}{alt_grundtext_nr}{position_nr if position_nr else ''}"

            if alt_regulation_nr != regulation_nr:
                print(f"🔍 Trying alternative search with full_nr = '{alt_regulation_nr}'")

                alt_response = supabase.table("regulations").select("*").eq("full_nr", alt_regulation_nr).execute()
                if alt_response.data:
                    print(f"✅ Found {len(alt_response.data)} results with alternative search")
                    results = alt_response.data

        # Parse entity_json in all results before returning
        return _parse_entity_json_in_results(results)

    except Exception as e:
        print(f"Error querying regulations by number '{regulation_nr}': {e}")
        return []

def unified_regulation_search(query: str) -> Dict[str, Any]:
    """
    Unified search function that can handle both regulation numbers and text queries.
    
    First checks if the query matches regulation number format (6 digits + optional letter).
    If it matches, performs number-based search. Otherwise, performs text-based search.
    
    Args:
        query: Either a regulation number (e.g., "003901C") or text query
    
    Returns:
        Dict with search results and metadata
    """
    if not query or not isinstance(query, str):
        return {
            "search_type": "invalid",
            "query": query,
            "results": [],
            "json_response": None,
            "total_results": 0
        }
    
    query = query.strip()
    
    # Check if query matches regulation number format (6 digits + optional letter)
    if re.match(r'^\d{6}[A-Za-z]?$', query):
        print(f"🔢 Detected regulation number format: '{query}'")
        
        # Use number-based search
        results = find_regulation_by_number(query)
        
        return {
            "search_type": "number",
            "query": query,
            "results": _parse_entity_json_in_results(results),
            "json_response": _parse_entity_json(results[0].get("entity_json")) if results else None,
            "total_results": len(results),
            "parsed_components": parse_regulation_number(query)
        }
    
    else:
        print(f"📝 Detected text query format: '{query}'")
        
        # First try direct searchable_text search
        direct_results = search_in_searchable_text(query)
        
        if direct_results:
            print(f"✅ Found {len(direct_results)} results with direct searchable_text search")
            return {
                "search_type": "direct_text",
                "query": query,
                "results": _parse_entity_json_in_results(direct_results),
                "json_response": _parse_entity_json(direct_results[0].get("entity_json")) if direct_results else None,
                "total_results": len(direct_results)
            }
        
        # If no direct results, fall back to AI-powered search
        print(f"🤖 No direct text matches found, trying AI-powered search...")
        result = analyze_query_with_gemini(query)
        
        # Handle different result formats from analyze_query_with_gemini
        if not result:
            return {
                "search_type": "ai_text",
                "query": query,
                "results": [],
                "json_response": None,
                "total_results": 0
            }
        
        # If result is a list (old format)
        if isinstance(result, list):
            return {
                "search_type": "ai_text",
                "query": query,
                "results": result,
                "json_response": None,
                "total_results": len(result)
            }
        
        # If result is a dict with results and json_response (new format)
        if isinstance(result, dict) and "results" in result:
            results_list = result.get("results", [])
            json_response = result.get("json_response")
            
            return {
                "search_type": "ai_text",
                "query": query,
                "results": results_list,
                "json_response": json_response,
                "total_results": len(results_list)
            }
        
        # Fallback case
        return {
            "search_type": "ai_text",
            "query": query,
            "results": [],
            "json_response": None,
            "total_results": 0
        }

def search_in_searchable_text(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Search directly in the searchable_text field using ILIKE (case-insensitive).
    
    Args:
        query: Text to search for in searchable_text field
        limit: Maximum number of results to return
    
    Returns:
        List of matching regulation records
    """
    if not query or not isinstance(query, str):
        return []
    
    query = query.strip()
    if not query:
        return []
    
    try:
        print(f"🔍 Searching in searchable_text for: '{query}'")
        
        # Use ILIKE for case-insensitive search with wildcards
        response = supabase.table("regulations").select("*").ilike("searchable_text", f"%{query}%").limit(limit).execute()
        
        results = response.data
        print(f"📈 Direct searchable_text search found {len(results)} results")

        # Parse entity_json in all results before returning
        return _parse_entity_json_in_results(results)
        
    except Exception as e:
        print(f"Error searching in searchable_text for '{query}': {e}")
        return []