"""
CRUD operations for the categories table.

This module provides Create, Read, Update, Delete operations for managing categories
in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- name: TEXT (unique, not null, validated to be non-empty)
- description: TEXT (nullable)
- color: TEXT (nullable)
- user_id: UUID (foreign key to users table, not null)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from datetime import datetime

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

# CREATE Operations
def create_category(name: str, user_id: str, description: Optional[str] = None, color: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new category in the database.

    Args:
        name: Category name (must be unique and non-empty)
        user_id: UUID of the user who owns this category
        description: Optional description of the category
        color: Optional color for the category

    Returns:
        Dictionary containing the created category data or error information

    Raises:
        Exception: If database operation fails
    """
    try:
        # Validate name is not empty
        if not name or not name.strip():
            return {"success": False, "error": "Category name cannot be empty"}

        category_data = {
            "name": name.strip(),
            "user_id": user_id,
            "description": description.strip() if description else None,
            "color": color.strip() if color else None
        }

        response = get_supabase_client().table("categories").insert(category_data).execute()

        if response.data:
            print(f"✅ Successfully created category: {name}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create category: {name}")
            return {"success": False, "error": "Failed to create category"}

    except Exception as e:
        print(f"❌ Error creating category {name}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_category_by_id(category_id: str) -> Dict[str, Any]:
    """
    Retrieve a category by its ID.

    Args:
        category_id: UUID of the category to retrieve

    Returns:
        Dictionary containing category data or error information
    """
    try:
        response = get_supabase_client().table("categories").select("*").eq("id", category_id).execute()

        if response.data:
            print(f"✅ Successfully retrieved category: {category_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Category not found: {category_id}")
            return {"success": False, "error": "Category not found"}

    except Exception as e:
        print(f"❌ Error retrieving category {category_id}: {e}")
        return {"success": False, "error": str(e)}

def get_categories_by_user_id(user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all categories for a specific user with pagination.

    Args:
        user_id: UUID of the user whose categories to retrieve
        limit: Maximum number of categories to return (default: 100)
        offset: Number of categories to skip (default: 0)

    Returns:
        Dictionary containing list of categories or error information
    """
    try:
        response = get_supabase_client().table("categories").select("*").eq("user_id", user_id).range(offset, offset + limit - 1).execute()

        print(f"✅ Successfully retrieved {len(response.data)} categories for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}

    except Exception as e:
        print(f"❌ Error retrieving categories for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def get_all_categories(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all categories with pagination.

    Args:
        limit: Maximum number of categories to return (default: 100)
        offset: Number of categories to skip (default: 0)

    Returns:
        Dictionary containing list of categories or error information
    """
    try:
        response = get_supabase_client().table("categories").select("*").range(offset, offset + limit - 1).execute()

        print(f"✅ Successfully retrieved {len(response.data)} categories")
        return {"success": True, "data": response.data, "count": len(response.data)}

    except Exception as e:
        print(f"❌ Error retrieving categories: {e}")
        return {"success": False, "error": str(e)}

def get_category_by_name(name: str) -> Dict[str, Any]:
    """
    Retrieve a category by its name.

    Args:
        name: Name of the category to retrieve

    Returns:
        Dictionary containing category data or error information
    """
    try:
        response = get_supabase_client().table("categories").select("*").eq("name", name.strip()).execute()

        if response.data:
            print(f"✅ Successfully retrieved category by name: {name}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Category not found with name: {name}")
            return {"success": False, "error": "Category not found"}

    except Exception as e:
        print(f"❌ Error retrieving category by name {name}: {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_category(category_id: str, name: Optional[str] = None, description: Optional[str] = None, color: Optional[str] = None) -> Dict[str, Any]:
    """
    Update category information.

    Args:
        category_id: UUID of the category to update
        name: New name (optional)
        description: New description (optional)
        color: New color (optional)

    Returns:
        Dictionary containing updated category data or error information
    """
    try:
        update_data = {}

        if name is not None:
            if not name.strip():
                return {"success": False, "error": "Category name cannot be empty"}
            update_data["name"] = name.strip()

        if description is not None:
            update_data["description"] = description.strip() if description else None

        if color is not None:
            update_data["color"] = color.strip() if color else None

        if not update_data:
            return {"success": False, "error": "No update data provided"}

        # Add updated_at timestamp
        update_data["updated_at"] = "NOW()"

        response = get_supabase_client().table("categories").update(update_data).eq("id", category_id).execute()

        if response.data:
            print(f"✅ Successfully updated category: {category_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to update category: {category_id}")
            return {"success": False, "error": "Category not found or update failed"}

    except Exception as e:
        print(f"❌ Error updating category {category_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_category(category_id: str) -> Dict[str, Any]:
    """
    Delete a category from the database.

    Args:
        category_id: UUID of the category to delete

    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = get_supabase_client().table("categories").delete().eq("id", category_id).execute()

        if response.data:
            print(f"✅ Successfully deleted category: {category_id}")
            return {"success": True, "message": "Category deleted successfully"}
        else:
            print(f"❌ Failed to delete category: {category_id}")
            return {"success": False, "error": "Category not found or delete failed"}

    except Exception as e:
        print(f"❌ Error deleting category {category_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def check_category_name_exists(name: str) -> bool:
    """
    Check if a category name already exists in the database.

    Args:
        name: Category name to check

    Returns:
        True if name exists, False otherwise
    """
    try:
        response = get_supabase_client().table("categories").select("id").eq("name", name.strip()).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking category name existence {name}: {e}")
        return False

def get_category_count() -> int:
    """
    Get the total number of categories in the database.

    Returns:
        Total count of categories
    """
    try:
        response = get_supabase_client().table("categories").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting category count: {e}")
        return 0

def get_categories_count_by_user(user_id: str) -> int:
    """
    Get the total number of categories for a specific user.

    Args:
        user_id: UUID of the user

    Returns:
        Total count of categories for the user
    """
    try:
        response = get_supabase_client().table("categories").select("id", count="exact").eq("user_id", user_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting category count for user {user_id}: {e}")
        return 0

def get_elements_by_category_id(category_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all elements that belong to a specific category with regulation counts.

    Args:
        category_id: UUID of the category whose elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)

    Returns:
        Dictionary containing list of elements or error information
    """
    try:
        supabase = get_supabase_client()

        # Get elements for the category
        response = supabase.table("element_list").select("*").eq("category_id", category_id).range(offset, offset + limit - 1).execute()

        if response.data:
            elements_with_counts = []
            for element in response.data:
                # Get regulation count for each element
                reg_response = supabase.table("element_regulations").select("id", count="exact").eq("element_id", element["id"]).execute()
                regulation_count = reg_response.count if reg_response.count is not None else 0

                # Add regulation count to element
                element["regulation_count"] = regulation_count
                elements_with_counts.append(element)

            print(f"✅ Successfully retrieved {len(elements_with_counts)} elements for category: {category_id}")
            return {"success": True, "data": elements_with_counts, "count": len(elements_with_counts)}
        else:
            print(f"✅ Successfully retrieved 0 elements for category: {category_id}")
            return {"success": True, "data": [], "count": 0}

    except Exception as e:
        print(f"❌ Error retrieving elements for category {category_id}: {e}")
        return {"success": False, "error": str(e)}

def get_elements_count_by_category(category_id: str) -> int:
    """
    Get the total number of elements for a specific category.

    Args:
        category_id: UUID of the category

    Returns:
        Total count of elements for the category
    """
    try:
        response = get_supabase_client().table("element_list").select("id", count="exact").eq("category_id", category_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting element count for category {category_id}: {e}")
        return 0