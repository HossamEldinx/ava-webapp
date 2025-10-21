"""
Element Regulations API Router

This module contains all API endpoints related to element-regulation relationships.
Provides CRUD operations for the many-to-many relationship between elements and regulations.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from ..services.element_regulations_service import (
    create_element_regulation_link,
    create_multiple_element_regulation_links,
    get_element_regulation_link_by_id,
    get_regulations_by_element_id,
    get_elements_by_regulation_id,
    get_element_regulation_links_by_user,
    check_element_regulation_link_exists,
    get_all_element_regulation_links,
    delete_element_regulation_link,
    delete_element_regulation_link_by_ids,
    delete_all_links_for_element,
    delete_all_links_for_regulation,
    delete_multiple_element_regulation_links,
    get_element_regulation_link_count,
    get_regulation_count_for_element,
    get_element_count_for_regulation,
    get_most_linked_regulations,
    get_most_linked_elements
)

router = APIRouter(
    prefix="/element-regulations",
    tags=["element-regulations"],
    responses={404: {"description": "Not found"}},
)

# CREATE Operations
@router.post("/")
async def create_element_regulation_link_endpoint(
    link_data: Dict[str, Any] = Body(...)
):
    """
    Create a new link between an element and a regulation.
    
    Required fields:
    - element_id: UUID of the element to link
    - regulation_id: ID of the regulation to link
    """
    try:
        # Validate required fields
        required_fields = ["element_id", "regulation_id"]
        for field in required_fields:
            if field not in link_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        element_id = link_data["element_id"]
        regulation_id = link_data["regulation_id"]
        
        # Validate field values
        if not element_id or not str(element_id).strip():
            raise HTTPException(status_code=400, detail="Element ID cannot be empty")
        
        if not regulation_id or not isinstance(regulation_id, int):
            raise HTTPException(status_code=400, detail="Regulation ID must be a valid integer")
        
        # Check if link already exists
        if check_element_regulation_link_exists(str(element_id), regulation_id):
            raise HTTPException(
                status_code=409,
                detail="Link between element and regulation already exists"
            )
        
        result = create_element_regulation_link(str(element_id), regulation_id)
        
        if result["success"]:
            return {
                "message": "Element-regulation link created successfully",
                "link": result["data"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating element-regulation link: {str(e)}")

@router.post("/multiple")
async def create_multiple_element_regulation_links_endpoint(
    link_data: Dict[str, Any] = Body(...)
):
    """
    Create multiple links between one element and multiple regulations.
    
    Required fields:
    - element_id: UUID of the element to link
    - regulation_ids: List of regulation IDs to link to the element
    """
    try:
        # Validate required fields
        required_fields = ["element_id", "regulation_ids"]
        for field in required_fields:
            if field not in link_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        element_id = link_data["element_id"]
        regulation_ids = link_data["regulation_ids"]
        
        # Validate field values
        if not element_id or not str(element_id).strip():
            raise HTTPException(status_code=400, detail="Element ID cannot be empty")
        
        if not regulation_ids or not isinstance(regulation_ids, list):
            raise HTTPException(status_code=400, detail="Regulation IDs must be a non-empty list")
        
        if not all(isinstance(reg_id, int) for reg_id in regulation_ids):
            raise HTTPException(status_code=400, detail="All regulation IDs must be valid integers")
        
        result = create_multiple_element_regulation_links(str(element_id), regulation_ids)
        
        if result["success"]:
            return {
                "message": f"Created {result['created_count']} element-regulation links",
                "element_id": element_id,
                "created_count": result["created_count"],
                "requested_count": result["requested_count"],
                "links": result["data"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating multiple element-regulation links: {str(e)}")

@router.post("/create-element-with-regulations")
async def create_element_with_multiple_regulations_endpoint(
    request_data: Dict[str, Any] = Body(...)
):
    """
    Create an element and link it to multiple regulations in a single operation.
    
    Required fields:
    - element: Dictionary containing element data (name, type, description, user_id)
    - regulation_ids: List of regulation IDs to link to the element (optional)
    """
    try:
        # Validate required fields
        if "element" not in request_data:
            raise HTTPException(
                status_code=400,
                detail="Missing required field: element"
            )
        
        element_data = request_data["element"]
        regulation_ids = request_data.get("regulation_ids", [])
        
        # Validate element data
        required_element_fields = ["name", "type", "user_id"]
        for field in required_element_fields:
            if field not in element_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required element field: {field}"
                )
        
        # Validate regulation_ids if provided
        if regulation_ids and not isinstance(regulation_ids, list):
            raise HTTPException(status_code=400, detail="Regulation IDs must be a list")
        
        if regulation_ids and not all(isinstance(reg_id, int) for reg_id in regulation_ids):
            raise HTTPException(status_code=400, detail="All regulation IDs must be valid integers")
        
        from ..services.element_regulations_service import create_element_with_multiple_regulations
        
        result = create_element_with_multiple_regulations(element_data, regulation_ids)
        
        if result["success"]:
            response = {
                "message": result["message"],
                "element": result["element"]
            }
            
            if "regulation_links" in result:
                response["regulation_links"] = result["regulation_links"]
            
            if "created_links_count" in result:
                response["created_links_count"] = result["created_links_count"]
                response["requested_links_count"] = result["requested_links_count"]
            
            if "warning" in result:
                response["warning"] = result["warning"]
            
            return response
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating element with regulations: {str(e)}")

# READ Operations
@router.get("/{link_id}")
async def get_element_regulation_link_endpoint(link_id: str):
    """
    Retrieve a specific element-regulation link by its ID.
    """
    try:
        result = get_element_regulation_link_by_id(link_id)
        
        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving element-regulation link: {str(e)}")

@router.get("/element/{element_id}/regulations")
async def get_regulations_by_element_endpoint(element_id: str):
    """
    Retrieve all regulations linked to a specific element.
    """
    try:
        result = get_regulations_by_element_id(element_id)
        
        if result["success"]:
            return {
                "element_id": element_id,
                "regulations": result["data"],
                "count": result["count"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving regulations for element: {str(e)}")

@router.get("/regulation/{regulation_id}/elements")
async def get_elements_by_regulation_endpoint(regulation_id: int):
    """
    Retrieve all elements linked to a specific regulation.
    """
    try:
        result = get_elements_by_regulation_id(regulation_id)
        
        if result["success"]:
            return {
                "regulation_id": regulation_id,
                "elements": result["data"],
                "count": result["count"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements for regulation: {str(e)}")

@router.get("/user/{user_id}")
async def get_element_regulation_links_by_user_endpoint(
    user_id: str,
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve all element-regulation links for elements owned by a specific user.
    
    Args:
        user_id: UUID of the user
        limit: Maximum number of links to return (default: 100)
        offset: Number of links to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_element_regulation_links_by_user(user_id, limit, offset)
        
        if result["success"]:
            return {
                "user_id": user_id,
                "links": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving links for user: {str(e)}")

@router.get("/")
async def get_all_element_regulation_links_endpoint(limit: int = 100, offset: int = 0):
    """
    Retrieve all element-regulation links with pagination.
    
    Args:
        limit: Maximum number of links to return (default: 100)
        offset: Number of links to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_all_element_regulation_links(limit, offset)
        
        if result["success"]:
            return {
                "links": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_links": get_element_regulation_link_count()
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving all links: {str(e)}")

@router.get("/check-exists/{element_id}/{regulation_id}")
async def check_element_regulation_link_exists_endpoint(element_id: str, regulation_id: int):
    """
    Check if a link between an element and regulation already exists.
    """
    try:
        exists = check_element_regulation_link_exists(element_id, regulation_id)
        return {
            "element_id": element_id,
            "regulation_id": regulation_id,
            "exists": exists
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking link existence: {str(e)}")

# DELETE Operations
@router.delete("/{link_id}")
async def delete_element_regulation_link_endpoint(link_id: str):
    """
    Delete a specific element-regulation link by its ID.
    """
    try:
        result = delete_element_regulation_link(link_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting element-regulation link: {str(e)}")

@router.delete("/element/{element_id}/regulation/{regulation_id}")
async def delete_element_regulation_link_by_ids_endpoint(element_id: str, regulation_id: int):
    """
    Delete a specific element-regulation link by element and regulation IDs.
    """
    try:
        result = delete_element_regulation_link_by_ids(element_id, regulation_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting element-regulation link: {str(e)}")

@router.delete("/element/{element_id}/all")
async def delete_all_links_for_element_endpoint(element_id: str):
    """
    Delete all regulation links for a specific element.
    """
    try:
        result = delete_all_links_for_element(element_id)
        
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
        raise HTTPException(status_code=500, detail=f"Error deleting links for element: {str(e)}")

@router.delete("/regulation/{regulation_id}/all")
async def delete_all_links_for_regulation_endpoint(regulation_id: int):
    """
    Delete all element links for a specific regulation.
    """
    try:
        result = delete_all_links_for_regulation(regulation_id)
        
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
        raise HTTPException(status_code=500, detail=f"Error deleting links for regulation: {str(e)}")

@router.delete("/element/{element_id}/multiple")
async def delete_multiple_element_regulation_links_endpoint(
    element_id: str,
    regulation_ids: List[int] = Body(...)
):
    """
    Delete multiple links between one element and multiple regulations.
    
    Request body should contain a list of regulation IDs to unlink from the element.
    """
    try:
        if not regulation_ids or not isinstance(regulation_ids, list):
            raise HTTPException(status_code=400, detail="Regulation IDs must be a non-empty list")
        
        if not all(isinstance(reg_id, int) for reg_id in regulation_ids):
            raise HTTPException(status_code=400, detail="All regulation IDs must be valid integers")
        
        result = delete_multiple_element_regulation_links(element_id, regulation_ids)
        
        if result["success"]:
            response = {
                "message": result["message"],
                "deleted_count": result["deleted_count"]
            }
            if "errors" in result:
                response["errors"] = result["errors"]
            return response
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting multiple links: {str(e)}")

# UTILITY and STATISTICS Endpoints
@router.get("/stats/count")
async def get_element_regulation_link_count_endpoint():
    """
    Get the total number of element-regulation links in the database.
    """
    try:
        count = get_element_regulation_link_count()
        return {"total_links": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting link count: {str(e)}")

@router.get("/stats/element/{element_id}/count")
async def get_regulation_count_for_element_endpoint(element_id: str):
    """
    Get the number of regulations linked to a specific element.
    """
    try:
        count = get_regulation_count_for_element(element_id)
        return {"element_id": element_id, "regulation_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting regulation count for element: {str(e)}")

@router.get("/stats/regulation/{regulation_id}/count")
async def get_element_count_for_regulation_endpoint(regulation_id: int):
    """
    Get the number of elements linked to a specific regulation.
    """
    try:
        count = get_element_count_for_regulation(regulation_id)
        return {"regulation_id": regulation_id, "element_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element count for regulation: {str(e)}")

@router.get("/stats/most-linked-regulations")
async def get_most_linked_regulations_endpoint(limit: int = 10):
    """
    Get the regulations that are linked to the most elements.
    
    Args:
        limit: Maximum number of regulations to return (default: 10)
    """
    try:
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
        
        result = get_most_linked_regulations(limit)
        
        if result["success"]:
            return {
                "most_linked_regulations": result["data"],
                "limit": limit
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting most linked regulations: {str(e)}")

@router.get("/stats/most-linked-elements")
async def get_most_linked_elements_endpoint(limit: int = 10):
    """
    Get the elements that are linked to the most regulations.
    
    Args:
        limit: Maximum number of elements to return (default: 10)
    """
    try:
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
        
        result = get_most_linked_elements(limit)
        
        if result["success"]:
            return {
                "most_linked_elements": result["data"],
                "limit": limit
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting most linked elements: {str(e)}")