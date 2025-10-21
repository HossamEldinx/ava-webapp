"""
CRUD operations for the projects table.

This module provides Create, Read, Update, Delete operations for managing projects
in the PostgreSQL database through Supabase.

Table Schema:
- id: UUID (primary key, auto-generated)
- user_id: UUID (foreign key to users table, not null)
- name: TEXT (not null, length 1-255)
- description: TEXT (optional)
- status: TEXT (default 'active', check: 'active', 'inactive', 'archived')
- lv_bezeichnung: TEXT (optional)
- auftraggeber: TEXT (optional)
- nr: TEXT (optional)
- dateiname: TEXT (optional)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)

Constraints:
- user_id must reference an existing user (CASCADE DELETE)
- name must be between 1 and 255 characters
- status must be one of: 'active', 'inactive', 'archived'
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from .files_service import get_files_by_project_id, delete_file_from_storage

# Initialize Supabase client
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Valid status values
VALID_STATUSES = ['active', 'inactive', 'archived']

# CREATE Operations
def create_project(user_id: str, name: str, description: Optional[str] = None, status: str = 'active',
                  lv_bezeichnung: Optional[str] = None, auftraggeber: Optional[str] = None,
                  nr: Optional[str] = None, dateiname: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new project in the projects table.
    
    Args:
        user_id: UUID of the user who owns this project
        name: Project name (must be 1-255 characters)
        description: Optional description of the project
        status: Project status ('active', 'inactive', 'archived'), defaults to 'active'
        lv_bezeichnung: Optional LV designation
        auftraggeber: Optional client/contractor information
        nr: Optional project number
        dateiname: Optional filename
        
    Returns:
        Dictionary containing the created project data or error information
        
    Raises:
        Exception: If database operation fails
    """
    try:
        # Validate required fields
        name = name.strip() if name else ""
        
        if not name:
            return {"success": False, "error": "Project name cannot be empty"}
        
        if len(name) > 255:
            return {"success": False, "error": "Project name cannot exceed 255 characters"}
        
        if status not in VALID_STATUSES:
            return {"success": False, "error": f"Status must be one of: {', '.join(VALID_STATUSES)}"}
        
        project_data = {
            "user_id": user_id,
            "name": name,
            "description": description.strip() if description else None,
            "status": status,
            "lv_bezeichnung": lv_bezeichnung.strip() if lv_bezeichnung else None,
            "auftraggeber": auftraggeber.strip() if auftraggeber else None,
            "nr": nr.strip() if nr else None,
            "dateiname": dateiname.strip() if dateiname else None
        }
        
        response = supabase.table("projects").insert(project_data).execute()
        
        if response.data:
            print(f"✅ Successfully created project: {name} for user: {user_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create project: {name}")
            return {"success": False, "error": "Failed to create project"}
            
    except Exception as e:
        print(f"❌ Error creating project {name}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_project_by_id(project_id: str) -> Dict[str, Any]:
    """
    Retrieve a project by its ID.
    
    Args:
        project_id: UUID of the project to retrieve
        
    Returns:
        Dictionary containing project data or error information
    """
    try:
        response = supabase.table("projects").select("*").eq("id", project_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved project: {project_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Project not found: {project_id}")
            return {"success": False, "error": "Project not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving project {project_id}: {e}")
        return {"success": False, "error": str(e)}

def get_projects_by_user_id(user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all projects belonging to a specific user.
    
    Args:
        user_id: UUID of the user whose projects to retrieve
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        response = supabase.table("projects").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} projects for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving projects for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def get_projects_by_status(status: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all projects with a specific status.
    
    Args:
        status: Status of projects to retrieve ('active', 'inactive', 'archived')
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        if status not in VALID_STATUSES:
            return {"success": False, "error": f"Status must be one of: {', '.join(VALID_STATUSES)}"}
        
        response = supabase.table("projects").select("*").eq("status", status).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} projects with status: {status}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving projects with status {status}: {e}")
        return {"success": False, "error": str(e)}

def get_projects_by_user_and_status(user_id: str, status: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve projects belonging to a specific user with a specific status.
    
    Args:
        user_id: UUID of the user whose projects to retrieve
        status: Status of projects to retrieve
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        if status not in VALID_STATUSES:
            return {"success": False, "error": f"Status must be one of: {', '.join(VALID_STATUSES)}"}
        
        response = supabase.table("projects").select("*").eq("user_id", user_id).eq("status", status).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} projects with status '{status}' for user: {user_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving projects with status {status} for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

def search_projects_by_name(search_term: str, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Search projects by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in project names
        user_id: Optional user ID to limit search to specific user's projects
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of matching projects or error information
    """
    try:
        query = supabase.table("projects").select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        query = query.ilike("name", f"%{search_term}%").order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully found {len(response.data)} projects matching '{search_term}'")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error searching projects with term '{search_term}': {e}")
        return {"success": False, "error": str(e)}

def get_all_projects(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all projects with pagination.
    
    Args:
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        response = supabase.table("projects").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} projects")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving all projects: {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_project(project_id: str, name: Optional[str] = None, description: Optional[str] = None,
                  status: Optional[str] = None, lv_bezeichnung: Optional[str] = None,
                  auftraggeber: Optional[str] = None, nr: Optional[str] = None,
                  dateiname: Optional[str] = None) -> Dict[str, Any]:
    """
    Update project information.
    
    Args:
        project_id: UUID of the project to update
        name: New project name (optional, must be 1-255 characters if provided)
        description: New description (optional, can be None to clear)
        status: New project status (optional, must be valid status if provided)
        lv_bezeichnung: New LV designation (optional, can be None to clear)
        auftraggeber: New client/contractor information (optional, can be None to clear)
        nr: New project number (optional, can be None to clear)
        dateiname: New filename (optional, can be None to clear)
        
    Returns:
        Dictionary containing updated project data or error information
    """
    try:
        update_data = {}
        
        if name is not None:
            name = name.strip()
            if not name:
                return {"success": False, "error": "Project name cannot be empty"}
            if len(name) > 255:
                return {"success": False, "error": "Project name cannot exceed 255 characters"}
            update_data["name"] = name
            
        if description is not None:
            update_data["description"] = description.strip() if description else None
            
        if status is not None:
            if status not in VALID_STATUSES:
                return {"success": False, "error": f"Status must be one of: {', '.join(VALID_STATUSES)}"}
            update_data["status"] = status
            
        if lv_bezeichnung is not None:
            update_data["lv_bezeichnung"] = lv_bezeichnung.strip() if lv_bezeichnung else None
            
        if auftraggeber is not None:
            update_data["auftraggeber"] = auftraggeber.strip() if auftraggeber else None
            
        if nr is not None:
            update_data["nr"] = nr.strip() if nr else None
            
        if dateiname is not None:
            update_data["dateiname"] = dateiname.strip() if dateiname else None
        
        if not update_data:
            return {"success": False, "error": "No update data provided"}
        
        response = supabase.table("projects").update(update_data).eq("id", project_id).execute()
        
        if response.data:
            print(f"✅ Successfully updated project: {project_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to update project: {project_id}")
            return {"success": False, "error": "Project not found or update failed"}
            
    except Exception as e:
        print(f"❌ Error updating project {project_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_project(project_id: str) -> Dict[str, Any]:
    """
    Delete a project from the database and all associated files from storage.

    This function will:
    1. Get all files associated with the project
    2. Delete each file from Supabase Storage
    3. Delete the project (which will cascade delete file records from database)

    Args:
        project_id: UUID of the project to delete

    Returns:
        Dictionary containing success status or error information
    """
    try:
        # First, get all files associated with this project
        files_result = get_files_by_project_id(project_id, include_inactive=True, limit=1000)
        if not files_result["success"]:
            print(f"⚠️ Warning: Could not retrieve files for project {project_id}: {files_result['error']}")
            files_to_delete = []
        else:
            files_to_delete = files_result["data"]

        # Delete files from storage
        storage_deletions_success = 0
        storage_deletions_failed = 0

        for file_record in files_to_delete:
            file_id = file_record["id"]
            storage_result = delete_file_from_storage(file_id, delete_db_record=False)  # Don't delete DB record yet

            if storage_result["success"]:
                storage_deletions_success += 1
                print(f"✅ Deleted file from storage: {file_record['name']}")
            else:
                storage_deletions_failed += 1
                print(f"⚠️ Failed to delete file from storage: {file_record['name']} - {storage_result['error']}")

        print(f"📊 Storage cleanup: {storage_deletions_success} successful, {storage_deletions_failed} failed")

        # Now delete the project (this will cascade delete all file records from database)
        response = supabase.table("projects").delete().eq("id", project_id).execute()

        if response.data:
            print(f"✅ Successfully deleted project: {project_id} and {storage_deletions_success} associated files from storage")
            return {
                "success": True,
                "message": "Project and associated files deleted successfully",
                "files_deleted_from_storage": storage_deletions_success,
                "files_failed_to_delete": storage_deletions_failed
            }
        else:
            print(f"❌ Failed to delete project: {project_id}")
            return {"success": False, "error": "Project not found or delete failed"}

    except Exception as e:
        print(f"❌ Error deleting project {project_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_projects_by_user_id(user_id: str) -> Dict[str, Any]:
    """
    Delete all projects belonging to a specific user and all associated files from storage.

    This function will:
    1. Get all projects for the user
    2. For each project, delete all associated files from storage
    3. Delete all projects (which will cascade delete file records from database)

    Args:
        user_id: UUID of the user whose projects to delete

    Returns:
        Dictionary containing success status and count of deleted projects or error information
    """
    try:
        # First, get all projects for this user
        projects_result = get_projects_by_user_id(user_id, limit=1000)
        if not projects_result["success"]:
            print(f"⚠️ Warning: Could not retrieve projects for user {user_id}: {projects_result['error']}")
            projects_to_delete = []
        else:
            projects_to_delete = projects_result["data"]

        total_storage_deletions_success = 0
        total_storage_deletions_failed = 0

        # For each project, delete associated files from storage
        for project in projects_to_delete:
            project_id = project["id"]
            project_name = project["name"]

            # Get all files for this project
            files_result = get_files_by_project_id(project_id, include_inactive=True, limit=1000)
            if not files_result["success"]:
                print(f"⚠️ Warning: Could not retrieve files for project {project_name}: {files_result['error']}")
                continue

            files_to_delete = files_result["data"]

            # Delete files from storage for this project
            for file_record in files_to_delete:
                file_id = file_record["id"]
                storage_result = delete_file_from_storage(file_id, delete_db_record=False)

                if storage_result["success"]:
                    total_storage_deletions_success += 1
                    print(f"✅ Deleted file from storage: {file_record['name']} (project: {project_name})")
                else:
                    total_storage_deletions_failed += 1
                    print(f"⚠️ Failed to delete file from storage: {file_record['name']} - {storage_result['error']}")

        # Now delete all projects for the user (this will cascade delete all file records from database)
        response = supabase.table("projects").delete().eq("user_id", user_id).execute()

        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} projects for user: {user_id}")
        print(f"📊 Total storage cleanup: {total_storage_deletions_success} files deleted, {total_storage_deletions_failed} failed")

        return {
            "success": True,
            "message": f"Deleted {deleted_count} projects and {total_storage_deletions_success} associated files",
            "deleted_count": deleted_count,
            "files_deleted_from_storage": total_storage_deletions_success,
            "files_failed_to_delete": total_storage_deletions_failed
        }

    except Exception as e:
        print(f"❌ Error deleting projects for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def get_project_count_by_user(user_id: str) -> int:
    """
    Get the total number of projects for a specific user.
    
    Args:
        user_id: UUID of the user
        
    Returns:
        Total count of projects for the user
    """
    try:
        response = supabase.table("projects").select("id", count="exact").eq("user_id", user_id).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting project count for user {user_id}: {e}")
        return 0

def get_project_count_by_status(status: str) -> int:
    """
    Get the total number of projects with a specific status.
    
    Args:
        status: Status of projects to count
        
    Returns:
        Total count of projects with the specified status
    """
    try:
        if status not in VALID_STATUSES:
            return 0
        response = supabase.table("projects").select("id", count="exact").eq("status", status).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting project count for status {status}: {e}")
        return 0

def get_total_project_count() -> int:
    """
    Get the total number of projects in the database.
    
    Returns:
        Total count of projects
    """
    try:
        response = supabase.table("projects").select("id", count="exact").execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting total project count: {e}")
        return 0

def check_project_exists(project_id: str) -> bool:
    """
    Check if a project exists in the database.
    
    Args:
        project_id: UUID of the project to check
        
    Returns:
        True if project exists, False otherwise
    """
    try:
        response = supabase.table("projects").select("id").eq("id", project_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking project existence {project_id}: {e}")
        return False

def get_projects_with_file_counts(user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve projects with their file counts.
    
    Args:
        user_id: Optional user ID to filter projects by user
        limit: Maximum number of projects to return (default: 100)
        offset: Number of projects to skip (default: 0)
        
    Returns:
        Dictionary containing list of projects with file counts or error information
    """
    try:
        # First get projects
        query = supabase.table("projects").select("*").order("created_at", desc=True).range(offset, offset + limit - 1)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        response = query.execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0}
        
        # Get file counts for each project
        projects_with_counts = []
        for project in response.data:
            # Get file count for this project
            file_response = supabase.table("files").select("id", count="exact").eq("project_id", project["id"]).eq("is_active", True).execute()
            file_count = file_response.count if file_response.count is not None else 0
            
            # Add file count to project
            project["file_count"] = file_count
            projects_with_counts.append(project)
        
        print(f"✅ Successfully retrieved {len(projects_with_counts)} projects with file counts")
        return {"success": True, "data": projects_with_counts, "count": len(projects_with_counts)}
        
    except Exception as e:
        print(f"❌ Error retrieving projects with file counts: {e}")
        return {"success": False, "error": str(e)}

def get_project_statistics(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get project statistics (total, by status).
    
    Args:
        user_id: Optional user ID to filter statistics by user
        
    Returns:
        Dictionary containing project statistics or error information
    """
    try:
        stats = {
            "total": 0,
            "active": 0,
            "inactive": 0,
            "archived": 0
        }
        
        # Get total count
        query = supabase.table("projects").select("id", count="exact")
        if user_id:
            query = query.eq("user_id", user_id)
        
        total_response = query.execute()
        stats["total"] = total_response.count if total_response.count is not None else 0
        
        # Get counts by status
        for status in VALID_STATUSES:
            status_query = supabase.table("projects").select("id", count="exact").eq("status", status)
            if user_id:
                status_query = status_query.eq("user_id", user_id)
            
            status_response = status_query.execute()
            stats[status] = status_response.count if status_response.count is not None else 0
        
        print(f"✅ Successfully retrieved project statistics")
        return {"success": True, "data": stats}
        
    except Exception as e:
        print(f"❌ Error retrieving project statistics: {e}")
        return {"success": False, "error": str(e)}