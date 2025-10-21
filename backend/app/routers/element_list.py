"""
Element List API Router

This module contains all API endpoints related to element list management.
Provides CRUD operations for elements in the element_list table.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from ..services.element_list_service import (
    create_element,
    get_element_by_id,
    get_elements_by_user_id,
    get_elements_by_type,
    get_elements_by_user_and_type,
    search_elements_by_name,
    get_all_elements,
    update_element,
    delete_element,
    delete_elements_by_user_id,
    get_element_count_by_user,
    get_element_count_by_type,
    get_total_element_count,
    get_unique_element_types,
    check_element_exists,
    get_elements_with_user_info,
    get_elements_with_regulation_counts,
    get_elements_by_user_with_regulation_counts
)

router = APIRouter(
    prefix="/elements",
    tags=["elements"],
    responses={404: {"description": "Not found"}},
)

# CREATE Operations
@router.post("/")
async def create_element_endpoint(
    element_data: Dict[str, Any] = Body(...)
):
    """
    Create a new element.
    
    Required fields:
    - name: Element name (must not be empty)
    - type: Element type (must not be empty)
    - user_id: UUID of the user who owns this element
    
    Optional fields:
    - description: Description of the element
    """
    try:
        # Validate required fields
        required_fields = ["name", "type", "user_id"]
        for field in required_fields:
            if field not in element_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        name = element_data["name"]
        element_type = element_data["type"]
        user_id = element_data["user_id"]
        description = element_data.get("description")
        category_id = element_data.get("category_id")

        # Validate field values
        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Element name cannot be empty")

        if not element_type or not element_type.strip():
            raise HTTPException(status_code=400, detail="Element type cannot be empty")

        if not user_id or not user_id.strip():
            raise HTTPException(status_code=400, detail="User ID cannot be empty")

        result = create_element(name, element_type, user_id, description, category_id)
        
        if result["success"]:
            return {
                "message": "Element created successfully",
                "element": result["data"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating element: {str(e)}")

# READ Operations
@router.get("/{element_id}")
async def get_element_endpoint(element_id: str):
    """
    Retrieve an element by its ID.
    """
    try:
        result = get_element_by_id(element_id)
        
        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving element: {str(e)}")

@router.get("/user/{user_id}")
async def get_elements_by_user_endpoint(
    user_id: str,
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve all elements belonging to a specific user with regulation counts.
    
    Args:
        user_id: UUID of the user whose elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_elements_by_user_with_regulation_counts(user_id, limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_elements_for_user": get_element_count_by_user(user_id)
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements for user: {str(e)}")

@router.get("/type/{element_type}")
async def get_elements_by_type_endpoint(
    element_type: str,
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve all elements of a specific type.
    
    Args:
        element_type: Type of elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_elements_by_type(element_type, limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "element_type": element_type,
                "limit": limit,
                "offset": offset,
                "total_elements_of_type": get_element_count_by_type(element_type)
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements by type: {str(e)}")

@router.get("/user/{user_id}/type/{element_type}")
async def get_elements_by_user_and_type_endpoint(
    user_id: str,
    element_type: str,
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve elements belonging to a specific user and of a specific type.
    
    Args:
        user_id: UUID of the user whose elements to retrieve
        element_type: Type of elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_elements_by_user_and_type(user_id, element_type, limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "user_id": user_id,
                "element_type": element_type,
                "limit": limit,
                "offset": offset
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements by user and type: {str(e)}")

@router.get("/search/{search_term}")
async def search_elements_endpoint(
    search_term: str,
    user_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Search elements by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in element names
        user_id: Optional user ID to limit search to specific user's elements
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if not search_term or not search_term.strip():
            raise HTTPException(status_code=400, detail="Search term cannot be empty")
        
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = search_elements_by_name(search_term.strip(), user_id, limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "search_term": search_term,
                "user_id": user_id,
                "limit": limit,
                "offset": offset
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching elements: {str(e)}")

@router.get("/")
async def get_all_elements_endpoint(limit: int = 100, offset: int = 0):
    """
    Retrieve all elements with pagination and regulation counts.
    
    Args:
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_elements_with_regulation_counts(limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_elements": get_total_element_count()
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving all elements: {str(e)}")

@router.get("/with-user-info/")
async def get_elements_with_user_info_endpoint(limit: int = 100, offset: int = 0):
    """
    Retrieve elements with their associated user information.
    
    Args:
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_elements_with_user_info(limit, offset)
        
        if result["success"]:
            return {
                "elements": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements with user info: {str(e)}")

# UPDATE Operations
@router.put("/{element_id}")
async def update_element_endpoint(
    element_id: str,
    update_data: Dict[str, Any] = Body(...)
):
    """
    Update element information.
    
    Optional fields:
    - name: New element name (must not be empty if provided)
    - description: New description (can be None to clear)
    - type: New element type (must not be empty if provided)
    """
    try:
        name = update_data.get("name")
        description = update_data.get("description")
        element_type = update_data.get("type")
        category_id = update_data.get("category_id")
        
        # Validate fields if provided
        if name is not None and (not name or not name.strip()):
            raise HTTPException(status_code=400, detail="Element name cannot be empty")
        
        if element_type is not None and (not element_type or not element_type.strip()):
            raise HTTPException(status_code=400, detail="Element type cannot be empty")
        
        result = update_element(element_id, name, description, element_type, category_id)
        
        if result["success"]:
            return {
                "message": "Element updated successfully",
                "element": result["data"]
            }
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating element: {str(e)}")

# DELETE Operations
@router.delete("/{element_id}")
async def delete_element_endpoint(element_id: str):
    """
    Delete an element from the database.
    
    Note: This will cascade delete all related element_regulations records.
    """
    try:
        result = delete_element(element_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting element: {str(e)}")

@router.delete("/user/{user_id}")
async def delete_elements_by_user_endpoint(user_id: str):
    """
    Delete all elements belonging to a specific user.
    
    Note: This will cascade delete all related element_regulations records.
    """
    try:
        result = delete_elements_by_user_id(user_id)
        
        if result["success"]:
            return {
                "message": result["message"],
                "deleted_count": result["deleted_count"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting elements for user: {str(e)}")

# UTILITY Endpoints
@router.get("/stats/count")
async def get_total_element_count_endpoint():
    """
    Get the total number of elements in the database.
    """
    try:
        count = get_total_element_count()
        return {"total_elements": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element count: {str(e)}")

@router.get("/stats/count/user/{user_id}")
async def get_element_count_by_user_endpoint(user_id: str):
    """
    Get the total number of elements for a specific user.
    """
    try:
        count = get_element_count_by_user(user_id)
        return {"user_id": user_id, "element_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element count for user: {str(e)}")

@router.get("/stats/count/type/{element_type}")
async def get_element_count_by_type_endpoint(element_type: str):
    """
    Get the total number of elements of a specific type.
    """
    try:
        count = get_element_count_by_type(element_type)
        return {"element_type": element_type, "element_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element count for type: {str(e)}")

@router.get("/stats/types")
async def get_unique_element_types_endpoint():
    """
    Get all unique element types in the database.
    """
    try:
        types = get_unique_element_types()
        return {"element_types": types, "count": len(types)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element types: {str(e)}")

@router.get("/check-exists/{element_id}")
async def check_element_exists_endpoint(element_id: str):
    """
    Check if an element exists in the database.
    """
    try:
        exists = check_element_exists(element_id)
        return {"element_id": element_id, "exists": exists}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking element existence: {str(e)}")