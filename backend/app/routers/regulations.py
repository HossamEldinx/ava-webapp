"""
Regulations API Router

This module contains all API endpoints related to regulation management.
Handles regulation processing, storage, and retrieval operations.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from ..models import SearchQuery, SearchResponse, SearchResult, CustomContentRequest, CustomContentResponse
from ..services_fixed import (
    process_and_store_regulations,
    get_regulation_by_id,
    get_regulations_by_lv_type,
    get_all_regulations
)
from ..services.data_services import analyze_query_with_gemini, find_regulation_by_number, unified_regulation_search
from ..services.entity import add_custom_content_to_lg

router = APIRouter(
    prefix="/regulations",
    tags=["regulations"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload")
async def upload_regulations(
    payload: Dict[str, Any] = Body(...),
    lv_type: str = "onlv"
):
    """
    Endpoint to receive a large JSON object of regulations,
    process it, generate embeddings, and store everything in Supabase.
    """
    try:
        # This can be a long-running process. For production, you'd use a
        # background task (e.g., with Celery or FastAPI's BackgroundTasks).
        process_and_store_regulations(payload, lv_type)
        return {
            "message": "Regulations are being processed and stored.",
            "lv_type": lv_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_regulations(query: SearchQuery):
    """
    Endpoint to perform intelligent semantic search using Gemini AI.
    Takes a text query and returns the most relevant regulations with JSON response.
    """
    if not query.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        # Use the new analyze_query_with_gemini function
        result = analyze_query_with_gemini(query.query)
        
        # Handle the case where no results are found
        if not result:
            return {
                "results": {
                    "results": [],
                    "json_response": None
                },
                "total_results": 0
            }
        
        # If result is a list (old format), convert to new format
        if isinstance(result, list):
            return {
                "results": {
                    "results": result,
                    "json_response": None
                },
                "total_results": len(result)
            }
        
        # If result is a dict with results and json_response (new format)
        if isinstance(result, dict) and "results" in result:
            results_list = result.get("results", [])
            json_response = result.get("json_response")
            
            return {
                "results": {
                    "results": results_list,
                    "json_response": json_response
                },
                "total_results": len(results_list)
            }
        
        # Fallback case
        return {
            "results": {
                "results": [],
                "json_response": None
            },
            "total_results": 0
        }
        
    except Exception as e:
        print(f"Error in search_regulations: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during search: {e}")

@router.get("/{regulation_id}")
async def get_regulation(regulation_id: int):
    """
    Endpoint to retrieve a specific regulation by its ID.
    """
    try:
        regulation = get_regulation_by_id(regulation_id)
        if not regulation:
            raise HTTPException(status_code=404, detail=f"Regulation with ID {regulation_id} not found.")
        return regulation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving regulation: {e}")

@router.get("/by-type/{lv_type}")
async def get_regulations_by_type(lv_type: str, limit: int = 50):
    """
    Endpoint to retrieve regulations filtered by lv_type.
    """
    try:
        regulations = get_regulations_by_lv_type(lv_type, limit)
        return {
            "lv_type": lv_type,
            "count": len(regulations),
            "regulations": regulations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving regulations: {e}")

@router.get("/by-number/{regulation_nr}")
async def get_regulation_by_number(regulation_nr: str):
    """
    Endpoint to find regulations by parsing regulation number format.
    
    Format: XXYYZZ[L] where:
    - XX: lg_nr (first two digits)
    - YY: ulg_nr (second two digits)
    - ZZ: grundtext_nr (third two digits)
    - L: position_nr (optional letter at end)
    
    Examples:
    - "003901C" -> lg_nr=00, ulg_nr=39, grundtext_nr=01, position_nr=C
    - "003502" -> lg_nr=00, ulg_nr=35, grundtext_nr=02, position_nr=None
    """
    try:
        regulations = find_regulation_by_number(regulation_nr)
        
        if not regulations:
            raise HTTPException(
                status_code=404,
                detail=f"No regulations found for number: {regulation_nr}"
            )
        
        return {
            "regulation_number": regulation_nr,
            "count": len(regulations),
            "regulations": regulations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while searching for regulation number {regulation_nr}: {e}"
        )

@router.get("/search-unified/{query}")
async def unified_search(query: str):
    """
    Unified search endpoint that automatically detects if the query is a regulation number or text.
    
    - If query matches format XXYYZZ[L] (6 digits + optional letter), performs number-based search
    - Otherwise, performs AI-powered text search using Gemini
    
    Examples:
    - "003901C" -> Number search: lg_nr=00, ulg_nr=39, grundtext_nr=01, position_nr=C
    - "003502" -> Number search: lg_nr=00, ulg_nr=35, grundtext_nr=02
    - "i want to build lg 00" -> Text search using AI analysis
    - "construction materials" -> Text search using AI analysis
    """
    try:
        result = unified_regulation_search(query)
        
        if result["total_results"] == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No regulations found for query: {query}"
            )
        
        return {
            "query": query,
            "search_type": result["search_type"],
            "total_results": result["total_results"],
            "results": result["results"],
            "json_response": result["json_response"],
            "parsed_components": result.get("parsed_components")  # Only present for number searches
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during unified search for '{query}': {e}"
        )

@router.get("/")
async def get_all_regulations_endpoint(limit: int = 100):
    """
    Endpoint to retrieve all regulations with optional limit.
    """
    try:
        regulations = get_all_regulations(limit)
        return {
            "count": len(regulations),
            "regulations": regulations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving regulations: {e}")

@router.post("/add-custom-content", response_model=CustomContentResponse)
async def add_custom_content_endpoint(request: CustomContentRequest):
    """
    Endpoint to add custom content (grundtext or folgeposition) to an LG structure.
    
    This endpoint allows you to:
    - Add custom grundtext to a specific ULG within an LG
    - Add custom folgeposition to a specific grundtext within an LG
    - Automatically detect content type based on JSON structure
    
    Args:
        request: CustomContentRequest containing:
            - position_nr: Position number like "392505A" (LG=39, ULG=25, GT=05, FP=A)
            - custom_json: The custom JSON content to add
            - content_type: "grundtext", "folgeposition", or "auto" (default)
    
    Returns:
        CustomContentResponse with the complete LG JSON structure including the added content
        
    Examples:
        POST /regulations/add-custom-content
        {
            "position_nr": "392505A",
            "custom_json": {
                "grundtextnr": [{
                    "grundtext": {"langtext": {"p": ["Custom grundtext content"]}},
                    "folgeposition": [...],
                    "@_nr": "05"
                }]
            },
            "content_type": "grundtext"
        }
        
        POST /regulations/add-custom-content
        {
            "position_nr": "392505A",
            "custom_json": {
                "pos-eigenschaften": {
                    "stichwort": "Custom folgeposition",
                    "einheit": "m²",
                    "lvmenge": 100
                },
                "@_ftnr": "A"
            },
            "content_type": "folgeposition"
        }
    """
    try:
        # Validate position number format
        if not request.position_nr:
            raise HTTPException(
                status_code=400,
                detail="Position number cannot be empty"
            )
        
        # Validate custom JSON
        if not request.custom_json:
            raise HTTPException(
                status_code=400,
                detail="Custom JSON content cannot be empty"
            )
        
        # Call the service function
        result = add_custom_content_to_lg(
            position_nr=request.position_nr,
            custom_json=request.custom_json,
            content_type=request.content_type
        )
        
        if not result:
            return CustomContentResponse(
                success=False,
                position_nr=request.position_nr,
                content_type=request.content_type,
                lg_json=None,
                error="Failed to add custom content. Check if the position number exists in the database.",
                message="Custom content addition failed"
            )
        
        # Determine the actual content type used
        actual_content_type = request.content_type
        if request.content_type == "auto":
            if "grundtextnr" in request.custom_json:
                actual_content_type = "grundtext"
            elif "pos-eigenschaften" in request.custom_json and "@_ftnr" in request.custom_json:
                actual_content_type = "folgeposition"
            else:
                actual_content_type = "unknown"
        
        return CustomContentResponse(
            success=True,
            position_nr=request.position_nr,
            content_type=actual_content_type,
            lg_json=result,
            error=None,
            message="Übertragung war erfolgreich"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        print(f"Error in add_custom_content_endpoint: {error_message}")
        
        return CustomContentResponse(
            success=False,
            position_nr=request.position_nr,
            content_type=request.content_type,
            lg_json=None,
            error=error_message,
            message="An error occurred while adding custom content"
        )