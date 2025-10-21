"""
CRUD operations for the users table.

This module provides Create, Read, Update, Delete operations for managing users
in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- email: TEXT (unique, not null, validated format)
- name: TEXT (not null)
- password: TEXT (not null)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import hashlib
import secrets

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

def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256 with a random salt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
    """
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password to verify
        hashed_password: Stored hash to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        salt, stored_hash = hashed_password.split(':')
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return password_hash == stored_hash
    except ValueError:
        return False

# CREATE Operations
def create_user(email: str, name: str, password: str) -> Dict[str, Any]:
    """
    Create a new user in the database.
    
    Args:
        email: User's email address (must be unique and valid format)
        name: User's full name
        password: User's password (will be hashed)
        
    Returns:
        Dictionary containing the created user data or error information
        
    Raises:
        Exception: If database operation fails
    """
    try:
        # Hash the password before storing
        hashed_password = hash_password(password)
        
        user_data = {
            "email": email.lower().strip(),
            "name": name.strip(),
            "password": hashed_password
        }
        
        response = get_supabase_client().table("users").insert(user_data).execute()
        
        if response.data:
            # Remove password from response for security
            user_result = response.data[0].copy()
            user_result.pop('password', None)
            print(f"✅ Successfully created user: {email}")
            return {"success": True, "data": user_result}
        else:
            print(f"❌ Failed to create user: {email}")
            return {"success": False, "error": "Failed to create user"}
            
    except Exception as e:
        print(f"❌ Error creating user {email}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_user_by_id(user_id: str) -> Dict[str, Any]:
    """
    Retrieve a user by their ID.
    
    Args:
        user_id: UUID of the user to retrieve
        
    Returns:
        Dictionary containing user data or error information
    """
    try:
        response = get_supabase_client().table("users").select("id, email, name, created_at, updated_at").eq("id", user_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved user: {user_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ User not found: {user_id}")
            return {"success": False, "error": "User not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def get_user_by_email(email: str) -> Dict[str, Any]:
    """
    Retrieve a user by their email address.
    
    Args:
        email: Email address of the user to retrieve
        
    Returns:
        Dictionary containing user data or error information
    """
    try:
        response = get_supabase_client().table("users").select("id, email, name, created_at, updated_at").eq("email", email.lower().strip()).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved user by email: {email}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ User not found with email: {email}")
            return {"success": False, "error": "User not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving user by email {email}: {e}")
        return {"success": False, "error": str(e)}

def get_all_users(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all users with pagination.
    
    Args:
        limit: Maximum number of users to return (default: 100)
        offset: Number of users to skip (default: 0)
        
    Returns:
        Dictionary containing list of users or error information
    """
    try:
        response = get_supabase_client().table("users").select("id, email, name, created_at, updated_at").range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} users")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving users: {e}")
        return {"success": False, "error": str(e)}

def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate a user by email and password.
    
    Args:
        email: User's email address
        password: User's plain text password
        
    Returns:
        Dictionary containing user data (without password) if authenticated, or error information
    """
    try:
        # Get user with password for verification
        response = get_supabase_client().table("users").select("*").eq("email", email.lower().strip()).execute()
        
        if not response.data:
            print(f"❌ Authentication failed - user not found: {email}")
            return {"success": False, "error": "Invalid email or password"}
        
        user = response.data[0]
        
        # Verify password
        if verify_password(password, user['password']):
            # Remove password from response
            user_result = user.copy()
            user_result.pop('password', None)
            print(f"✅ Successfully authenticated user: {email}")
            return {"success": True, "data": user_result}
        else:
            print(f"❌ Authentication failed - invalid password: {email}")
            return {"success": False, "error": "Invalid email or password"}
            
    except Exception as e:
        print(f"❌ Error authenticating user {email}: {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_user(user_id: str, email: Optional[str] = None, name: Optional[str] = None, password: Optional[str] = None) -> Dict[str, Any]:
    """
    Update user information.
    
    Args:
        user_id: UUID of the user to update
        email: New email address (optional)
        name: New name (optional)
        password: New password (optional, will be hashed)
        
    Returns:
        Dictionary containing updated user data or error information
    """
    try:
        update_data = {}
        
        if email is not None:
            update_data["email"] = email.lower().strip()
        if name is not None:
            update_data["name"] = name.strip()
        if password is not None:
            update_data["password"] = hash_password(password)
        
        if not update_data:
            return {"success": False, "error": "No update data provided"}
        
        # Add updated_at timestamp
        update_data["updated_at"] = "NOW()"
        
        response = get_supabase_client().table("users").update(update_data).eq("id", user_id).execute()
        
        if response.data:
            # Remove password from response
            user_result = response.data[0].copy()
            user_result.pop('password', None)
            print(f"✅ Successfully updated user: {user_id}")
            return {"success": True, "data": user_result}
        else:
            print(f"❌ Failed to update user: {user_id}")
            return {"success": False, "error": "User not found or update failed"}
            
    except Exception as e:
        print(f"❌ Error updating user {user_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_user(user_id: str) -> Dict[str, Any]:
    """
    Delete a user from the database.
    
    Note: This will cascade delete all related element_list records due to foreign key constraint.
    
    Args:
        user_id: UUID of the user to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = get_supabase_client().table("users").delete().eq("id", user_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted user: {user_id}")
            return {"success": True, "message": "User deleted successfully"}
        else:
            print(f"❌ Failed to delete user: {user_id}")
            return {"success": False, "error": "User not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def soft_delete_user(user_id: str) -> Dict[str, Any]:
    """
    Soft delete a user by updating their email to mark as deleted.
    This preserves the user record while making the email unique constraint available.
    
    Args:
        user_id: UUID of the user to soft delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        # Get current user data
        user_response = get_user_by_id(user_id)
        if not user_response["success"]:
            return user_response
        
        user = user_response["data"]
        deleted_email = f"deleted_{user_id}@deleted.local"
        
        update_data = {
            "email": deleted_email,
            "name": f"[DELETED] {user['name']}",
            "updated_at": "NOW()"
        }
        
        response = get_supabase_client().table("users").update(update_data).eq("id", user_id).execute()
        
        if response.data:
            print(f"✅ Successfully soft deleted user: {user_id}")
            return {"success": True, "message": "User soft deleted successfully"}
        else:
            print(f"❌ Failed to soft delete user: {user_id}")
            return {"success": False, "error": "User not found or soft delete failed"}
            
    except Exception as e:
        print(f"❌ Error soft deleting user {user_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def check_email_exists(email: str) -> bool:
    """
    Check if an email address already exists in the database.
    
    Args:
        email: Email address to check
        
    Returns:
        True if email exists, False otherwise
    """
    try:
        response = get_supabase_client().table("users").select("id").eq("email", email.lower().strip()).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking email existence {email}: {e}")
        return False

def get_user_count() -> int:
    """
    Get the total number of users in the database.
    
    Returns:
        Total count of users
    """
    try:
        response = get_supabase_client().table("users").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting user count: {e}")
        return 0