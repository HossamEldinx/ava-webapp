"""
Users API Router

This module contains all API endpoints related to user management.
Provides CRUD operations for users including authentication.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from ..services.users_service import (
    create_user,
    get_user_by_id,
    get_user_by_email,
    get_all_users,
    authenticate_user,
    update_user,
    delete_user,
    soft_delete_user,
    check_email_exists,
    get_user_count
)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

# CREATE Operations
@router.post("/")
async def create_user_endpoint(
    user_data: Dict[str, Any] = Body(...)
):
    """
    Create a new user.
    
    Required fields:
    - email: User's email address (must be unique)
    - name: User's full name
    - password: User's password (will be hashed)
    """
    try:
        # Validate required fields
        required_fields = ["email", "name", "password"]
        for field in required_fields:
            if field not in user_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        email = user_data["email"]
        name = user_data["name"]
        password = user_data["password"]
        
        # Validate field values
        if not email or not email.strip():
            raise HTTPException(status_code=400, detail="Email cannot be empty")
        
        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        if not password or len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Check if email already exists
        if check_email_exists(email):
            raise HTTPException(status_code=409, detail="Email already exists")
        
        result = create_user(email, name, password)
        
        if result["success"]:
            return {
                "message": "User created successfully",
                "user": result["data"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

# READ Operations
@router.get("/{user_id}")
async def get_user_endpoint(user_id: str):
    """
    Retrieve a user by their ID.
    """
    try:
        result = get_user_by_id(user_id)
        
        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")

@router.get("/email/{email}")
async def get_user_by_email_endpoint(email: str):
    """
    Retrieve a user by their email address.
    """
    try:
        result = get_user_by_email(email)
        
        if result["success"]:
            return result["data"]
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user by email: {str(e)}")

@router.get("/")
async def get_all_users_endpoint(limit: int = 100, offset: int = 0):
    """
    Retrieve all users with pagination.
    
    Args:
        limit: Maximum number of users to return (default: 100)
        offset: Number of users to skip (default: 0)
    """
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = get_all_users(limit, offset)
        
        if result["success"]:
            return {
                "users": result["data"],
                "count": result["count"],
                "limit": limit,
                "offset": offset,
                "total_users": get_user_count()
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")

@router.post("/authenticate")
async def authenticate_user_endpoint(
    credentials: Dict[str, str] = Body(...)
):
    """
    Authenticate a user with email and password.
    
    Required fields:
    - email: User's email address
    - password: User's password
    """
    try:
        # Validate required fields
        if "email" not in credentials or "password" not in credentials:
            raise HTTPException(
                status_code=400,
                detail="Email and password are required"
            )
        
        email = credentials["email"]
        password = credentials["password"]
        
        if not email or not email.strip():
            raise HTTPException(status_code=400, detail="Email cannot be empty")
        
        if not password:
            raise HTTPException(status_code=400, detail="Password cannot be empty")
        
        result = authenticate_user(email, password)
        
        if result["success"]:
            return {
                "message": "Authentication successful",
                "user": result["data"]
            }
        else:
            raise HTTPException(status_code=401, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error authenticating user: {str(e)}")

# UPDATE Operations
@router.put("/{user_id}")
async def update_user_endpoint(
    user_id: str,
    update_data: Dict[str, Any] = Body(...)
):
    """
    Update user information.
    
    Optional fields:
    - email: New email address
    - name: New name
    - password: New password (will be hashed)
    """
    try:
        email = update_data.get("email")
        name = update_data.get("name")
        password = update_data.get("password")
        
        # Validate fields if provided
        if email is not None and (not email or not email.strip()):
            raise HTTPException(status_code=400, detail="Email cannot be empty")
        
        if name is not None and (not name or not name.strip()):
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        if password is not None and len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Check if new email already exists (if email is being updated)
        if email and check_email_exists(email):
            # Get current user to check if it's the same email
            current_user = get_user_by_id(user_id)
            if current_user["success"] and current_user["data"]["email"] != email:
                raise HTTPException(status_code=409, detail="Email already exists")
        
        result = update_user(user_id, email, name, password)
        
        if result["success"]:
            return {
                "message": "User updated successfully",
                "user": result["data"]
            }
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

# DELETE Operations
@router.delete("/{user_id}")
async def delete_user_endpoint(user_id: str):
    """
    Delete a user from the database.
    
    Note: This will cascade delete all related element_list records.
    """
    try:
        result = delete_user(user_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@router.delete("/{user_id}/soft")
async def soft_delete_user_endpoint(user_id: str):
    """
    Soft delete a user by marking their email as deleted.
    This preserves the user record while making the email unique constraint available.
    """
    try:
        result = soft_delete_user(user_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error soft deleting user: {str(e)}")

# UTILITY Endpoints
@router.get("/check-email/{email}")
async def check_email_exists_endpoint(email: str):
    """
    Check if an email address already exists in the database.
    """
    try:
        exists = check_email_exists(email)
        return {"email": email, "exists": exists}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking email: {str(e)}")

@router.get("/stats/count")
async def get_user_count_endpoint():
    """
    Get the total number of users in the database.
    """
    try:
        count = get_user_count()
        return {"total_users": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting user count: {str(e)}")