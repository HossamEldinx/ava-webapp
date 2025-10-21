from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Dict, List
from ..services.parse_file import (
    WallDataResponse,
    process_wall_data_from_pdf,
    get_supported_units
)

router = APIRouter(
    prefix="/wall-extraction",
    tags=["Wall Data Extraction"],
    responses={404: {"description": "Not found"}},
)

@router.post("/extract-walls/", response_model=WallDataResponse)
async def extract_walls(file: UploadFile = File(...)):
    """
    Extract wall data from PDF file with measurement units
    
    This endpoint accepts a PDF file and extracts structured wall data including:
    - Wall IDs (e.g., IW01, IW02)
    - Origin floor information
    - Measurements with units (thickness, height, length, areas)
    - Calculated totals and summary statistics
    
    Args:
        file: PDF file containing wall data
        
    Returns:
        WallDataResponse: Structured wall data with measurements and totals
        
    Raises:
        HTTPException: If file is not PDF or processing fails
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Read file content
        content = await file.read()
        
        # Process the PDF using the service
        result = process_wall_data_from_pdf(content)
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions from the service
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/supported-units")
async def get_supported_measurement_units() -> Dict[str, List[str]]:
    """
    Get list of supported measurement units
    
    Returns a dictionary of supported units categorized by type:
    - length_units: mm, cm, m, etc.
    - area_units: mm², cm², m², etc.
    - volume_units: mm³, cm³, m³, etc.
    - weight_units: g, kg, t, etc.
    - temperature_units: °C, °F, K
    - pressure_units: Pa, kPa, MPa, etc.
    - force_units: N, kN, etc.
    - power_units: W, kW, etc.
    
    Returns:
        Dict[str, List[str]]: Dictionary of unit categories and their supported units
    """
    return get_supported_units()

@router.get("/health")
async def health_check():
    """
    Health check endpoint for wall extraction service
    
    Returns:
        dict: Service status and information
    """
    return {
        "status": "healthy",
        "service": "Wall Data Extractor API",
        "version": "1.0.0",
        "features": [
            "Extract wall data with measurement units",
            "Support for metric and imperial units", 
            "English JSON keys",
            "Automatic unit detection",
            "Totals calculation by unit type"
        ]
    }