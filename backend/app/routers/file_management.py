"""
File Management API Router

This module contains all API endpoints related to file management operations.
Handles .onlv file uploads, conversions, downloads, and file listing.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import Dict, Any
import xmltodict
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

router = APIRouter(
    prefix="/files",
    tags=["file-management"],
    responses={404: {"description": "Not found"}},
)

# Configure upload directories
UPLOAD_DIR = Path("uploads")
ONLV_DIR = UPLOAD_DIR / "onlv_files"
JSON_DIR = UPLOAD_DIR / "json_files"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
ONLV_DIR.mkdir(exist_ok=True)
JSON_DIR.mkdir(exist_ok=True)

# Helper functions
def file_exists_in_storage(filename: str) -> bool:
    """Check if a file already exists in storage"""
    onlv_path = ONLV_DIR / filename
    return onlv_path.exists()

def save_files(filename: str, onlv_content: bytes, json_data: dict) -> Dict[str, str]:
    """Save both .onlv and .json files to storage"""
    # Save .onlv file
    onlv_path = ONLV_DIR / filename
    with open(onlv_path, 'wb') as f:
        f.write(onlv_content)
    
    # Save .json file
    json_filename = filename.replace('.onlv', '.json')
    json_path = JSON_DIR / json_filename
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    
    return {
        "onlv_path": str(onlv_path),
        "json_path": str(json_path)
    }

def get_file_info(filepath: Path) -> Dict[str, Any]:
    """Get file information including size and modification time"""
    stat = filepath.stat()
    return {
        "name": filepath.name,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "path": str(filepath)
    }

def process_array_elements(data, array_elements):
    """
    Recursively process data to ensure specified elements are always arrays
    """
    if isinstance(data, dict):
        processed_data = {}
        for key, value in data.items():
            if key in array_elements and not isinstance(value, list):
                # Convert single item to array
                processed_data[key] = [value] if value is not None else []
            else:
                # Recursively process nested structures
                processed_data[key] = process_array_elements(value, array_elements)
        return processed_data
    elif isinstance(data, list):
        return [process_array_elements(item, array_elements) for item in data]
    else:
        return data

@router.post("/upload-onlv/")
async def upload_onlv_file(file: UploadFile = File(...)):
    """
    Upload .onlv file and convert XML to JSON with specific array handling.
    Saves both .onlv and .json files to storage with duplicate checking.
    """
    # Check if file has .onlv extension
    if not file.filename.endswith('.onlv'):
        raise HTTPException(status_code=400, detail="File must have .onlv extension")
    
    # Check if file already exists
    if file_exists_in_storage(file.filename):
        raise HTTPException(
            status_code=409,
            detail=f"File '{file.filename}' already exists in storage. Please rename the file or delete the existing one."
        )
    
    try:
        # Read file content
        content = await file.read()
        xml_content = content.decode('utf-8')
        
        # Define elements that should always be treated as arrays
        # Based on the JavaScript logic provided
        array_elements = [
            "leistungsteil",
            "position",
            "teilposition",
            "zuschlag",
            "abschlag",
            "kennwert"
        ]
        
        # Convert XML to dictionary using xmltodict with proper configuration
        # to match JavaScript XMLParser behavior
        xml_dict = xmltodict.parse(
            xml_content,
            attr_prefix='@_',  # Match the JavaScript XMLParser attributeNamePrefix: "@_"
            force_list=array_elements  # Force these elements to always be lists (arrays)
        )
        
        # The force_list parameter handles the array conversion during parsing,
        # so we don't need post-processing
        processed_data = xml_dict
        
        # Save both files to storage
        file_paths = save_files(file.filename, content, processed_data)
        
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "data": processed_data,
            "saved_files": file_paths,
            "message": f"File '{file.filename}' uploaded and converted successfully!"
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error. Please ensure the file is UTF-8 encoded.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/")
async def list_stored_files():
    """
    List all stored .onlv and .json files with their information
    """
    try:
        files_info = {
            "onlv_files": [],
            "json_files": [],
            "total_count": 0
        }
        
        # Get .onlv files
        if ONLV_DIR.exists():
            for onlv_file in ONLV_DIR.glob("*.onlv"):
                file_info = get_file_info(onlv_file)
                # Check if corresponding JSON file exists
                json_filename = onlv_file.name.replace('.onlv', '.json')
                json_path = JSON_DIR / json_filename
                file_info["has_json"] = json_path.exists()
                if json_path.exists():
                    file_info["json_info"] = get_file_info(json_path)
                files_info["onlv_files"].append(file_info)
        
        # Get .json files
        if JSON_DIR.exists():
            for json_file in JSON_DIR.glob("*.json"):
                file_info = get_file_info(json_file)
                # Check if corresponding ONLV file exists
                onlv_filename = json_file.name.replace('.json', '.onlv')
                onlv_path = ONLV_DIR / onlv_filename
                file_info["has_onlv"] = onlv_path.exists()
                if onlv_path.exists():
                    file_info["onlv_info"] = get_file_info(onlv_path)
                files_info["json_files"].append(file_info)
        
        # Sort files by modification time (newest first)
        files_info["onlv_files"].sort(key=lambda x: x["modified"], reverse=True)
        files_info["json_files"].sort(key=lambda x: x["modified"], reverse=True)
        
        files_info["total_count"] = len(files_info["onlv_files"]) + len(files_info["json_files"])
        
        return files_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@router.delete("/local/{filename}")
async def delete_file(filename: str):
    """
    Delete a file and its corresponding pair (.onlv/.json)
    """
    try:
        deleted_files = []
        
        if filename.endswith('.onlv'):
            # Delete .onlv file
            onlv_path = ONLV_DIR / filename
            if onlv_path.exists():
                onlv_path.unlink()
                deleted_files.append(f"onlv_files/{filename}")
            
            # Delete corresponding .json file
            json_filename = filename.replace('.onlv', '.json')
            json_path = JSON_DIR / json_filename
            if json_path.exists():
                json_path.unlink()
                deleted_files.append(f"json_files/{json_filename}")
                
        elif filename.endswith('.json'):
            # Delete .json file
            json_path = JSON_DIR / filename
            if json_path.exists():
                json_path.unlink()
                deleted_files.append(f"json_files/{filename}")
            
            # Delete corresponding .onlv file
            onlv_filename = filename.replace('.json', '.onlv')
            onlv_path = ONLV_DIR / onlv_filename
            if onlv_path.exists():
                onlv_path.unlink()
                deleted_files.append(f"onlv_files/{onlv_filename}")
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Only .onlv and .json files are supported.")
        
        if not deleted_files:
            raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")
        
        return {
            "message": f"Successfully deleted {len(deleted_files)} file(s)",
            "deleted_files": deleted_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.get("/local/download/{filename}")
async def download_file(filename: str):
    """
    Download a specific file (.onlv or .json)
    """
    try:
        if filename.endswith('.onlv'):
            file_path = ONLV_DIR / filename
            media_type = "application/octet-stream"
        elif filename.endswith('.json'):
            file_path = JSON_DIR / filename
            media_type = "application/json"
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Only .onlv and .json files are supported.")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")