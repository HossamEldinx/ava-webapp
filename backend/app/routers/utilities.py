"""
Utilities API Router

This module contains utility API endpoints for various helper functions.
Handles entity filtering and configuration data retrieval.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from ..services.data_services import get_onlv_empty_json, unified_regulation_search
from ..services.entity import filter_json_entity, filter_json_by_full_nr, filter_lg_by_position_numbers, fetch_and_filter_lg_by_position_numbers_v2

router = APIRouter(
    prefix="/utils",
    tags=["utilities"],
    responses={404: {"description": "Not found"}},
)

@router.get("/onlv-empty-json")
async def get_onlv_empty_json_endpoint(
    project_id: Optional[str] = None,
    boq_id: Optional[str] = None
):
    """
    Endpoint to return the content of the onlv_empty.json file.
    Returns JSON with preserved key order and populated with project/BoQ data.
    
    Args:
        project_id: Optional UUID of the project to populate project-specific data
        boq_id: Optional UUID of the BoQ to populate BoQ-specific data (takes priority over project data)
    
    Examples:
        GET /utils/onlv-empty-json
        GET /utils/onlv-empty-json?project_id=123e4567-e89b-12d3-a456-426614174000
        GET /utils/onlv-empty-json?boq_id=456e7890-e89b-12d3-a456-426614174000
        GET /utils/onlv-empty-json?project_id=123e4567-e89b-12d3-a456-426614174000&boq_id=456e7890-e89b-12d3-a456-426614174000
    """
    try:
        json_content = get_onlv_empty_json(project_id=project_id, boq_id=boq_id)
        if not json_content:
            raise HTTPException(status_code=500, detail="Could not load onlv_empty.json content.")
        
        # FastAPI will automatically serialize OrderedDict to JSON while preserving order
        return json_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving onlv_empty.json: {str(e)}")

@router.post("/filter-entity")
async def filter_entity_endpoint(
    request_body: dict = Body(...)
):
    """
    Endpoint to filter JSON entity data to keep only a specific sub-entity.
    
    Filters a JSON object (LG, ULG, or Grundtext) to keep only a specific sub-entity
    based on the target entity type and target value, with optional parameters for
    more precise filtering within specific ULG/Grundtext.
    
    Request body should contain:
    - json_input (dict): The input JSON data (LG, ULG, or Grundtext level)
    - target_entity_type (str): Type of entity to filter ("ULG", "Grundtext", "Folgeposition")
    - target_value (str|int): The 'nr' (for ULG, Grundtext) or 'ftnr' (for Folgeposition) value to keep
    - target_ulg_nr (str|int, optional): The 'nr' of the ULG to search within
    - target_grundtext_nr (str|int, optional): The 'nr' of the Grundtext to search within
    
    Example requests:
    1. Filter ULG from LG:
    {
        "json_input": {...},
        "target_entity_type": "ULG",
        "target_value": "01.02"
    }
    
    2. Filter Folgeposition from LG with specific ULG and Grundtext:
    {
        "json_input": {...},
        "target_entity_type": "Folgeposition",
        "target_value": "001",
        "target_ulg_nr": "01.02",
        "target_grundtext_nr": "010"
    }
    """
    try:
        # Validate required fields
        required_fields = ["json_input", "target_entity_type", "target_value"]
        for field in required_fields:
            if field not in request_body:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        json_input = request_body["json_input"]
        target_entity_type = request_body["target_entity_type"]
        target_value = request_body["target_value"]
        
        # Optional parameters
        target_ulg_nr = request_body.get("target_ulg_nr")
        target_grundtext_nr = request_body.get("target_grundtext_nr")
        
        # Validate json_input is a dictionary
        if not isinstance(json_input, dict):
            raise HTTPException(
                status_code=400,
                detail="json_input must be a dictionary"
            )
        
        # Validate target_entity_type
        valid_entity_types = ["ULG", "Grundtext", "Folgeposition"]
        if target_entity_type not in valid_entity_types:
            raise HTTPException(
                status_code=400,
                detail=f"target_entity_type must be one of: {', '.join(valid_entity_types)}"
            )
        
        # Validate target_value (can be string or int)
        if not isinstance(target_value, (str, int)):
            raise HTTPException(
                status_code=400,
                detail="target_value must be a string or integer"
            )
        
        # Validate optional parameters if provided
        if target_ulg_nr is not None and not isinstance(target_ulg_nr, (str, int)):
            raise HTTPException(
                status_code=400,
                detail="target_ulg_nr must be a string or integer"
            )
        
        if target_grundtext_nr is not None and not isinstance(target_grundtext_nr, (str, int)):
            raise HTTPException(
                status_code=400,
                detail="target_grundtext_nr must be a string or integer"
            )
        
        # Call the filter function with all parameters
        filtered_data = filter_json_entity(
            json_input=json_input,
            target_entity_type=target_entity_type,
            target_value=target_value,
            target_ulg_nr=target_ulg_nr,
            target_grundtext_nr=target_grundtext_nr
        )
        
        # Build response message
        message_parts = [f"Successfully filtered {target_entity_type} with value '{target_value}'"]
        if target_ulg_nr is not None:
            message_parts.append(f"within ULG '{target_ulg_nr}'")
        if target_grundtext_nr is not None:
            message_parts.append(f"within Grundtext '{target_grundtext_nr}'")
        
        return {
            "message": " ".join(message_parts),
            "target_entity_type": target_entity_type,
            "target_value": target_value,
            "target_ulg_nr": target_ulg_nr,
            "target_grundtext_nr": target_grundtext_nr,
            "filtered_data": filtered_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error filtering entity: {str(e)}"
        )

@router.post("/unified-search")
async def unified_search_endpoint(
    query_body: Dict[str, str] = Body(..., example={"query": "lg 00"})
):
    """
    Endpoint for unified regulation search, handling both regulation numbers and text queries.
    
    Args:
        query_body: A dictionary containing the 'query' string.
    
    Returns:
        Dict with search results and metadata from unified_regulation_search.
    """
    query = query_body.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required.")
    
    try:
        search_result = unified_regulation_search(query)
        return search_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during unified search: {str(e)}")

@router.post("/filter-full-nr")
async def filter_full_nr_endpoint(
    request_body: dict = Body(...)
):
    """
    Endpoint to filter JSON structure to retain only specified positions by full number.
    
    Filters a JSON structure (LG or ULG) to retain only specified positions.
    The function identifies whether a number refers to a 'Grundtext' (e.g., '01')
    or a specific 'Folgeposition' (e.g., '01A').
    
    Request body should contain:
    - json_input (dict): The input JSON data (LG or ULG level)
    - full_nrs_to_keep (list[str]): List of full position numbers to retain (e.g., ['001101', '001103A'])
    
    Filtering logic:
    - If an item is '01', it marks the entire Grundtext '01' for retention with ALL Folgepositions
    - If an item is '01A', it marks only the Folgeposition 'A' within Grundtext '01' for retention
    - ULGs that have no matching Grundtexts after filtering are removed
    
    Example requests:
    1. Keep entire Grundtexts and specific Folgepositions:
    {
        "json_input": {...},
        "full_nrs_to_keep": ["001101", "001103A"]
    }
    
    2. Keep only specific Folgepositions:
    {
        "json_input": {...},
        "full_nrs_to_keep": ["001101A", "001101B", "001103C"]
    }
    """
    try:
        # Validate required fields
        required_fields = ["json_input", "full_nrs_to_keep"]
        for field in required_fields:
            if field not in request_body:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        json_input = request_body["json_input"]
        full_nrs_to_keep = request_body["full_nrs_to_keep"]
        
        # Validate json_input is a dictionary
        if not isinstance(json_input, dict):
            raise HTTPException(
                status_code=400,
                detail="json_input must be a dictionary"
            )
        
        # Validate full_nrs_to_keep is a list
        if not isinstance(full_nrs_to_keep, list):
            raise HTTPException(
                status_code=400,
                detail="full_nrs_to_keep must be a list"
            )
        
        # Validate all full numbers are strings
        if not all(isinstance(pos, str) for pos in full_nrs_to_keep):
            raise HTTPException(
                status_code=400,
                detail="All full numbers in full_nrs_to_keep must be strings"
            )
        
        # Validate full numbers are not empty
        if not full_nrs_to_keep:
            raise HTTPException(
                status_code=400,
                detail="full_nrs_to_keep cannot be empty"
            )
        
        # Call the filter function
        filtered_data = filter_json_by_full_nr(
            json_input=json_input,
            full_nrs_to_keep=full_nrs_to_keep
        )
        
        return {
            "message": f"Successfully filtered JSON to retain {len(full_nrs_to_keep)} specified full numbers",
            "full_nrs_to_keep": full_nrs_to_keep,
            "full_nrs_count": len(full_nrs_to_keep),
            "filtered_data": filtered_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error filtering positions: {str(e)}"
        )

@router.post("/filter-lg-positions")
async def filter_lg_positions_endpoint(
    request_body: dict = Body(...)
):
    """
    Endpoint to filter LG JSON data by position numbers (simplified interface).
    
    This is a user-friendly wrapper around the filter-full-nr endpoint that provides
    a cleaner interface specifically for filtering LG data by position numbers.
    
    Request body should contain:
    - lg_json_data (dict): The LG JSON data to filter
    - position_numbers (list[str]): List of position numbers to keep (e.g., ["001101", "001103A"])
    
    Position number format:
    - LLGGTT (6 digits): Keep entire Grundtext with all Folgepositions
    - LLGGTTF (6 digits + 1 letter): Keep only specific Folgeposition
    
    Where:
    - LL = LG number (2 digits)
    - GG = ULG number (2 digits)
    - TT = Grundtext number (2 digits)
    - F = Folgeposition letter (optional)
    
    Example request:
    {
        "lg_json_data": {...},
        "position_numbers": ["001101", "001103A"]
    }
    
    This will keep:
    - ULG 11, Grundtext 01 with ALL Folgepositions
    - ULG 11, Grundtext 03 with ONLY Folgeposition A
    """
    try:
        # Validate required fields
        required_fields = ["lg_json_data", "position_numbers"]
        for field in required_fields:
            if field not in request_body:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        lg_json_data = request_body["lg_json_data"]
        position_numbers = request_body["position_numbers"]
        
        # Validate lg_json_data is a dictionary
        if not isinstance(lg_json_data, dict):
            raise HTTPException(
                status_code=400,
                detail="lg_json_data must be a dictionary"
            )
        
        # Validate position_numbers is a list
        if not isinstance(position_numbers, list):
            raise HTTPException(
                status_code=400,
                detail="position_numbers must be a list"
            )
        
        # Validate all position numbers are strings
        if not all(isinstance(pos, str) for pos in position_numbers):
            raise HTTPException(
                status_code=400,
                detail="All position numbers must be strings"
            )
        
        # Validate position numbers are not empty
        if not position_numbers:
            raise HTTPException(
                status_code=400,
                detail="position_numbers cannot be empty"
            )
        
        # Call the filter function
        filtered_data = filter_lg_by_position_numbers(
            lg_json_data=lg_json_data,
            position_numbers=position_numbers
        )
        
        return {
            "message": f"Successfully filtered LG data to retain {len(position_numbers)} specified positions",
            "position_numbers": position_numbers,
            "position_count": len(position_numbers),
            "filtered_data": filtered_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error filtering LG positions: {str(e)}"
        )

@router.post("/fetch-lg-positions")
async def fetch_lg_positions_endpoint(
    request_body: dict = Body(...)
):
    """
    Endpoint to fetch LG data from Supabase database and filter by position numbers.
    
    This endpoint:
    1. Takes a list of position numbers (e.g., ["001101", "001103A"])
    2. Extracts unique LG numbers from them
    3. Fetches complete LG data from Supabase (once per LG)
    4. Filters the result to keep only the specified positions
    
    Request body should contain:
    - position_numbers (list[str]): List of position numbers to keep (e.g., ["001101", "001103A"])
    
    Position number format:
    - LLGGTT (6 digits): Keep entire Grundtext with all Folgepositions
    - LLGGTTF (6 digits + 1 letter): Keep only specific Folgeposition
    
    Where:
    - LL = LG number (2 digits)
    - GG = ULG number (2 digits)
    - TT = Grundtext number (2 digits)
    - F = Folgeposition letter (optional)
    
    Example request:
    {
        "position_numbers": ["001101", "001103A"]
    }
    
    This will:
    1. Extract LG "00" from both position numbers
    2. Fetch LG "00" data from Supabase once
    3. Filter to keep only:
       - ULG 11, Grundtext 01 with ALL Folgepositions
       - ULG 11, Grundtext 03 with ONLY Folgeposition A
    """
    try:
        # Validate required fields
        if "position_numbers" not in request_body:
            raise HTTPException(
                status_code=400,
                detail="Missing required field: position_numbers"
            )
        
        position_numbers = request_body["position_numbers"]
        
        # Validate position_numbers is a list
        if not isinstance(position_numbers, list):
            raise HTTPException(
                status_code=400,
                detail="position_numbers must be a list"
            )
        
        # Validate all position numbers are strings
        if not all(isinstance(pos, str) for pos in position_numbers):
            raise HTTPException(
                status_code=400,
                detail="All position numbers must be strings"
            )
        
        # Validate position numbers are not empty
        if not position_numbers:
            raise HTTPException(
                status_code=400,
                detail="position_numbers cannot be empty"
            )
        
        # Call the service function
        filtered_data = fetch_and_filter_lg_by_position_numbers_v2(position_numbers)
        
        return {
            "message": f"Successfully fetched and filtered LG data for {len(position_numbers)} specified positions",
            "position_numbers": position_numbers,
            "position_count": len(position_numbers),
            "filtered_data": filtered_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching and filtering LG positions: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Simple health check endpoint to verify the API is running.
    """
    return {"status": "API is running", "service": "utilities"}

@router.get("/test-boq-data")
async def test_boq_data(boq_id: str):
    """
    Test endpoint to check BoQ data retrieval.
    """
    try:
        from ..services.data_services import get_boq_by_id
        boq_data = get_boq_by_id(boq_id)
        return {
            "boq_id": boq_id,
            "boq_data": boq_data,
            "message": "BoQ data retrieved successfully"
        }
    except Exception as e:
        return {
            "boq_id": boq_id,
            "error": str(e),
            "message": "Error retrieving BoQ data"
        }

@router.get("/test-onlv-generation")
async def test_onlv_generation(boq_id: str, project_id: Optional[str] = None):
    """
    Test endpoint to check ONLV generation with debug info.
    """
    try:
        print(f"🧪 Testing ONLV generation with boq_id={boq_id}, project_id={project_id}")
        json_content = get_onlv_empty_json(project_id=project_id, boq_id=boq_id)
        
        # Extract key values for debugging
        debug_info = {}
        if json_content and "onlv" in json_content and "ausschreibungs-lv" in json_content["onlv"] and "kenndaten" in json_content["onlv"]["ausschreibungs-lv"]:
            kenndaten = json_content["onlv"]["ausschreibungs-lv"]["kenndaten"]
            debug_info = {
                "lvcode": kenndaten.get("lvcode"),
                "vorhaben": kenndaten.get("vorhaben"),
                "lvbezeichnung": kenndaten.get("lvbezeichnung"),
                "dateiname": json_content["onlv"]["metadaten"].get("dateiname") if "metadaten" in json_content["onlv"] else None
            }
        
        return {
            "boq_id": boq_id,
            "project_id": project_id,
            "debug_info": debug_info,
            "has_onlv_data": bool(json_content),
            "message": "ONLV generation test completed"
        }
    except Exception as e:
        return {
            "boq_id": boq_id,
            "project_id": project_id,
            "error": str(e),
            "message": "Error testing ONLV generation"
        }