"""
Categories API Router

This module contains all API endpoints related to category management.
Provides CRUD operations for categories including user-specific operations.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional, List
from ..services.categories_services import (
    create_category,
    get_category_by_id,
    get_categories_by_user_id,
    get_all_categories,
    get_category_by_name,
    update_category,
    delete_category,
    check_category_name_exists,
    get_category_count,
    get_categories_count_by_user,
    get_elements_by_category_id,
    get_elements_count_by_category
)
from ..schemas import CategoryCreate, CategoryUpdate, Category

router = APIRouter(
    prefix="/categories",
    tags=["categories"],
    responses={404: {"description": "Not found"}},
)

# CREATE Operations
@router.post("/", response_model=Dict[str, Any])
async def create_category_endpoint(category: CategoryCreate):
    """
    Create a new category.

    Required fields:
    - name: Category name (must be unique and non-empty)
    - user_id: UUID of the user who owns this category

    Optional fields:
    - description: Description of the category
    - color: Color for the category
    """
    try:
        # Check if category name already exists
        if check_category_name_exists(category.name):
            raise HTTPException(status_code=409, detail="Category name already exists")

        result = create_category(
            name=category.name,
            user_id=category.user_id,
            description=category.description,
            color=category.color
        )

        if result["success"]:
            return {
                "message": "Category created successfully",
                "category": result["data"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating category: {str(e)}")

# READ Operations
@router.get("/{category_id}", response_model=Category)
async def get_category_endpoint(category_id: str):
    """
    Retrieve a category by its ID.
    """
    try:
        result = get_category_by_id(category_id)

        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving category: {str(e)}")

@router.get("/user/{user_id}", response_model=Dict[str, Any])
async def get_categories_by_user_endpoint(user_id: str, limit: int = 100, offset: int = 0):
    """
    Retrieve all categories for a specific user with pagination.

    Args:
        user_id: UUID of the user whose categories to retrieve
        limit: Maximum number of categories to return (default: 100)
        offset: Number of categories to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")

        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")

        result = get_categories_by_user_id(user_id, limit, offset)

        if result["success"]:
            return {
                "categories": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_categories": get_categories_count_by_user(user_id)
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving categories: {str(e)}")

@router.get("/", response_model=Dict[str, Any])
async def get_all_categories_endpoint(limit: int = 100, offset: int = 0):
    """
    Retrieve all categories with pagination.

    Args:
        limit: Maximum number of categories to return (default: 100)
        offset: Number of categories to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")

        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")

        result = get_all_categories(limit, offset)

        if result["success"]:
            return {
                "categories": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_categories": get_category_count()
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving categories: {str(e)}")

@router.get("/name/{name}", response_model=Category)
async def get_category_by_name_endpoint(name: str):
    """
    Retrieve a category by its name.
    """
    try:
        result = get_category_by_name(name)

        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving category by name: {str(e)}")

# UPDATE Operations
@router.put("/{category_id}", response_model=Dict[str, Any])
async def update_category_endpoint(
    category_id: str,
    category_update: CategoryUpdate
):
    """
    Update category information.

    Optional fields:
    - name: New category name (must be unique if provided)
    - description: New description
    - color: New color
    """
    try:
        # Check if new name already exists (if name is being updated)
        if category_update.name and check_category_name_exists(category_update.name):
            # Get current category to check if it's the same name
            current_category = get_category_by_id(category_id)
            if current_category["success"] and current_category["data"]["name"] != category_update.name:
                raise HTTPException(status_code=409, detail="Category name already exists")

        result = update_category(
            category_id=category_id,
            name=category_update.name,
            description=category_update.description,
            color=category_update.color
        )

        if result["success"]:
            return {
                "message": "Category updated successfully",
                "category": result["data"]
            }
        else:
            raise HTTPException(status_code=404, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating category: {str(e)}")

# DELETE Operations
@router.delete("/{category_id}", response_model=Dict[str, Any])
async def delete_category_endpoint(category_id: str):
    """
    Delete a category from the database.
    """
    try:
        result = delete_category(category_id)

        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting category: {str(e)}")

# UTILITY Endpoints
@router.get("/check-name/{name}", response_model=Dict[str, Any])
async def check_category_name_exists_endpoint(name: str):
    """
    Check if a category name already exists in the database.
    """
    try:
        exists = check_category_name_exists(name)
        return {"name": name, "exists": exists}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking category name: {str(e)}")

@router.get("/stats/count", response_model=Dict[str, Any])
async def get_category_count_endpoint():
    """
    Get the total number of categories in the database.
    """
    try:
        count = get_category_count()
        return {"total_categories": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting category count: {str(e)}")

@router.get("/stats/user/{user_id}/count", response_model=Dict[str, Any])
async def get_categories_count_by_user_endpoint(user_id: str):
    """
    Get the total number of categories for a specific user.
    """
    try:
        count = get_categories_count_by_user(user_id)
        return {"user_id": user_id, "total_categories": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting category count for user: {str(e)}")

# ELEMENTS BY CATEGORY Endpoints
@router.get("/{category_id}/elements", response_model=Dict[str, Any])
async def get_elements_by_category_endpoint(category_id: str, limit: int = 100, offset: int = 0):
    """
    Retrieve all elements that belong to a specific category with pagination.

    Args:
        category_id: UUID of the category whose elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")

        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")

        result = get_elements_by_category_id(category_id, limit, offset)

        if result["success"]:
            return {
                "category_id": category_id,
                "elements": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_elements": get_elements_count_by_category(category_id)
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving elements for category: {str(e)}")

@router.get("/{category_id}/elements/count", response_model=Dict[str, Any])
async def get_elements_count_by_category_endpoint(category_id: str):
    """
    Get the total number of elements for a specific category.
    """
    try:
        count = get_elements_count_by_category(category_id)
        return {"category_id": category_id, "total_elements": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting element count for category: {str(e)}")