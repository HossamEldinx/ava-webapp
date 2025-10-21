import io
import re
import json
from enum import Enum
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel
import logging

# pdfplumber is a required third-party library
# Install it with: pip install pdfplumber
import pdfplumber

# Database imports
from ..database import get_supabase_client

# Configure logging
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# 1. Pydantic Models - Structured Data Representation
# --------------------------------------------------------------------------

class FloorType(str, Enum):
    GROUND_FLOOR = "GROUND_FLOOR"
    FIRST_FLOOR = "FIRST_FLOOR"
    SECOND_FLOOR = "SECOND_FLOOR"
    THIRD_FLOOR = "THIRD_FLOOR"
    BASEMENT = "BASEMENT"

class MeasurementValue(BaseModel):
    value: float
    unit: str
    raw_text: str

# Represents a single line of data for a wall on a specific floor
class WallComponent(BaseModel):
    origin_floor: FloorType
    wall_thickness: MeasurementValue
    height: MeasurementValue
    length: MeasurementValue
    gross_area: MeasurementValue
    net_area: MeasurementValue

# Represents a full Wall section (e.g., IW01) including all its components and totals
class Wall(BaseModel):
    id: str
    components: List[WallComponent]
    total_length: MeasurementValue
    total_gross_area: MeasurementValue
    total_net_area: MeasurementValue

# The final response object
class WallDataResponse(BaseModel):
    walls: List[Wall]
    summary: Dict[str, Any]
    grand_totals: Dict[str, MeasurementValue]


# --------------------------------------------------------------------------
# 2. Database Functions - Element Name Fetching
# --------------------------------------------------------------------------

def fetch_element_names_by_user(user_id: str) -> Set[str]:
    """
    Fetch all element names from the database for a specific user.
    
    Args:
        user_id: The user ID to fetch elements for
        
    Returns:
        Set of element names from the database
    """
    try:
        supabase = get_supabase_client()
        
        # Fetch element names with efficient query using index
        response = supabase.table("element_list") \
            .select("name") \
            .eq("user_id", user_id) \
            .execute()
        
        if response.data:
            element_names = {item["name"].upper() for item in response.data}
            logger.info(f"Fetched {len(element_names)} element names from database")
            return element_names
        else:
            logger.warning("No element names found in database")
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

def create_element_name_regex(element_names: Set[str]) -> re.Pattern:
    """
    Create an optimized regex pattern for matching element names.
    
    Args:
        element_names: Set of element names from database
        
    Returns:
        Compiled regex pattern for efficient matching
    """
    if not element_names:
        # Fallback pattern for common wall types
        fallback_patterns = [r'IW\d+', r'IN\d+', r'EW\d+', r'WAND\d*']
        pattern = '|'.join(fallback_patterns)
        return re.compile(f'^({pattern})$', re.IGNORECASE)
    
    # Sort by length (longest first) to avoid partial matches
    sorted_names = sorted(element_names, key=len, reverse=True)
    
    # Escape special regex characters and join with OR
    escaped_names = [re.escape(name) for name in sorted_names]
    pattern = '|'.join(escaped_names)
    
    return re.compile(f'^({pattern})$', re.IGNORECASE)

# --------------------------------------------------------------------------
# 3. Helper Functions - Data Cleaning and Translation
# --------------------------------------------------------------------------

def translate_floor(german_floor: str) -> FloorType:
    """Translate German floor names to English enum values"""
    floor_mapping = {
        "ERDGESCHOSS": FloorType.GROUND_FLOOR,
        "1. OBERGESCHOSS": FloorType.FIRST_FLOOR,
        "2. OBERGESCHOSS": FloorType.SECOND_FLOOR,
        "3. OBERGESCHOSS": FloorType.THIRD_FLOOR,
        "UNTERGESCHOSS": FloorType.BASEMENT
    }
    # Find the key that is present in the input string for broader matching
    for key, value in floor_mapping.items():
        if key in german_floor.upper():
            return value
    return FloorType.GROUND_FLOOR # Default fallback

def parse_german_number(text: str) -> float:
    """Parse German formatted numbers (e.g., '1.234,56' or '1 234,56')"""
    if not text:
        return 0.0
    # Remove thousand separators (dots or spaces) and then replace comma with dot for decimal
    cleaned_text = text.strip().replace('.', '').replace(' ', '').replace(',', '.')
    try:
        return float(cleaned_text)
    except (ValueError, TypeError):
        return 0.0

def extract_measurement_with_unit(value_str: str, default_unit: str) -> MeasurementValue:
    """Extract measurement value with unit from string"""
    if not value_str:
        return MeasurementValue(value=0.0, unit=default_unit, raw_text="")

    raw_text = str(value_str).strip()
    numeric_value = parse_german_number(raw_text)

    # Determine unit from text or use default
    unit = default_unit
    if "m²" in raw_text:
        unit = "m²"
    elif "m" in raw_text and "m²" not in raw_text:
        unit = "m"
    # Assuming thickness/height are cm if not otherwise specified, which is a common convention
    elif default_unit == 'cm':
        unit = 'cm'

    return MeasurementValue(value=numeric_value, unit=unit, raw_text=raw_text)


# --------------------------------------------------------------------------
# 3. Core PDF Processing Logic
# --------------------------------------------------------------------------

def process_wall_data_from_pdf(file_content: bytes, user_id: str = None) -> WallDataResponse:
    """
    Main function to process wall data from a PDF file using a structured, stateful approach.
    Now uses database-fetched element names for improved wall ID detection.
    
    Args:
        file_content: PDF file content as bytes
        user_id: User ID to fetch element names from database
        
    Returns:
        WallDataResponse with parsed wall data
    """
    # A dictionary to hold the data as we parse it, keyed by wall ID
    walls_map: Dict[str, Dict[str, Any]] = {}
    grand_totals_data = {}
    current_wall_id: Optional[str] = None
    debug_info = []
    
    # Fetch element names from database for better wall ID detection
    element_names = set()
    element_regex = None
    pattern_groups = {}
    
    if user_id:
        element_names = fetch_element_names_by_user(user_id)
        if element_names:
            element_regex = create_element_name_regex(element_names)
            pattern_groups = group_element_names_by_pattern(element_names)
            debug_info.append(f"Using {len(element_names)} element names from database")
        else:
            debug_info.append("No element names found in database, using fallback patterns")
    else:
        debug_info.append("No user_id provided, using fallback patterns")

    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            debug_info.append(f"PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages):
                debug_info.append(f"Processing page {page_num + 1}")
                
                # Try both table extraction methods
                tables = page.extract_tables()
                if not tables:
                    # Fallback: try to extract text and parse manually
                    text = page.extract_text()
                    if text:
                        debug_info.append(f"No tables found on page {page_num + 1}, extracted text length: {len(text)}")
                        # Try to parse text line by line
                        lines = text.split('\n')
                        tables = [_parse_text_to_table(lines)]
                    else:
                        debug_info.append(f"No content found on page {page_num + 1}")
                        continue
                
                for table_num, table in enumerate(tables):
                    if not table:
                        continue
                    
                    debug_info.append(f"Table {table_num + 1} has {len(table)} rows")
                        
                    for i, row in enumerate(table):
                        # Clean the row by removing None and stripping whitespace from each cell
                        cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                        
                        if not any(cleaned_row): # Skip entirely empty rows
                            continue

                        debug_info.append(f"Row {i}: {cleaned_row}")  # Log full row for debugging

                        # --- State Management: Identify the current Wall ID ---
                        # Look for wall ID in any column, not just the first
                        wall_id_found = None
                        for col_idx, cell in enumerate(cleaned_row):
                            if cell:
                                cell_upper = cell.upper().strip()
                                # Use database-fetched element names if available
                                if element_regex and element_regex.match(cell_upper):
                                    wall_id_found = cell_upper
                                    break
                                # Fallback to original pattern matching if no database elements
                                elif not element_names and (re.match(r'^IW\d+', cell_upper) or 
                                     re.match(r'^IN\d+', cell_upper) or 
                                     re.match(r'^EW\d+', cell_upper) or 
                                     re.match(r'^WAND\d*', cell_upper)):
                                    wall_id_found = cell_upper
                                    break
                        
                        if wall_id_found:
                            current_wall_id = wall_id_found
                            if current_wall_id not in walls_map:
                                walls_map[current_wall_id] = {"id": current_wall_id, "components": [], "totals": {}}
                                debug_info.append(f"Found wall ID: {current_wall_id}")

                        # If no wall ID found yet, try to infer from context or create a default one
                        if not current_wall_id:
                            # Look for floor information to determine if this might be wall data
                            has_floor_info = any("GESCHOSS" in str(cell).upper() for cell in cleaned_row)
                            if has_floor_info:
                                # Create a default wall ID based on patterns found in database or fallback
                                if pattern_groups and "IW" in pattern_groups:
                                    # Use the IW pattern if available
                                    current_wall_id = f"IW{table_num + 1:02d}"
                                elif pattern_groups:
                                    # Use the first available pattern
                                    first_pattern = list(pattern_groups.keys())[0]
                                    if first_pattern != "OTHER":
                                        current_wall_id = f"{first_pattern}{table_num + 1:02d}"
                                    else:
                                        current_wall_id = f"WALL{table_num + 1:02d}"
                                else:
                                    # Fallback to IW pattern
                                    current_wall_id = f"IW{table_num + 1:02d}"
                                
                                if current_wall_id not in walls_map:
                                    walls_map[current_wall_id] = {"id": current_wall_id, "components": [], "totals": {}}
                                    debug_info.append(f"Created default wall ID: {current_wall_id}")
                            else:
                                continue

                        # --- Row Type Identification and Parsing ---
                        # Look for floor information in any column
                        floor_info = None
                        floor_col_idx = -1
                        for col_idx, cell in enumerate(cleaned_row):
                            if cell and ("GESCHOSS" in cell.upper() or any(floor in cell.upper() for floor in ["ERDGESCHOSS", "OBERGESCHOSS", "UNTERGESCHOSS"])):
                                floor_info = cell
                                floor_col_idx = col_idx
                                break
                        
                        # Case 1: This is a Data Row because it has floor information
                        if floor_info:
                            try:
                                # Try to extract measurements from the available columns
                                # We'll be more flexible about which columns contain what data
                                measurements = []
                                for col_idx, cell in enumerate(cleaned_row):
                                    if col_idx != floor_col_idx and cell and re.search(r'\d', cell):
                                        measurements.append(cell)
                                
                                debug_info.append(f"Found floor {floor_info} with measurements: {measurements}")
                                
                                # Create component with available data, using defaults for missing values
                                component = WallComponent(
                                    origin_floor=translate_floor(floor_info),
                                    wall_thickness=extract_measurement_with_unit(measurements[0] if len(measurements) > 0 else "0", 'cm'),
                                    height=extract_measurement_with_unit(measurements[1] if len(measurements) > 1 else "0", 'cm'),
                                    length=extract_measurement_with_unit(measurements[2] if len(measurements) > 2 else "0", 'm'),
                                    gross_area=extract_measurement_with_unit(measurements[3] if len(measurements) > 3 else "0", 'm²'),
                                    net_area=extract_measurement_with_unit(measurements[4] if len(measurements) > 4 else "0", 'm²')
                                )
                                walls_map[current_wall_id]["components"].append(component)
                                debug_info.append(f"Added component for {current_wall_id} on {floor_info}")
                                
                            except (IndexError, ValueError) as e:
                                # This row is likely malformed or doesn't have enough columns, skip it
                                debug_info.append(f"Skipping malformed data row for {current_wall_id}: {cleaned_row} - Error: {e}")
                                continue
                        
                        # Case 2: This is a Wall Summary Row - look for rows with numeric data but no floor info
                        elif not floor_info and any(re.search(r'\d', cell) for cell in cleaned_row if cell):
                            # Extract numeric values from the row
                            numeric_values = []
                            for cell in cleaned_row:
                                if cell and re.search(r'\d', cell):
                                    numeric_values.append(cell)
                            
                            # If we have numeric data and this looks like a summary
                            if len(numeric_values) >= 2 and current_wall_id in walls_map and walls_map[current_wall_id]["components"]:
                                walls_map[current_wall_id]["totals"] = {
                                    "total_length": extract_measurement_with_unit(numeric_values[0] if len(numeric_values) > 0 else "0", 'm'),
                                    "total_gross_area": extract_measurement_with_unit(numeric_values[1] if len(numeric_values) > 1 else "0", 'm²'),
                                    "total_net_area": extract_measurement_with_unit(numeric_values[2] if len(numeric_values) > 2 else "0", 'm²'),
                                }
                                debug_info.append(f"Added totals for {current_wall_id}: {numeric_values}")
                        
                        # Case 3: This is the Grand Total Row - look for "WAND" or similar indicators
                        if any("WAND" in str(cell).upper() for cell in cleaned_row):
                            numeric_values = []
                            for cell in cleaned_row:
                                if cell and re.search(r'\d', cell):
                                    numeric_values.append(cell)
                            
                            if len(numeric_values) >= 2:
                                grand_totals_data = {
                                    "total_length": extract_measurement_with_unit(numeric_values[0], 'm'),
                                    "total_gross_area": extract_measurement_with_unit(numeric_values[1], 'm²'),
                                    "total_net_area": extract_measurement_with_unit(numeric_values[2] if len(numeric_values) > 2 else "0", 'm²'),
                                }
                                debug_info.append(f"Found grand totals: {numeric_values}")

        # --- Final Assembly: Convert the parsed map into a list of Wall objects ---
        final_walls: List[Wall] = []
        for wall_id, data in walls_map.items():
            # More flexible validation - allow walls with components even if no totals
            if data["components"]:
                # If no totals were found, calculate them from components
                if not data["totals"]:
                    total_length = sum(comp.length.value for comp in data["components"])
                    total_gross_area = sum(comp.gross_area.value for comp in data["components"])
                    total_net_area = sum(comp.net_area.value for comp in data["components"])
                    
                    data["totals"] = {
                        "total_length": MeasurementValue(value=total_length, unit="m", raw_text=f"{total_length}"),
                        "total_gross_area": MeasurementValue(value=total_gross_area, unit="m²", raw_text=f"{total_gross_area}"),
                        "total_net_area": MeasurementValue(value=total_net_area, unit="m²", raw_text=f"{total_net_area}"),
                    }
                    debug_info.append(f"Calculated totals for {wall_id}")
                
                final_walls.append(Wall(**data))

        debug_info.append(f"Found {len(walls_map)} wall sections, {len(final_walls)} valid walls")

        if not final_walls:
            error_msg = f"Could not parse valid wall data from the provided PDF. Debug info: {'; '.join(debug_info[-10:])}"  # Last 10 debug messages
            raise ValueError(error_msg)
            
        summary = {
            "total_wall_sections_found": len(final_walls),
            "floors_found": sorted(list(set(comp.origin_floor.value for wall in final_walls for comp in wall.components))),
            "element_names_used": len(element_names) if element_names else 0,
            "patterns_found": list(pattern_groups.keys()) if pattern_groups else [],
            "database_optimization_enabled": bool(user_id and element_names),
            "debug_info": debug_info[-20:]  # Include last 20 debug messages in response
        }

        return WallDataResponse(
            walls=final_walls,
            summary=summary,
            grand_totals=grand_totals_data
        )

    except Exception as e:
        error_msg = f"An unexpected error occurred: {e}. Debug info: {'; '.join(debug_info[-10:])}"
        print(error_msg)
        raise ValueError(error_msg)

def _parse_text_to_table(lines: List[str]) -> List[List[str]]:
    """
    Fallback method to parse text lines into a table structure
    when PDF table extraction fails
    """
    table = []
    for line in lines:
        if line.strip():
            # Split by multiple spaces or tabs
            cells = re.split(r'\s{2,}|\t+', line.strip())
            if len(cells) > 1:  # Only include lines with multiple columns
                table.append(cells)
    return table


# --------------------------------------------------------------------------
# 4. Supported Units Configuration
# --------------------------------------------------------------------------

def get_supported_units() -> Dict[str, List[str]]:
    """
    Get list of supported measurement units categorized by type
    
    Returns a dictionary of supported units for different measurement types
    commonly used in construction and engineering documents.
    
    Returns:
        Dict[str, List[str]]: Dictionary of unit categories and their supported units
    """
    return {
        "length_units": [
            "mm", "cm", "m", "km",
            "in", "ft", "yd", "mi"
        ],
        "area_units": [
            "mm²", "cm²", "m²", "km²",
            "in²", "ft²", "yd²", "mi²"
        ],
        "volume_units": [
            "mm³", "cm³", "m³", "km³",
            "in³", "ft³", "yd³", "mi³",
            "l", "ml", "gal"
        ],
        "weight_units": [
            "g", "kg", "t",
            "oz", "lb", "ton"
        ],
        "temperature_units": [
            "°C", "°F", "K"
        ],
        "pressure_units": [
            "Pa", "kPa", "MPa", "GPa",
            "psi", "bar", "atm"
        ],
        "force_units": [
            "N", "kN", "MN",
            "lbf", "kip"
        ],
        "power_units": [
            "W", "kW", "MW", "GW",
            "hp", "BTU/h"
        ]
    }
