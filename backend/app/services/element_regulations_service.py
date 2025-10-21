"""
CRUD operations for the element_regulations table.

This module provides Create, Read, Update, Delete operations for managing the many-to-many
relationship between elements and regulations in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- element_id: UUID (foreign key to element_list table, not null)
- regulation_id: BIGINT (foreign key to regulations table, not null)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)

Constraints:
- element_id must reference an existing element (CASCADE DELETE)
- regulation_id must reference an existing regulation (CASCADE DELETE)
- Unique constraint on (element_id, regulation_id) to prevent duplicates

This is a junction table that creates a many-to-many relationship between:
- element_list table (elements created by users)
- regulations table (regulation documents from the system)
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
def create_element_regulation_link(element_id: str, regulation_id: int) -> Dict[str, Any]:
    """
    Create a new link between an element and a regulation.
    
    Args:
        element_id: UUID of the element to link
        regulation_id: ID of the regulation to link
        
    Returns:
        Dictionary containing the created link data or error information
        
    Raises:
        Exception: If database operation fails or duplicate link exists
    """
    try:
        link_data = {
            "element_id": element_id,
            "regulation_id": regulation_id
        }
        
        response = supabase.table("element_regulations").insert(link_data).execute()
        
        if response.data:
            print(f"✅ Successfully created element-regulation link: element {element_id} -> regulation {regulation_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create element-regulation link: element {element_id} -> regulation {regulation_id}")
            return {"success": False, "error": "Failed to create element-regulation link"}
            
    except Exception as e:
        error_msg = str(e)
        if "unique_element_regulation" in error_msg.lower() or "duplicate" in error_msg.lower():
            print(f"❌ Duplicate link already exists: element {element_id} -> regulation {regulation_id}")
            return {"success": False, "error": "Link between element and regulation already exists"}
        else:
            print(f"❌ Error creating element-regulation link: {e}")
            return {"success": False, "error": str(e)}

def create_multiple_element_regulation_links(element_id: str, regulation_ids: List[int]) -> Dict[str, Any]:
    """
    Create multiple links between one element and multiple regulations.
    
    Args:
        element_id: UUID of the element to link
        regulation_ids: List of regulation IDs to link to the element
        
    Returns:
        Dictionary containing success status, created links, and any errors
    """
    try:
        links_data = [
            {"element_id": element_id, "regulation_id": reg_id}
            for reg_id in regulation_ids
        ]
        
        response = supabase.table("element_regulations").insert(links_data).execute()
        
        created_count = len(response.data) if response.data else 0
        print(f"✅ Successfully created {created_count} element-regulation links for element {element_id}")
        
        return {
            "success": True, 
            "data": response.data, 
            "created_count": created_count,
            "requested_count": len(regulation_ids)
        }
        
    except Exception as e:
        print(f"❌ Error creating multiple element-regulation links: {e}")
        return {"success": False, "error": str(e)}

def create_element_with_multiple_regulations(element_data: Dict[str, Any], regulation_ids: List[int]) -> Dict[str, Any]:
    """
    Create an element and link it to multiple regulations in a single transaction-like operation.
    
    Args:
        element_data: Dictionary containing element data (name, type, description, user_id)
        regulation_ids: List of regulation IDs to link to the element
        
    Returns:
        Dictionary containing success status, element data, and regulation links
    """
    try:
        from .element_list_service import create_element
        
        # First create the element
        element_result = create_element(element_data)
        
        if not element_result.get("success"):
            return {
                "success": False,
                "error": f"Failed to create element: {element_result.get('error', 'Unknown error')}"
            }
        
        element_id = element_result["data"]["id"]
        
        # If no regulations to link, return success with element data
        if not regulation_ids:
            return {
                "success": True,
                "element": element_result["data"],
                "regulation_links": [],
                "message": "Element created successfully with no regulations"
            }
        
        # Create multiple regulation links
        links_result = create_multiple_element_regulation_links(element_id, regulation_ids)
        
        if links_result.get("success"):
            return {
                "success": True,
                "element": element_result["data"],
                "regulation_links": links_result["data"],
                "created_links_count": links_result["created_count"],
                "requested_links_count": links_result["requested_count"],
                "message": f"Element created successfully with {links_result['created_count']} regulation links"
            }
        else:
            # Element was created but regulation linking failed
            # We could optionally delete the element here, but for now we'll keep it
            return {
                "success": True,  # Element creation succeeded
                "element": element_result["data"],
                "regulation_links": [],
                "warning": f"Element created but regulation linking failed: {links_result.get('error')}",
                "message": "Element created successfully but some regulation links failed"
            }
            
    except Exception as e:
        print(f"❌ Error in create_element_with_multiple_regulations: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_element_regulation_link_by_id(link_id: str) -> Dict[str, Any]:
    """
    Retrieve a specific element-regulation link by its ID.
    
    Args:
        link_id: UUID of the link to retrieve
        
    Returns:
        Dictionary containing link data or error information
    """
    try:
        response = supabase.table("element_regulations").select("*").eq("id", link_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved element-regulation link: {link_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Element-regulation link not found: {link_id}")
            return {"success": False, "error": "Link not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving element-regulation link {link_id}: {e}")
        return {"success": False, "error": str(e)}

def get_regulations_by_element_id(element_id: str) -> Dict[str, Any]:
    """
    Retrieve all regulations linked to a specific element.
    
    Args:
        element_id: UUID of the element
        
    Returns:
        Dictionary containing list of linked regulations or error information
    """
    try:
        # First get the element_regulations links
        links_response = supabase.table("element_regulations").select("*").eq("element_id", element_id).execute()

        if not links_response.data:
            print(f"✅ No regulations found for element: {element_id}")
            return {"success": True, "data": [], "count": 0}

        # Then get the regulation details for each regulation_id
        regulation_ids = [link["regulation_id"] for link in links_response.data]

        regulations_response = supabase.table("regulations").select(
            "id, entity_type, lg_nr, ulg_nr, grundtext_nr, position_nr, searchable_text, full_nr, short_text, created_at"
        ).in_("id", regulation_ids).execute()

        # Create a map of regulation_id to regulation data for easy lookup
        regulations_map = {reg["id"]: reg for reg in regulations_response.data or []}

        # Combine the data
        combined_data = []
        for link in links_response.data:
            regulation_data = regulations_map.get(link["regulation_id"])
            if regulation_data:
                combined_data.append({
                    **link,
                    "regulations": regulation_data
                })

        print(f"✅ Successfully retrieved {len(combined_data)} regulations with details for element: {element_id}")
        return {"success": True, "data": combined_data, "count": len(combined_data)}
        
        print(f"✅ Successfully retrieved {len(response.data)} regulations for element: {element_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving regulations for element {element_id}: {e}")
        return {"success": False, "error": str(e)}

def get_elements_by_regulation_id(regulation_id: int) -> Dict[str, Any]:
    """
    Retrieve all elements linked to a specific regulation.
    
    Args:
        regulation_id: ID of the regulation
        
    Returns:
        Dictionary containing list of linked elements or error information
    """
    try:
        response = supabase.table("element_regulations").select("""
            *,
            element_list:element_id (
                id,
                name,
                description,
                type,
                user_id,
                created_at,
                updated_at
            )
        """).eq("regulation_id", regulation_id).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} elements for regulation: {regulation_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving elements for regulation {regulation_id}: {e}")
        return {"success": False, "error": str(e)}

def get_element_regulation_links_by_user(user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all element-regulation links for elements owned by a specific user.
    
    Args:
        user_id: UUID of the user
        limit: Maximum number of links to return (default: 100)
        offset: Number of links to skip (default: 0)
        
    Returns:
        Dictionary containing list of links or error information
    """
    try:
        response = supabase.table("element_regulations").select("""
            *,
            element_list:element_id (
                id,
                name,
                description,
                type,
                user_id
            ),
            regulations:regulation_id (
                id,
                entity_type,
                lg_nr,
                ulg_nr,
                full_nr,
                short_text,
                searchable_text
            )
        """).eq("element_list.user_id", user_id).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} element-regulation links for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving element-regulation links for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def check_element_regulation_link_exists(element_id: str, regulation_id: int) -> bool:
    """
    Check if a link between an element and regulation already exists.
    
    Args:
        element_id: UUID of the element
        regulation_id: ID of the regulation
        
    Returns:
        True if link exists, False otherwise
    """
    try:
        response = supabase.table("element_regulations").select("id").eq("element_id", element_id).eq("regulation_id", regulation_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking element-regulation link existence: {e}")
        return False

def get_all_element_regulation_links(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all element-regulation links with pagination.
    
    Args:
        limit: Maximum number of links to return (default: 100)
        offset: Number of links to skip (default: 0)
        
    Returns:
        Dictionary containing list of links or error information
    """
    try:
        response = supabase.table("element_regulations").select("*").range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} element-regulation links")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving all element-regulation links: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_element_regulation_link(link_id: str) -> Dict[str, Any]:
    """
    Delete a specific element-regulation link by its ID.
    
    Args:
        link_id: UUID of the link to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("element_regulations").delete().eq("id", link_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted element-regulation link: {link_id}")
            return {"success": True, "message": "Link deleted successfully"}
        else:
            print(f"❌ Failed to delete element-regulation link: {link_id}")
            return {"success": False, "error": "Link not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting element-regulation link {link_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_element_regulation_link_by_ids(element_id: str, regulation_id: int) -> Dict[str, Any]:
    """
    Delete a specific element-regulation link by element and regulation IDs.
    
    Args:
        element_id: UUID of the element
        regulation_id: ID of the regulation
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("element_regulations").delete().eq("element_id", element_id).eq("regulation_id", regulation_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted element-regulation link: element {element_id} -> regulation {regulation_id}")
            return {"success": True, "message": "Link deleted successfully"}
        else:
            print(f"❌ Failed to delete element-regulation link: element {element_id} -> regulation {regulation_id}")
            return {"success": False, "error": "Link not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting element-regulation link: {e}")
        return {"success": False, "error": str(e)}

def delete_all_links_for_element(element_id: str) -> Dict[str, Any]:
    """
    Delete all regulation links for a specific element.
    
    Args:
        element_id: UUID of the element
        
    Returns:
        Dictionary containing success status and count of deleted links or error information
    """
    try:
        response = supabase.table("element_regulations").delete().eq("element_id", element_id).execute()
        
        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} regulation links for element: {element_id}")
        return {"success": True, "message": f"Deleted {deleted_count} links", "deleted_count": deleted_count}
        
    except Exception as e:
        print(f"❌ Error deleting links for element {element_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_all_links_for_regulation(regulation_id: int) -> Dict[str, Any]:
    """
    Delete all element links for a specific regulation.
    
    Args:
        regulation_id: ID of the regulation
        
    Returns:
        Dictionary containing success status and count of deleted links or error information
    """
    try:
        response = supabase.table("element_regulations").delete().eq("regulation_id", regulation_id).execute()
        
        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} element links for regulation: {regulation_id}")
        return {"success": True, "message": f"Deleted {deleted_count} links", "deleted_count": deleted_count}
        
    except Exception as e:
        print(f"❌ Error deleting links for regulation {regulation_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_multiple_element_regulation_links(element_id: str, regulation_ids: List[int]) -> Dict[str, Any]:
    """
    Delete multiple links between one element and multiple regulations.
    
    Args:
        element_id: UUID of the element
        regulation_ids: List of regulation IDs to unlink from the element
        
    Returns:
        Dictionary containing success status and count of deleted links or error information
    """
    try:
        deleted_count = 0
        errors = []
        
        for regulation_id in regulation_ids:
            result = delete_element_regulation_link_by_ids(element_id, regulation_id)
            if result["success"]:
                deleted_count += 1
            else:
                errors.append(f"Failed to delete link to regulation {regulation_id}: {result['error']}")
        
        if errors:
            print(f"⚠️ Deleted {deleted_count} links with {len(errors)} errors for element: {element_id}")
            return {
                "success": True, 
                "message": f"Deleted {deleted_count} links with {len(errors)} errors",
                "deleted_count": deleted_count,
                "errors": errors
            }
        else:
            print(f"✅ Successfully deleted {deleted_count} regulation links for element: {element_id}")
            return {
                "success": True, 
                "message": f"Deleted {deleted_count} links",
                "deleted_count": deleted_count
            }
        
    except Exception as e:
        print(f"❌ Error deleting multiple links for element {element_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def get_element_regulation_link_count() -> int:
    """
    Get the total number of element-regulation links in the database.
    
    Returns:
        Total count of links
    """
    try:
        response = supabase.table("element_regulations").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting element-regulation link count: {e}")
        return 0

def get_regulation_count_for_element(element_id: str) -> int:
    """
    Get the number of regulations linked to a specific element.
    
    Args:
        element_id: UUID of the element
        
    Returns:
        Count of linked regulations
    """
    try:
        response = supabase.table("element_regulations").select("id", count="exact").eq("element_id", element_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting regulation count for element {element_id}: {e}")
        return 0

def get_element_count_for_regulation(regulation_id: int) -> int:
    """
    Get the number of elements linked to a specific regulation.
    
    Args:
        regulation_id: ID of the regulation
        
    Returns:
        Count of linked elements
    """
    try:
        response = supabase.table("element_regulations").select("id", count="exact").eq("regulation_id", regulation_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting element count for regulation {regulation_id}: {e}")
        return 0

def get_most_linked_regulations(limit: int = 10) -> Dict[str, Any]:
    """
    Get the regulations that are linked to the most elements.
    
    Args:
        limit: Maximum number of regulations to return (default: 10)
        
    Returns:
        Dictionary containing list of regulations with their link counts
    """
    try:
        # This requires a more complex query - using RPC function would be ideal
        # For now, we'll get all links and count them in Python
        response = supabase.table("element_regulations").select("regulation_id").execute()
        
        if response.data:
            # Count occurrences of each regulation_id
            regulation_counts = {}
            for link in response.data:
                reg_id = link["regulation_id"]
                regulation_counts[reg_id] = regulation_counts.get(reg_id, 0) + 1
            
            # Sort by count and take top N
            sorted_regulations = sorted(regulation_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            result = [{"regulation_id": reg_id, "link_count": count} for reg_id, count in sorted_regulations]
            
            print(f"✅ Successfully retrieved top {len(result)} most linked regulations")
            return {"success": True, "data": result}
        else:
            return {"success": True, "data": []}
            
    except Exception as e:
        print(f"❌ Error getting most linked regulations: {e}")
        return {"success": False, "error": str(e)}

def get_most_linked_elements(limit: int = 10) -> Dict[str, Any]:
    """
    Get the elements that are linked to the most regulations.
    
    Args:
        limit: Maximum number of elements to return (default: 10)
        
    Returns:
        Dictionary containing list of elements with their link counts
    """
    try:
        response = supabase.table("element_regulations").select("element_id").execute()
        
        if response.data:
            # Count occurrences of each element_id
            element_counts = {}
            for link in response.data:
                elem_id = link["element_id"]
                element_counts[elem_id] = element_counts.get(elem_id, 0) + 1
            
            # Sort by count and take top N
            sorted_elements = sorted(element_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            result = [{"element_id": elem_id, "link_count": count} for elem_id, count in sorted_elements]
            
            print(f"✅ Successfully retrieved top {len(result)} most linked elements")
            return {"success": True, "data": result}
        else:
            return {"success": True, "data": []}
            
    except Exception as e:
        print(f"❌ Error getting most linked elements: {e}")
        return {"success": False, "error": str(e)}