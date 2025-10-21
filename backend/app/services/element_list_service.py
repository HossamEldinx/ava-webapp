"""
CRUD operations for the element_list table.

This module provides Create, Read, Update, Delete operations for managing element lists
in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- name: TEXT (not null, must not be empty)
- description: TEXT (optional)
- type: TEXT (not null, must not be empty)
- user_id: UUID (foreign key to users table, not null)
- category_id: UUID (foreign key to categories table, optional)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)

Constraints:
- name must not be empty (length > 0 after trimming)
- type must not be empty (length > 0 after trimming)
- user_id must reference an existing user (CASCADE DELETE)
- category_id must reference an existing category (optional)
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

# Initialize Supabase client
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# CREATE Operations
def create_element(name: str, type: str, user_id: str, description: Optional[str] = None, category_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new element in the element_list table.

    Args:
        name: Element name (must not be empty after trimming)
        type: Element type (must not be empty after trimming)
        user_id: UUID of the user who owns this element
        description: Optional description of the element
        category_id: Optional UUID of the category this element belongs to

    Returns:
        Dictionary containing the created element data or error information

    Raises:
        Exception: If database operation fails
    """
    try:
        # Validate required fields
        name = name.strip() if name else ""
        type = type.strip() if type else ""

        if not name:
            return {"success": False, "error": "Element name cannot be empty"}

        if not type:
            return {"success": False, "error": "Element type cannot be empty"}

        element_data = {
            "name": name,
            "type": type,
            "user_id": user_id,
            "description": description.strip() if description else None,
            "category_id": category_id if category_id else None
        }
        
        response = supabase.table("element_list").insert(element_data).execute()
        
        if response.data:
            print(f"✅ Successfully created element: {name} (type: {type})")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create element: {name}")
            return {"success": False, "error": "Failed to create element"}
            
    except Exception as e:
        print(f"❌ Error creating element {name}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_element_by_id(element_id: str) -> Dict[str, Any]:
    """
    Retrieve an element by its ID.
    
    Args:
        element_id: UUID of the element to retrieve
        
    Returns:
        Dictionary containing element data or error information
    """
    try:
        response = supabase.table("element_list").select("*").eq("id", element_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved element: {element_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Element not found: {element_id}")
            return {"success": False, "error": "Element not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving element {element_id}: {e}")
        return {"success": False, "error": str(e)}

def get_elements_by_user_id(user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all elements belonging to a specific user.
    
    Args:
        user_id: UUID of the user whose elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements or error information
    """
    try:
        response = supabase.table("element_list").select("*").eq("user_id", user_id).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} elements for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def get_elements_by_type(element_type: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all elements of a specific type.
    
    Args:
        element_type: Type of elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements or error information
    """
    try:
        response = supabase.table("element_list").select("*").eq("type", element_type).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} elements of type: {element_type}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements of type {element_type}: {e}")
        return {"success": False, "error": str(e)}

def get_elements_by_user_and_type(user_id: str, element_type: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve elements belonging to a specific user and of a specific type.
    
    Args:
        user_id: UUID of the user whose elements to retrieve
        element_type: Type of elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements or error information
    """
    try:
        response = supabase.table("element_list").select("*").eq("user_id", user_id).eq("type", element_type).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} elements of type '{element_type}' for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements of type {element_type} for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def search_elements_by_name(search_term: str, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Search elements by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in element names
        user_id: Optional user ID to limit search to specific user's elements
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of matching elements or error information
    """
    try:
        query = supabase.table("element_list").select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        query = query.ilike("name", f"%{search_term}%").range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully found {len(response.data)} elements matching '{search_term}'")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error searching elements with term '{search_term}': {e}")
        return {"success": False, "error": str(e)}

def get_all_elements(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all elements with pagination.
    
    Args:
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements or error information
    """
    try:
        response = supabase.table("element_list").select("*").range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} elements")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving all elements: {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_element(element_id: str, name: Optional[str] = None, description: Optional[str] = None,
                   type: Optional[str] = None, category_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Update element information.

    Args:
        element_id: UUID of the element to update
        name: New element name (optional, must not be empty if provided)
        description: New description (optional, can be None to clear)
        type: New element type (optional, must not be empty if provided)
        category_id: New category ID (optional, can be None to clear)

    Returns:
        Dictionary containing updated element data or error information
    """
    try:
        update_data = {}

        if name is not None:
            name = name.strip()
            if not name:
                return {"success": False, "error": "Element name cannot be empty"}
            update_data["name"] = name

        if description is not None:
            update_data["description"] = description.strip() if description else None

        if type is not None:
            type = type.strip()
            if not type:
                return {"success": False, "error": "Element type cannot be empty"}
            update_data["type"] = type

        if category_id is not None:
            update_data["category_id"] = category_id if category_id else None

        if not update_data:
            return {"success": False, "error": "No update data provided"}

        # Add updated_at timestamp
        update_data["updated_at"] = "NOW()"

        response = supabase.table("element_list").update(update_data).eq("id", element_id).execute()

        if response.data:
            print(f"✅ Successfully updated element: {element_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to update element: {element_id}")
            return {"success": False, "error": "Element not found or update failed"}

    except Exception as e:
        print(f"❌ Error updating element {element_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_element(element_id: str) -> Dict[str, Any]:
    """
    Delete an element from the database.
    
    Note: This will cascade delete all related element_regulations records due to foreign key constraint.
    
    Args:
        element_id: UUID of the element to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("element_list").delete().eq("id", element_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted element: {element_id}")
            return {"success": True, "message": "Element deleted successfully"}
        else:
            print(f"❌ Failed to delete element: {element_id}")
            return {"success": False, "error": "Element not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting element {element_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_elements_by_user_id(user_id: str) -> Dict[str, Any]:
    """
    Delete all elements belonging to a specific user.
    
    Note: This will cascade delete all related element_regulations records.
    
    Args:
        user_id: UUID of the user whose elements to delete
        
    Returns:
        Dictionary containing success status and count of deleted elements or error information
    """
    try:
        response = supabase.table("element_list").delete().eq("user_id", user_id).execute()
        
        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} elements for user: {user_id}")
        return {"success": True, "message": f"Deleted {deleted_count} elements", "deleted_count": deleted_count}
        
    except Exception as e:
        print(f"❌ Error deleting elements for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def get_element_count_by_user(user_id: str) -> int:
    """
    Get the total number of elements for a specific user.
    
    Args:
        user_id: UUID of the user
        
    Returns:
        Total count of elements for the user
    """
    try:
        response = supabase.table("element_list").select("id", count="exact").eq("user_id", user_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting element count for user {user_id}: {e}")
        return 0

def get_element_count_by_type(element_type: str) -> int:
    """
    Get the total number of elements of a specific type.
    
    Args:
        element_type: Type of elements to count
        
    Returns:
        Total count of elements of the specified type
    """
    try:
        response = supabase.table("element_list").select("id", count="exact").eq("type", element_type).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting element count for type {element_type}: {e}")
        return 0

def get_total_element_count() -> int:
    """
    Get the total number of elements in the database.
    
    Returns:
        Total count of elements
    """
    try:
        response = supabase.table("element_list").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting total element count: {e}")
        return 0

def get_unique_element_types() -> List[str]:
    """
    Get all unique element types in the database.
    
    Returns:
        List of unique element types
    """
    try:
        response = supabase.table("element_list").select("type").execute()
        
        if response.data:
            unique_types = list(set(item["type"] for item in response.data))
            print(f"✅ Found {len(unique_types)} unique element types")
            return unique_types
        else:
            return []
            
    except Exception as e:
        print(f"❌ Error getting unique element types: {e}")
        return []

def check_element_exists(element_id: str) -> bool:
    """
    Check if an element exists in the database.
    
    Args:
        element_id: UUID of the element to check
        
    Returns:
        True if element exists, False otherwise
    """
    try:
        response = supabase.table("element_list").select("id").eq("id", element_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking element existence {element_id}: {e}")
        return False

def get_elements_with_user_info(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve elements with their associated user information and regulation counts.
    
    Args:
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements with user info and regulation counts or error information
    """
    try:
        response = supabase.table("element_list").select("""
            *,
            users:user_id (
                id,
                email,
                name
            ),
            element_regulations!inner(count)
        """).range(offset, offset + limit - 1).execute()
        
        # Add regulation count to each element
        for element in response.data:
            element['regulation_count'] = len(element.get('element_regulations', []))
            # Remove the element_regulations array as we only need the count
            if 'element_regulations' in element:
                del element['element_regulations']
        
        print(f"✅ Successfully retrieved {len(response.data)} elements with user info and regulation counts")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements with user info: {e}")
        return {"success": False, "error": str(e)}

def get_elements_with_regulation_counts(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve elements with their regulation counts.
    
    Args:
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements with regulation counts or error information
    """
    try:
        # First get elements
        response = supabase.table("element_list").select("*").range(offset, offset + limit - 1).execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0}
        
        # Get regulation counts for each element
        elements_with_counts = []
        for element in response.data:
            # Get regulation count for this element
            reg_response = supabase.table("element_regulations").select("id", count="exact").eq("element_id", element["id"]).execute()
            regulation_count = reg_response.count if reg_response.count is not None else 0
            
            # Add regulation count to element
            element["regulation_count"] = regulation_count
            elements_with_counts.append(element)
        
        print(f"✅ Successfully retrieved {len(elements_with_counts)} elements with regulation counts")
        return {"success": True, "data": elements_with_counts, "count": len(elements_with_counts)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements with regulation counts: {e}")
        return {"success": False, "error": str(e)}

def get_elements_by_user_with_regulation_counts(user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve elements by user with their regulation counts.
    
    Args:
        user_id: UUID of the user whose elements to retrieve
        limit: Maximum number of elements to return (default: 100)
        offset: Number of elements to skip (default: 0)
        
    Returns:
        Dictionary containing list of elements with regulation counts or error information
    """
    try:
        # First get elements for the user
        response = supabase.table("element_list").select("*").eq("user_id", user_id).range(offset, offset + limit - 1).execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0}
        
        # Get regulation counts for each element
        elements_with_counts = []
        for element in response.data:
            # Get regulation count for this element
            reg_response = supabase.table("element_regulations").select("id", count="exact").eq("element_id", element["id"]).execute()
            regulation_count = reg_response.count if reg_response.count is not None else 0
            
            # Add regulation count to element
            element["regulation_count"] = regulation_count
            elements_with_counts.append(element)
        
        print(f"✅ Successfully retrieved {len(elements_with_counts)} elements with regulation counts for user: {user_id}")
        return {"success": True, "data": elements_with_counts, "count": len(elements_with_counts)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements with regulation counts for user {user_id}: {e}")
        return {"success": False, "error": str(e)}