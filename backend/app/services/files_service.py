"""
CRUD operations for the files table and Supabase Storage bucket operations.

This module provides Create, Read, Update, Delete operations for managing files
in the PostgreSQL database through Supabase, as well as file upload/download
operations to/from Supabase Storage buckets.

Table Schema:
- id: UUID (primary key, auto-generated)
- project_id: UUID (foreign key to projects table, not null)
- name: TEXT (not null, length 1-255)
- file_path: TEXT (optional)
- file_size: BIGINT (optional, must be >= 0)
- file_type: TEXT (optional)
- mime_type: TEXT (optional)
- is_active: BOOLEAN (default true)
- created_at: TIMESTAMP WITH TIME ZONE (auto-generated)
- updated_at: TIMESTAMP WITH TIME ZONE (auto-generated)

Constraints:
- project_id must reference an existing project (CASCADE DELETE)
- name must be between 1 and 255 characters
- file_size must be >= 0 if provided
"""

import os
import mimetypes
from io import BytesIO
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional, Union, BinaryIO
import xmltodict
import json
import re


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to make it safe for storage.
    
    Args:
        filename: The original filename
        
    Returns:
        A sanitized filename with special characters replaced
    """
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    
    # Remove or replace invalid characters for Supabase storage
    # Keep alphanumeric, dots, underscores, and hyphens
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Ensure we don't have multiple consecutive underscores
    filename = re.sub(r'_+', '_', filename)
    
    # Remove leading/trailing underscores
    filename = filename.strip('_')
    
    # Ensure the filename is not empty
    if not filename:
        filename = "unnamed_file"
    
    return filename

# Initialize Supabase client
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Storage bucket configuration
DEFAULT_BUCKET_NAME = "files"  # Default bucket name for file storage

# CREATE Operations
def create_file(project_id: str, name: str, file_path: Optional[str] = None,
               file_size: Optional[int] = None, file_type: Optional[str] = None,
               mime_type: Optional[str] = None, is_active: bool = True,
               boq_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new file record in the files table.
    
    Args:
        project_id: UUID of the project this file belongs to
        name: File name (must be 1-255 characters)
        file_path: Optional path to the file
        file_size: Optional file size in bytes (must be >= 0)
        file_type: Optional file type/extension
        mime_type: Optional MIME type
        is_active: Whether the file is active (default: True)
        boq_id: Optional UUID of the BOQ this file belongs to
        
    Returns:
        Dictionary containing the created file data or error information
        
    Raises:
        Exception: If database operation fails
    """
    try:
        # Validate required fields
        name = name.strip() if name else ""
        
        if not name:
            return {"success": False, "error": "File name cannot be empty"}
        
        if len(name) > 255:
            return {"success": False, "error": "File name cannot exceed 255 characters"}
        
        if file_size is not None and file_size < 0:
            return {"success": False, "error": "File size must be >= 0"}
        
        file_data = {
            "project_id": project_id,
            "name": name,
            "file_path": file_path.strip() if file_path else None,
            "file_size": file_size,
            "file_type": file_type.strip() if file_type else None,
            "mime_type": mime_type.strip() if mime_type else None,
            "is_active": is_active,
            "boq_id": boq_id
        }
        
        response = supabase.table("files").insert(file_data).execute()
        
        if response.data:
            print(f"✅ Successfully created file: {name} for project: {project_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to create file: {name}")
            return {"success": False, "error": "Failed to create file"}
            
    except Exception as e:
        print(f"❌ Error creating file {name}: {e}")
        return {"success": False, "error": str(e)}

# READ Operations
def get_file_by_id(file_id: str) -> Dict[str, Any]:
    """
    Retrieve a file by its ID.
    
    Args:
        file_id: UUID of the file to retrieve
        
    Returns:
        Dictionary containing file data or error information
    """
    try:
        response = supabase.table("files").select("*").eq("id", file_id).execute()
        
        if response.data:
            print(f"✅ Successfully retrieved file: {file_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ File not found: {file_id}")
            return {"success": False, "error": "File not found"}
            
    except Exception as e:
        print(f"❌ Error retrieving file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def get_files_by_project_id(project_id: str, include_inactive: bool = False, 
                           limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all files belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose files to retrieve
        include_inactive: Whether to include inactive files (default: False)
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        query = supabase.table("files").select("*").eq("project_id", project_id)
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files for project: {project_id}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files for project {project_id}: {e}")
        return {"success": False, "error": str(e)}

def get_files_by_type(file_type: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all files of a specific type.
    
    Args:
        file_type: Type of files to retrieve
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        response = supabase.table("files").select("*").eq("file_type", file_type).eq("is_active", True).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files of type: {file_type}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files of type {file_type}: {e}")
        return {"success": False, "error": str(e)}

def get_files_by_mime_type(mime_type: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all files of a specific MIME type.
    
    Args:
        mime_type: MIME type of files to retrieve
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        response = supabase.table("files").select("*").eq("mime_type", mime_type).eq("is_active", True).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files of MIME type: {mime_type}")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files of MIME type {mime_type}: {e}")
        return {"success": False, "error": str(e)}

def search_files_by_name(search_term: str, project_id: Optional[str] = None, 
                        limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Search files by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in file names
        project_id: Optional project ID to limit search to specific project's files
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of matching files or error information
    """
    try:
        query = supabase.table("files").select("*").eq("is_active", True)
        
        if project_id:
            query = query.eq("project_id", project_id)
        
        query = query.ilike("name", f"%{search_term}%").order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully found {len(response.data)} files matching '{search_term}'")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error searching files with term '{search_term}': {e}")
        return {"success": False, "error": str(e)}

def get_files_by_size_range(min_size: Optional[int] = None, max_size: Optional[int] = None,
                           limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve files within a specific size range.
    
    Args:
        min_size: Minimum file size in bytes (optional)
        max_size: Maximum file size in bytes (optional)
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        query = supabase.table("files").select("*").eq("is_active", True)
        
        if min_size is not None:
            query = query.gte("file_size", min_size)
        
        if max_size is not None:
            query = query.lte("file_size", max_size)
        
        query = query.order("file_size", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files in size range")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files by size range: {e}")
        return {"success": False, "error": str(e)}

def get_all_files(include_inactive: bool = False, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve all files with pagination.
    
    Args:
        include_inactive: Whether to include inactive files (default: False)
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        query = supabase.table("files").select("*")
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving all files: {e}")
        return {"success": False, "error": str(e)}

# UPDATE Operations
def update_file(file_id: str, name: Optional[str] = None, file_path: Optional[str] = None,
               file_size: Optional[int] = None, file_type: Optional[str] = None,
               mime_type: Optional[str] = None, is_active: Optional[bool] = None,
               content: Optional[str] = None, boq_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Update file information.
    
    Args:
        file_id: UUID of the file to update
        name: New file name (optional, must be 1-255 characters if provided)
        file_path: New file path (optional)
        file_size: New file size (optional, must be >= 0 if provided)
        file_type: New file type (optional)
        mime_type: New MIME type (optional)
        is_active: New active status (optional)
        content: New content (optional)
        boq_id: New BOQ ID (optional, can be None to clear)
        
    Returns:
        Dictionary containing updated file data or error information
    """
    try:
        update_data = {}
        
        if name is not None:
            name = name.strip()
            if not name:
                return {"success": False, "error": "File name cannot be empty"}
            if len(name) > 255:
                return {"success": False, "error": "File name cannot exceed 255 characters"}
            update_data["name"] = name
            
        if file_path is not None:
            update_data["file_path"] = file_path.strip() if file_path else None
            
        if file_size is not None:
            if file_size < 0:
                return {"success": False, "error": "File size must be >= 0"}
            update_data["file_size"] = file_size
            
        if file_type is not None:
            update_data["file_type"] = file_type.strip() if file_type else None
            
        if mime_type is not None:
            update_data["mime_type"] = mime_type.strip() if mime_type else None
            
        if is_active is not None:
            update_data["is_active"] = is_active
            
        if content is not None:
            update_data["content"] = content
            
        if boq_id is not None:
            update_data["boq_id"] = boq_id
        
        if not update_data:
            return {"success": False, "error": "No update data provided"}
        
        response = supabase.table("files").update(update_data).eq("id", file_id).execute()
        
        if response.data:
            print(f"✅ Successfully updated file: {file_id}")
            return {"success": True, "data": response.data[0]}
        else:
            print(f"❌ Failed to update file: {file_id}")
            return {"success": False, "error": "File not found or update failed"}
            
    except Exception as e:
        print(f"❌ Error updating file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def deactivate_file(file_id: str) -> Dict[str, Any]:
    """
    Deactivate a file (soft delete).
    
    Args:
        file_id: UUID of the file to deactivate
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("files").update({"is_active": False}).eq("id", file_id).execute()
        
        if response.data:
            print(f"✅ Successfully deactivated file: {file_id}")
            return {"success": True, "message": "File deactivated successfully", "data": response.data[0]}
        else:
            print(f"❌ Failed to deactivate file: {file_id}")
            return {"success": False, "error": "File not found or deactivation failed"}
            
    except Exception as e:
        print(f"❌ Error deactivating file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def reactivate_file(file_id: str) -> Dict[str, Any]:
    """
    Reactivate a file.
    
    Args:
        file_id: UUID of the file to reactivate
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("files").update({"is_active": True}).eq("id", file_id).execute()
        
        if response.data:
            print(f"✅ Successfully reactivated file: {file_id}")
            return {"success": True, "message": "File reactivated successfully", "data": response.data[0]}
        else:
            print(f"❌ Failed to reactivate file: {file_id}")
            return {"success": False, "error": "File not found or reactivation failed"}
            
    except Exception as e:
        print(f"❌ Error reactivating file {file_id}: {e}")
        return {"success": False, "error": str(e)}

# DELETE Operations
def delete_file(file_id: str) -> Dict[str, Any]:
    """
    Permanently delete a file from the database.
    
    Args:
        file_id: UUID of the file to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        response = supabase.table("files").delete().eq("id", file_id).execute()
        
        if response.data:
            print(f"✅ Successfully deleted file: {file_id}")
            return {"success": True, "message": "File deleted successfully"}
        else:
            print(f"❌ Failed to delete file: {file_id}")
            return {"success": False, "error": "File not found or delete failed"}
            
    except Exception as e:
        print(f"❌ Error deleting file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_files_by_project_id(project_id: str) -> Dict[str, Any]:
    """
    Delete all files belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose files to delete
        
    Returns:
        Dictionary containing success status and count of deleted files or error information
    """
    try:
        response = supabase.table("files").delete().eq("project_id", project_id).execute()
        
        deleted_count = len(response.data) if response.data else 0
        print(f"✅ Successfully deleted {deleted_count} files for project: {project_id}")
        return {"success": True, "message": f"Deleted {deleted_count} files", "deleted_count": deleted_count}
        
    except Exception as e:
        print(f"❌ Error deleting files for project {project_id}: {e}")
        return {"success": False, "error": str(e)}

def bulk_deactivate_files(file_ids: List[str]) -> Dict[str, Any]:
    """
    Deactivate multiple files at once.
    
    Args:
        file_ids: List of file UUIDs to deactivate
        
    Returns:
        Dictionary containing success status and results
    """
    try:
        successful_deactivations = []
        failed_deactivations = []
        
        for file_id in file_ids:
            result = deactivate_file(file_id)
            if result["success"]:
                successful_deactivations.append(file_id)
            else:
                failed_deactivations.append({"file_id": file_id, "error": result["error"]})
        
        print(f"✅ Bulk deactivation completed: {len(successful_deactivations)} successful, {len(failed_deactivations)} failed")
        return {
            "success": True,
            "successful_count": len(successful_deactivations),
            "failed_count": len(failed_deactivations),
            "successful_files": successful_deactivations,
            "failed_files": failed_deactivations
        }
        
    except Exception as e:
        print(f"❌ Error in bulk file deactivation: {e}")
        return {"success": False, "error": str(e)}

# UTILITY Functions
def get_file_count_by_project(project_id: str, include_inactive: bool = False) -> int:
    """
    Get the total number of files for a specific project.
    
    Args:
        project_id: UUID of the project
        include_inactive: Whether to include inactive files (default: False)
        
    Returns:
        Total count of files for the project
    """
    try:
        query = supabase.table("files").select("id", count="exact").eq("project_id", project_id)
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        response = query.execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting file count for project {project_id}: {e}")
        return 0

def get_file_count_by_type(file_type: str) -> int:
    """
    Get the total number of files of a specific type.
    
    Args:
        file_type: Type of files to count
        
    Returns:
        Total count of files of the specified type
    """
    try:
        response = supabase.table("files").select("id", count="exact").eq("file_type", file_type).eq("is_active", True).execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting file count for type {file_type}: {e}")
        return 0

def get_total_file_count(include_inactive: bool = False) -> int:
    """
    Get the total number of files in the database.
    
    Args:
        include_inactive: Whether to include inactive files (default: False)
        
    Returns:
        Total count of files
    """
    try:
        query = supabase.table("files").select("id", count="exact")
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        response = query.execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        print(f"❌ Error getting total file count: {e}")
        return 0

def check_file_exists(file_id: str) -> bool:
    """
    Check if a file exists in the database.
    
    Args:
        file_id: UUID of the file to check
        
    Returns:
        True if file exists, False otherwise
    """
    try:
        response = supabase.table("files").select("id").eq("id", file_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ Error checking file existence {file_id}: {e}")
        return False

def get_unique_file_types() -> List[str]:
    """
    Get all unique file types in the database.
    
    Returns:
        List of unique file types
    """
    try:
        response = supabase.table("files").select("file_type").eq("is_active", True).execute()
        
        if response.data:
            unique_types = list(set(item["file_type"] for item in response.data if item["file_type"]))
            print(f"✅ Found {len(unique_types)} unique file types")
            return unique_types
        else:
            return []
            
    except Exception as e:
        print(f"❌ Error getting unique file types: {e}")
        return []

def get_unique_mime_types() -> List[str]:
    """
    Get all unique MIME types in the database.
    
    Returns:
        List of unique MIME types
    """
    try:
        response = supabase.table("files").select("mime_type").eq("is_active", True).execute()
        
        if response.data:
            unique_types = list(set(item["mime_type"] for item in response.data if item["mime_type"]))
            print(f"✅ Found {len(unique_types)} unique MIME types")
            return unique_types
        else:
            return []
            
    except Exception as e:
        print(f"❌ Error getting unique MIME types: {e}")
        return []

def get_file_statistics(project_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get file statistics (total, by type, size info).
    
    Args:
        project_id: Optional project ID to filter statistics by project
        
    Returns:
        Dictionary containing file statistics or error information
    """
    try:
        query = supabase.table("files").select("*").eq("is_active", True)
        
        if project_id:
            query = query.eq("project_id", project_id)
        
        response = query.execute()
        files = response.data
        
        stats = {
            "total_files": len(files),
            "total_size": sum(f.get("file_size", 0) or 0 for f in files),
            "average_size": 0,
            "file_types": {},
            "mime_types": {}
        }
        
        if stats["total_files"] > 0:
            stats["average_size"] = stats["total_size"] / stats["total_files"]
        
        # Count by file type
        for file in files:
            file_type = file.get("file_type")
            if file_type:
                stats["file_types"][file_type] = stats["file_types"].get(file_type, 0) + 1
        
        # Count by MIME type
        for file in files:
            mime_type = file.get("mime_type")
            if mime_type:
                stats["mime_types"][mime_type] = stats["mime_types"].get(mime_type, 0) + 1
        
        print(f"✅ Successfully retrieved file statistics")
        return {"success": True, "data": stats}
        
    except Exception as e:
        print(f"❌ Error retrieving file statistics: {e}")
        return {"success": False, "error": str(e)}

def get_files_with_project_info(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Retrieve files with their associated project information.
    
    Args:
        limit: Maximum number of files to return (default: 100)
        offset: Number of files to skip (default: 0)
        
    Returns:
        Dictionary containing list of files with project info or error information
    """
    try:
        response = supabase.table("files").select("""
            *,
            projects:project_id (
                id,
                name,
                description,
                status,
                user_id
            )
        """).eq("is_active", True).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        print(f"✅ Successfully retrieved {len(response.data)} files with project info")
        return {"success": True, "data": response.data, "count": len(response.data)}
        
    except Exception as e:
        print(f"❌ Error retrieving files with project info: {e}")
        return {"success": False, "error": str(e)}

# SUPABASE STORAGE OPERATIONS
def upload_file_to_storage(
    file_content: Union[bytes, BinaryIO],
    file_name: str,
    project_id: str,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    content_type: Optional[str] = None,
    boq_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload a file to Supabase Storage bucket and create a database record.
    
    Args:
        file_content: File content as bytes or file-like object
        file_name: Name of the file
        project_id: UUID of the project this file belongs to
        bucket_name: Name of the storage bucket (default: 'files')
        content_type: MIME type of the file (auto-detected if not provided)
        boq_id: Optional UUID of the BOQ this file belongs to
        
    Returns:
        Dictionary containing upload result and file record data
    """
    try:
        # Auto-detect content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(file_name)
            if not content_type:
                content_type = "application/octet-stream"
        
        # Generate storage path: project_id/file_name
        sanitized_file_name = sanitize_filename(file_name)
        storage_path = f"{project_id}/{sanitized_file_name}"
        
        # Get file size
        if isinstance(file_content, bytes):
            file_size = len(file_content)
            file_data = file_content
        else:
            # For file-like objects, read content and get size
            file_data = file_content.read()
            file_size = len(file_data)
            # Reset file pointer if possible
            if hasattr(file_content, 'seek'):
                file_content.seek(0)
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": content_type}
        )
        
        if hasattr(storage_response, 'error') and storage_response.error:
            print(f"❌ Storage upload failed: {storage_response.error}")
            return {"success": False, "error": f"Storage upload failed: {storage_response.error}"}
        
        # Get file extension for file_type
        file_extension = os.path.splitext(file_name)[1].lower().lstrip('.')
        
        # Create database record
        db_result = create_file(
            project_id=project_id,
            name=file_name,
            file_path=storage_path,
            file_size=file_size,
            file_type=file_extension if file_extension else None,
            mime_type=content_type,
            is_active=True,
            boq_id=boq_id
        )
        
        if not db_result["success"]:
            # If database record creation fails, try to delete the uploaded file
            try:
                supabase.storage.from_(bucket_name).remove([storage_path])
            except:
                pass  # Ignore cleanup errors
            return {"success": False, "error": f"Database record creation failed: {db_result['error']}"}
        
        # Get public URL for the uploaded file
        try:
            public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
            db_result["data"]["public_url"] = public_url
        except Exception as e:
            print(f"⚠️ Could not generate public URL: {e}")
        
        print(f"✅ Successfully uploaded file: {file_name} to {storage_path}")
        return {
            "success": True,
            "message": "File uploaded successfully",
            "data": db_result["data"],
            "storage_path": storage_path,
            "bucket_name": bucket_name
        }
        
    except Exception as e:
        print(f"❌ Error uploading file {file_name}: {e}")
        return {"success": False, "error": str(e)}

def upload_and_process_onlv_file(
    project_id: str,
    file_name: str,
    file_content: bytes,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    boq_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Uploads an .onlv file to Supabase Storage, parses its XML content to JSON,
    and saves the parsed JSON to the 'content' column of the file's database record.

    Args:
        project_id: UUID of the project this file belongs to.
        file_name: Name of the .onlv file.
        file_content: The binary content of the .onlv file.
        bucket_name: Name of the storage bucket (default: 'files').
        boq_id: Optional UUID of the BOQ this file belongs to.

    Returns:
        Dictionary containing the upload and processing result.
    """
    try:
        if not file_name.endswith('.onlv'):
            return {"success": False, "error": "File must have .onlv extension"}

        # 1. Upload the original .onlv file to Supabase Storage
        upload_result = upload_file_to_storage(
            file_content=file_content,
            file_name=file_name,
            project_id=project_id,
            bucket_name=bucket_name,
            content_type="application/xml", # .onlv files are XML
            boq_id=boq_id
        )

        if not upload_result["success"]:
            return {"success": False, "error": f"Failed to upload ONLV file to storage: {upload_result['error']}"}
        
        file_record_data = upload_result["data"]
        file_id = file_record_data["id"]

        # 2. Parse the XML content to JSON
        try:
            xml_content = file_content.decode('utf-8')
            
            # Define elements that should always be treated as arrays
            array_elements = [
                "leistungsteil",
                "position",
                "teilposition",
                "zuschlag",
                "abschlag",
                "kennwert"
            ]
            
            # Convert XML to dictionary using xmltodict with proper configuration
            xml_dict = xmltodict.parse(
                xml_content,
                attr_prefix='@_',  # Match the JavaScript XMLParser attributeNamePrefix: "@_"
                force_list=array_elements  # Force these elements to always be lists (arrays)
            )
            
            # Convert the parsed dictionary to a JSON string for storage in 'content' column
            parsed_json_content = json.dumps(xml_dict, indent=2, ensure_ascii=False)

        except UnicodeDecodeError:
            # Clean up uploaded file if parsing fails
            delete_file_from_storage(file_id, bucket_name, delete_db_record=True)
            return {"success": False, "error": "File encoding error. Please ensure the file is UTF-8 encoded."}
        except Exception as e:
            # Clean up uploaded file if parsing fails
            delete_file_from_storage(file_id, bucket_name, delete_db_record=True)
            return {"success": False, "error": f"Error parsing ONLV file: {str(e)}"}

        # 3. Update the database record with the parsed JSON content
        update_result = update_file(
            file_id=file_id,
            content=parsed_json_content
        )

        if not update_result["success"]:
            # Log error but don't delete file from storage, as it was successfully uploaded
            print(f"⚠️ Failed to update file record {file_id} with parsed content: {update_result['error']}")
            return {"success": False, "error": f"File uploaded but failed to save parsed content: {update_result['error']}"}
        
        print(f"✅ Successfully uploaded and processed ONLV file: {file_name}")
        return {
            "success": True,
            "message": f"File '{file_name}' uploaded, parsed, and content saved successfully!",
            "file_record": update_result["data"],
            "parsed_content": xml_dict,
            "storage_path": upload_result["storage_path"]
        }

    except Exception as e:
        print(f"❌ An unexpected error occurred during ONLV file upload and processing: {e}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

def upload_and_process_onlv_file_safe(
    project_id: str,
    file_name: str,
    file_content: bytes,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    boq_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Uploads an .onlv file to Supabase Storage, parses its XML content to JSON,
    and saves the parsed JSON to the 'content' column of the file's database record.
    This is a safer version that handles large payloads better.

    Args:
        project_id: UUID of the project this file belongs to.
        file_name: Name of the .onlv file.
        file_content: The binary content of the .onlv file.
        bucket_name: Name of the storage bucket (default: 'files').
        boq_id: Optional UUID of the BOQ this file belongs to.

    Returns:
        Dictionary containing the upload and processing result.
    """
    try:
        if not file_name.endswith('.onlv'):
            return {"success": False, "error": "File must have .onlv extension"}

        # 1. Upload the original .onlv file to Supabase Storage
        upload_result = upload_file_to_storage(
            file_content=file_content,
            file_name=file_name,
            project_id=project_id,
            bucket_name=bucket_name,
            content_type="application/xml",  # .onlv files are XML
            boq_id=boq_id
        )

        if not upload_result["success"]:
            return {"success": False, "error": f"Failed to upload ONLV file to storage: {upload_result['error']}"}
        
        file_record_data = upload_result["data"]
        file_id = file_record_data["id"]

        # 2. Parse the XML content to JSON
        try:
            xml_content = file_content.decode('utf-8')
            
            # Define elements that should always be treated as arrays
            array_elements = [
                "leistungsteil",
                "position",
                "teilposition",
                "zuschlag",
                "abschlag",
                "kennwert"
            ]
            
            # Convert XML to dictionary using xmltodict with proper configuration
            xml_dict = xmltodict.parse(
                xml_content,
                attr_prefix='@_',  # Match the JavaScript XMLParser attributeNamePrefix: "@_"
                force_list=array_elements  # Force these elements to always be lists (arrays)
            )
            
            # Convert the parsed dictionary to a JSON string for storage in 'content' column
            parsed_json_content = json.dumps(xml_dict, indent=2, ensure_ascii=False)

            # Check if the content is too large for a single update operation
            content_size = len(parsed_json_content.encode('utf-8'))
            if content_size > 50 * 1024 * 1024:  # 50MB limit
                print(f"⚠️ Parsed content is very large ({content_size} bytes). Consider storing separately.")
                # For very large content, we might want to store it in a separate table or file
                # For now, we'll proceed but with a warning

        except UnicodeDecodeError:
            # Clean up uploaded file if parsing fails
            delete_file_from_storage(file_id, bucket_name, delete_db_record=True)
            return {"success": False, "error": "File encoding error. Please ensure the file is UTF-8 encoded."}
        except Exception as e:
            # Clean up uploaded file if parsing fails
            delete_file_from_storage(file_id, bucket_name, delete_db_record=True)
            return {"success": False, "error": f"Error parsing ONLV file: {str(e)}"}

        # 3. Update the database record with the parsed JSON content
        # Use a more robust approach to handle potential SSL issues with large payloads
        try:
            update_data = {"content": parsed_json_content}
            response = supabase.table("files").update(update_data).eq("id", file_id).execute()
            
            if response.data:
                print(f"✅ Successfully updated file: {file_id}")
                update_result = {"success": True, "data": response.data[0]}
            else:
                print(f"❌ Failed to update file: {file_id}")
                update_result = {"success": False, "error": "File not found or update failed"}
        except Exception as update_error:
            print(f"⚠️ Error updating file {file_id}: {update_error}")
            # Try with a smaller payload to determine if it's a size issue
            try:
                # Try updating with a truncated version to test if it's a size issue
                small_update_data = {"content": parsed_json_content[:1000] + "... (truncated for size test)"}
                response = supabase.table("files").update(small_update_data).eq("id", file_id).execute()
                # If this works, it confirms it's a size issue
                print("⚠️ Confirmed: Large payload is causing the issue")
                update_result = {"success": False, "error": f"Content too large for database update: {str(update_error)}"}
            except Exception as small_update_error:
                print(f"❌ Small update also failed: {small_update_error}")
                update_result = {"success": False, "error": str(update_error)}

        if not update_result["success"]:
            # Log error but don't delete file from storage, as it was successfully uploaded
            print(f"⚠️ Failed to update file record {file_id} with parsed content: {update_result['error']}")
            return {"success": False, "error": f"File uploaded but failed to save parsed content: {update_result['error']}"}
        
        print(f"✅ Successfully uploaded and processed ONLV file: {file_name}")
        return {
            "success": True,
            "message": f"File '{file_name}' uploaded, parsed, and content saved successfully!",
            "file_record": update_result["data"],
            "parsed_content": xml_dict,
            "storage_path": upload_result["storage_path"]
        }

    except Exception as e:
        print(f"❌ An unexpected error occurred during ONLV file upload and processing: {e}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

def parse_onlv_file_to_json(file_content: bytes) -> Dict[str, Any]:
    """
    Parse an .onlv file content to JSON format without uploading or storing anything.
    This function only processes the XML content and returns the parsed JSON.
    
    Args:
        file_content: The binary content of the .onlv file
        
    Returns:
        Dictionary containing the parsed JSON data or error information
    """
    try:
        # 1. Parse the XML content to JSON
        try:
            xml_content = file_content.decode('utf-8')
            
            # Define elements that should always be treated as arrays
            array_elements = [
                "leistungsteil",
                "position",
                "teilposition",
                "zuschlag",
                "abschlag",
                "kennwert"
            ]
            
            # Convert XML to dictionary using xmltodict with proper configuration
            xml_dict = xmltodict.parse(
                xml_content,
                attr_prefix='@_',  # Match the JavaScript XMLParser attributeNamePrefix: "@_"
                force_list=array_elements  # Force these elements to always be lists (arrays)
            )
            
            print(f"✅ Successfully parsed ONLV file content to JSON")
            return {
                "success": True,
                "message": "ONLV file parsed successfully",
                "parsed_content": xml_dict,
                "content_size": len(xml_content),
                "json_size": len(json.dumps(xml_dict, ensure_ascii=False))
            }

        except UnicodeDecodeError:
            return {"success": False, "error": "File encoding error. Please ensure the file is UTF-8 encoded."}
        except Exception as e:
            return {"success": False, "error": f"Error parsing ONLV file: {str(e)}"}

    except Exception as e:
        print(f"❌ An unexpected error occurred during ONLV file parsing: {e}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

def download_file_from_storage(
    file_id: str,
    bucket_name: str = DEFAULT_BUCKET_NAME
) -> Dict[str, Any]:
    """
    Download a file from Supabase Storage bucket.
    
    Args:
        file_id: UUID of the file record
        bucket_name: Name of the storage bucket (default: 'files')
        
    Returns:
        Dictionary containing file content and metadata
    """
    try:
        # Get file record from database
        file_result = get_file_by_id(file_id)
        if not file_result["success"]:
            return {"success": False, "error": "File record not found"}
        
        file_record = file_result["data"]
        storage_path = file_record.get("file_path")
        
        if not storage_path:
            return {"success": False, "error": "File path not found in record"}
        
        # Download from Supabase Storage
        storage_response = supabase.storage.from_(bucket_name).download(storage_path)
        
        if hasattr(storage_response, 'error') and storage_response.error:
            print(f"❌ Storage download failed: {storage_response.error}")
            return {"success": False, "error": f"Storage download failed: {storage_response.error}"}
        
        print(f"✅ Successfully downloaded file: {file_record['name']}")
        return {
            "success": True,
            "file_content": storage_response,
            "file_record": file_record,
            "storage_path": storage_path
        }
        
    except Exception as e:
        print(f"❌ Error downloading file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def delete_file_from_storage(
    file_id: str,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    delete_db_record: bool = True
) -> Dict[str, Any]:
    """
    Delete a file from Supabase Storage bucket and optionally from database.
    
    Args:
        file_id: UUID of the file record
        bucket_name: Name of the storage bucket (default: 'files')
        delete_db_record: Whether to also delete the database record (default: True)
        
    Returns:
        Dictionary containing deletion result
    """
    try:
        # Get file record from database
        file_result = get_file_by_id(file_id)
        if not file_result["success"]:
            return {"success": False, "error": "File record not found"}
        
        file_record = file_result["data"]
        storage_path = file_record.get("file_path")
        
        if storage_path:
            # Delete from Supabase Storage
            storage_response = supabase.storage.from_(bucket_name).remove([storage_path])
            
            if hasattr(storage_response, 'error') and storage_response.error:
                print(f"⚠️ Storage deletion warning: {storage_response.error}")
                # Continue with database deletion even if storage deletion fails
        
        # Delete database record if requested
        if delete_db_record:
            db_result = delete_file(file_id)
            if not db_result["success"]:
                return {"success": False, "error": f"Database record deletion failed: {db_result['error']}"}
        
        print(f"✅ Successfully deleted file: {file_record['name']}")
        return {
            "success": True,
            "message": "File deleted successfully",
            "file_record": file_record,
            "storage_deleted": bool(storage_path),
            "db_deleted": delete_db_record
        }
        
    except Exception as e:
        print(f"❌ Error deleting file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def get_file_public_url(
    file_id: str,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    expires_in: Optional[int] = None
) -> Dict[str, Any]:
    """
    Get public URL for a file in Supabase Storage.
    
    Args:
        file_id: UUID of the file record
        bucket_name: Name of the storage bucket (default: 'files')
        expires_in: URL expiration time in seconds (None for permanent URL)
        
    Returns:
        Dictionary containing public URL
    """
    try:
        # Get file record from database
        file_result = get_file_by_id(file_id)
        if not file_result["success"]:
            return {"success": False, "error": "File record not found"}
        
        file_record = file_result["data"]
        storage_path = file_record.get("file_path")
        
        if not storage_path:
            return {"success": False, "error": "File path not found in record"}
        
        # Get public URL
        if expires_in:
            # Create signed URL with expiration
            public_url = supabase.storage.from_(bucket_name).create_signed_url(storage_path, expires_in)
        else:
            # Get permanent public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
        
        print(f"✅ Successfully generated URL for file: {file_record['name']}")
        return {
            "success": True,
            "public_url": public_url,
            "file_record": file_record,
            "expires_in": expires_in
        }
        
    except Exception as e:
        print(f"❌ Error generating URL for file {file_id}: {e}")
        return {"success": False, "error": str(e)}

def list_storage_files(
    project_id: Optional[str] = None,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    List files in Supabase Storage bucket with optional project filtering.
    
    Args:
        project_id: Optional project ID to filter files
        bucket_name: Name of the storage bucket (default: 'files')
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of storage files
    """
    try:
        # Get path prefix for project filtering
        path_prefix = f"{project_id}/" if project_id else ""
        
        # List files in storage
        storage_response = supabase.storage.from_(bucket_name).list(
            path=path_prefix,
            limit=limit,
            offset=offset
        )
        
        if hasattr(storage_response, 'error') and storage_response.error:
            print(f"❌ Storage list failed: {storage_response.error}")
            return {"success": False, "error": f"Storage list failed: {storage_response.error}"}
        
        print(f"✅ Successfully listed {len(storage_response)} storage files")
        return {
            "success": True,
            "files": storage_response,
            "bucket_name": bucket_name,
            "project_id": project_id,
            "count": len(storage_response)
        }
        
    except Exception as e:
        print(f"❌ Error listing storage files: {e}")
        return {"success": False, "error": str(e)}

def create_storage_bucket(bucket_name: str, public: bool = False) -> Dict[str, Any]:
    """
    Create a new storage bucket in Supabase.
    
    Args:
        bucket_name: Name of the bucket to create
        public: Whether the bucket should be public (default: False)
        
    Returns:
        Dictionary containing creation result
    """
    try:
        # Create bucket
        bucket_response = supabase.storage.create_bucket(bucket_name, {"public": public})
        
        if hasattr(bucket_response, 'error') and bucket_response.error:
            print(f"❌ Bucket creation failed: {bucket_response.error}")
            return {"success": False, "error": f"Bucket creation failed: {bucket_response.error}"}
        
        print(f"✅ Successfully created bucket: {bucket_name}")
        return {
            "success": True,
            "message": f"Bucket '{bucket_name}' created successfully",
            "bucket_name": bucket_name,
            "public": public
        }
        
    except Exception as e:
        print(f"❌ Error creating bucket {bucket_name}: {e}")
        return {"success": False, "error": str(e)}

def get_storage_bucket_info(bucket_name: str) -> Dict[str, Any]:
    """
    Get information about a storage bucket.
    
    Args:
        bucket_name: Name of the bucket
        
    Returns:
        Dictionary containing bucket information
    """
    try:
        # Get bucket info
        bucket_response = supabase.storage.get_bucket(bucket_name)
        
        if hasattr(bucket_response, 'error') and bucket_response.error:
            print(f"❌ Get bucket info failed: {bucket_response.error}")
            return {"success": False, "error": f"Get bucket info failed: {bucket_response.error}"}
        
        print(f"✅ Successfully retrieved bucket info: {bucket_name}")
        return {
            "success": True,
            "bucket_info": bucket_response,
            "bucket_name": bucket_name
        }
        
    except Exception as e:
        print(f"❌ Error getting bucket info {bucket_name}: {e}")
        return {"success": False, "error": str(e)}

def bulk_upload_files(
    files_data: List[Dict[str, Any]],
    project_id: str,
    bucket_name: str = DEFAULT_BUCKET_NAME,
    boq_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload multiple files to storage and create database records.
    
    Args:
        files_data: List of dictionaries containing file data:
                   [{"content": bytes, "name": str, "content_type": str}, ...]
        project_id: UUID of the project these files belong to
        bucket_name: Name of the storage bucket (default: 'files')
        boq_id: Optional UUID of the BOQ these files belong to
        
    Returns:
        Dictionary containing bulk upload results
    """
    try:
        successful_uploads = []
        failed_uploads = []
        
        for file_data in files_data:
            file_content = file_data.get("content")
            file_name = file_data.get("name")
            content_type = file_data.get("content_type")
            
            if not file_content or not file_name:
                failed_uploads.append({
                    "file_name": file_name or "unknown",
                    "error": "Missing file content or name"
                })
                continue
            
            result = upload_file_to_storage(
                file_content=file_content,
                file_name=file_name,
                project_id=project_id,
                bucket_name=bucket_name,
                content_type=content_type,
                boq_id=boq_id
            )
            
            if result["success"]:
                successful_uploads.append(result["data"])
            else:
                failed_uploads.append({
                    "file_name": file_name,
                    "error": result["error"]
                })
        
        print(f"✅ Bulk upload completed: {len(successful_uploads)} successful, {len(failed_uploads)} failed")
        return {
            "success": True,
            "successful_count": len(successful_uploads),
            "failed_count": len(failed_uploads),
            "successful_uploads": successful_uploads,
            "failed_uploads": failed_uploads
        }
        
    except Exception as e:
        print(f"❌ Error in bulk file upload: {e}")
        return {"success": False, "error": str(e)}