"""
FastAPI router for BOQs endpoints.

This module provides REST API endpoints for managing BOQs (Bill of Quantities) using the boqs_service.
All endpoints follow RESTful conventions and include proper error handling.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from ..services import boqs_service

router = APIRouter(prefix="/boqs", tags=["boqs"])

# Pydantic models for request/response validation
class BoqCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="BOQ name")
    lv_code: str = Field(..., description="LV Code")
    work_type: str = Field(..., description="Work Type")
    description: Optional[str] = Field(None, description="BOQ description")
    original_filename: Optional[str] = Field(None, description="Original filename of the BOQ")
    lv_bezeichnung: Optional[str] = Field(None, description="LV Bezeichnung")

class BoqUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="BOQ name")
    description: Optional[str] = Field(None, description="BOQ description")
    original_filename: Optional[str] = Field(None, description="Original filename of the BOQ")
    lv_code: Optional[str] = Field(None, description="LV Code")
    lv_bezeichnung: Optional[str] = Field(None, description="LV Bezeichnung")
    work_type: Optional[str] = Field(None, description="Work Type")

class BoqResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str
    original_filename: Optional[str]
    lv_code: str
    lv_bezeichnung: Optional[str]
    work_type: str

class BoqWithFileCount(BoqResponse):
    file_count: int

# CREATE endpoints
@router.post("/", response_model=Dict[str, Any])
async def create_boq(
    project_id: str = Query(..., description="Project ID this BOQ belongs to"),
    boq: BoqCreate = ...
):
    """
    Create a new BOQ.
    
    Args:
        project_id: UUID of the project this BOQ belongs to
        boq: BOQ data to create
        
    Returns:
        Dictionary containing the created BOQ data or error information
    """
    try:
        result = boqs_service.create_boq(
            project_id=project_id,
            name=boq.name,
            description=boq.description,
            original_filename=boq.original_filename,
            lv_code=boq.lv_code,
            lv_bezeichnung=boq.lv_bezeichnung,
            work_type=boq.work_type
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "BOQ created successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# READ endpoints
@router.get("/{boq_id}", response_model=Dict[str, Any])
async def get_boq(
    boq_id: str = Path(..., description="BOQ ID")
):
    """
    Retrieve a BOQ by its ID.
    
    Args:
        boq_id: UUID of the BOQ to retrieve
        
    Returns:
        Dictionary containing BOQ data or error information
    """
    try:
        result = boqs_service.get_boq_by_id(boq_id)
        
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
async def get_boqs_by_project(
    project_id: str = Path(..., description="Project ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of BOQs to return"),
    offset: int = Query(0, ge=0, description="Number of BOQs to skip")
):
    """
    Retrieve all BOQs belonging to a specific project.
    
    Args:
        project_id: UUID of the project whose BOQs to retrieve
        limit: Maximum number of BOQs to return
        offset: Number of BOQs to skip
        
    Returns:
        Dictionary containing list of BOQs or error information
    """
    try:
        result = boqs_service.get_boqs_by_project_id(project_id, limit, offset)
        
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

@router.get("/", response_model=Dict[str, Any])
async def get_all_boqs(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of BOQs to return"),
    offset: int = Query(0, ge=0, description="Number of BOQs to skip")
):
    """
    Retrieve all BOQs with pagination.
    
    Args:
        limit: Maximum number of BOQs to return
        offset: Number of BOQs to skip
        
    Returns:
        Dictionary containing list of BOQs or error information
    """
    try:
        result = boqs_service.get_all_boqs(limit, offset)
        
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
async def search_boqs_by_name(
    search_term: str = Query(..., description="Term to search for in BOQ names"),
    project_id: Optional[str] = Query(None, description="Optional project ID to limit search"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of BOQs to return"),
    offset: int = Query(0, ge=0, description="Number of BOQs to skip")
):
    """
    Search BOQs by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in BOQ names
        project_id: Optional project ID to limit search to specific project's BOQs
        limit: Maximum number of BOQs to return
        offset: Number of BOQs to skip
        
    Returns:
        Dictionary containing list of matching BOQs or error information
    """
    try:
        result = boqs_service.search_boqs_by_name(search_term, project_id, limit, offset)
        
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

# UPDATE endpoints
@router.put("/{boq_id}", response_model=Dict[str, Any])
async def update_boq(
    boq_id: str = Path(..., description="BOQ ID"),
    boq: BoqUpdate = ...
):
    """
    Update BOQ information.
    
    Args:
        boq_id: UUID of the BOQ to update
        boq: BOQ data to update
        
    Returns:
        Dictionary containing updated BOQ data or error information
    """
    try:
        result = boqs_service.update_boq(
            boq_id=boq_id,
            name=boq.name,
            description=boq.description,
            original_filename=boq.original_filename,
            lv_code=boq.lv_code,
            lv_bezeichnung=boq.lv_bezeichnung,
            work_type=boq.work_type
        )
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "BOQ updated successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# DELETE endpoints
@router.delete("/{boq_id}", response_model=Dict[str, Any])
async def delete_boq(
    boq_id: str = Path(..., description="BOQ ID")
):
    """
    Delete a BOQ from the database.
    
    Note: This will cascade delete all related files records.
    
    Args:
        boq_id: UUID of the BOQ to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        result = boqs_service.delete_boq(boq_id)
        
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
async def delete_boqs_by_project(
    project_id: str = Path(..., description="Project ID")
):
    """
    Delete all BOQs belonging to a specific project.
    
    Note: This will cascade delete all related files records.
    
    Args:
        project_id: UUID of the project whose BOQs to delete
        
    Returns:
        Dictionary containing success status and count of deleted BOQs or error information
    """
    try:
        result = boqs_service.delete_boqs_by_project_id(project_id)
        
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
async def get_boq_count_by_project(
    project_id: str = Path(..., description="Project ID")
):
    """
    Get the total number of BOQs for a specific project.
    
    Args:
        project_id: UUID of the project
        
    Returns:
        Dictionary containing BOQ count
    """
    try:
        count = boqs_service.get_boq_count_by_project(project_id)
        
        return {
            "success": True,
            "project_id": project_id,
            "boq_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/statistics/total", response_model=Dict[str, Any])
async def get_total_boq_count():
    """
    Get the total number of BOQs in the database.
    
    Returns:
        Dictionary containing total BOQ count
    """
    try:
        count = boqs_service.get_total_boq_count()
        
        return {
            "success": True,
            "total_boqs": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{boq_id}/exists", response_model=Dict[str, Any])
async def check_boq_exists(
    boq_id: str = Path(..., description="BOQ ID")
):
    """
    Check if a BOQ exists in the database.
    
    Args:
        boq_id: UUID of the BOQ to check
        
    Returns:
        Dictionary containing existence status
    """
    try:
        exists = boqs_service.check_boq_exists(boq_id)
        
        return {
            "success": True,
            "boq_id": boq_id,
            "exists": exists
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{boq_id}/files", response_model=Dict[str, Any])
async def get_files_by_boq(
    boq_id: str = Path(..., description="BOQ ID"),
    include_inactive: bool = Query(False, description="Include inactive files"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    offset: int = Query(0, ge=0, description="Number of files to skip")
):
    """
    Get all files related to a specific BOQ.
    
    Args:
        boq_id: UUID of the BOQ whose files to retrieve
        include_inactive: Whether to include inactive files
        limit: Maximum number of files to return
        offset: Number of files to skip
        
    Returns:
        Dictionary containing list of files or error information
    """
    try:
        result = boqs_service.get_files_by_boq_id(boq_id, include_inactive, limit, offset)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result["data"],
            "count": result["count"],
            "boq_id": boq_id,
            "limit": limit,
            "offset": offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/with-file-counts/all", response_model=Dict[str, Any])
async def get_boqs_with_file_counts(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter BOQs"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of BOQs to return"),
    offset: int = Query(0, ge=0, description="Number of BOQs to skip")
):
    """
    Retrieve BOQs with their file counts.
    
    Args:
        project_id: Optional project ID to filter BOQs by project
        limit: Maximum number of BOQs to return
        offset: Number of BOQs to skip
        
    Returns:
        Dictionary containing list of BOQs with file counts or error information
    """
    try:
        result = boqs_service.get_boqs_with_file_counts(project_id, limit, offset)
        
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