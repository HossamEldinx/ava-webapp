import os
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List
import json
from collections import OrderedDict

# Initialize Supabase client lazily
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def check_nr_existence(nr: str) -> Dict[str, Any]:
    """
    Checks if a given 'nr' exists in the 'full_nr' column of the 'regulations' table.
    Enhanced to check for existing grundtext records using grundtext_nr column and entity_type.

    Args:
        nr: The number to check for existence (e.g., "001101G").

    Returns:
        Dict containing:
        - If grundtext exists: {"exists": boolean, "grundtext_exists": True, "grundtext_data": [...]}
        - If only nr exists: {"exists": True}
        - If nothing exists: {"exists": False}
    """
    try:
        # First check if the exact nr exists
        response = get_supabase_client().table("regulations").select("id").eq("full_nr", nr).execute()
        exact_exists = len(response.data) > 0
        
        # Parse the nr to extract all components (e.g., "001101G" -> lg="00", ulg="11", grundtext="01")
        lg_nr = None
        ulg_nr = None
        grundtext_nr = None
        
        if len(nr) >= 6:
            lg_nr = nr[0:2]  # First 2 digits (positions 0-1)
            ulg_nr = nr[2:4]  # Next 2 digits (positions 2-3)
            grundtext_nr = nr[4:6]  # Next 2 digits (positions 4-5)
            print(f"📋 Parsed nr '{nr}': lg_nr={lg_nr}, ulg_nr={ulg_nr}, grundtext_nr={grundtext_nr}")
        
        # If we have all components, check for existing records with matching lg_nr, ulg_nr, grundtext_nr AND entity_type = "Grundtext"
        if lg_nr and ulg_nr and grundtext_nr:
            print(f"🔍 Checking for existing records with lg_nr: {lg_nr}, ulg_nr: {ulg_nr}, grundtext_nr: {grundtext_nr} and entity_type: Grundtext")
            grundtext_response = get_supabase_client().table("regulations").select(
                "id, full_nr, lg_nr, ulg_nr, grundtext_nr, entity_type, entity_json, short_text, searchable_text"
            ).eq("lg_nr", lg_nr).eq("ulg_nr", ulg_nr).eq("grundtext_nr", grundtext_nr).eq("entity_type", "Grundtext").execute()
            
            if grundtext_response.data and len(grundtext_response.data) > 0:
                print(f"✅ Found {len(grundtext_response.data)} existing grundtext records with lg_nr: {lg_nr}, ulg_nr: {ulg_nr}, grundtext_nr: {grundtext_nr}")
                return {
                    "exists": exact_exists,
                    "grundtext_exists": True,
                    "grundtext_data": grundtext_response.data
                }
        
        # If exact nr exists but no grundtext matches
        if exact_exists:
            return {"exists": True}
        
        # Nothing exists
        return {"exists": False}
        
    except Exception as e:
        print(f"❌ Error checking nr existence {nr}: {e}")
        return {"exists": False, "error": str(e)}

def _flatten_text_from_json(obj: Any) -> str:
    """
    Recursively flatten text content from JSON structure.
    Similar to the function in data_services.py but simplified for custom positions.
    """
    if obj is None:
        return ""
    if isinstance(obj, str):
        return obj.strip()
    if isinstance(obj, list):
        return " ".join(_flatten_text_from_json(item) for item in obj)
    if isinstance(obj, dict):
        text_content = _flatten_text_from_json(obj.get("#text", ""))
        if not text_content:
            return " ".join(_flatten_text_from_json(v) for v in obj.values())
        return text_content
    return ""

def _get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    """
    Generate embedding for text using Google's embedding model.
    """
    if not text:
        print("Warning: Attempted to embed empty text. Skipping.")
        return []
    try:
        result = genai.embed_content(model="models/embedding-001", content=text, task_type=task_type)
        return result['embedding']
    except Exception as e:
        print(f"Error getting embedding for text snippet '{text[:50]}...': {e}")
        return []

def _preserve_json_order(obj: Any) -> Any:
    """
    Creates a clean copy of the object that preserves the original JSON key order.
    Simplified version from data_services.py for custom positions.
    """
    if isinstance(obj, dict):
        ordered_dict = OrderedDict()
        for key, value in obj.items():
            ordered_dict[key] = _preserve_json_order(value)
        return dict(ordered_dict)
    elif isinstance(obj, list):
        return [_preserve_json_order(item) for item in obj]
    else:
        return obj

def _extract_grundtext_data(json_body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract grundtext data from the JSON body.
    
    Args:
        json_body: The complete JSON structure
        
    Returns:
        Dict containing grundtext data and @_nr
    """
    grundtext_data = {}
    
    # Look for grundtext in grundtextnr array
    grundtextnr_list = json_body.get("grundtextnr", [])
    if isinstance(grundtextnr_list, dict):
        grundtextnr_list = [grundtextnr_list]
    
    for grundtext_item in grundtextnr_list:
        if isinstance(grundtext_item, dict):
            grundtext_content = grundtext_item.get("grundtext", {})
            nr_attr = grundtext_item.get("@_nr", "")
            
            if grundtext_content:
                grundtext_data = {
                    "grundtext": grundtext_content,
                    "@_nr": nr_attr
                }
                break
    
    return grundtext_data

def _extract_folgeposition_data(json_body: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract folgeposition data from the JSON body.
    
    Args:
        json_body: The complete JSON structure
        
    Returns:
        List of folgeposition dictionaries
    """
    folgeposition_list = []
    
    # Look for folgeposition in grundtextnr array
    grundtextnr_list = json_body.get("grundtextnr", [])
    if isinstance(grundtextnr_list, dict):
        grundtextnr_list = [grundtextnr_list]
    
    for grundtext_item in grundtextnr_list:
        if isinstance(grundtext_item, dict):
            folgepositions = grundtext_item.get("folgeposition", [])
            if isinstance(folgepositions, dict):
                folgepositions = [folgepositions]
            
            for folgepos in folgepositions:
                if isinstance(folgepos, dict):
                    folgeposition_list.append(folgepos)
    
    return folgeposition_list

def create_custom_position(nr: str, json_body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a custom position in the regulations table from nr and JSON body.
    First checks if grundtext exists, and if not, creates separate records for grundtext and folgeposition.
    
    Args:
        nr: The position number/identifier (e.g., "001101G")
        json_body: JSON structure containing position data
        
    Returns:
        Dict containing the result of the operation with success status and data
    """
    try:
        print(f"🔧 Creating custom position with nr: {nr}")
        
        # First step: Check if grundtext already exists using the nr
        existence_check = check_nr_existence(nr)
        
        # Check if exact nr already exists
        if existence_check.get("exists", False):
            return {
                "success": False,
                "error": f"Position with nr '{nr}' already exists",
                "data": None
            }
        
        # Check if grundtext exists - if it does, we'll skip creating grundtext and only create folgeposition
        grundtext_already_exists = existence_check.get("grundtext_exists", False)
        if grundtext_already_exists:
            print(f"📋 Grundtext already exists for nr '{nr}', will only create folgeposition records")
        
        # Parse the nr to extract position components (e.g., "001101G" -> lg="00", ulg="11", gt="01", pos="G")
        lg_nr = None
        ulg_nr = None
        grundtext_nr = None
        position_nr = None
        
        if len(nr) >= 6:
            lg_nr = nr[0:2]  # First 2 digits
            ulg_nr = nr[2:4]  # Next 2 digits
            grundtext_nr = nr[4:6]  # Next 2 digits
            if len(nr) > 6:
                position_nr = nr[6:]  # Remaining characters (letter)
            
            print(f"📋 Parsed nr '{nr}': lg_nr={lg_nr}, ulg_nr={ulg_nr}, grundtext_nr={grundtext_nr}, position_nr={position_nr}")
        
        # Extract grundtext and folgeposition data
        grundtext_data = _extract_grundtext_data(json_body)
        folgeposition_data = _extract_folgeposition_data(json_body)
        
        created_records = []
        
        # Create Grundtext record only if grundtext data exists AND grundtext doesn't already exist
        if grundtext_data and grundtext_data.get("grundtext") and not grundtext_already_exists:
            print(f"📝 Creating Grundtext record...")
            
            # Create searchable text for grundtext
            grundtext_searchable_parts = [
                f"LG: {lg_nr}",
                f"ULG: {ulg_nr}",
                f"Grundtext: {grundtext_nr}",
                "Dokumententyp: Grundtext"
            ]
            
            grundtext_text = _flatten_text_from_json(grundtext_data.get("grundtext", {}))
            if grundtext_text:
                grundtext_searchable_parts.append(f"Grundtext Inhalt: {grundtext_text}")
            
            grundtext_searchable_text = " ".join(grundtext_searchable_parts)
            
            # Generate embedding for grundtext
            grundtext_embedding = _get_embedding(grundtext_searchable_text)
            if not grundtext_embedding:
                return {
                    "success": False,
                    "error": "Failed to generate embedding for grundtext",
                    "data": None
                }
            
            # Prepare grundtext document
            grundtext_document = {
                "entity_type": "Grundtext",
                "lg_nr": lg_nr,
                "ulg_nr": ulg_nr,
                "grundtext_nr": grundtext_nr,
                "position_nr": None,  # Grundtext doesn't have position_nr
                "searchable_text": grundtext_searchable_text,
                "entity_json": _preserve_json_order(grundtext_data),
                "embedding": grundtext_embedding,
                "full_nr": f"{lg_nr}{ulg_nr}{grundtext_nr}",  # Grundtext nr without position suffix
                "short_text": "Grundtext",
                "position_type": "custom"
            }
            
            # Insert grundtext record
            grundtext_response = get_supabase_client().table("regulations").insert(grundtext_document).execute()
            
            if grundtext_response.data:
                created_records.append({"type": "Grundtext", "data": grundtext_response.data[0]})
                print(f"✅ Successfully created Grundtext record")
            else:
                return {
                    "success": False,
                    "error": "Failed to insert grundtext into database",
                    "data": None
                }
        elif grundtext_already_exists:
            print(f"⏭️ Skipping Grundtext creation - already exists for nr '{nr}'")
        
        # Create Folgeposition records
        for folgepos in folgeposition_data:
            print(f"📝 Creating Folgeposition record...")
            
            # Extract position details
            ftnr = folgepos.get("@_ftnr", "")
            pos_eigenschaften = folgepos.get("pos-eigenschaften", {})
            stichwort = pos_eigenschaften.get("stichwort", "")
            langtext = pos_eigenschaften.get("langtext", {})
            
            # Create searchable text for folgeposition
            folgepos_searchable_parts = [
                f"LG: {lg_nr}",
                f"ULG: {ulg_nr}",
                f"Grundtext: {grundtext_nr}",
                "Dokumententyp: Folgeposition"
            ]
            
            if ftnr:
                folgepos_searchable_parts.append(f"Position: {ftnr}")
            if stichwort:
                folgepos_searchable_parts.append(f"Stichwort: {stichwort}")
            
            langtext_content = _flatten_text_from_json(langtext)
            if langtext_content:
                folgepos_searchable_parts.append(f"Beschreibung: {langtext_content}")
            
            folgepos_searchable_text = " ".join(folgepos_searchable_parts)
            
            # Generate embedding for folgeposition
            folgepos_embedding = _get_embedding(folgepos_searchable_text)
            if not folgepos_embedding:
                return {
                    "success": False,
                    "error": f"Failed to generate embedding for folgeposition {ftnr}",
                    "data": None
                }
            
            # Prepare folgeposition document
            folgepos_document = {
                "entity_type": "Folgeposition",
                "lg_nr": lg_nr,
                "ulg_nr": ulg_nr,
                "grundtext_nr": grundtext_nr,
                "position_nr": ftnr or position_nr,  # Use ftnr from JSON or parsed position_nr
                "searchable_text": folgepos_searchable_text,
                "entity_json": _preserve_json_order(folgepos),
                "embedding": folgepos_embedding,
                "full_nr": f"{lg_nr}{ulg_nr}{grundtext_nr}{ftnr}" if ftnr else nr,
                "short_text": stichwort or "Folgeposition",
                "position_type": "custom"
            }
            
            # Insert folgeposition record
            folgepos_response = get_supabase_client().table("regulations").insert(folgepos_document).execute()
            
            if folgepos_response.data:
                created_records.append({"type": "Folgeposition", "data": folgepos_response.data[0]})
                print(f"✅ Successfully created Folgeposition record with ftnr: {ftnr}")
            else:
                return {
                    "success": False,
                    "error": f"Failed to insert folgeposition {ftnr} into database",
                    "data": None
                }
        
        print(f"✅ Successfully created {len(created_records)} custom records for nr: {nr}")
        return {
            "success": True,
            "error": None,
            "data": created_records
        }
            
    except Exception as e:
        print(f"❌ Error creating custom position {nr}: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": None
        }

def get_all_custom_positions(
    entity_type: Optional[str] = None,
    lg_nr: Optional[str] = None,
    ulg_nr: Optional[str] = None,
    grundtext_nr: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch all custom positions from the regulations table.
    Optionally filter by entity_type, lg_nr, ulg_nr, or grundtext_nr.
    
    Args:
        entity_type: Optional filter by entity type (e.g., "Grundtext", "Folgeposition")
        lg_nr: Optional filter by LG number
        ulg_nr: Optional filter by ULG number
        grundtext_nr: Optional filter by Grundtext number
        
    Returns:
        Dict containing:
        - success: boolean
        - data: List of custom positions
        - count: Number of custom positions found
        - error: Error message if any
    """
    try:
        print(f"🔍 Fetching custom positions with filters: entity_type={entity_type}, lg_nr={lg_nr}, ulg_nr={ulg_nr}, grundtext_nr={grundtext_nr}")
        
        # Start building the query - select all custom positions
        query = get_supabase_client().table("regulations").select(
            "id, entity_type, lg_nr, ulg_nr, grundtext_nr, position_nr, "
            "searchable_text, entity_json, full_nr, short_text, position_type, created_at"
        ).eq("position_type", "custom")
        
        # Apply optional filters
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if lg_nr:
            query = query.eq("lg_nr", lg_nr)
        if ulg_nr:
            query = query.eq("ulg_nr", ulg_nr)
        if grundtext_nr:
            query = query.eq("grundtext_nr", grundtext_nr)
        
        # Order by created_at descending (newest first)
        query = query.order("created_at", desc=True)
        
        # Execute query
        response = query.execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} custom positions")
            return {
                "success": True,
                "data": response.data,
                "count": len(response.data),
                "error": None
            }
        else:
            print(f"📭 No custom positions found")
            return {
                "success": True,
                "data": [],
                "count": 0,
                "error": None
            }
            
    except Exception as e:
        print(f"❌ Error fetching custom positions: {e}")
        return {
            "success": False,
            "data": [],
            "count": 0,
            "error": str(e)
        }

def delete_custom_position(position_id: int) -> Dict[str, Any]:
    """
    Delete a custom position from the regulations table by its ID.
    
    Args:
        position_id: The ID of the position to delete
        
    Returns:
        Dict containing:
        - success: boolean
        - message: Success or error message
        - error: Error message if any
    """
    try:
        print(f"🗑️ Deleting custom position with ID: {position_id}")
        
        # First, check if the position exists and is a custom position
        check_response = get_supabase_client().table("regulations").select(
            "id, full_nr, position_type, entity_type"
        ).eq("id", position_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            return {
                "success": False,
                "message": f"Position with ID {position_id} not found",
                "error": "Position not found"
            }
        
        position = check_response.data[0]
        
        # Verify it's a custom position
        if position.get("position_type") != "custom":
            return {
                "success": False,
                "message": f"Position {position.get('full_nr')} is not a custom position and cannot be deleted",
                "error": "Not a custom position"
            }
        
        # Delete the position
        delete_response = get_supabase_client().table("regulations").delete().eq(
            "id", position_id
        ).execute()
        
        if delete_response.data:
            print(f"✅ Successfully deleted custom position ID: {position_id}, full_nr: {position.get('full_nr')}")
            return {
                "success": True,
                "message": f"Custom position '{position.get('full_nr')}' deleted successfully",
                "error": None
            }
        else:
            return {
                "success": False,
                "message": "Failed to delete position from database",
                "error": "Delete operation failed"
            }
            
    except Exception as e:
        print(f"❌ Error deleting custom position {position_id}: {e}")
        return {
            "success": False,
            "message": f"Error deleting custom position: {str(e)}",
            "error": str(e)
        }
