"""
FastAPI router for projects endpoints.

This module provides REST API endpoints for managing projects using the projects_service.
All endpoints follow RESTful conventions and include proper error handling.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from ..services import projects_service

router = APIRouter(prefix="/projects", tags=["projects"])

# Pydantic models for request/response validation
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    status: str = Field("active", description="Project status", pattern="^(active|inactive|archived)$")
    lv_bezeichnung: Optional[str] = Field(None, description="LV designation")
    auftraggeber: Optional[str] = Field(None, description="Client/contractor information")
    nr: Optional[str] = Field(None, description="Project number")
    dateiname: Optional[str] = Field(None, description="Filename")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    status: Optional[str] = Field(None, description="Project status", pattern="^(active|inactive|archived)$")
    lv_bezeichnung: Optional[str] = Field(None, description="LV designation")
    auftraggeber: Optional[str] = Field(None, description="Client/contractor information")
    nr: Optional[str] = Field(None, description="Project number")
    dateiname: Optional[str] = Field(None, description="Filename")

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    status: str
    lv_bezeichnung: Optional[str]
    auftraggeber: Optional[str]
    nr: Optional[str]
    dateiname: Optional[str]
    created_at: str
    updated_at: str

class ProjectWithFileCount(ProjectResponse):
    file_count: int

class ProjectStatistics(BaseModel):
    total: int
    active: int
    inactive: int
    archived: int

# CREATE endpoints
@router.post("/", response_model=Dict[str, Any])
async def create_project(
    user_id: str = Query(..., description="User ID who owns the project"),
    project: ProjectCreate = ...
):
    """
    Create a new project.
    
    Args:
        user_id: UUID of the user who owns this project
        project: Project data to create
        
    Returns:
        Dictionary containing the created project data or error information
    """
    try:
        result = projects_service.create_project(
            user_id=user_id,
            name=project.name,
            description=project.description,
            status=project.status,
            lv_bezeichnung=project.lv_bezeichnung,
            auftraggeber=project.auftraggeber,
            nr=project.nr,
            dateiname=project.dateiname
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "Project created successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# READ endpoints
@router.get("/{project_id}", response_model=Dict[str, Any])
async def get_project(
    project_id: str = Path(..., description="Project ID")
):
    """
    Retrieve a project by its ID.
    
    Args:
        project_id: UUID of the project to retrieve
        
    Returns:
        Dictionary containing project data or error information
    """
    try:
        result = projects_service.get_project_by_id(project_id)
        
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

@router.get("/user/{user_id}", response_model=Dict[str, Any])
async def get_projects_by_user(
    user_id: str = Path(..., description="User ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Retrieve all projects belonging to a specific user.
    
    Args:
        user_id: UUID of the user whose projects to retrieve
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        result = projects_service.get_projects_by_user_id(user_id, limit, offset)
        
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

@router.get("/status/{status}", response_model=Dict[str, Any])
async def get_projects_by_status(
    status: str = Path(..., description="Project status", pattern="^(active|inactive|archived)$"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Retrieve all projects with a specific status.
    
    Args:
        status: Status of projects to retrieve
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        result = projects_service.get_projects_by_status(status, limit, offset)
        
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

@router.get("/user/{user_id}/status/{status}", response_model=Dict[str, Any])
async def get_projects_by_user_and_status(
    user_id: str = Path(..., description="User ID"),
    status: str = Path(..., description="Project status", pattern="^(active|inactive|archived)$"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Retrieve projects belonging to a specific user with a specific status.
    
    Args:
        user_id: UUID of the user whose projects to retrieve
        status: Status of projects to retrieve
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        result = projects_service.get_projects_by_user_and_status(user_id, status, limit, offset)
        
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
async def get_all_projects(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Retrieve all projects with pagination.
    
    Args:
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of projects or error information
    """
    try:
        result = projects_service.get_all_projects(limit, offset)
        
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
async def search_projects_by_name(
    search_term: str = Query(..., description="Term to search for in project names"),
    user_id: Optional[str] = Query(None, description="Optional user ID to limit search"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Search projects by name using case-insensitive pattern matching.
    
    Args:
        search_term: Term to search for in project names
        user_id: Optional user ID to limit search to specific user's projects
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of matching projects or error information
    """
    try:
        result = projects_service.search_projects_by_name(search_term, user_id, limit, offset)
        
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
@router.put("/{project_id}", response_model=Dict[str, Any])
async def update_project(
    project_id: str = Path(..., description="Project ID"),
    project: ProjectUpdate = ...
):
    """
    Update project information.
    
    Args:
        project_id: UUID of the project to update
        project: Project data to update
        
    Returns:
        Dictionary containing updated project data or error information
    """
    try:
        result = projects_service.update_project(
            project_id=project_id,
            name=project.name,
            description=project.description,
            status=project.status,
            lv_bezeichnung=project.lv_bezeichnung,
            auftraggeber=project.auftraggeber,
            nr=project.nr,
            dateiname=project.dateiname
        )
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "message": "Project updated successfully",
            "data": result["data"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# DELETE endpoints
@router.delete("/{project_id}", response_model=Dict[str, Any])
async def delete_project(
    project_id: str = Path(..., description="Project ID")
):
    """
    Delete a project from the database.
    
    Note: This will cascade delete all related files records.
    
    Args:
        project_id: UUID of the project to delete
        
    Returns:
        Dictionary containing success status or error information
    """
    try:
        result = projects_service.delete_project(project_id)
        
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

@router.delete("/user/{user_id}", response_model=Dict[str, Any])
async def delete_projects_by_user(
    user_id: str = Path(..., description="User ID")
):
    """
    Delete all projects belonging to a specific user.
    
    Note: This will cascade delete all related files records.
    
    Args:
        user_id: UUID of the user whose projects to delete
        
    Returns:
        Dictionary containing success status and count of deleted projects or error information
    """
    try:
        result = projects_service.delete_projects_by_user_id(user_id)
        
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
@router.get("/user/{user_id}/count", response_model=Dict[str, Any])
async def get_project_count_by_user(
    user_id: str = Path(..., description="User ID")
):
    """
    Get the total number of projects for a specific user.
    
    Args:
        user_id: UUID of the user
        
    Returns:
        Dictionary containing project count
    """
    try:
        count = projects_service.get_project_count_by_user(user_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "project_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/status/{status}/count", response_model=Dict[str, Any])
async def get_project_count_by_status(
    status: str = Path(..., description="Project status", pattern="^(active|inactive|archived)$")
):
    """
    Get the total number of projects with a specific status.
    
    Args:
        status: Status of projects to count
        
    Returns:
        Dictionary containing project count
    """
    try:
        count = projects_service.get_project_count_by_status(status)
        
        return {
            "success": True,
            "status": status,
            "project_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/statistics/total", response_model=Dict[str, Any])
async def get_total_project_count():
    """
    Get the total number of projects in the database.
    
    Returns:
        Dictionary containing total project count
    """
    try:
        count = projects_service.get_total_project_count()
        
        return {
            "success": True,
            "total_projects": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{project_id}/exists", response_model=Dict[str, Any])
async def check_project_exists(
    project_id: str = Path(..., description="Project ID")
):
    """
    Check if a project exists in the database.
    
    Args:
        project_id: UUID of the project to check
        
    Returns:
        Dictionary containing existence status
    """
    try:
        exists = projects_service.check_project_exists(project_id)
        
        return {
            "success": True,
            "project_id": project_id,
            "exists": exists
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/with-file-counts/all", response_model=Dict[str, Any])
async def get_projects_with_file_counts(
    user_id: Optional[str] = Query(None, description="Optional user ID to filter projects"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip")
):
    """
    Retrieve projects with their file counts.
    
    Args:
        user_id: Optional user ID to filter projects by user
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        
    Returns:
        Dictionary containing list of projects with file counts or error information
    """
    try:
        result = projects_service.get_projects_with_file_counts(user_id, limit, offset)
        
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

@router.get("/statistics/detailed", response_model=Dict[str, Any])
async def get_project_statistics(
    user_id: Optional[str] = Query(None, description="Optional user ID to filter statistics")
):
    """
    Get project statistics (total, by status).
    
    Args:
        user_id: Optional user ID to filter statistics by user
        
    Returns:
        Dictionary containing project statistics or error information
    """
    try:
        result = projects_service.get_project_statistics(user_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "statistics": result["data"],
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")