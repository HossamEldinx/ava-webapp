"""
PDF Parser Service

This module provides functionality to parse PDF files and extract text content
using both pdfplumber and PyPDF2 libraries for comprehensive PDF processing.
"""

import io
import logging
import os
import json
import re
from typing import Dict, Any, List, Optional, Union, Set
import pdfplumber
import PyPDF2
from PyPDF2 import PdfReader
import google.generativeai as genai
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini client
try:
    # Get API key from environment variable
    api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
    if api_key:
        genai.configure(api_key=api_key)
        gemini_client = True
    else:
        gemini_client = None
        logger.warning("No Google API key found. Gemini functionality will be disabled.")
except Exception as e:
    gemini_client = None
    logger.error(f"Failed to initialize Gemini client: {str(e)}")

# Initialize Supabase client
try:
    load_dotenv()
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase_client = True
    else:
        supabase_client = None
        logger.warning("No Supabase credentials found. Database functionality will be disabled.")
except Exception as e:
    supabase_client = None
    logger.error(f"Failed to initialize Supabase client: {str(e)}")


class PDFParsingError(Exception):
    """Custom exception for PDF parsing errors"""
    pass


class GeminiParsingError(Exception):
    """Custom exception for Gemini parsing errors"""
    pass


# --------------------------------------------------------------------------
# Database Functions - Element Name Fetching for Enhanced Wall Detection
# --------------------------------------------------------------------------

def fetch_element_names_by_user(user_id: str) -> Set[str]:
    """
    Fetch all element names from the database for a specific user.
    
    Args:
        user_id: The user ID to fetch elements for
        
    Returns:
        Set of element names from the database
    """
    if not supabase_client:
        logger.warning("Supabase client not available, returning empty element names set")
        return set()
    
    try:
        # Fetch element names with efficient query using index
        response = supabase.table("element_list") \
            .select("name") \
            .eq("user_id", user_id) \
            .execute()
        
        if response.data:
            element_names = {item["name"].upper() for item in response.data}
            logger.info(f"Fetched {len(element_names)} element names from database for user {user_id}")
            return element_names
        else:
            logger.warning(f"No element names found in database for user {user_id}")
            return set()
            
    except Exception as e:
        logger.error(f"Error fetching element names from database: {str(e)}")
        return set()

def group_element_names_by_pattern(element_names: Set[str]) -> Dict[str, List[str]]:
    """
    Group element names by their pattern (e.g., IW, IN, etc.)
    
    Args:
        element_names: Set of element names from database
        
    Returns:
        Dictionary mapping patterns to lists of element names
    """
    pattern_groups = {}
    
    for name in element_names:
        # Extract pattern using regex - match letters followed by numbers
        match = re.match(r'^([A-Z]+)\d+', name)
        if match:
            pattern = match.group(1)
            if pattern not in pattern_groups:
                pattern_groups[pattern] = []
            pattern_groups[pattern].append(name)
        else:
            # Handle names that don't follow the pattern
            if "OTHER" not in pattern_groups:
                pattern_groups["OTHER"] = []
            pattern_groups["OTHER"].append(name)
    
    # Sort each group for consistency
    for pattern in pattern_groups:
        pattern_groups[pattern].sort()
    
    logger.info(f"Grouped element names into {len(pattern_groups)} patterns: {list(pattern_groups.keys())}")
    return pattern_groups

def create_enhanced_wall_prompt(pdf_text: str, element_names: Set[str] = None) -> str:
    """
    Create an enhanced prompt for Gemini that includes user-specific element names.
    
    Args:
        pdf_text: The PDF text to analyze
        element_names: Set of element names from database
        
    Returns:
        Enhanced prompt string
    """
    # Build the element list for the prompt
    if element_names:
        pattern_groups = group_element_names_by_pattern(element_names)
        element_examples = []
        
        for pattern, names in pattern_groups.items():
            if pattern != "OTHER":
                sample_names = names[:3]  # Take first 3 as examples
                element_examples.extend(sample_names)
        
        if element_examples:
            element_list = ", ".join(sorted(element_examples))
            specific_instruction = f"""
        
        SPECIFIC ELEMENT NAMES TO LOOK FOR:
        Based on the user's database, prioritize finding these specific element names: {element_list}
        
        These are actual element names from the user's system. Look for exact matches or variations of these names.
        """
        else:
            specific_instruction = "\n\nNo specific element names available from database, use standard patterns."
    else:
        specific_instruction = "\n\nNo database connection available, use standard patterns like IW01, IW02, IN01, etc."
    
    return f"""
        Extract wall information from the PDF text and return ONLY a valid JSON object in this exact format:

        {{
            "walls": [
                {{
                    "id": "IW01",
                    "total_length": {{"value": 698.08, "unit": "m", "raw_text": "698,08 m"}},
                    "total_gross_area": {{"value": 2256.74, "unit": "m²", "raw_text": "2 256,74 m²"}},
                    "total_net_area": {{"value": 1987.13, "unit": "m²", "raw_text": "1 987,13 m²"}}
                }}
            ]
        }}

        CRITICAL REQUIREMENTS:
        1. Return ONLY valid JSON - no markdown, no explanations, no code blocks
        2. Find wall IDs like IW01, IW02, IW03, IN01, EW01, WAND, DECKE, BODEN, etc.
        3. Extract measurements for each wall: length, gross area, net area
        4. Use exact raw text from document in "raw_text" field
        5. Convert numbers to float in "value" field
        6. Use proper units: "m" for length, "m²" for area
        7. If no walls found, return {{"walls": []}}
        8. Ensure JSON is complete and properly closed{specific_instruction}

        PDF Text:
        {pdf_text}
        """


def extract_text_with_pdfplumber(pdf_content: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using pdfplumber library.
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Dictionary containing extracted text and metadata
    """
    try:
        pdf_stream = io.BytesIO(pdf_content)
        
        with pdfplumber.open(pdf_stream) as pdf:
            text_content = []
            page_texts = []
            
            # Extract text from each page
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    page_texts.append({
                        "page_number": page_num,
                        "text": page_text.strip(),
                        "char_count": len(page_text)
                    })
                    text_content.append(page_text)
            
            # Combine all text
            full_text = "\n\n".join(text_content)
            
            # Extract tables if any
            tables = []
            for page_num, page in enumerate(pdf.pages, 1):
                page_tables = page.extract_tables()
                if page_tables:
                    for table_idx, table in enumerate(page_tables):
                        tables.append({
                            "page_number": page_num,
                            "table_index": table_idx,
                            "table_data": table
                        })
            
            return {
                "success": True,
                "method": "pdfplumber",
                "full_text": full_text,
                "page_texts": page_texts,
                "tables": tables,
                "total_pages": len(pdf.pages),
                "total_characters": len(full_text),
                "metadata": {
                    "pages_with_text": len(page_texts),
                    "tables_found": len(tables)
                }
            }
            
    except Exception as e:
        logger.error(f"Error extracting text with pdfplumber: {str(e)}")
        return {
            "success": False,
            "method": "pdfplumber",
            "error": str(e),
            "full_text": "",
            "page_texts": [],
            "tables": [],
            "total_pages": 0,
            "total_characters": 0
        }


def extract_text_with_pypdf2(pdf_content: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using PyPDF2 library.
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Dictionary containing extracted text and metadata
    """
    try:
        pdf_stream = io.BytesIO(pdf_content)
        pdf_reader = PdfReader(pdf_stream)
        
        text_content = []
        page_texts = []
        
        # Extract text from each page
        for page_num, page in enumerate(pdf_reader.pages, 1):
            try:
                page_text = page.extract_text()
                if page_text:
                    page_texts.append({
                        "page_number": page_num,
                        "text": page_text.strip(),
                        "char_count": len(page_text)
                    })
                    text_content.append(page_text)
            except Exception as page_error:
                logger.warning(f"Error extracting text from page {page_num}: {str(page_error)}")
                continue
        
        # Combine all text
        full_text = "\n\n".join(text_content)
        
        # Extract metadata
        metadata = {}
        if pdf_reader.metadata:
            metadata = {
                "title": pdf_reader.metadata.get("/Title", ""),
                "author": pdf_reader.metadata.get("/Author", ""),
                "subject": pdf_reader.metadata.get("/Subject", ""),
                "creator": pdf_reader.metadata.get("/Creator", ""),
                "producer": pdf_reader.metadata.get("/Producer", ""),
                "creation_date": str(pdf_reader.metadata.get("/CreationDate", "")),
                "modification_date": str(pdf_reader.metadata.get("/ModDate", ""))
            }
        
        return {
            "success": True,
            "method": "PyPDF2",
            "full_text": full_text,
            "page_texts": page_texts,
            "total_pages": len(pdf_reader.pages),
            "total_characters": len(full_text),
            "metadata": metadata,
            "document_info": {
                "pages_with_text": len(page_texts),
                "is_encrypted": pdf_reader.is_encrypted
            }
        }
        
    except Exception as e:
        logger.error(f"Error extracting text with PyPDF2: {str(e)}")
        return {
            "success": False,
            "method": "PyPDF2",
            "error": str(e),
            "full_text": "",
            "page_texts": [],
            "total_pages": 0,
            "total_characters": 0
        }


def parse_pdf_comprehensive(pdf_content: bytes, preferred_method: str = "pdfplumber") -> Dict[str, Any]:
    """
    Parse PDF using both methods and return comprehensive results.
    
    Args:
        pdf_content: PDF file content as bytes
        preferred_method: Preferred parsing method ("pdfplumber" or "pypdf2")
        
    Returns:
        Dictionary containing comprehensive parsing results
    """
    try:
        results = {
            "parsing_timestamp": None,
            "file_size_bytes": len(pdf_content),
            "preferred_method": preferred_method,
            "results": {}
        }
        
        # Try pdfplumber first if preferred
        if preferred_method == "pdfplumber":
            pdfplumber_result = extract_text_with_pdfplumber(pdf_content)
            results["results"]["pdfplumber"] = pdfplumber_result
            
            # If pdfplumber fails, try PyPDF2 as fallback
            if not pdfplumber_result["success"]:
                logger.info("pdfplumber failed, trying PyPDF2 as fallback")
                pypdf2_result = extract_text_with_pypdf2(pdf_content)
                results["results"]["pypdf2"] = pypdf2_result
            else:
                # Also try PyPDF2 for metadata if pdfplumber succeeded
                pypdf2_result = extract_text_with_pypdf2(pdf_content)
                results["results"]["pypdf2"] = pypdf2_result
        
        # Try PyPDF2 first if preferred
        else:
            pypdf2_result = extract_text_with_pypdf2(pdf_content)
            results["results"]["pypdf2"] = pypdf2_result
            
            # If PyPDF2 fails, try pdfplumber as fallback
            if not pypdf2_result["success"]:
                logger.info("PyPDF2 failed, trying pdfplumber as fallback")
                pdfplumber_result = extract_text_with_pdfplumber(pdf_content)
                results["results"]["pdfplumber"] = pdfplumber_result
            else:
                # Also try pdfplumber for tables if PyPDF2 succeeded
                pdfplumber_result = extract_text_with_pdfplumber(pdf_content)
                results["results"]["pdfplumber"] = pdfplumber_result
        
        # Determine the best result
        best_result = None
        if preferred_method == "pdfplumber" and results["results"].get("pdfplumber", {}).get("success"):
            best_result = results["results"]["pdfplumber"]
        elif preferred_method == "pypdf2" and results["results"].get("pypdf2", {}).get("success"):
            best_result = results["results"]["pypdf2"]
        elif results["results"].get("pdfplumber", {}).get("success"):
            best_result = results["results"]["pdfplumber"]
        elif results["results"].get("pypdf2", {}).get("success"):
            best_result = results["results"]["pypdf2"]
        
        if best_result:
            results["success"] = True
            results["best_method"] = best_result["method"]
            results["extracted_text"] = best_result["full_text"]
            results["page_count"] = best_result["total_pages"]
            results["character_count"] = best_result["total_characters"]
            results["pages_with_text"] = len(best_result["page_texts"])
            
            # Include tables if available (from pdfplumber)
            if "tables" in best_result:
                results["tables"] = best_result["tables"]
                results["tables_count"] = len(best_result["tables"])
            
            # Include metadata if available (from PyPDF2)
            if "metadata" in best_result and isinstance(best_result["metadata"], dict):
                if "title" in best_result["metadata"]:  # PyPDF2 metadata format
                    results["document_metadata"] = best_result["metadata"]
        else:
            results["success"] = False
            results["error"] = "Both parsing methods failed"
            results["extracted_text"] = ""
            results["page_count"] = 0
            results["character_count"] = 0
        
        return results
        
    except Exception as e:
        logger.error(f"Error in comprehensive PDF parsing: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "extracted_text": "",
            "page_count": 0,
            "character_count": 0,
            "file_size_bytes": len(pdf_content) if pdf_content else 0
        }


def parse_pdf_simple(pdf_content: bytes) -> Dict[str, Any]:
    """
    Simple PDF parsing function that returns just the essential information with page splits.
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Dictionary containing essential parsing results including page-by-page text
    """
    try:
        # Try pdfplumber first for better text extraction
        result = extract_text_with_pdfplumber(pdf_content)
        
        if not result["success"]:
            # Fallback to PyPDF2
            result = extract_text_with_pypdf2(pdf_content)
        
        if result["success"]:
            return {
                "success": True,
                "text": result["full_text"],
                "pages": result["total_pages"],
                "characters": result["total_characters"],
                "method_used": result["method"],
                "page_texts": result["page_texts"]  # Include individual page texts
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "text": "",
                "pages": 0,
                "characters": 0,
                "page_texts": []
            }
            
    except Exception as e:
        logger.error(f"Error in simple PDF parsing: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0,
            "characters": 0,
            "page_texts": []
        }


# Main parsing function for external use
def extract_walls_with_gemini(pdf_text: str, user_id: str = None) -> Dict[str, Any]:
    """
    Extract wall data from PDF text using Gemini Flash 2.5 model.
    Now enhanced with database-driven element name detection.
    
    Args:
        pdf_text: Extracted text from PDF
        user_id: Optional user ID to fetch specific element names from database
        
    Returns:
        Dictionary containing structured wall data
    """
    if not gemini_client:
        return {
            "success": False,
            "error": "Gemini client not initialized. Please check your API key configuration.",
            "walls": []
        }
    
    if not pdf_text or not pdf_text.strip():
        return {
            "success": False,
            "error": "No text content provided for analysis",
            "walls": []
        }
    
    try:
        # Fetch element names from database if user_id is provided
        element_names = set()
        if user_id:
            element_names = fetch_element_names_by_user(user_id)
            logger.info(f"Using {len(element_names)} element names from database for enhanced wall detection")
        
        # Create enhanced prompt with database-driven element names
        prompt = create_enhanced_wall_prompt(pdf_text, element_names)
        
        # Generate content using Gemini Flash 2.5 (optimized for speed)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,  # Low temperature for more consistent output
                max_output_tokens=30000,  # Reduced from 50000 to speed up processing
                top_p=0.8,
                top_k=40
            )
        )
        
        if not response or not response.text:
            return {
                "success": False,
                "error": "No response received from Gemini model",
                "walls": []
            }
        
        # Extract usage metadata for cost calculation
        usage_metadata = {}
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            usage_metadata = {
                "prompt_token_count": getattr(response.usage_metadata, 'prompt_token_count', 0),
                "candidates_token_count": getattr(response.usage_metadata, 'candidates_token_count', 0),
                "total_token_count": getattr(response.usage_metadata, 'total_token_count', 0)
            }
            
            # Calculate estimated cost for Gemini Flash 2.5
            # Pricing as of 2024: $0.075 per 1M input tokens, $0.30 per 1M output tokens
            input_cost = (usage_metadata["prompt_token_count"] / 1_000_000) * 0.075
            output_cost = (usage_metadata["candidates_token_count"] / 1_000_000) * 0.30
            total_cost = input_cost + output_cost
            
            usage_metadata.update({
                "estimated_input_cost_usd": round(input_cost, 6),
                "estimated_output_cost_usd": round(output_cost, 6),
                "estimated_total_cost_usd": round(total_cost, 6)
            })
        
        # Parse the JSON response
        try:
            # Clean the response text (remove any markdown formatting)
            response_text = response.text.strip()
            
            # Remove markdown code blocks
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Handle truncated JSON by finding the last complete object
            if not response_text.endswith('}'):
                # Find the last complete wall object
                last_complete_brace = response_text.rfind('}')
                if last_complete_brace != -1:
                    # Find the position after the last complete wall object
                    walls_end = response_text.rfind('}', 0, last_complete_brace)
                    if walls_end != -1:
                        # Truncate to the last complete wall and close the JSON properly
                        response_text = response_text[:walls_end + 1] + '\n    ]\n}'
            
            parsed_data = json.loads(response_text)
            
            # Validate the structure
            if not isinstance(parsed_data, dict) or "walls" not in parsed_data:
                return {
                    "success": False,
                    "error": "Invalid response structure from Gemini model",
                    "walls": []
                }
            
            # Debug: Log the extracted walls
            walls = parsed_data["walls"]
            logger.info(f"Gemini extracted {len(walls)} walls from PDF:")
            for i, wall in enumerate(walls):
                wall_id = wall.get("id", "NO_ID")
                logger.info(f"  Wall {i+1}: ID='{wall_id}'")
            
            return {
                "success": True,
                "walls": walls,
                "total_walls_found": len(walls),
                "model_used": "gemini-2.0-flash-001",
                "usage_metadata": usage_metadata,
                "database_optimization_enabled": bool(user_id and element_names),
                "element_names_used": len(element_names) if element_names else 0,
                "patterns_found": list(group_element_names_by_pattern(element_names).keys()) if element_names else []
            }
            
        except json.JSONDecodeError as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            logger.error(f"Raw response: {response.text}")
            return {
                "success": False,
                "error": f"Failed to parse JSON response: {str(json_error)}",
                "walls": [],
                "raw_response": response.text,
                "usage_metadata": usage_metadata,
                "database_optimization_enabled": bool(user_id and element_names),
                "element_names_used": len(element_names) if element_names else 0
            }
            
    except Exception as e:
        logger.error(f"Error in Gemini wall extraction: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "walls": [],
            "usage_metadata": {}
        }


def parse_pdf_with_wall_extraction(pdf_content: bytes, user_id: str = None) -> Dict[str, Any]:
    """
    Parse PDF and extract wall data using Gemini Flash 2.5.
    Now enhanced with database-driven element name detection.
    
    Args:
        pdf_content: PDF file content as bytes
        user_id: Optional user ID to fetch specific element names from database
        
    Returns:
        Dictionary containing PDF parsing results and extracted wall data
    """
    try:
        # First, extract text from PDF
        pdf_result = parse_pdf_simple(pdf_content)
        
        if not pdf_result["success"]:
            return {
                "success": False,
                "error": f"PDF parsing failed: {pdf_result.get('error', 'Unknown error')}",
                "pdf_data": pdf_result,
                "wall_data": {"success": False, "walls": []}
            }
        
        # Extract wall data using Gemini with enhanced prompting
        wall_result = extract_walls_with_gemini(pdf_result["text"], user_id=user_id)
        
        return {
            "success": True,
            "pdf_data": pdf_result,
            "wall_data": wall_result,
            "summary": {
                "pdf_pages": pdf_result["pages"],
                "pdf_characters": pdf_result["characters"],
                "walls_found": wall_result.get("total_walls_found", 0),
                "extraction_method": pdf_result["method_used"],
                "ai_model": wall_result.get("model_used", "gemini-2.0-flash-001"),
                "usage_metadata": wall_result.get("usage_metadata", {})
            }
        }
        
    except Exception as e:
        logger.error(f"Error in PDF parsing with wall extraction: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "pdf_data": {"success": False, "text": "", "pages": 0, "characters": 0},
            "wall_data": {"success": False, "walls": []}
        }


def enrich_walls_with_elements_and_regulations(wall_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Enrich wall data with element information and regulations from the database.
    
    This function takes the parsed PDF wall data and:
    1. Bulk searches for all elements in the element_list table where name matches any wall ID
    2. Bulk gets associated regulations for all those elements
    3. Returns the enriched data
    
    Args:
        wall_data: Dictionary containing wall data from PDF parsing (with "walls" key)
        user_id: UUID of the user to filter elements by
        
    Returns:
        Dictionary containing enriched wall data with elements and regulations
    """
    if not supabase_client:
        return {
            "success": False,
            "error": "Database client not initialized. Please check your Supabase configuration.",
            "enriched_walls": []
        }
    
    if not wall_data or not isinstance(wall_data, dict) or "walls" not in wall_data:
        return {
            "success": False,
            "error": "Invalid wall data provided. Expected dictionary with 'walls' key.",
            "enriched_walls": []
        }
    
    try:
        walls = wall_data.get("walls", [])
        if not walls:
            return {
                "success": True,
                "enriched_walls": [],
                "summary": {
                    "total_walls": 0,
                    "total_elements_found": 0,
                    "total_regulations_found": 0,
                    "user_id": user_id
                }
            }
        
        # Extract all wall IDs that have valid IDs
        wall_ids = []
        walls_by_id = {}
        
        for wall in walls:
            wall_id = wall.get("id")
            if wall_id:
                # Clean and normalize wall ID
                wall_id_clean = wall_id.strip()
                wall_ids.append(wall_id_clean)
                walls_by_id[wall_id_clean] = wall
        
        logger.info(f"Extracted wall IDs for enrichment: {wall_ids}")
        
        # If no valid wall IDs, return walls with empty elements/regulations
        if not wall_ids:
            enriched_walls = []
            for wall in walls:
                enriched_wall = {
                    **wall,
                    "elements": [],
                    "regulations": [],
                    "element_count": 0,
                    "regulation_count": 0,
                    "error": "Wall has no ID" if not wall.get("id") else None
                }
                enriched_walls.append(enriched_wall)
            
            return {
                "success": True,
                "enriched_walls": enriched_walls,
                "summary": {
                    "total_walls": len(enriched_walls),
                    "total_elements_found": 0,
                    "total_regulations_found": 0,
                    "user_id": user_id
                }
            }
        
        # Bulk query: Get all elements that match any of the wall IDs
        # Try exact match first
        elements_response = supabase.table("element_list").select("*").in_("name", wall_ids).eq("user_id", user_id).execute()
        all_elements = elements_response.data if elements_response.data else []
        
        logger.info(f"Found {len(all_elements)} elements with exact match for user {user_id}")
        
        # If no exact matches found, try case-insensitive search
        if not all_elements:
            logger.info("No exact matches found, trying case-insensitive search...")
            # Get all elements for this user and filter manually
            all_user_elements_response = supabase.table("element_list").select("*").eq("user_id", user_id).execute()
            all_user_elements = all_user_elements_response.data if all_user_elements_response.data else []
            
            # Create case-insensitive mapping
            wall_ids_lower = [wid.lower() for wid in wall_ids]
            all_elements = []
            
            for element in all_user_elements:
                element_name = element.get("name", "").strip()
                if element_name.lower() in wall_ids_lower:
                    all_elements.append(element)
                    logger.info(f"Found case-insensitive match: '{element_name}' matches one of {wall_ids}")
        
        logger.info(f"Total elements found after all matching attempts: {len(all_elements)}")
        
        # Debug: Show what elements we found
        if all_elements:
            logger.info("Elements found in database:")
            for element in all_elements:
                logger.info(f"  - ID: {element.get('id')}, Name: '{element.get('name')}', User: {element.get('user_id')}")
        else:
            logger.warning(f"No elements found in database for user {user_id} matching wall IDs: {wall_ids}")
            # Debug: Show what elements exist for this user
            debug_response = supabase.table("element_list").select("id, name").eq("user_id", user_id).limit(10).execute()
            debug_elements = debug_response.data if debug_response.data else []
            if debug_elements:
                logger.info(f"Sample elements for user {user_id}:")
                for elem in debug_elements:
                    logger.info(f"  - ID: {elem.get('id')}, Name: '{elem.get('name')}'")
            else:
                logger.warning(f"No elements found at all for user {user_id}")
        
        # Group elements by wall ID (name)
        elements_by_wall_id = {}
        element_ids = []
        
        for element in all_elements:
            wall_id = element["name"]
            if wall_id not in elements_by_wall_id:
                elements_by_wall_id[wall_id] = []
            elements_by_wall_id[wall_id].append(element)
            element_ids.append(element["id"])
        
        # Bulk query: Get all regulations for all elements
        all_regulations = []
        if element_ids:
            # First get all element_regulations links
            regulations_response = supabase.table("element_regulations").select("*").in_("element_id", element_ids).execute()
            element_regulation_links = regulations_response.data if regulations_response.data else []
            
            if element_regulation_links:
                # Get all unique regulation IDs
                regulation_ids = list(set([link["regulation_id"] for link in element_regulation_links]))
                
                # Get regulation details for all regulation IDs
                regulations_details_response = supabase.table("regulations").select(
                    "id, entity_type, lg_nr, ulg_nr, grundtext_nr, position_nr, full_nr, short_text, searchable_text, created_at"
                ).in_("id", regulation_ids).execute()
                
                regulations_details = regulations_details_response.data if regulations_details_response.data else []
                
                # Create a map of regulation_id to regulation data for easy lookup
                regulations_map = {reg["id"]: reg for reg in regulations_details}
                
                # Combine the data to create the expected structure
                for link in element_regulation_links:
                    regulation_data = regulations_map.get(link["regulation_id"])
                    if regulation_data:
                        all_regulations.append({
                            **link,
                            "regulations": regulation_data
                        })
        
        # Group regulations by element ID
        regulations_by_element_id = {}
        for regulation in all_regulations:
            element_id = regulation["element_id"]
            if element_id not in regulations_by_element_id:
                regulations_by_element_id[element_id] = []
            regulations_by_element_id[element_id].append(regulation)
        
        # Build enriched walls data
        enriched_walls = []
        total_elements_found = 0
        total_regulations_found = 0
        
        for wall in walls:
            wall_id = wall.get("id")
            
            if not wall_id:
                # Wall without ID
                enriched_wall = {
                    **wall,
                    "elements": [],
                    "regulations": [],
                    "element_count": 0,
                    "regulation_count": 0,
                    "error": "Wall has no ID"
                }
                enriched_walls.append(enriched_wall)
                continue
            
            # Get elements for this wall
            wall_elements = elements_by_wall_id.get(wall_id, [])
            wall_regulations = []
            
            # For each element, add its regulations and update element data
            for element in wall_elements:
                element_id = element["id"]
                element_regulations = regulations_by_element_id.get(element_id, [])
                
                # Add regulation info to element
                element["regulation_count"] = len(element_regulations)
                element["regulations"] = element_regulations
                
                # Collect all regulations for this wall
                wall_regulations.extend(element_regulations)
            
            # Create enriched wall data
            enriched_wall = {
                **wall,  # Original wall data (id, total_length, total_gross_area, total_net_area)
                "elements": wall_elements,
                "regulations": wall_regulations,
                "element_count": len(wall_elements),
                "regulation_count": len(wall_regulations)
            }
            
            total_elements_found += len(wall_elements)
            total_regulations_found += len(wall_regulations)
            
            enriched_walls.append(enriched_wall)
            
            logger.info(f"Wall {wall_id}: Found {len(wall_elements)} elements and {len(wall_regulations)} regulations")
        
        return {
            "success": True,
            "enriched_walls": enriched_walls,
            "summary": {
                "total_walls": len(enriched_walls),
                "total_elements_found": total_elements_found,
                "total_regulations_found": total_regulations_found,
                "user_id": user_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error enriching walls with elements and regulations: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "enriched_walls": []
        }


def parse_pdf_with_wall_extraction_and_enrichment(pdf_content: bytes, user_id: str) -> Dict[str, Any]:
    """
    Parse PDF, extract wall data using Gemini, and enrich with element information and regulations.
    
    Args:
        pdf_content: PDF file content as bytes
        user_id: UUID of the user to filter elements by
        
    Returns:
        Dictionary containing PDF parsing results, extracted wall data, and enriched data
    """
    try:
        # First, parse PDF and extract wall data
        wall_extraction_result = parse_pdf_with_wall_extraction(pdf_content)
        
        if not wall_extraction_result["success"]:
            return {
                "success": False,
                "error": f"Wall extraction failed: {wall_extraction_result.get('error', 'Unknown error')}",
                "pdf_data": wall_extraction_result.get("pdf_data", {}),
                "wall_data": wall_extraction_result.get("wall_data", {}),
                "enriched_data": {"success": False, "enriched_walls": []}
            }
        
        # Extract wall data for enrichment
        wall_data = wall_extraction_result.get("wall_data", {})
        
        if not wall_data.get("success") or not wall_data.get("walls"):
            return {
                "success": True,
                "pdf_data": wall_extraction_result.get("pdf_data", {}),
                "wall_data": wall_data,
                "enriched_data": {
                    "success": True,
                    "enriched_walls": [],
                    "message": "No walls found to enrich"
                }
            }
        
        # Enrich wall data with elements and regulations
        enrichment_result = enrich_walls_with_elements_and_regulations(wall_data, user_id)
        
        return {
            "success": True,
            "pdf_data": wall_extraction_result.get("pdf_data", {}),
            "wall_data": wall_data,
            "enriched_data": enrichment_result,
            "summary": {
                "pdf_pages": wall_extraction_result.get("summary", {}).get("pdf_pages", 0),
                "pdf_characters": wall_extraction_result.get("summary", {}).get("pdf_characters", 0),
                "walls_found": wall_data.get("total_walls_found", 0),
                "elements_found": enrichment_result.get("summary", {}).get("total_elements_found", 0),
                "regulations_found": enrichment_result.get("summary", {}).get("total_regulations_found", 0),
                "extraction_method": wall_extraction_result.get("summary", {}).get("extraction_method", "unknown"),
                "ai_model": wall_extraction_result.get("summary", {}).get("ai_model", "gemini-2.0-flash-001"),
                "usage_metadata": wall_extraction_result.get("summary", {}).get("usage_metadata", {}),
                "user_id": user_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error in PDF parsing with wall extraction and enrichment: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "pdf_data": {"success": False, "text": "", "pages": 0, "characters": 0},
            "wall_data": {"success": False, "walls": []},
            "enriched_data": {"success": False, "enriched_walls": []}
        }


def enrich_walls_from_pdf_id(pdf_id: str, user_id: str) -> Dict[str, Any]:
    """
    Fetch PDF content from database by ID and enrich wall data with elements and regulations.
    
    Args:
        pdf_id: UUID of the PDF file in the database
        user_id: UUID of the user to filter elements by
        
    Returns:
        Dictionary containing enriched wall data with elements and regulations
    """
    if not supabase_client:
        return {
            "success": False,
            "error": "Database client not initialized. Please check your Supabase configuration.",
            "enriched_walls": []
        }
    
    try:
        # Import files service functions
        from .files_service import get_file_by_id, download_file_from_storage
        
        # Get file record from database
        file_result = get_file_by_id(pdf_id)
        if not file_result["success"]:
            return {
                "success": False,
                "error": f"PDF file not found: {file_result.get('error', 'Unknown error')}",
                "enriched_walls": []
            }
        
        file_record = file_result["data"]
        
        # Check if file is a PDF
        if not file_record.get("name", "").lower().endswith('.pdf'):
            return {
                "success": False,
                "error": "File is not a PDF",
                "enriched_walls": []
            }
        
        # Check if we already have parsed wall data in the content field
        existing_content = file_record.get("content")
        if existing_content:
            try:
                import json
                parsed_content = json.loads(existing_content)
                
                # Check if it contains wall data
                if "walls" in parsed_content:
                    logger.info(f"Found existing wall data for PDF {pdf_id}, enriching with elements and regulations")
                    
                    # Enrich the existing wall data
                    enrichment_result = enrich_walls_with_elements_and_regulations(parsed_content, user_id)
                    
                    return {
                        "success": True,
                        "pdf_id": pdf_id,
                        "file_info": {
                            "name": file_record["name"],
                            "size": file_record.get("file_size"),
                            "created_at": file_record.get("created_at")
                        },
                        "enriched_data": enrichment_result,
                        "source": "existing_content"
                    }
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in content field for PDF {pdf_id}, will re-parse")
        
        # Download PDF content from storage
        download_result = download_file_from_storage(pdf_id)
        if not download_result["success"]:
            return {
                "success": False,
                "error": f"Failed to download PDF content: {download_result.get('error', 'Unknown error')}",
                "enriched_walls": []
            }
        
        pdf_content = download_result["file_content"]
        
        # Parse PDF and extract wall data with enrichment
        result = parse_pdf_with_wall_extraction_and_enrichment(pdf_content, user_id)
        
        if not result["success"]:
            return {
                "success": False,
                "error": f"PDF processing failed: {result.get('error', 'Unknown error')}",
                "enriched_walls": []
            }
        
        # Store the parsed wall data in the content field for future use
        try:
            import json
            from .files_service import update_file
            
            content_data = {
                "walls": result["wall_data"]["walls"],
                "summary": result["summary"],
                "pdf_info": {
                    "pages": result["pdf_data"]["pages"],
                    "characters": result["pdf_data"]["characters"],
                    "method_used": result["pdf_data"]["method_used"]
                },
                "cost_info": result["summary"].get("usage_metadata", {}),
                "processed_at": None  # Will be set by database
            }
            content_json = json.dumps(content_data, ensure_ascii=False)
            
            update_result = update_file(file_id=pdf_id, content=content_json)
            if not update_result["success"]:
                logger.warning(f"Failed to update file content for PDF {pdf_id}: {update_result.get('error')}")
        except Exception as e:
            logger.warning(f"Failed to store parsed content for PDF {pdf_id}: {str(e)}")
        
        return {
            "success": True,
            "pdf_id": pdf_id,
            "file_info": {
                "name": file_record["name"],
                "size": file_record.get("file_size"),
                "created_at": file_record.get("created_at")
            },
            "pdf_data": result["pdf_data"],
            "wall_data": result["wall_data"],
            "enriched_data": result["enriched_data"],
            "summary": result["summary"],
            "source": "fresh_processing"
        }
        
    except Exception as e:
        logger.error(f"Error enriching walls from PDF ID {pdf_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "enriched_walls": []
        }


def upload_pdf_and_enrich_walls(
    pdf_content: bytes,
    file_name: str,
    project_id: str,
    user_id: str,
    boq_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload PDF file to storage, save it to database, then enrich wall data with elements and regulations.
    
    This function combines two different logics:
    1. First: Upload PDF file and save it to database (using files_service)
    2. Second: Use enrich_walls_from_pdf_id function to get regulation data and return enriched result
    
    Args:
        pdf_content: PDF file content as bytes
        file_name: Name of the PDF file
        project_id: UUID of the project this file belongs to
        user_id: UUID of the user to filter elements by
        boq_id: Optional UUID of the BOQ this file belongs to
        
    Returns:
        Dictionary containing upload result and enriched wall data with elements and regulations
    """
    if not pdf_content:
        return {
            "success": False,
            "error": "No PDF content provided",
            "file_data": None,
            "enriched_data": {"success": False, "enriched_walls": []},
            "enriched_walls": []
        }
    
    if not file_name or not file_name.lower().endswith('.pdf'):
        return {
            "success": False,
            "error": "Invalid file name or file is not a PDF",
            "file_data": None,
            "enriched_data": {"success": False, "enriched_walls": []},
            "enriched_walls": []
        }
    
    try:
        # Import files service functions
        from .files_service import upload_file_to_storage
        
        logger.info(f"Starting upload and enrichment process for PDF: {file_name}")
        logger.info(f"User ID for enrichment: {user_id}")
        logger.info(f"Project ID: {project_id}")
        
        # Step 1: Upload PDF file to storage and create database record
        upload_result = upload_file_to_storage(
            file_content=pdf_content,
            file_name=file_name,
            project_id=project_id,
            boq_id=boq_id
        )
        
        if not upload_result["success"]:
            return {
                "success": False,
                "error": f"PDF upload failed: {upload_result.get('error', 'Unknown error')}",
                "file_data": None,
                "enriched_data": {"success": False, "enriched_walls": []},
                "enriched_walls": []
            }
        
        file_data = upload_result["data"]
        file_id = file_data["id"]
        
        logger.info(f"PDF uploaded successfully with ID: {file_id}")
        logger.info(f"Calling enrich_walls_from_pdf_id with file_id: {file_id}, user_id: {user_id}")
        
        # Step 2: Use enrich_walls_from_pdf_id to process the uploaded PDF
        enrichment_result = enrich_walls_from_pdf_id(file_id, user_id)
        
        logger.info(f"Enrichment result success: {enrichment_result.get('success')}")
        if enrichment_result.get('enriched_data'):
            enriched_walls = enrichment_result['enriched_data'].get('enriched_walls', [])
            logger.info(f"Number of enriched walls returned: {len(enriched_walls)}")
            if enriched_walls:
                for i, wall in enumerate(enriched_walls):
                    logger.info(f"Wall {i+1}: ID='{wall.get('id')}', elements={wall.get('element_count', 0)}, regulations={wall.get('regulation_count', 0)}")
        else:
            logger.warning("No enriched_data in enrichment_result")
            logger.info(f"Enrichment result keys: {list(enrichment_result.keys())}")
        
        if not enrichment_result["success"]:
            # Even if enrichment fails, we still have the uploaded file
            logger.warning(f"Wall enrichment failed for PDF {file_id}: {enrichment_result.get('error')}")
            return {
                "success": True,  # Upload was successful
                "message": "PDF uploaded successfully but wall enrichment failed",
                "file_data": file_data,
                "enriched_data": enrichment_result,
                "enriched_walls": [],
                "upload_info": {
                    "file_id": file_id,
                    "file_name": file_name,
                    "storage_path": upload_result.get("storage_path"),
                    "bucket_name": upload_result.get("bucket_name")
                },
                "warning": f"Enrichment failed: {enrichment_result.get('error', 'Unknown error')}"
            }
        
        logger.info(f"Wall enrichment completed successfully for PDF {file_id}")
        
        return {
            "success": True,
            "message": "PDF uploaded and wall data enriched successfully",
            "file_data": file_data,
            "enriched_data": enrichment_result.get("enriched_data", {}),
            "enriched_walls": enrichment_result.get("enriched_data", {}).get("enriched_walls", []),
            "upload_info": {
                "file_id": file_id,
                "file_name": file_name,
                "storage_path": upload_result.get("storage_path"),
                "bucket_name": upload_result.get("bucket_name")
            },
            "pdf_info": enrichment_result.get("pdf_data", {}),
            "wall_data": enrichment_result.get("wall_data", {}),
            "summary": enrichment_result.get("summary", {}),
            "source": enrichment_result.get("source", "fresh_processing")
        }
        
    except Exception as e:
        logger.error(f"Error in upload_pdf_and_enrich_walls for {file_name}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "file_data": None,
            "enriched_data": {"success": False, "enriched_walls": []},
            "enriched_walls": []
        }


def parse_pdf(pdf_content: bytes, method: str = "comprehensive", user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Main PDF parsing function that can be called from endpoints.
    
    Args:
        pdf_content: PDF file content as bytes
        method: Parsing method ("simple", "comprehensive", "wall_extraction", or "wall_extraction_enriched")
        user_id: UUID of the user (required for "wall_extraction_enriched" method)
        
    Returns:
        Dictionary containing parsing results
    """
    if not pdf_content:
        return {
            "success": False,
            "error": "No PDF content provided",
            "text": "",
            "pages": 0,
            "characters": 0
        }
    
    try:
        if method == "simple":
            return parse_pdf_simple(pdf_content)
        elif method == "wall_extraction":
            return parse_pdf_with_wall_extraction(pdf_content, user_id=user_id)
        elif method == "wall_extraction_enriched":
            if not user_id:
                return {
                    "success": False,
                    "error": "user_id is required for wall_extraction_enriched method",
                    "text": "",
                    "pages": 0,
                    "characters": 0
                }
            return parse_pdf_with_wall_extraction_and_enrichment(pdf_content, user_id)
        else:
            return parse_pdf_comprehensive(pdf_content)
            
    except Exception as e:
        logger.error(f"Error in main PDF parsing function: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0,
            "characters": 0
        }