"""
Data Processing API Router

This module contains all API endpoints related to data processing operations.
Handles enhanced data processing, data storage, search, and Gemini-powered query analysis.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from ..enhanced_services import process_and_store_data
from ..services.data_services import (
    process_and_store_data as data_store_service,
    find_similar_regulations as data_search_service,
    analyze_query_with_gemini
)

router = APIRouter(
    prefix="/data",
    tags=["data-processing"],
    responses={404: {"description": "Not found"}},
)

@router.post("/process-enhanced")
async def process_enhanced_data_endpoint(
    lg_list: List[Dict[str, Any]] = Body(...)
):
    """
    Enhanced endpoint to process a list of LG objects with improved text extraction,
    better error handling, and comprehensive entity processing including Grundtext.
    
    Expects a JSON payload that is a list of LG objects directly.
    """
    try:
        if not lg_list or not isinstance(lg_list, list):
            raise HTTPException(
                status_code=400,
                detail="Payload must be a non-empty list of LG objects"
            )
        
        # Process the data using the enhanced service
        result = process_and_store_data(lg_list)
        
        if result["status"] == "success":
            return {
                "message": "Enhanced data processing completed successfully.",
                "stored_documents": result.get("stored_documents", 0),
                "details": result.get("message", "")
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Processing failed: {result.get('message', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing enhanced data: {str(e)}")

@router.post("/store")
async def data_store_endpoint(
    lg_list: List[Dict[str, Any]] = Body(...)
):
    """
    Data store endpoint to process and store LG data using data_services.
    Processes a list of LG objects and stores them with embeddings in the database.
    """
    try:
        if not lg_list or not isinstance(lg_list, list):
            raise HTTPException(
                status_code=400,
                detail="Payload must be a non-empty list of LG objects"
            )
        
        # Process and store the data using data_services
        data_store_service(lg_list)
        
        return {
            "message": "Data processing and storage completed successfully.",
            "processed_items": len(lg_list)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing data: {str(e)}")

@router.post("/search")
async def data_search_endpoint(
    query: str = Body(..., embed=True),
    threshold: float = Body(0.7, embed=True),
    count: int = Body(10, embed=True)
):
    """
    Data search endpoint to find similar regulations using data_services.
    Performs semantic search using embeddings to find relevant regulations.
    """
    try:
        if not query or not query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
        # Search for similar regulations using data_services
        results = data_search_service(query.strip(), threshold, count)
        
        return {
            "query": query,
            "threshold": threshold,
            "count": count,
            "results": results,
            "total_results": len(results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching data: {str(e)}")

@router.post("/gemini-query")
async def gemini_query_endpoint(
    request_body: dict = Body(...)
):
    """
    Gemini-powered query analysis endpoint.
    Analyzes natural language queries using Gemini Flash 2.5 and converts them to structured Supabase queries.
    
    Example queries:
    - "i want to build lg 00"
    - "show me ulg 01.02"
    - "find grundtext for lg 03"
    - "get all positions in ulg 02.01"
    """
    print(f"DEBUG: Received request_body: {request_body}")
    print(f"DEBUG: Request body type: {type(request_body)}")
    
    try:
        # Extract query from request body
        if isinstance(request_body, dict) and 'query' in request_body:
            query = request_body['query']
        else:
            raise HTTPException(status_code=400, detail="Request body must contain 'query' field")
        
        print(f"DEBUG: Extracted query: '{query}'")
        print(f"DEBUG: Query type: {type(query)}")
        
        if not query or not query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
        # Analyze query using Gemini and execute structured search
        results = analyze_query_with_gemini(query.strip())
        
        return {
            "query": query,
            "results": results,
            "total_results": len(results),
            "message": f"Found {len(results)} regulations matching your query"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing query with Gemini: {str(e)}")