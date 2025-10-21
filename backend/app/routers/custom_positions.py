from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..services.custom_position import check_nr_existence, create_custom_position, get_all_custom_positions, delete_custom_position

router = APIRouter(
    prefix="/custom_positions",
    tags=["custom_positions"],
    responses={404: {"description": "Not found"}},
)

class CreateCustomPositionRequest(BaseModel):
    nr: str
    json_body: Dict[str, Any]

@router.get("/check_nr_existence/{nr}")
def check_nr_exists_endpoint(nr: str):
    """
    Endpoint to check if a given 'nr' exists in the 'full_nr' column of the regulations table.
    """
    if not nr:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NR cannot be empty")
    
    try:
        exists = check_nr_existence(nr)
        return {"nr": nr, "exists": exists}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error checking nr existence: {str(e)}")

@router.post("/create")
def create_custom_position_endpoint(request: CreateCustomPositionRequest):
    """
    Endpoint to create a custom position in the regulations table.
    
    Args:
        request: Contains nr (position number) and json_body (position data)
    
    Returns:
        Success response with created position data or error details
    """
    if not request.nr:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NR cannot be empty")
    
    if not request.json_body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="JSON body cannot be empty")
    
    try:
        result = create_custom_position(request.nr, request.json_body)
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Custom position '{request.nr}' created successfully",
                "data": result["data"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating custom position: {str(e)}"
        )

@router.get("/list")
def get_all_custom_positions_endpoint(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g., 'Grundtext', 'Folgeposition')"),
    lg_nr: Optional[str] = Query(None, description="Filter by LG number"),
    ulg_nr: Optional[str] = Query(None, description="Filter by ULG number"),
    grundtext_nr: Optional[str] = Query(None, description="Filter by Grundtext number")
):
    """
    Endpoint to fetch all custom positions from the regulations table.
    Optionally filter by entity_type, lg_nr, ulg_nr, or grundtext_nr.
    
    Query Parameters:
        - entity_type: Filter by entity type (e.g., "Grundtext", "Folgeposition")
        - lg_nr: Filter by LG number (e.g., "00")
        - ulg_nr: Filter by ULG number (e.g., "11")
        - grundtext_nr: Filter by Grundtext number (e.g., "01")
    
    Returns:
        List of custom positions with their details
    """
    try:
        result = get_all_custom_positions(
            entity_type=entity_type,
            lg_nr=lg_nr,
            ulg_nr=ulg_nr,
            grundtext_nr=grundtext_nr
        )
        
        if result["success"]:
            return {
                "success": True,
                "data": result["data"],
                "count": result["count"],
                "filters": {
                    "entity_type": entity_type,
                    "lg_nr": lg_nr,
                    "ulg_nr": ulg_nr,
                    "grundtext_nr": grundtext_nr
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching custom positions: {str(e)}"
        )

@router.delete("/{position_id}")
def delete_custom_position_endpoint(position_id: int):
    """
    Endpoint to delete a custom position from the regulations table.
    Only custom positions (position_type='custom') can be deleted.
    
    Args:
        position_id: The ID of the position to delete
    
    Returns:
        Success response with deletion confirmation or error details
    """
    try:
        result = delete_custom_position(position_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"]
            }
        else:
            # Determine appropriate status code based on error
            if result["error"] == "Position not found":
                status_code = status.HTTP_404_NOT_FOUND
            elif result["error"] == "Not a custom position":
                status_code = status.HTTP_403_FORBIDDEN
            else:
                status_code = status.HTTP_400_BAD_REQUEST
                
            raise HTTPException(
                status_code=status_code,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting custom position: {str(e)}"
        )


