"""
FastAPI router for PDF parsing endpoints.

This module provides REST API endpoints for parsing PDF files and extracting text content.
Supports file upload and parsing using both pdfplumber and PyPDF2 libraries.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Form
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
import os
import google.generativeai as genai

from ..services import pdf_parser

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdf", tags=["pdf-parser"])

# Pydantic models for request/response validation
class PDFParseResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    pages: Optional[int] = None
    characters: Optional[int] = None
    method_used: Optional[str] = None
    error: Optional[str] = None

class PDFParseComprehensiveResponse(BaseModel):
    success: bool
    extracted_text: Optional[str] = None
    page_count: Optional[int] = None
    character_count: Optional[int] = None
    pages_with_text: Optional[int] = None
    best_method: Optional[str] = None
    file_size_bytes: Optional[int] = None
    tables_count: Optional[int] = None
    document_metadata: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ValueUnitRaw(BaseModel):
    value: float
    unit: str
    raw_text: str

class WallData(BaseModel):
    id: str
    total_length: ValueUnitRaw
    total_gross_area: ValueUnitRaw
    total_net_area: ValueUnitRaw

class GeminiResponse(BaseModel):
    walls: list[WallData]


@router.post("/parse", response_model=Dict[str, Any])
async def parse_pdf_file(
    file: UploadFile = File(..., description="PDF file to parse"),
    method: str = Query("simple", description="Parsing method: 'simple', 'comprehensive', or 'wall_extraction'")
):
    """
    Parse a PDF file and extract text content.
    
    Args:
        file: PDF file to upload and parse
        method: Parsing method - 'simple' for basic text extraction, 'comprehensive' for detailed analysis, 'wall_extraction' for AI-powered wall data extraction
        
    Returns:
        Dictionary containing extracted text and metadata
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Validate method
        valid_methods = ["simple", "comprehensive", "wall_extraction"]
        if method not in valid_methods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid method. Supported methods: {', '.join(valid_methods)}"
            )
        
        # Read file content
        try:
            pdf_content = await file.read()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error reading uploaded file: {str(e)}"
            )
        
        # Validate file size (limit to 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(pdf_content) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Parse PDF
        result = pdf_parser.parse_pdf(pdf_content, method=method)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"PDF parsing failed: {result.get('error', 'Unknown error')}"
            )
        
        # Return appropriate response based on method
        if method == "simple":
            return {
                "success": True,
                "message": "PDF parsed successfully",
                "filename": file.filename,
                "data": {
                    "text": result["text"],
                    "pages": result["pages"],
                    "characters": result["characters"],
                    "method_used": result["method_used"],
                    "page_texts": result.get("page_texts", [])
                }
            }
        elif method == "wall_extraction":
            return {
                "success": True,
                "message": "PDF parsed and wall data extracted successfully",
                "filename": file.filename,
                "walls": result["wall_data"]["walls"],
                "summary": result["summary"],
                "pdf_info": {
                    "pages": result["pdf_data"]["pages"],
                    "characters": result["pdf_data"]["characters"],
                    "method_used": result["pdf_data"]["method_used"]
                },
                "cost_info": result["summary"].get("usage_metadata", {})
            }
        else:
            return {
                "success": True,
                "message": "PDF parsed successfully with comprehensive analysis",
                "filename": file.filename,
                "data": result
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in PDF parsing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/extract/walls", response_model=Dict[str, Any])
async def extract_walls_from_pdf(
    file: UploadFile = File(..., description="PDF file to parse and extract wall data from"),
    project_id: Optional[str] = Form(None, description="Project ID to attach the file to (optional if boq_id is provided)"),
    boq_id: Optional[str] = Form(None, description="BOQ ID to attach the file to (optional if project_id is provided)")
):
    """
    Parse a PDF file and extract wall data using Gemini Flash 2.5 model.
    Uploads the file to Supabase storage and stores the Gemini response in the content column.
    
    Args:
        file: PDF file to upload and parse
        project_id: Project ID to attach the file to (optional if boq_id is provided)
        boq_id: BOQ ID to attach the file to (optional if project_id is provided)
        
    Returns:
        Dictionary containing extracted wall data in structured format
    """
    try:
        # Validate that at least one ID is provided
        if not project_id and not boq_id:
            raise HTTPException(
                status_code=400,
                detail="Either project_id or boq_id must be provided"
            )
        
        # If boq_id is provided but not project_id, get project_id from BOQ
        if boq_id and not project_id:
            from ..services.boqs_service import get_boq_by_id
            boq_result = get_boq_by_id(boq_id)
            if not boq_result["success"]:
                raise HTTPException(
                    status_code=404,
                    detail=f"BOQ not found: {boq_result.get('error', 'Unknown error')}"
                )
            project_id = boq_result["data"]["project_id"]
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Read and validate file content
        pdf_content = await file.read()
        if len(pdf_content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Upload file to Supabase storage
        from ..services.files_service import upload_file_to_storage, update_file
        upload_result = upload_file_to_storage(
            file_content=pdf_content,
            file_name=file.filename,
            project_id=project_id,
            boq_id=boq_id
        )
        
        if not upload_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"File upload failed: {upload_result.get('error', 'Unknown error')}"
            )
        
        # Get the file ID from the upload result
        file_id = upload_result["data"]["id"]
        
        # Parse PDF and extract wall data using our new service function
        result = pdf_parser.parse_pdf_with_wall_extraction(pdf_content)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"PDF parsing or wall extraction failed: {result.get('error', 'Unknown error')}"
            )
        
        # Convert the wall data to JSON string for storage in content column
        import json
        content_data = {
            "walls": result["wall_data"]["walls"],
            "summary": result["summary"],
            "pdf_info": {
                "pages": result["pdf_data"]["pages"],
                "characters": result["pdf_data"]["characters"],
                "method_used": result["pdf_data"]["method_used"]
            },
            "cost_info": result["summary"].get("usage_metadata", {})
        }
        content_json = json.dumps(content_data, ensure_ascii=False)
        
        # Update the file record with the content
        update_result = update_file(file_id=file_id, content=content_json)
        
        if not update_result["success"]:
            # Log the error but don't fail the request since we already have the extraction result
            logger.warning(f"Failed to update file content: {update_result.get('error', 'Unknown error')}")
        
        return {
            "success": True,
            "message": "Wall data extracted successfully",
            "filename": file.filename,
            "file_id": file_id,
            "walls": result["wall_data"]["walls"],
            "summary": result["summary"],
            "pdf_info": {
                "pages": result["pdf_data"]["pages"],
                "characters": result["pdf_data"]["characters"],
                "method_used": result["pdf_data"]["method_used"]
            },
            "cost_info": result["summary"].get("usage_metadata", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in wall extraction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/parse/simple", response_model=GeminiResponse)
async def parse_pdf_simple_legacy(
    file: UploadFile = File(..., description="PDF file to parse")
):
    """
    Legacy endpoint - Parse a PDF file using simple method for basic text extraction and send to Gemini for structured data extraction.
    
    Args:
        file: PDF file to upload and parse
        
    Returns:
        Structured data extracted by Gemini model
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Read and validate file content
        pdf_content = await file.read()
        if len(pdf_content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Use the new wall extraction function
        result = pdf_parser.parse_pdf_with_wall_extraction(pdf_content)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"PDF parsing or wall extraction failed: {result.get('error', 'Unknown error')}"
            )
        
        # Format response to match the expected GeminiResponse model
        walls_data = result["wall_data"]["walls"]
        return GeminiResponse(walls=walls_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in simple PDF parsing with Gemini: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/parse/comprehensive", response_model=Dict[str, Any])
async def parse_pdf_comprehensive(
    file: UploadFile = File(..., description="PDF file to parse"),
    preferred_method: str = Query("pdfplumber", description="Preferred parsing method: 'pdfplumber' or 'pypdf2'")
):
    """
    Parse a PDF file using comprehensive method for detailed analysis.
    
    Args:
        file: PDF file to upload and parse
        preferred_method: Preferred parsing library to use first
        
    Returns:
        Dictionary containing comprehensive parsing results including tables and metadata
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Validate preferred method
        if preferred_method not in ["pdfplumber", "pypdf2"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid preferred method. Use 'pdfplumber' or 'pypdf2'"
            )
        
        # Read and validate file content
        pdf_content = await file.read()
        if len(pdf_content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Parse PDF using comprehensive method
        result = pdf_parser.parse_pdf_comprehensive(pdf_content, preferred_method)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"PDF parsing failed: {result.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "message": "PDF parsed successfully with comprehensive analysis",
            "filename": file.filename,
            "preferred_method": preferred_method,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in comprehensive PDF parsing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/extract/text-only", response_model=Dict[str, Any])
async def extract_text_only(
    file: UploadFile = File(..., description="PDF file to extract text from")
):
    """
    Extract only text content from PDF file without additional metadata.
    
    Args:
        file: PDF file to upload and extract text from
        
    Returns:
        Dictionary containing only the extracted text
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Read and validate file content
        pdf_content = await file.read()
        if len(pdf_content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Parse PDF using simple method
        result = pdf_parser.parse_pdf_simple(pdf_content)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Text extraction failed: {result.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "message": "Text extracted successfully",
            "filename": file.filename,
            "text": result["text"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in text extraction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health", response_model=Dict[str, Any])
async def pdf_parser_health():
    """
    Health check endpoint for PDF parser service.
    
    Returns:
        Dictionary containing service status
    """
    try:
        return {
            "success": True,
            "service": "PDF Parser",
            "status": "healthy",
            "supported_methods": ["simple", "comprehensive"],
            "supported_libraries": ["pdfplumber", "PyPDF2"],
            "max_file_size_mb": 50
        }
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Service health check failed: {str(e)}"
        )


@router.get("/info", response_model=Dict[str, Any])
async def pdf_parser_info():
    """
    Get information about the PDF parser service capabilities.
    
    Returns:
        Dictionary containing service information and capabilities
    """
    return {
        "success": True,
        "service_name": "PDF Parser Service with AI Wall Extraction",
        "version": "2.0.0",
        "description": "Parse PDF files and extract text content using pdfplumber and PyPDF2, with AI-powered wall data extraction using Google Gemini Flash 2.5",
        "endpoints": {
            "/parse": "Parse PDF with configurable method (simple/comprehensive/wall_extraction)",
            "/parse/simple": "Legacy simple text extraction with Gemini processing",
            "/parse/comprehensive": "Comprehensive analysis with tables and metadata",
            "/extract/walls": "AI-powered wall data extraction using Gemini Flash 2.5",
            "/extract/text-only": "Extract only text content",
            "/upload-and-enrich": "Upload PDF file and enrich wall data with elements and regulations",
            "/enrich-walls/{pdf_id}": "Enrich wall data from stored PDF with elements and regulations",
            "/enrich-walls-batch": "Batch process multiple PDFs for wall enrichment",
            "/health": "Service health check",
            "/info": "Service information"
        },
        "supported_formats": ["PDF"],
        "parsing_libraries": {
            "pdfplumber": "Better for text extraction and table detection",
            "PyPDF2": "Better for metadata extraction"
        },
        "ai_capabilities": {
            "model": "Google Gemini Flash 2.5 (gemini-2.0-flash-001)",
            "wall_data_extraction": "Structured extraction of wall measurements and areas",
            "supported_units": ["m", "m²", "cm", "mm", "ft", "ft²"],
            "output_format": "JSON with id, total_length, total_gross_area, total_net_area"
        },
        "features": [
            "Text extraction from all pages",
            "Table detection and extraction",
            "Document metadata extraction",
            "Multiple parsing methods",
            "Fallback parsing support",
            "AI-powered wall data extraction",
            "Structured JSON output for wall measurements",
            "Unit conversion and normalization",
            "File size validation",
            "Error handling and logging"
        ],
        "limitations": {
            "max_file_size_mb": 50,
            "supported_file_types": [".pdf"],
            "encrypted_pdfs": "Limited support for encrypted PDFs",
            "ai_requirements": "Requires valid Google API key for wall extraction features"
        }
    }


@router.get("/enrich-walls/{pdf_id}", response_model=Dict[str, Any])
async def enrich_walls_from_pdf_id(
    pdf_id: str,
    user_id: str = Query(..., description="User ID to filter elements by")
):
    """
    Fetch PDF by ID and enrich wall data with elements and regulations from database.
    
    This endpoint:
    1. Fetches the PDF file from the database by ID
    2. Checks if wall data is already parsed and stored in the content field
    3. If not, downloads the PDF content and parses it using Gemini AI
    4. Enriches wall data with matching elements from element_list table
    5. Gets associated regulations for each element
    6. Returns comprehensive enriched data
    
    Args:
        pdf_id: UUID of the PDF file in the database
        user_id: UUID of the user to filter elements by
        
    Returns:
        Dictionary containing enriched wall data with elements and regulations
    """
    try:
        # Call the service function
        result = pdf_parser.enrich_walls_from_pdf_id(pdf_id, user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Wall enrichment failed: {result.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "message": "Wall data enriched successfully",
            "pdf_id": pdf_id,
            "user_id": user_id,
            "file_info": result.get("file_info", {}),
            "enriched_walls": result.get("enriched_data", {}).get("enriched_walls", []),
            "summary": {
                "total_walls": len(result.get("enriched_data", {}).get("enriched_walls", [])),
                "total_elements_found": result.get("enriched_data", {}).get("summary", {}).get("total_elements_found", 0),
                "total_regulations_found": result.get("enriched_data", {}).get("summary", {}).get("total_regulations_found", 0),
                "source": result.get("source", "unknown"),
                "pdf_info": result.get("summary", {}) if result.get("source") == "fresh_processing" else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in wall enrichment endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/upload-and-enrich", response_model=Dict[str, Any])
async def upload_pdf_and_enrich_walls(
    file: UploadFile = File(..., description="PDF file to upload and process"),
    user_id: str = Form(..., description="User ID to filter elements by"),
    project_id: Optional[str] = Form(None, description="Project ID to attach the file to (optional if boq_id is provided)"),
    boq_id: Optional[str] = Form(None, description="BOQ ID to attach the file to (optional if project_id is provided)")
):
    """
    Upload PDF file, save it to database, then enrich wall data with elements and regulations.
    
    This endpoint combines two different logics:
    1. First: Upload PDF file and save it to database
    2. Second: Use enrich_walls_from_pdf_id function to get regulation data and return enriched result
    
    Args:
        file: PDF file to upload and process
        user_id: UUID of the user to filter elements by
        project_id: UUID of the project this file belongs to (optional if boq_id is provided)
        boq_id: Optional UUID of the BOQ this file belongs to (optional if project_id is provided)
        
    Returns:
        Dictionary containing upload result and enriched wall data with elements and regulations
    """
    try:
        # Validate that at least one ID is provided
        if not project_id and not boq_id:
            raise HTTPException(
                status_code=400,
                detail="Either project_id or boq_id must be provided"
            )
        
        # If boq_id is provided but not project_id, get project_id from BOQ
        if boq_id and not project_id:
            from ..services.boqs_service import get_boq_by_id
            boq_result = get_boq_by_id(boq_id)
            if not boq_result["success"]:
                raise HTTPException(
                    status_code=404,
                    detail=f"BOQ not found: {boq_result.get('error', 'Unknown error')}"
                )
            project_id = boq_result["data"]["project_id"]
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files are supported."
            )
        
        # Read and validate file content
        pdf_content = await file.read()
        if len(pdf_content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Call the service function
        result = pdf_parser.upload_pdf_and_enrich_walls(
            pdf_content=pdf_content,
            file_name=file.filename,
            project_id=project_id,
            user_id=user_id,
            boq_id=boq_id
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Upload and enrichment failed: {result.get('error', 'Unknown error')}"
            )
        
        # Format response
        response_data = {
            "success": True,
            "message": result.get("message", "PDF uploaded and processed successfully"),
            "file_info": {
                "file_id": result.get("upload_info", {}).get("file_id"),
                "file_name": result.get("upload_info", {}).get("file_name"),
                "storage_path": result.get("upload_info", {}).get("storage_path"),
                "bucket_name": result.get("upload_info", {}).get("bucket_name")
            },
            "enriched_walls": result.get("enriched_data", {}).get("enriched_walls", []),
            "summary": {
                "total_walls": len(result.get("enriched_data", {}).get("enriched_walls", [])),
                "total_elements_found": result.get("enriched_data", {}).get("summary", {}).get("total_elements_found", 0),
                "total_regulations_found": result.get("enriched_data", {}).get("summary", {}).get("total_regulations_found", 0),
                "source": result.get("source", "fresh_processing")
            }
        }
        
        # Add PDF info if available
        if result.get("pdf_info"):
            response_data["pdf_info"] = result["pdf_info"]
        
        # Add wall data if available
        if result.get("wall_data"):
            response_data["wall_data"] = result["wall_data"]
        
        # Add processing summary if available
        if result.get("summary"):
            response_data["processing_summary"] = result["summary"]
        
        # Add warning if present
        if result.get("warning"):
            response_data["warning"] = result["warning"]
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload and enrich endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/enrich-walls-batch", response_model=Dict[str, Any])
async def enrich_walls_from_multiple_pdfs(
    pdf_ids: list[str] = Form(..., description="List of PDF file IDs"),
    user_id: str = Form(..., description="User ID to filter elements by")
):
    """
    Batch process multiple PDFs to enrich wall data with elements and regulations.
    
    Args:
        pdf_ids: List of PDF file UUIDs in the database
        user_id: UUID of the user to filter elements by
        
    Returns:
        Dictionary containing batch processing results
    """
    try:
        results = []
        successful_count = 0
        failed_count = 0
        
        for pdf_id in pdf_ids:
            try:
                result = pdf_parser.enrich_walls_from_pdf_id(pdf_id, user_id)
                
                if result["success"]:
                    successful_count += 1
                    results.append({
                        "pdf_id": pdf_id,
                        "success": True,
                        "enriched_walls": result.get("enriched_data", {}).get("enriched_walls", []),
                        "summary": result.get("enriched_data", {}).get("summary", {}),
                        "file_info": result.get("file_info", {})
                    })
                else:
                    failed_count += 1
                    results.append({
                        "pdf_id": pdf_id,
                        "success": False,
                        "error": result.get("error", "Unknown error")
                    })
                    
            except Exception as e:
                failed_count += 1
                results.append({
                    "pdf_id": pdf_id,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "message": f"Batch processing completed: {successful_count} successful, {failed_count} failed",
            "user_id": user_id,
            "total_processed": len(pdf_ids),
            "successful_count": successful_count,
            "failed_count": failed_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch wall enrichment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )