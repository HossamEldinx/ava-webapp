# services.py
import os
import json
import google.genai as genai
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Union

# Load environment variables from .env file
load_dotenv()

# --- Initialize Clients ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def _flatten_text_from_json(obj: Any) -> str:
    """A robust helper to extract and clean text from complex JSON structures."""
    if obj is None:
        return ""
    if isinstance(obj, str):
        return obj.strip()
    if isinstance(obj, list):
        return " ".join(_flatten_text_from_json(item) for item in obj)
    if isinstance(obj, dict):
        return _flatten_text_from_json(obj.get("#text", ""))
    return ""

def _get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    """Generates an embedding for the given text."""
    try:
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type=task_type
        )
        return result['embedding']
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

def get_gemini_embedding(text: str) -> List[float]:
    """Generates an embedding for the given text using the Gemini model."""
    return _get_embedding(text, "RETRIEVAL_DOCUMENT")

def process_and_store_all_data(full_json: Dict[str, Any], lv_type: str = "onlv"):
    """
    Parses the entire JSON, creates embeddings for ALL entity levels (LG, ULG, Positions),
    and stores them in Supabase.
    """
    documents_to_store = []
    
    for lg in full_json.get("lg-liste", {}).get("lg", []):
        lg_nr = lg.get("@_nr")
        lg_eigenschaften = lg.get("lg-eigenschaften", {})
        
        # 1. Process the LG itself as a searchable entity
        lg_ueberschrift = lg_eigenschaften.get("ueberschrift", "")
        lg_vorbemerkung = _flatten_text_from_json(lg_eigenschaften.get("vorbemerkung", {}).get("p", ""))
        lg_kommentar = _flatten_text_from_json(lg_eigenschaften.get("kommentar", {}).get("p", ""))
        lg_text = f"Hauptgruppe: {lg_ueberschrift}. Vorbemerkung: {lg_vorbemerkung}. Kommentar: {lg_kommentar}"
        
        documents_to_store.append({
            "entity_type": "LG",
            "lg_nr": lg_nr,
            "searchable_text": lg_text,
            "entity_json": lg_eigenschaften,
            "lv_type": lv_type,
            "embedding": _get_embedding(lg_text)
        })

        ulgs = lg.get("ulg-liste", {}).get("ulg", [])
        if isinstance(ulgs, dict): ulgs = [ulgs]

        for ulg in ulgs:
            ulg_nr = ulg.get("@_nr")
            ulg_eigenschaften = ulg.get("ulg-eigenschaften", {})
            
            # 2. Process the ULG itself as a searchable entity
            ulg_ueberschrift = ulg_eigenschaften.get("ueberschrift", "")
            ulg_vorbemerkung = _flatten_text_from_json(ulg_eigenschaften.get("vorbemerkung", {}))
            ulg_context = f"Hauptgruppe: {lg_ueberschrift}. Untergruppe: {ulg_ueberschrift}"
            ulg_text = f"{ulg_context}. Vorbemerkung: {ulg_vorbemerkung}"

            documents_to_store.append({
                "entity_type": "ULG",
                "lg_nr": lg_nr,
                "ulg_nr": ulg_nr,
                "searchable_text": ulg_text,
                "entity_json": ulg_eigenschaften,
                "lv_type": lv_type,
                "embedding": _get_embedding(ulg_text)
            })

            grundtexte = ulg.get("positionen", {}).get("grundtextnr", [])
            for gt in grundtexte:
                gt_nr = gt.get("@_nr")
                
                # 3. Process UngeteiltePositionen
                ungeteilte_positionen = gt.get("ungeteilteposition", [])
                for pos in ungeteilte_positionen:
                    pos_nr = pos.get("@_mfv")
                    pos_text = _flatten_text_from_json(pos.get("pos-eigenschaften", {}))
                    searchable_text = f"{ulg_context}. Position: {pos_text}"
                    
                    documents_to_store.append({
                        "entity_type": "UngeteiltePosition",
                        "lg_nr": lg_nr,
                        "ulg_nr": ulg_nr,
                        "grundtext_nr": gt_nr,
                        "position_nr": pos_nr,
                        "searchable_text": searchable_text,
                        "entity_json": pos,
                        "lv_type": lv_type,
                        "embedding": _get_embedding(searchable_text)
                    })
                
                # 4. Process Grundtext + Folgepositionen
                if "grundtext" in gt:
                    gt_text = _flatten_text_from_json(gt.get("grundtext", {}))
                    grundtext_context = f"{ulg_context}. Grundtext: {gt_text}"

                    folgepositionen = gt.get("folgeposition", [])
                    if isinstance(folgepositionen, dict): folgepositionen = [folgepositionen]
                    
                    for pos in folgepositionen:
                        pos_nr = pos.get("@_ftnr")
                        pos_text = _flatten_text_from_json(pos.get("pos-eigenschaften", {}))
                        searchable_text = f"{grundtext_context}. Option: {pos_text}"
                        
                        documents_to_store.append({
                            "entity_type": "Folgeposition",
                            "lg_nr": lg_nr,
                            "ulg_nr": ulg_nr,
                            "grundtext_nr": gt_nr,
                            "position_nr": pos_nr,
                            "searchable_text": searchable_text,
                            "entity_json": pos,
                            "lv_type": lv_type,
                            "embedding": _get_embedding(searchable_text)
                        })

    # Final check to remove any documents where embedding failed
    valid_documents = [doc for doc in documents_to_store if doc.get("embedding")]

    # Batch insert into Supabase
    if valid_documents:
        try:
            # You may need to send in smaller chunks if the total payload is too large
            CHUNK_SIZE = 100
            for i in range(0, len(valid_documents), CHUNK_SIZE):
                chunk = valid_documents[i:i + CHUNK_SIZE]
                print(f"Storing chunk {i // CHUNK_SIZE + 1} with {len(chunk)} documents.")
                supabase.table("regulations").insert(chunk).execute()
            
            print(f"Successfully stored a total of {len(valid_documents)} documents.")
        except Exception as e:
            print(f"Error storing documents in Supabase: {e}")

def process_and_store_regulations(json_data: Dict[str, Any], lv_type: str = "onlv"):
    """
    Legacy function name for backward compatibility.
    Calls the enhanced process_and_store_all_data function.
    """
    return process_and_store_all_data(json_data, lv_type)

async def find_similar_regulations(query: str, threshold: float, count: int) -> List[Dict[str, Any]]:
    """Finds similar regulations using the RPC function in Supabase."""
    # Use 'RETRIEVAL_QUERY' for the user's search query
    query_embedding = genai.embed_content(
        model="models/embedding-001",
        content=query,
        task_type="RETRIEVAL_QUERY"
    )['embedding']
    
    if not query_embedding:
        return []

    try:
        response = supabase.rpc('match_regulations', {
            'query_embedding': query_embedding,
            'match_threshold': threshold,
            'match_count': count
        }).execute()
        return response.data
    except Exception as e:
        print(f"Error calling RPC function: {e}")
        return []

def get_regulation_by_id(regulation_id: int) -> Dict[str, Any]:
    """
    Retrieve a specific regulation by its ID from Supabase.
    """
    try:
        response = supabase.table("regulations").select("*").eq("id", regulation_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            return {}
    except Exception as e:
        print(f"Error retrieving regulation by ID {regulation_id}: {e}")
        return {}

def get_regulations_by_lv_type(lv_type: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieve regulations filtered by lv_type from Supabase.
    """
    try:
        response = supabase.table("regulations").select("*").eq("lv_type", lv_type).limit(limit).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error retrieving regulations by lv_type {lv_type}: {e}")
        return []

def get_all_regulations(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Retrieve all regulations from Supabase with optional limit.
    """
    try:
        response = supabase.table("regulations").select("*").limit(limit).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error retrieving all regulations: {e}")
        return []