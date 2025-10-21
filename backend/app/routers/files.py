"""
FastAPI router for files endpoints.

This module provides REST API endpoints for managing files using the files_service.
All endpoints follow RESTful conventions and include proper error handling.
Includes file upload/download operations with Supabase Storage integration.
"""

from fastapi import APIRouter, HTTPException, Query, Path, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from io import BytesIO
from ..services import files_service

router = APIRouter(prefix="/files", tags=["files"])

# Pydantic models for request/response validation
class FileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="File name")
    file_path: Optional[str] = Field(None, description="Path to the file")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    file_type: Optional[str] = Field(None, description="File type/extension")
    mime_type: Optional[str] = Field(None, description="MIME type")
    is_active: bool = Field(True, description="Whether the file is active")
    boq_id: Optional[str] = Field(None, description="BOQ ID this file belongs to")

class FileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="File name")
    file_path: Optional[str] = Field(None, description="Path to the file")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    file_type: Optional[str] = Field(None, description="File type/extension")
    mime_type: Optional[str] = Field(None, description="MIME type")
    is_active: Optional[bool] = Field(None, description="Whether the file is active")
    boq_id: Optional[str] = Field(None, description="BOQ ID this file belongs to")

class FileResponse(BaseModel):
    id: str
    project_id: str
    name: str
    file_path: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]
    mime_type: Optional[str]
    is_active: bool
    boq_id: Optional[str]
    created_at: str
    updated_at: str

class FileWithProjectInfo(FileResponse):
    projects: Optional[Dict[str, Any]]

class FileStatistics(BaseModel):
    total_files: int
    total_size: int
    average_size: float
    file_types: Dict[str, int]
    mime_types: Dict[str, int]

class BulkDeactivateRequest(BaseModel):
    file_ids: List[str] = Field(..., description="List of file IDs to deactivate")

# CREATE endpoints
@router.post("/", response_model=Dict[str, Any])
async def create_file(
    project_id: str = Query(..., description="Project ID this file belongs to"),
    file: FileCreate = ...,
    boq_id: Optional[str] = Query(None, description="Optional BOQ ID this file belongs to")
):
    """
    Create a new file record.
    
    Args:
        project_id: UUID of the project this file belongs to
        file: File data to create
        
    Returns:
        Dictionary containing the created file data or error information
    """
    try:
        result = files_service.create_file(
            project_id=project_id,
            name=file.name,
            file_path=file.file_path,
            file_size=file.file_size,
            file_type=file.file_type,
            mime_type=file.mime_type,
            is_active=file.is_active,
            boq_id=boq_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "File created successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# READ endpoints
@router.get("/{file_id}", response_model=Dict[str, Any])
async def get_file(
    file_id: str = Path(..., description="File ID")
):
    """
    Retrieve a file by its ID.
    
    Args:
        file_id: UUID of the file to retrieve
        
    Returns:
        Dictionary containing file data or error information
    """
    try:
        result = files_service.get_file_by_id(file_id)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/project/{project_id}", response_model=Dict[str, Any])
async def get_files_by_project(
    project_id: str = Path(..., description="Project ID"),
    include_inactive: bool = Query(False, description="Whether to include inactive files"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve all files belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose files to retrieve
        include_inactive: Whether to include inactive files
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = files_service.get_files_by_project_id(project_id, include_inactive, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/type/{file_type}", response_model=Dict[str, Any])
async def get_files_by_type(
    file_type: str = Path(..., description="File type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve all files of a specific type.
    
    Args:
        file_type: Type of files to retrieve
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = files_service.get_files_by_type(file_type, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "file_type": file_type,
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/mime-type/{mime_type:path}", response_model=Dict[str, Any])
async def get_files_by_mime_type(
    mime_type: str = Path(..., description="MIME type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve all files of a specific MIME type.
    
    Args:
        mime_type: MIME type of files to retrieve
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = files_service.get_files_by_mime_type(mime_type, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "mime_type": mime_type,
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=Dict[str, Any])
async def get_all_files(
    include_inactive: bool = Query(False, description="Whether to include inactive files"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve all files with pagination.
    
    Args:
        include_inactive: Whether to include inactive files
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = files_service.get_all_files(include_inactive, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/search/name", response_model=Dict[str, Any])
async def search_files_by_name(
    search_term: str = Query(..., description="Term to search for in file names"),
    project_id: Optional[str] = Query(None, description="Optional project ID to limit search"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Search files by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in file names
        project_id: Optional project ID to limit search to specific project's files
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of matching files or error information
    """
    try:
        result = files_service.search_files_by_name(search_term, project_id, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "search_term": search_term,
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/search/size-range", response_model=Dict[str, Any])
async def get_files_by_size_range(
    min_size: Optional[int] = Query(None, ge=0, description="Minimum file size in bytes"),
    max_size: Optional[int] = Query(None, ge=0, description="Maximum file size in bytes"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve files within a specific size range.
    
    Args:
        min_size: Minimum file size in bytes
        max_size: Maximum file size in bytes
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = files_service.get_files_by_size_range(min_size, max_size, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "min_size": min_size,
            "max_size": max_size,
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# UPDATE endpoints
@router.put("/{file_id}", response_model=Dict[str, Any])
async def update_file(
    file_id: str = Path(..., description="File ID"),
    file: FileUpdate = ...,
    boq_id: Optional[str] = Query(None, description="Optional BOQ ID this file belongs to")
):
    """
    Update file information.
    
    Args:
        file_id: UUID of the file to update
        file: File data to update
        
    Returns:
        Dictionary containing updated file data or error information
    """
    try:
        result = files_service.update_file(
            file_id=file_id,
            name=file.name,
            file_path=file.file_path,
            file_size=file.file_size,
            file_type=file.file_type,
            mime_type=file.mime_type,
            is_active=file.is_active,
            boq_id=boq_id
        )
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "File updated successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/{file_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_file(
    file_id: str = Path(..., description="File ID")
):
    """
    Deactivate a file (soft delete).
    
    Args:
        file_id: UUID of the file to deactivate
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        result = files_service.deactivate_file(file_id)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/{file_id}/reactivate", response_model=Dict[str, Any])
async def reactivate_file(
    file_id: str = Path(..., description="File ID")
):
    """
    Reactivate a file.
    
    Args:
        file_id: UUID of the file to reactivate
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        result = files_service.reactivate_file(file_id)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/bulk/deactivate", response_model=Dict[str, Any])
async def bulk_deactivate_files(
    request: BulkDeactivateRequest = ...
):
    """
    Deactivate multiple files at once.
    
    Args:
        request: Request containing list of file IDs to deactivate
        
    Returns:
        Dictionary containing success status and results
    """
    try:
        result = files_service.bulk_deactivate_files(request.file_ids)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": f"Bulk deactivation completed: {result['successful_count']} successful, {result['failed_count']} failed",
            "successful_count": result["successful_count"],
            "failed_count": result["failed_count"],
            "successful_files": result["successful_files"],
            "failed_files": result["failed_files"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# DELETE endpoints
@router.delete("/{file_id}", response_model=Dict[str, Any])
async def delete_file(
    file_id: str = Path(..., description="File ID")
):
    """
    Permanently delete a file from the database.
    
    Args:
        file_id: UUID of the file to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        result = files_service.delete_file_from_storage(file_id, delete_db_record=True)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/project/{project_id}", response_model=Dict[str, Any])
async def delete_files_by_project(
    project_id: str = Path(..., description="Project ID")
):
    """
    Delete all files belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose files to delete
        
    Returns:
        Dictionary containing success status and count of deleted files or error information
    """
    try:
        result = files_service.delete_files_by_project_id(project_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "deleted_count": result["deleted_count"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# UTILITY endpoints
@router.get("/project/{project_id}/count", response_model=Dict[str, Any])
async def get_file_count_by_project(
    project_id: str = Path(..., description="Project ID"),
    include_inactive: bool = Query(False, description="Whether to include inactive files")
):
    """
    Get the total number of files for a specific project.
    
    Args:
        project_id: UUID of the project
        include_inactive: Whether to include inactive files
        
    Returns:
        Dictionary containing file count
    """
    try:
        count = files_service.get_file_count_by_project(project_id, include_inactive)
        
        return {
            "success": True,
            "project_id": project_id,
            "file_count": count,
            "include_inactive": include_inactive
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/type/{file_type}/count", response_model=Dict[str, Any])
async def get_file_count_by_type(
    file_type: str = Path(..., description="File type")
):
    """
    Get the total number of files of a specific type.
    
    Args:
        file_type: Type of files to count
        
    Returns:
        Dictionary containing file count
    """
    try:
        count = files_service.get_file_count_by_type(file_type)
        
        return {
            "success": True,
            "file_type": file_type,
            "file_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/statistics/total", response_model=Dict[str, Any])
async def get_total_file_count(
    include_inactive: bool = Query(False, description="Whether to include inactive files")
):
    """
    Get the total number of files in the database.
    
    Args:
        include_inactive: Whether to include inactive files
        
    Returns:
        Dictionary containing total file count
    """
    try:
        count = files_service.get_total_file_count(include_inactive)
        
        return {
            "success": True,
            "total_files": count,
            "include_inactive": include_inactive
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{file_id}/exists", response_model=Dict[str, Any])
async def check_file_exists(
    file_id: str = Path(..., description="File ID")
):
    """
    Check if a file exists in the database.
    
    Args:
        file_id: UUID of the file to check
        
    Returns:
        Dictionary containing existence status
    """
    try:
        exists = files_service.check_file_exists(file_id)
        
        return {
            "success": True,
            "file_id": file_id,
            "exists": exists
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/metadata/file-types", response_model=Dict[str, Any])
async def get_unique_file_types():
    """
    Get all unique file types in the database.
    
    Returns:
        Dictionary containing list of unique file types
    """
    try:
        file_types = files_service.get_unique_file_types()
        
        return {
            "success": True,
            "file_types": file_types,
            "count": len(file_types)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/metadata/mime-types", response_model=Dict[str, Any])
async def get_unique_mime_types():
    """
    Get all unique MIME types in the database.
    
    Returns:
        Dictionary containing list of unique MIME types
    """
    try:
        mime_types = files_service.get_unique_mime_types()
        
        return {
            "success": True,
            "mime_types": mime_types,
            "count": len(mime_types)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/statistics/detailed", response_model=Dict[str, Any])
async def get_file_statistics(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter statistics")
):
    """
    Get file statistics (total, by type, size info).
    
    Args:
        project_id: Optional project ID to filter statistics by project
        
    Returns:
        Dictionary containing file statistics or error information
    """
    try:
        result = files_service.get_file_statistics(project_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "statistics": result["data"],
            "project_id": project_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/with-project-info/all", response_model=Dict[str, Any])
async def get_files_with_project_info(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Retrieve files with their associated project information.
    
    Args:
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files with project info or error information
    """
    try:
        result = files_service.get_files_with_project_info(limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# STORAGE OPERATIONS ENDPOINTS
@router.post("/upload", response_model=Dict[str, Any])
async def upload_file(
    project_id: str = Form(..., description="Project ID this file belongs to"),
    bucket_name: str = Form(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name"),
    file: UploadFile = File(..., description="File to upload"),
    boq_id: Optional[str] = Form(None, description="Optional BOQ ID this file belongs to")
):
    """
    Upload a file to Supabase Storage and create a database record.
    
    Args:
        project_id: UUID of the project this file belongs to
        bucket_name: Name of the storage bucket
        file: File to upload
        
    Returns:
        Dictionary containing upload result and file record data
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload file to storage
        result = files_service.upload_file_to_storage(
            file_content=file_content,
            file_name=file.filename,
            project_id=project_id,
            bucket_name=bucket_name,
            content_type=file.content_type,
            boq_id=boq_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "data": result["data"],
            "storage_path": result["storage_path"],
            "bucket_name": result["bucket_name"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/upload/multiple", response_model=Dict[str, Any])
async def upload_multiple_files(
    project_id: str = Form(..., description="Project ID these files belong to"),
    bucket_name: str = Form(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name"),
    files: List[UploadFile] = File(..., description="Files to upload"),
    boq_id: Optional[str] = Form(None, description="Optional BOQ ID these files belong to")
):
    """
    Upload multiple files to Supabase Storage and create database records.
    
    Args:
        project_id: UUID of the project these files belong to
        bucket_name: Name of the storage bucket
        files: List of files to upload
        
    Returns:
        Dictionary containing bulk upload results
    """
    try:
        # Prepare files data
        files_data = []
        for file in files:
            file_content = await file.read()
            files_data.append({
                "content": file_content,
                "name": file.filename,
                "content_type": file.content_type
            })
        
        # Bulk upload files
        result = files_service.bulk_upload_files(
            files_data=files_data,
            project_id=project_id,
            bucket_name=bucket_name,
            boq_id=boq_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": f"Bulk upload completed: {result['successful_count']} successful, {result['failed_count']} failed",
            "successful_count": result["successful_count"],
            "failed_count": result["failed_count"],
            "successful_uploads": result["successful_uploads"],
            "failed_uploads": result["failed_uploads"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/upload-onlv-processed", response_model=Dict[str, Any])
async def upload_onlv_processed(
    project_id: str = Form(..., description="Project ID this file belongs to"),
    file: UploadFile = File(..., description="ONLV file to upload and process"),
    boq_id: Optional[str] = Form(None, description="Optional BOQ ID this file belongs to")
):
    """
    Uploads an .onlv file, processes its XML content to JSON,
    and saves the parsed JSON to the 'content' column of the file's database record.
    """
    try:
        file_content = await file.read()
        
        # Try the safer version first, fall back to original if it doesn't exist
        try:
            result = files_service.upload_and_process_onlv_file_safe(
                project_id=project_id,
                file_name=file.filename,
                file_content=file_content,
                boq_id=boq_id
            )
        except AttributeError:
            # Fall back to original function if the safe version doesn't exist
            result = files_service.upload_and_process_onlv_file(
                project_id=project_id,
                file_name=file.filename,
                file_content=file_content,
                boq_id=boq_id
            )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "file_record": result["file_record"],
            "parsed_content": result["parsed_content"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/parse-onlv", response_model=Dict[str, Any])
async def parse_onlv_file(
    file: UploadFile = File(..., description="ONLV file to parse")
):
    """
    Parse an .onlv file content to JSON format without uploading or storing anything.
    This endpoint only processes the XML content and returns the parsed JSON.
    
    Args:
        file: ONLV file to parse
        
    Returns:
        Dictionary containing the parsed JSON data
    """
    try:
        # Validate file extension
        if not file.filename.endswith('.onlv'):
            raise HTTPException(status_code=400, detail="File must have .onlv extension")
        
        # Read file content
        file_content = await file.read()
        
        # Parse the ONLV file
        result = files_service.parse_onlv_file_to_json(file_content)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "parsed_content": result["parsed_content"],
            "file_name": file.filename,
            "content_size": result["content_size"],
            "json_size": result["json_size"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{file_id}/download")
async def download_file(
    file_id: str = Path(..., description="File ID"),
    bucket_name: str = Query(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name")
):
    """
    Download a file from Supabase Storage.
    
    Args:
        file_id: UUID of the file to download
        bucket_name: Name of the storage bucket
        
    Returns:
        File content as streaming response
    """
    try:
        result = files_service.download_file_from_storage(file_id, bucket_name)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        file_record = result["file_record"]
        file_content = result["file_content"]
        
        # Create streaming response
        return StreamingResponse(
            BytesIO(file_content),
            media_type=file_record.get("mime_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f"attachment; filename={file_record['name']}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{file_id}/url", response_model=Dict[str, Any])
async def get_file_public_url(
    file_id: str = Path(..., description="File ID"),
    bucket_name: str = Query(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name"),
    expires_in: Optional[int] = Query(None, description="URL expiration time in seconds")
):
    """
    Get public URL for a file in Supabase Storage.
    
    Args:
        file_id: UUID of the file
        bucket_name: Name of the storage bucket
        expires_in: URL expiration time in seconds (None for permanent URL)
        
    Returns:
        Dictionary containing public URL
    """
    try:
        result = files_service.get_file_public_url(file_id, bucket_name, expires_in)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "public_url": result["public_url"],
            "file_record": result["file_record"],
            "expires_in": result["expires_in"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{file_id}/storage", response_model=Dict[str, Any])
async def delete_file_from_storage(
    file_id: str = Path(..., description="File ID"),
    bucket_name: str = Query(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name"),
    delete_db_record: bool = Query(True, description="Whether to also delete the database record")
):
    """
    Delete a file from Supabase Storage bucket and optionally from database.
    
    Args:
        file_id: UUID of the file to delete
        bucket_name: Name of the storage bucket
        delete_db_record: Whether to also delete the database record
        
    Returns:
        Dictionary containing deletion result
    """
    try:
        result = files_service.delete_file_from_storage(file_id, bucket_name, delete_db_record)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "file_record": result["file_record"],
            "storage_deleted": result["storage_deleted"],
            "db_deleted": result["db_deleted"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/storage/list", response_model=Dict[str, Any])
async def list_storage_files(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter files"),
    bucket_name: str = Query(files_service.DEFAULT_BUCKET_NAME, description="Storage bucket name"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    List files in Supabase Storage bucket with optional project filtering.
    
    Args:
        project_id: Optional project ID to filter files
        bucket_name: Name of the storage bucket
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of storage files
    """
    try:
        result = files_service.list_storage_files(project_id, bucket_name, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "files": result["files"],
            "bucket_name": result["bucket_name"],
            "project_id": result["project_id"],
            "count": result["count"],
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/storage/bucket", response_model=Dict[str, Any])
async def create_storage_bucket(
    bucket_name: str = Query(..., description="Name of the bucket to create"),
    public: bool = Query(False, description="Whether the bucket should be public")
):
    """
    Create a new storage bucket in Supabase.
    
    Args:
        bucket_name: Name of the bucket to create
        public: Whether the bucket should be public
        
    Returns:
        Dictionary containing creation result
    """
    try:
        result = files_service.create_storage_bucket(bucket_name, public)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": result["message"],
            "bucket_name": result["bucket_name"],
            "public": result["public"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/storage/bucket/{bucket_name}/info", response_model=Dict[str, Any])
async def get_storage_bucket_info(
    bucket_name: str = Path(..., description="Name of the bucket")
):
    """
    Get information about a storage bucket.
    
    Args:
        bucket_name: Name of the bucket
        
    Returns:
        Dictionary containing bucket information
    """
    try:
        result = files_service.get_storage_bucket_info(bucket_name)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "bucket_info": result["bucket_info"],
            "bucket_name": result["bucket_name"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")