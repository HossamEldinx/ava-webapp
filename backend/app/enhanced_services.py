# enhanced_services.py

import os
import google.genai as genai
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any

# --- Initialization ---
# Load environment variables from your .env file
load_dotenv()

# Configure the Gemini client
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize the Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# --- Helper Functions ---

def _flatten_text_from_json(obj: Any) -> str:
    """
    A robust helper function to recursively extract and clean all text 
    from the varied and complex JSON structures.
    """
    if obj is None:
        return ""
    if isinstance(obj, str):
        return obj.strip()
    if isinstance(obj, list):
        # Process each item in the list and join with a space
        return " ".join(_flatten_text_from_json(item) for item in obj)
    if isinstance(obj, dict):
        # Dictionaries often have a '#text' key, but we should also check for others
        # to be safe, though we prioritize '#text'.
        text_content = _flatten_text_from_json(obj.get("#text", ""))
        if not text_content: # If #text is not present, flatten other values
             return " ".join(_flatten_text_from_json(v) for k, v in obj.items())
        return text_content
    return ""

def _get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    """
    Generates an embedding for the given text using the Gemini model.
    Includes error handling.
    """
    if not text:
        print("Warning: Attempted to embed empty text. Skipping.")
        return []
    try:
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type=task_type
        )
        return result['embedding']
    except Exception as e:
        print(f"Error getting embedding for text snippet '{text[:50]}...': {e}")
        return []

# --- Main Processing Function ---

def process_and_store_data(full_json_payload: List[Dict[str, Any]]):
    """
    Parses the entire JSON payload, creates embeddings, and stores them in Supabase.
    This version ensures all inserted objects match the exact database schema.
    
    Database schema fields:
    - entity_type (text, not null)
    - lg_nr (text, nullable)
    - ulg_nr (text, nullable)
    - grundtext_nr (text, nullable)
    - position_nr (text, nullable)
    - searchable_text (text, not null)
    - entity_json (jsonb, nullable)
    - embedding (vector, not null)
    """
    documents_to_store = []
    
    for lg in full_json_payload:
        lg_nr = lg.get("@_nr")
        lg_eigenschaften = lg.get("lg-eigenschaften", {})
        
        # 1. Process LG
        lg_ueberschrift = lg_eigenschaften.get("ueberschrift", "")
        lg_vorbemerkung = _flatten_text_from_json(lg_eigenschaften.get("vorbemerkung", {}))
        lg_kommentar = _flatten_text_from_json(lg_eigenschaften.get("kommentar", {}))
        lg_text = f"Hauptgruppe: {lg_ueberschrift}. Vorbemerkung: {lg_vorbemerkung}. Kommentar: {lg_kommentar}"
        
        documents_to_store.append({
            "entity_type": "LG",
            "lg_nr": lg_nr,
            "ulg_nr": None,  # FIX: Add missing keys with None
            "grundtext_nr": None,  # FIX: Add missing keys with None
            "position_nr": None,  # FIX: Add missing keys with None
            "searchable_text": lg_text,
            "entity_json": lg_eigenschaften,
            "embedding": _get_embedding(lg_text)
        })

        ulgs = lg.get("ulg-liste", {}).get("ulg", [])
        if isinstance(ulgs, dict): ulgs = [ulgs]

        for ulg in ulgs:
            ulg_nr = ulg.get("@_nr")
            ulg_eigenschaften = ulg.get("ulg-eigenschaften", {})
            
            # 2. Process ULG
            ulg_ueberschrift = ulg_eigenschaften.get("ueberschrift", "")
            ulg_vorbemerkung = _flatten_text_from_json(ulg_eigenschaften.get("vorbemerkung", {}))
            ulg_context = f"Hauptgruppe: {lg_ueberschrift}. Untergruppe: {ulg_ueberschrift}"
            ulg_text = f"{ulg_context}. Vorbemerkung: {ulg_vorbemerkung}"

            documents_to_store.append({
                "entity_type": "ULG",
                "lg_nr": lg_nr,
                "ulg_nr": ulg_nr,
                "grundtext_nr": None,  # FIX: Add missing keys with None
                "position_nr": None,  # FIX: Add missing keys with None
                "searchable_text": ulg_text,
                "entity_json": ulg_eigenschaften,
                "embedding": _get_embedding(ulg_text)
            })

            grundtexte = ulg.get("positionen", {}).get("grundtextnr", [])
            for gt in grundtexte:
                gt_nr = gt.get("@_nr")
                
                # 3. Process UngeteiltePositionen
                ungeteilte_positionen = gt.get("ungeteilteposition", [])
                if isinstance(ungeteilte_positionen, dict): ungeteilte_positionen = [ungeteilte_positionen]
                
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
                        "embedding": _get_embedding(searchable_text)
                    })
                
                # 4. Process Grundtext + Folgepositionen
                if "grundtext" in gt:
                    gt_text = _flatten_text_from_json(gt.get("grundtext", {}))
                    grundtext_context = f"{ulg_context}. Grundtext: {gt_text}"

                    documents_to_store.append({
                        "entity_type": "Grundtext",
                        "lg_nr": lg_nr,
                        "ulg_nr": ulg_nr,
                        "grundtext_nr": gt_nr,
                        "position_nr": None, # FIX: Add missing keys with None
                        "searchable_text": grundtext_context,
                        "entity_json": gt.get("grundtext"),
                        "embedding": _get_embedding(grundtext_context)
                    })
                    
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
                            "embedding": _get_embedding(searchable_text)
                        })

    # The rest of the function remains the same
    valid_documents = [doc for doc in documents_to_store if doc.get("embedding")]
    if valid_documents:
        try:
            CHUNK_SIZE = 100
            for i in range(0, len(valid_documents), CHUNK_SIZE):
                chunk = valid_documents[i:i + CHUNK_SIZE]
                print(f"Storing chunk {i // CHUNK_SIZE + 1} with {len(chunk)} documents...")
                supabase.table("regulations").insert(chunk).execute()
            print(f"Successfully stored a total of {len(valid_documents)} documents.")
            return {"status": "success", "stored_documents": len(valid_documents)}
        except Exception as e:
            print(f"Error during Supabase insert: {e}")
            raise  # Re-raise the exception to be caught by FastAPI
    
    return {"status": "success", "message": "No new documents to store."}