"""
CRUD operations for the boqs table.

This module provides Create, Read, Update, Delete operations for managing BOQs (Bill of Quantities)
in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- project_id: UUID (foreign key to projects table, not null)
- name: TEXT (not null, length 1-255)
- description: TEXT (optional)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- original_filename: TEXT (optional)
- lv_code: TEXT (not null)
- lv_bezeichnung: TEXT (optional)
- work_type: TEXT (not null)

Constraints:
- project_id must reference an existing project (CASCADE DELETE)
- name must be between 1 and 255 characters
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from .projects_service import get_project_by_id

# Initialize Supabase client
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# CREATE Operations
def create_boq(
    project_id: str,
    name: str,
    lv_code: str,
    work_type: str,
    description: Optional[str] = None,
    original_filename: Optional[str] = None,
    lv_bezeichnung: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new BOQ in the boqs table.
    
    Args:
        project_id: UUID of the project this BOQ belongs to
        name: BOQ name (must be 1-255 characters)
        original_filename: Original filename of the BOQ (optional)
        lv_code: LV Code (not null)
        lv_bezeichnung: LV Bezeichnung (optional)
        work_type: Work Type (not null)
        description: Optional description of the BOQ
        
    Returns:
        Dictionary containing the created BOQ data or error information
        
    Raises:
        Exception: If database operation fails
    """
    try:
        # Validate required fields
        name = name.strip() if name else ""
        lv_code = lv_code.strip() if lv_code else ""
        work_type = work_type.strip() if work_type else ""

        if not name:
            return {"success": False, "error": "BOQ name cannot be empty"}
        
        if len(name) > 255:
            return {"success": False, "error": "BOQ name cannot exceed 255 characters"}
        
        if not lv_code:
            return {"success": False, "error": "LV Code cannot be empty"}
        
        if not work_type:
            return {"success": False, "error": "Work Type cannot be empty"}
        
        boq_data = {
            "project_id": project_id,
            "name": name,
            "description": description.strip() if description else None,
            "original_filename": original_filename.strip() if original_filename else None,
            "lv_code": lv_code,
            "lv_bezeichnung": lv_bezeichnung.strip() if lv_bezeichnung else None,
            "work_type": work_type
        }
        
        response = supabase.table("boqs").insert(boq_data).execute()
        
        if response.data:
            print(f"✅ Successfully created BOQ: {name} for project: {project_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create BOQ: {name}")
            return {"success": False, "error": "Failed to create BOQ"}
            
    except Exception as e:
        print(f"❌ Error creating BOQ {name}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_boq_by_id(boq_id: str) -> Dict[str, Any]:
    """
    Retrieve a BOQ by its ID.
    
    Args:
        boq_id: UUID of the BOQ to retrieve
        
    Returns:
        Dictionary containing BOQ data or error information
    """
    try:
        response = supabase.table("boqs").select("*").eq("id", boq_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved BOQ: {boq_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ BOQ not found: {boq_id}")
            return {"success": False, "error": "BOQ not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving BOQ {boq_id}: {e}")
        return {"success": False, "error": str(e)}

def get_boqs_by_project_id(project_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all BOQs belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose BOQs to retrieve
        limit: Maximum number of BOQs to return (default: 100)
        offset: Number of BOQs to skip (default: 0)
        
    Returns:
        Dictionary containing list of BOQs or error information
    """
    try:
        response = supabase.table("boqs").select("*").eq("project_id", project_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} BOQs for project: {project_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving BOQs for project {project_id}: {e}")
        return {"success": False, "error": str(e)}

def get_all_boqs(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all BOQs with pagination.
    
    Args:
        limit: Maximum number of BOQs to return (default: 100)
        offset: Number of BOQs to skip (default: 0)
        
    Returns:
        Dictionary containing list of BOQs or error information
    """
    try:
        response = supabase.table("boqs").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} BOQs")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving all BOQs: {e}")
        return {"success": False, "error": str(e)}

def search_boqs_by_name(search_term: str, project_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Search BOQs by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in BOQ names
        project_id: Optional project ID to limit search to specific project's BOQs
        limit: Maximum number of BOQs to return (default: 100)
        offset: Number of BOQs to skip (default: 0)
        
    Returns:
        Dictionary containing list of matching BOQs or error information
    """
    try:
        query = supabase.table("boqs").select("*")
        
        if project_id:
            query = query.eq("project_id", project_id)
        
        query = query.ilike("name", f"%{search_term}%").order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully found {len(response.data)} BOQs matching '{search_term}'")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error searching BOQs with term '{search_term}': {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_boq(
    boq_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    original_filename: Optional[str] = None,
    lv_code: Optional[str] = None,
    lv_bezeichnung: Optional[str] = None,
    work_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update BOQ information.
    
    Args:
        boq_id: UUID of the BOQ to update
        name: New BOQ name (optional, must be 1-255 characters if provided)
        description: New description (optional, can be None to clear)
        original_filename: New original filename (optional, can be None to clear)
        lv_code: New LV Code (optional)
        lv_bezeichnung: New LV Bezeichnung (optional, can be None to clear)
        work_type: New Work Type (optional)
        
    Returns:
        Dictionary containing updated BOQ data or error information
    """
    try:
        update_data = {}
        
        if name is not None:
            name = name.strip()
            if not name:
                return {"success": False, "error": "BOQ name cannot be empty"}
            if len(name) > 255:
                return {"success": False, "error": "BOQ name cannot exceed 255 characters"}
            update_data["name"] = name
            
        if description is not None:
            update_data["description"] = description.strip() if description else None
        
        if original_filename is not None:
            update_data["original_filename"] = original_filename.strip() if original_filename else None
            
        if lv_code is not None:
            lv_code = lv_code.strip()
            if not lv_code:
                return {"success": False, "error": "LV Code cannot be empty"}
            update_data["lv_code"] = lv_code
            
        if lv_bezeichnung is not None:
            update_data["lv_bezeichnung"] = lv_bezeichnung.strip() if lv_bezeichnung else None
            
        if work_type is not None:
            work_type = work_type.strip()
            if not work_type:
                return {"success": False, "error": "Work Type cannot be empty"}
            update_data["work_type"] = work_type
        
        if not update_data:
            return {"success": False, "error": "No update data provided"}
        
        response = supabase.table("boqs").update(update_data).eq("id", boq_id).execute()
        
        if response.data:
            print(f"✅ Successfully updated BOQ: {boq_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to update BOQ: {boq_id}")
            return {"success": False, "error": "BOQ not found or update failed"}
            
    except Exception as e:
        print(f"❌ Error updating BOQ {boq_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_boq(boq_id: str) -> Dict[str, Any]:
    """
    Delete a BOQ from the database.
    
    Note: This will cascade delete all related files records.
    
    Args:
        boq_id: UUID of the BOQ to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("boqs").delete().eq("id", boq_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted BOQ: {boq_id}")
            return {"success": True, "message": "BOQ deleted successfully"}
        else:
            print(f"❌ Failed to delete BOQ: {boq_id}")
            return {"success": False, "error": "BOQ not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting BOQ {boq_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_boqs_by_project_id(project_id: str) -> Dict[str, Any]:
    """
    Delete all BOQs belonging to a specific project.
    
    Note: This will cascade delete all related files records.
    
    Args:
        project_id: UUID of the project whose BOQs to delete
        
    Returns:
        Dictionary containing success status and count of deleted BOQs or error information
    """
    try:
        response = supabase.table("boqs").delete().eq("project_id", project_id).execute()
        
        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} BOQs for project: {project_id}")
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} BOQs",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        print(f"❌ Error deleting BOQs for project {project_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def get_boq_count_by_project(project_id: str) -> int:
    """
    Get the total number of BOQs for a specific project.
    
    Args:
        project_id: UUID of the project
        
    Returns:
        Total count of BOQs for the project
    """
    try:
        response = supabase.table("boqs").select("id", count="exact").eq("project_id", project_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting BOQ count for project {project_id}: {e}")
        return 0

def get_total_boq_count() -> int:
    """
    Get the total number of BOQs in the database.
    
    Returns:
        Total count of BOQs
    """
    try:
        response = supabase.table("boqs").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting total BOQ count: {e}")
        return 0

def check_boq_exists(boq_id: str) -> bool:
    """
    Check if a BOQ exists in the database.
    
    Args:
        boq_id: UUID of the BOQ to check
        
    Returns:
        True if BOQ exists, False otherwise
    """
    try:
        response = supabase.table("boqs").select("id").eq("id", boq_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking BOQ existence {boq_id}: {e}")
        return False

def get_files_by_boq_id(boq_id: str, include_inactive: bool = False, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Get all files related to a specific BOQ.
    
    Args:
        boq_id: UUID of the BOQ whose files to retrieve
        include_inactive: Whether to include inactive files (default: False)
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        query = supabase.table("files").select("*").eq("boq_id", boq_id)
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files for BOQ: {boq_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files for BOQ {boq_id}: {e}")
        return {"success": False, "error": str(e)}

def get_boqs_with_file_counts(project_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve BOQs with their file counts.
    
    Args:
        project_id: Optional project ID to filter BOQs by project
        limit: Maximum number of BOQs to return (default: 100)
        offset: Number of BOQs to skip (default: 0)
        
    Returns:
        Dictionary containing list of BOQs with file counts or error information
    """
    try:
        # First get BOQs
        query = supabase.table("boqs").select("*").order("created_at", desc=True).range(offset, offset + limit - 1)
        
        if project_id:
            query = query.eq("project_id", project_id)
        
        response = query.execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0}
        
        # Get file counts for each BOQ
        if not response.data:
            return {"success": True, "data": [], "count": 0}

        # Collect all unique project_ids
        project_ids = list(set(boq["project_id"] for boq in response.data if boq.get("project_id")))
        
        projects_map = {}
        if project_ids:
            # Fetch all projects in a single query
            projects_response = supabase.table("projects").select("id, name").in_("id", project_ids).execute()
            if projects_response.data:
                projects_map = {project["id"]: project["name"] for project in projects_response.data}

        boqs_with_counts = []
        for boq in response.data:
            # Get file count for this BOQ
            file_response = supabase.table("files").select("id", count="exact").eq("boq_id", boq["id"]).eq("is_active", True).execute()
            file_count = file_response.count if file_response.count is not None else 0
            
            # Add file count and project name to BOQ
            boq["file_count"] = file_count
            boq["project_name"] = projects_map.get(boq.get("project_id"))
            boqs_with_counts.append(boq)
        
        print(f"✅ Successfully retrieved {len(boqs_with_counts)} BOQs with file counts")
        return {"success": True, "data": boqs_with_counts, "count": len(boqs_with_counts)}
        
    except Exception as e:
        print(f"❌ Error retrieving BOQs with file counts: {e}")
        return {"success": False, "error": str(e)}