import json
import copy
import re
from collections import defaultdict
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()


def filter_json_entity(
    json_input: dict,
    target_entity_type: str,
    target_value: str | int,
    target_ulg_nr: str | int | None = None,
    target_grundtext_nr: str | int | None = None
) -> dict:
    """
    Filters a JSON structure (LG, ULG, or Grundtext level) to keep only a specified
    entity (ULG, Grundtext, or Folgeposition) based on its 'nr' or 'ftnr' value.

    Optional parameters `target_ulg_nr` and `target_grundtext_nr` can be provided
    to narrow down the search for 'Folgeposition' within a specific ULG and/or Grundtext.

    The function operates as follows:
    1. It creates a deep copy of the input JSON to ensure the original data remains unchanged.
    2. It determines the type of the input JSON (LG, ULG, or Grundtext).
    3. It searches for the *first* occurrence of the target entity (based on `target_entity_type`
       and `target_value`, and optional `target_ulg_nr`/`target_grundtext_nr` for Folgeposition)
       within the appropriate level of the JSON.
    4. If the target entity is found:
       - Only this specific entity is retained within its immediate parent's list.
       - All other siblings of the target entity (of the same type) are removed from that list.
       - If the target entity is nested (e.g., a Grundtext filtered from an LG input),
         its direct parent and necessary ancestors are retained. However, other branches
         (i.e., sibling ULGs when filtering Grundtext from LG, or sibling Grundtexts when
         filtering Folgeposition from ULG) that do not contain the path to the specific
         target entity are removed.
    5. If the target entity is not found, the relevant lists in the JSON structure
       will become empty, effectively removing all entities of that type at and below
       the target type's level within the affected branch.
    6. The function preserves the original order of the elements in the JSON.

    Args:
        json_input (dict): The input JSON (dictionary) representing an LG, ULG, or Grundtext.
        target_entity_type (str): The type of entity to filter ('ULG', 'Grundtext', 'Folgeposition').
        target_value (str | int): The 'nr' (for ULG, Grundtext) or 'ftnr' (for Folgeposition)
                                 value of the target entity to keep.
        target_ulg_nr (str | int | None): Optional. The 'nr' of the ULG to search within.
                                         Applicable when target_entity_type is 'Grundtext' (if input is LG)
                                         or 'Folgeposition' (if input is LG or ULG).
        target_grundtext_nr (str | int | None): Optional. The 'nr' of the Grundtext to search within.
                                                Applicable when target_entity_type is 'Folgeposition'
                                                (if input is LG or ULG).

    Returns:
        dict: The updated JSON with only the specified entity and its necessary ancestors,
              or a modified JSON where the target lists are empty if the entity was not found.
              Returns the original input if the input JSON structure is not recognized
              or the `target_entity_type` is invalid for the given input level.
    """
    # Create a deep copy of the input JSON to avoid modifying the original
    updated_json = copy.deepcopy(json_input)

    # Convert target_value and optional NRs to string for consistent comparison
    target_value = str(target_value)
    if target_ulg_nr is not None:
        target_ulg_nr = str(target_ulg_nr)
    if target_grundtext_nr is not None:
        target_grundtext_nr = str(target_grundtext_nr)

    # Helper function to find and filter a list of entities to keep only the first match
    def _find_and_filter_single(entity_list, key_name, value_to_find):
        """
        Searches for the first entity with a matching value in a list and returns a list
        containing only that found entity, or an empty list if no match is found.
        """
        for entity in entity_list:
            if str(entity.get(key_name)) == value_to_find:
                return [entity]
        return []

    # Determine the level of the input JSON (LG, ULG, or Grundtext) based on its top-level keys
    is_lg = "lg-eigenschaften" in updated_json and "ulg-liste" in updated_json
    is_ulg = "ulg-eigenschaften" in updated_json and "positionen" in updated_json
    is_grundtext = "grundtext" in updated_json and "folgeposition" in updated_json

    # --- Filtering logic based on input JSON type ---

    if is_lg:
        # The input JSON is an LG (Leistungsgruppe)
        if target_entity_type == 'ULG':
            # Target is an ULG: Filter the 'ulg' list directly under 'ulg-liste'
            if 'ulg-liste' in updated_json and 'ulg' in updated_json['ulg-liste']:
                updated_json['ulg-liste']['ulg'] = _find_and_filter_single(
                    updated_json['ulg-liste']['ulg'], '@_nr', target_value
                )
            else:
                # If expected keys are missing, ensure 'ulg' list is empty
                if 'ulg-liste' in updated_json:
                    updated_json['ulg-liste']['ulg'] = []
                else:
                    updated_json['ulg-liste'] = {'ulg': []}
                print("Warning: 'ulg-liste' or 'ulg' not found in LG JSON for ULG filtering. Resulting 'ulg' list will be empty.")
            return updated_json

        elif target_entity_type == 'Grundtext':
            # Target is a Grundtext: Traverse through ULGs to find and filter the Grundtext.
            # Optional target_ulg_nr can constrain the search.
            filtered_ulgs_to_keep = []
            if 'ulg-liste' in updated_json and 'ulg' in updated_json['ulg-liste']:
                for ulg in updated_json['ulg-liste']['ulg']:
                    # Check if target_ulg_nr is specified and matches current ULG
                    if target_ulg_nr is not None and str(ulg.get('@_nr')) != target_ulg_nr:
                        continue # Skip this ULG if it doesn't match the optional ULG nr

                    if 'positionen' in ulg and 'grundtextnr' in ulg['positionen']:
                        # Attempt to filter Grundtexts within the current ULG
                        filtered_grundtexts_for_current_ulg = _find_and_filter_single(
                            ulg['positionen']['grundtextnr'], '@_nr', target_value
                        )
                        if filtered_grundtexts_for_current_ulg:
                            # If the target Grundtext is found, keep this ULG and only this Grundtext.
                            ulg['positionen']['grundtextnr'] = filtered_grundtexts_for_current_ulg
                            filtered_ulgs_to_keep.append(ulg)
                            # Once the target Grundtext is found (and potentially ULG matched), we stop.
                            break
            updated_json['ulg-liste']['ulg'] = filtered_ulgs_to_keep
            return updated_json

        elif target_entity_type == 'Folgeposition':
            # Target is a Folgeposition: Traverse through ULGs and Grundtexts.
            # Optional target_ulg_nr and target_grundtext_nr can constrain the search.
            filtered_ulgs_to_keep = []
            if 'ulg-liste' in updated_json and 'ulg' in updated_json['ulg-liste']:
                for ulg in updated_json['ulg-liste']['ulg']:
                    # Check if target_ulg_nr is specified and matches current ULG
                    if target_ulg_nr is not None and str(ulg.get('@_nr')) != target_ulg_nr:
                        continue # Skip this ULG if it doesn't match the optional ULG nr

                    filtered_grundtexts_to_keep = []
                    if 'positionen' in ulg and 'grundtextnr' in ulg['positionen']:
                        for gt in ulg['positionen']['grundtextnr']:
                            # Check if target_grundtext_nr is specified and matches current Grundtext
                            if target_grundtext_nr is not None and str(gt.get('@_nr')) != target_grundtext_nr:
                                continue # Skip this Grundtext if it doesn't match the optional Grundtext nr

                            if 'folgeposition' in gt:
                                # Attempt to filter Folgepositions within the current Grundtext
                                filtered_fps_for_current_gt = _find_and_filter_single(
                                    gt['folgeposition'], '@_ftnr', target_value
                                )
                                if filtered_fps_for_current_gt:
                                    # If the target Folgeposition is found, keep this Grundtext and only this Folgeposition.
                                    gt['folgeposition'] = filtered_fps_for_current_gt
                                    filtered_grundtexts_to_keep.append(gt)
                                    # Stop searching in other Grundtexts within this ULG.
                                    break # Found the specific FP, break from inner loop
                    if filtered_grundtexts_to_keep:
                        # If a Grundtext containing the target Folgeposition was found, keep this ULG.
                        ulg['positionen']['grundtextnr'] = filtered_grundtexts_to_keep
                        filtered_ulgs_to_keep.append(ulg)
                        # Stop searching in other ULGs.
                        break # Found the specific FP, break from outer loop
            updated_json['ulg-liste']['ulg'] = filtered_ulgs_to_keep
            return updated_json

        else:
            print(f"Error: Invalid target_entity_type '{target_entity_type}' for LG level JSON. Must be 'ULG', 'Grundtext', or 'Folgeposition'. Returning original input.")
            return json_input

    elif is_ulg:
        # The input JSON is an ULG (Unterleistungsgruppe)
        if target_entity_type == 'Grundtext':
            # Target is a Grundtext: Filter the 'grundtextnr' list directly under 'positionen'
            # Optional target_ulg_nr is irrelevant here as input is already a specific ULG.
            if 'positionen' in updated_json and 'grundtextnr' in updated_json['positionen']:
                updated_json['positionen']['grundtextnr'] = _find_and_filter_single(
                    updated_json['positionen']['grundtextnr'], '@_nr', target_value
                )
            else:
                if 'positionen' in updated_json:
                    updated_json['positionen']['grundtextnr'] = []
                else:
                    updated_json['positionen'] = {'grundtextnr': []}
                print("Warning: 'positionen' or 'grundtextnr' not found in ULG JSON. Resulting 'grundtextnr' list will be empty.")
            return updated_json

        elif target_entity_type == 'Folgeposition':
            # Target is a Folgeposition: Traverse through Grundtexts.
            # Optional target_grundtext_nr can constrain the search.
            filtered_grundtexts_to_keep = []
            if 'positionen' in updated_json and 'grundtextnr' in updated_json['positionen']:
                for gt in updated_json['positionen']['grundtextnr']:
                    # Check if target_grundtext_nr is specified and matches current Grundtext
                    if target_grundtext_nr is not None and str(gt.get('@_nr')) != target_grundtext_nr:
                        continue # Skip this Grundtext if it doesn't match the optional Grundtext nr

                    if 'folgeposition' in gt:
                        # Attempt to filter Folgepositions within the current Grundtext
                        filtered_fps_for_current_gt = _find_and_filter_single(
                            gt['folgeposition'], '@_ftnr', target_value
                        )
                        if filtered_fps_for_current_gt:
                            # If the target Folgeposition is found, keep this Grundtext and only this Folgeposition.
                            gt['folgeposition'] = filtered_fps_for_current_gt
                            filtered_grundtexts_to_keep.append(gt)
                            # Stop searching in other Grundtexts within this ULG.
                            break # Found the specific FP, break from inner loop
            updated_json['positionen']['grundtextnr'] = filtered_grundtexts_to_keep
            return updated_json
        else:
            print(f"Error: Invalid target_entity_type '{target_entity_type}' for ULG level JSON. Must be 'Grundtext' or 'Folgeposition'. Returning original input.")
            return json_input

    elif is_grundtext:
        # The input JSON is a Grundtext
        if target_entity_type == 'Folgeposition':
            # Target is a Folgeposition: Filter the 'folgeposition' list directly
            # Optional target_ulg_nr and target_grundtext_nr are irrelevant here.
            if 'folgeposition' in updated_json:
                updated_json['folgeposition'] = _find_and_filter_single(
                    updated_json['folgeposition'], '@_ftnr', target_value
                )
            else:
                updated_json['folgeposition'] = []
                print("Warning: 'folgeposition' not found in Grundtext JSON. Resulting 'folgeposition' list will be empty.")
            return updated_json
        else:
            print(f"Error: Invalid target_entity_type '{target_entity_type}' for Grundtext level JSON. Must be 'Folgeposition'. Returning original input.")
            return json_input

    else:
        # The input JSON structure is not recognized as LG, ULG, or Grundtext
        print("Error: Input JSON does not seem to be a valid LG, ULG, or Grundtext structure. Returning original input.")
        return json_input
    





def filter_json_by_full_nr(json_input: dict, full_nrs_to_keep: list[str]) -> dict:
    """
    Filters a JSON structure (LG) to retain only positions specified by a
    full, hierarchical number (e.g., '001101' or '001103A').

    This function uses the same approach as filter_json_entity but handles multiple
    position numbers at once by building up the result incrementally.

    Args:
        json_input (dict): The input JSON (dictionary) representing an LG.
        full_nrs_to_keep (list[str]): A list of full position numbers to retain
                                      (e.g., ['001101', '001103A']).

    Returns:
        dict: The updated JSON with only the specified positions and their
              necessary ancestors. If no positions match, the relevant lists
              in the returned structure will be empty.
    """
    if not full_nrs_to_keep:
        # Return empty structure if no positions specified
        result = copy.deepcopy(json_input)
        if "ulg-liste" in result and "ulg" in result["ulg-liste"]:
            result["ulg-liste"]["ulg"] = []
        return result

    # Start with empty result structure
    result = copy.deepcopy(json_input)
    if "ulg-liste" in result and "ulg" in result["ulg-liste"]:
        result["ulg-liste"]["ulg"] = []

    # Keep track of ULGs we've already added to avoid duplicates
    added_ulgs = {}

    for nr in full_nrs_to_keep:
        # Parse the position number
        match = re.match(r"^(\d{2})(\d{2})(\d{2})([A-Z]?)$", nr)
        if not match:
            print(f"Warning: Skipping invalid full number format: {nr}")
            continue

        lg_nr, ulg_nr, gt_nr, fp_letter = match.groups()
        print(f"Processing {nr}: LG={lg_nr}, ULG={ulg_nr}, GT={gt_nr}, FP={fp_letter}")

        # Find the target ULG in the original JSON
        target_ulg = None
        for ulg in json_input.get("ulg-liste", {}).get("ulg", []):
            if str(ulg.get("@_nr")) == ulg_nr:
                target_ulg = ulg
                break

        if not target_ulg:
            print(f"Warning: ULG {ulg_nr} not found in JSON")
            continue

        # Check if we already have this ULG in our result
        if ulg_nr in added_ulgs:
            result_ulg = added_ulgs[ulg_nr]
        else:
            # Create a new ULG entry in the result
            result_ulg = copy.deepcopy(target_ulg)
            result_ulg["positionen"]["grundtextnr"] = []
            result["ulg-liste"]["ulg"].append(result_ulg)
            added_ulgs[ulg_nr] = result_ulg

        # Find the target Grundtext
        target_gt = None
        for gt in target_ulg.get("positionen", {}).get("grundtextnr", []):
            if str(gt.get("@_nr")) == gt_nr:
                target_gt = gt
                break

        if not target_gt:
            print(f"Warning: Grundtext {gt_nr} not found in ULG {ulg_nr}")
            continue

        # Check if we already have this Grundtext in our result ULG
        existing_gt = None
        for gt in result_ulg["positionen"]["grundtextnr"]:
            if str(gt.get("@_nr")) == gt_nr:
                existing_gt = gt
                break

        if fp_letter:
            # We want a specific Folgeposition
            if existing_gt:
                # Add the Folgeposition to existing Grundtext if not already there
                existing_fps = [fp.get("@_ftnr") for fp in existing_gt.get("folgeposition", [])]
                if fp_letter not in existing_fps:
                    # Find the target Folgeposition
                    for fp in target_gt.get("folgeposition", []):
                        if fp.get("@_ftnr") == fp_letter:
                            existing_gt["folgeposition"].append(copy.deepcopy(fp))
                            break
            else:
                # Create new Grundtext with only the specific Folgeposition
                new_gt = copy.deepcopy(target_gt)
                new_gt["folgeposition"] = []
                for fp in target_gt.get("folgeposition", []):
                    if fp.get("@_ftnr") == fp_letter:
                        new_gt["folgeposition"].append(copy.deepcopy(fp))
                        break
                result_ulg["positionen"]["grundtextnr"].append(new_gt)
        else:
            # We want the entire Grundtext
            if not existing_gt:
                # Add the entire Grundtext
                result_ulg["positionen"]["grundtextnr"].append(copy.deepcopy(target_gt))
            # If it already exists, we keep it as is (entire Grundtext)

    return result


def filter_lg_by_position_numbers(lg_json_data: dict, position_numbers: list[str]) -> dict:
    """
    Filters LG JSON data to keep only the specified position numbers.
    
    This is a convenient wrapper around filter_json_by_full_nr that provides
    a cleaner interface for filtering LG data by position numbers.
    
    Args:
        lg_json_data (dict): The LG JSON data to filter
        position_numbers (list[str]): List of position numbers to keep
                                     (e.g., ["001101", "001103A"])
                                     Format: LLGGTTF where:
                                     - LL = LG number (2 digits)
                                     - GG = ULG number (2 digits)
                                     - TT = Grundtext number (2 digits)
                                     - F = Folgeposition letter (optional)
    
    Returns:
        dict: Filtered JSON with only the specified positions, maintaining order
        
    Example:
        >>> lg_data = {...}  # Your LG JSON data
        >>> filtered = filter_lg_by_position_numbers(lg_data, ["001101", "001103A"])
        >>> # Returns LG data with only ULG 11, Grundtext 01 (all folgepositions)
        >>> # and ULG 11, Grundtext 03, Folgeposition A
    """
    if not lg_json_data:
        return {}
    
    if not position_numbers:
        # Return empty structure if no positions specified
        result = copy.deepcopy(lg_json_data)
        if "ulg-liste" in result and "ulg" in result["ulg-liste"]:
            result["ulg-liste"]["ulg"] = []
        return result
    
    # Use the existing filter_json_by_full_nr function
    return filter_json_by_full_nr(lg_json_data, position_numbers)


def validate_position_number_format(position_number: str) -> bool:
    """
    Validates if a position number follows the correct format.
    
    Args:
        position_number (str): Position number to validate
        
    Returns:
        bool: True if format is valid, False otherwise
        
    Valid formats:
        - LLGGTT (6 digits): Full Grundtext
        - LLGGTTF (6 digits + 1 letter): Specific Folgeposition
    """
    if not isinstance(position_number, str):
        return False
    
    # Check if it matches the expected pattern
    pattern = r"^(\d{2})(\d{2})(\d{2})([A-Z]?)$"
    return bool(re.match(pattern, position_number))


def get_position_info(position_number: str) -> dict:
    """
    Parses a position number and returns its components.
    
    Args:
        position_number (str): Position number to parse
        
    Returns:
        dict: Dictionary with parsed components or empty dict if invalid
        
    Example:
        >>> get_position_info("001103A")
        {
            'lg_nr': '00',
            'ulg_nr': '11',
            'grundtext_nr': '03',
            'folgeposition': 'A',
            'is_full_grundtext': False
        }
    """
    if not validate_position_number_format(position_number):
        return {}
    
    match = re.match(r"^(\d{2})(\d{2})(\d{2})([A-Z]?)$", position_number)
    if not match:
        return {}
    
    lg_nr, ulg_nr, gt_nr, fp_letter = match.groups()
    
    return {
        'lg_nr': lg_nr,
        'ulg_nr': ulg_nr,
        'grundtext_nr': gt_nr,
        'folgeposition': fp_letter if fp_letter else None,
        'is_full_grundtext': not bool(fp_letter)
    }



def fetch_and_filter_lg_by_position_numbers_v2(position_numbers: list[str]) -> dict:
    """
    Fetches LG data from Supabase and filters it based on position numbers using an optimized bulk-fetch approach.
    
    This optimized function:
    1. Parses all position numbers to identify unique LGs, ULGs, and Grundtexts.
    2. Fetches all required data (LGs, ULGs, Grundtexts, Folgepositions) in a few bulk queries.
    3. Reconstructs the LG JSON structure in memory.
    4. Filters the reconstructed JSON to keep only the specified positions.
    
    Args:
        position_numbers (list[str]): A list of position numbers to filter by.
        
    Returns:
        dict: Filtered LG JSON data. Can be a single LG object or a list of LG objects.
    """
    if not position_numbers:
        return {}

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials not found.")
        return {}
    
    supabase: Client = create_client(supabase_url, supabase_key)

    # Step 1: Parse all position numbers to get unique entity numbers
    lg_nrs, ulg_nrs, gt_nrs = set(), set(), set()
    for nr in position_numbers:
        if validate_position_number_format(nr):
            info = get_position_info(nr)
            lg_nrs.add(info['lg_nr'])
            ulg_nrs.add(info['ulg_nr'])
            gt_nrs.add(info['grundtext_nr'])

    if not lg_nrs:
        return {}

    # Step 2: Bulk fetch all required data
    try:
        # Fetch LGs
        lg_records = supabase.table('regulations').select('lg_nr, entity_json').eq('entity_type', 'LG').in_('lg_nr', list(lg_nrs)).execute().data
        
        # Fetch ULGs
        ulg_records = supabase.table('regulations').select('lg_nr, ulg_nr, entity_json').eq('entity_type', 'ULG').in_('lg_nr', list(lg_nrs)).order('ulg_nr').execute().data
        
        # Fetch Grundtexts
        gt_records = supabase.table('regulations').select('lg_nr, ulg_nr, grundtext_nr, entity_json').eq('entity_type', 'Grundtext').in_('lg_nr', list(lg_nrs)).order('grundtext_nr').execute().data
        
        # Fetch Folgepositions
        fp_records = supabase.table('regulations').select('lg_nr, ulg_nr, grundtext_nr, position_nr, entity_json').eq('entity_type', 'Folgeposition').in_('lg_nr', list(lg_nrs)).order('position_nr').execute().data

    except Exception as e:
        print(f"Error during bulk fetch from Supabase: {e}")
        return {}

    # Step 3: Reconstruct JSON in memory
    
    # Organize fetched data for quick lookup
    fps_by_gt = defaultdict(list)
    for fp in fp_records:
        key = (fp['lg_nr'], fp['ulg_nr'], fp['grundtext_nr'])
        try:
            fp_json = json.loads(fp['entity_json']) if fp['entity_json'] else {}
            fp_json["@_ftnr"] = fp['position_nr']
            fps_by_gt[key].append(fp_json)
        except json.JSONDecodeError:
            print(f"Warning: Invalid JSON for Folgeposition {fp['position_nr']}")

    gts_by_ulg = defaultdict(list)
    for gt in gt_records:
        key = (gt['lg_nr'], gt['ulg_nr'])
        try:
            gt_json = json.loads(gt['entity_json']) if gt['entity_json'] else {}
            gt_json["@_nr"] = gt['grundtext_nr']
            fp_key = (gt['lg_nr'], gt['ulg_nr'], gt['grundtext_nr'])
            gt_json["folgeposition"] = fps_by_gt.get(fp_key, [])
            gts_by_ulg[key].append(gt_json)
        except json.JSONDecodeError:
            print(f"Warning: Invalid JSON for Grundtext {gt['grundtext_nr']}")

    ulgs_by_lg = defaultdict(list)
    for ulg in ulg_records:
        key = ulg['lg_nr']
        try:
            ulg_json = json.loads(ulg['entity_json']) if ulg['entity_json'] else {}
            ulg_json["@_nr"] = ulg['ulg_nr']
            gt_key = (ulg['lg_nr'], ulg['ulg_nr'])
            if "positionen" not in ulg_json:
                ulg_json["positionen"] = {}
            ulg_json["positionen"]["grundtextnr"] = gts_by_ulg.get(gt_key, [])
            ulgs_by_lg[key].append(ulg_json)
        except json.JSONDecodeError:
            print(f"Warning: Invalid JSON for ULG {ulg['ulg_nr']}")

    lg_data = {}
    for lg in lg_records:
        lg_nr = lg['lg_nr']
        try:
            lg_json = json.loads(lg['entity_json']) if lg['entity_json'] else {}
            lg_json["@_nr"] = lg_nr
            if "ulg-liste" not in lg_json:
                lg_json["ulg-liste"] = {}
            lg_json["ulg-liste"]["ulg"] = ulgs_by_lg.get(lg_nr, [])
            lg_data[lg_nr] = lg_json
        except json.JSONDecodeError:
            print(f"Warning: Invalid JSON for LG {lg_nr}")

    # Step 4: Filter the reconstructed data
    if len(lg_data) == 1:
        lg_json = list(lg_data.values())[0]
        return filter_json_by_full_nr(lg_json, position_numbers)
    
    elif len(lg_data) > 1:
        filtered_lgs = []
        for lg_nr, lg_json in lg_data.items():
            lg_specific_positions = [pos for pos in position_numbers if pos.startswith(lg_nr)]
            if lg_specific_positions:
                filtered_lg = filter_json_by_full_nr(lg_json, lg_specific_positions)
                if ("ulg-liste" in filtered_lg and "ulg" in filtered_lg["ulg-liste"] and filtered_lg["ulg-liste"]["ulg"]):
                    filtered_lgs.append(filtered_lg)
        
        filtered_lgs.sort(key=lambda lg: lg.get('@_nr', ''))
        return filtered_lgs
        
    else:
        return {}


def add_custom_content_to_lg(position_nr: str, custom_json: dict, content_type: str = "auto") -> dict:
    """
    Adds custom content (grundtext or folgeposition) to an LG structure based on position number.
    
    This function:
    1. Parses the position number to extract LG, ULG, Grundtext, and Folgeposition components
    2. Fetches the existing LG data from the database
    3. Adds the custom content to the appropriate location in the LG structure
    4. Returns the complete LG JSON with the added content
    
    Args:
        position_nr (str): Position number like "392502A" (LG=39, ULG=25, GT=02, FP=A)
        custom_json (dict): The custom JSON content to add
        content_type (str): Type of content - "grundtext", "folgeposition", or "auto" (default)
                           "auto" will determine based on the JSON structure
    
    Returns:
        dict: Complete LG JSON structure with the custom content added
        
    Example:
        >>> custom_gt = {
        ...     "grundtextnr": [{
        ...         "grundtext": {"langtext": {"p": ["Custom text"]}},
        ...         "folgeposition": [...],
        ...         "@_nr": "02"
        ...     }]
        ... }
        >>> result = add_custom_content_to_lg("392502A", custom_gt, "grundtext")
    """
    if not position_nr or not custom_json:
        print("Error: Position number or custom JSON is empty")
        return {}
    
    # Parse position number
    position_info = get_position_info(position_nr)
    if not position_info:
        print(f"Error: Invalid position number format: {position_nr}")
        return {}
    
    lg_nr = position_info['lg_nr']
    ulg_nr = position_info['ulg_nr']
    gt_nr = position_info['grundtext_nr']
    fp_letter = position_info['folgeposition']
    
    print(f"Debug: Parsed position {position_nr} -> LG={lg_nr}, ULG={ulg_nr}, GT={gt_nr}, FP={fp_letter}")
    
    # Determine content type if auto
    if content_type == "auto":
        if "folgeposition" in custom_json and isinstance(custom_json["folgeposition"], list):
            content_type = "grundtext"  # It's a grundtext with folgepositions
        elif "pos-eigenschaften" in custom_json:
            content_type = "folgeposition"
        elif "grundtextnr" in custom_json:
            content_type = "grundtext"
        else:
            print(f"Error: Cannot determine content type automatically from JSON keys: {list(custom_json.keys())}")
            return {}
    
    print(f"Debug: Determined content type: {content_type}")
    
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials not found.")
        return {}
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Debug: Check what's in the database for this LG
        print(f"Debug: Searching for LG {lg_nr} in database...")
        lg_records = supabase.table('regulations').select('lg_nr, entity_json').eq('entity_type', 'LG').eq('lg_nr', lg_nr).execute().data
        
        if not lg_records:
            print(f"Error: LG {lg_nr} not found in database")
            # Let's check what LGs exist
            all_lgs = supabase.table('regulations').select('lg_nr').eq('entity_type', 'LG').execute().data
            available_lgs = [record['lg_nr'] for record in all_lgs]
            print(f"Debug: Available LGs in database: {available_lgs}")
            return {}
        
        print(f"Debug: Found LG {lg_nr}, now searching for ULG {ulg_nr}...")
        # Fetch only the specific ULG
        ulg_records = supabase.table('regulations').select('lg_nr, ulg_nr, entity_json').eq('entity_type', 'ULG').eq('lg_nr', lg_nr).eq('ulg_nr', ulg_nr).execute().data
        
        if not ulg_records:
            print(f"Error: ULG {ulg_nr} not found in LG {lg_nr}")
            # Let's check what ULGs exist for this LG
            all_ulgs = supabase.table('regulations').select('ulg_nr').eq('entity_type', 'ULG').eq('lg_nr', lg_nr).execute().data
            available_ulgs = [record['ulg_nr'] for record in all_ulgs]
            print(f"Debug: Available ULGs in LG {lg_nr}: {available_ulgs}")
            return {}
        
        print(f"Debug: Found ULG {ulg_nr}, building LG structure...")
        
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        return {}
    
    # Build minimal LG structure with only the specific ULG and custom content
    lg_record = lg_records[0]
    ulg_record = ulg_records[0]
    
    try:
        # Create LG structure
        lg_json = json.loads(lg_record['entity_json']) if lg_record['entity_json'] else {}
        lg_json["@_nr"] = lg_nr
        
        # Create ULG structure
        ulg_json = json.loads(ulg_record['entity_json']) if ulg_record['entity_json'] else {}
        ulg_json["@_nr"] = ulg_nr
        
        # Initialize empty positions (we only want the custom content)
        if "positionen" not in ulg_json:
            ulg_json["positionen"] = {}
        ulg_json["positionen"]["grundtextnr"] = []
        
        # Add only the custom content based on type
        if content_type == "grundtext":
            # Handle the case where custom_json contains folgeposition directly
            if "folgeposition" in custom_json:
                # This is a grundtext with folgepositions
                custom_gt = copy.deepcopy(custom_json)
                if "@_nr" not in custom_gt:
                    custom_gt["@_nr"] = gt_nr
                ulg_json["positionen"]["grundtextnr"].append(custom_gt)
            elif "grundtextnr" in custom_json:
                # This is the old format with grundtextnr array
                for custom_gt in custom_json["grundtextnr"]:
                    # Ensure the grundtext has the correct number
                    if "@_nr" not in custom_gt:
                        custom_gt["@_nr"] = gt_nr
                    ulg_json["positionen"]["grundtextnr"].append(custom_gt)
        
        elif content_type == "folgeposition":
            # Create a minimal grundtext with only the custom folgeposition
            minimal_grundtext = {
                "@_nr": gt_nr,
                "folgeposition": []
            }
            
            # Add the custom folgeposition
            custom_fp = copy.deepcopy(custom_json)
            if "@_ftnr" not in custom_fp:
                custom_fp["@_ftnr"] = fp_letter or "A"
            
            minimal_grundtext["folgeposition"].append(custom_fp)
            ulg_json["positionen"]["grundtextnr"].append(minimal_grundtext)
        
        # Build final LG structure with only the specific ULG
        if "ulg-liste" not in lg_json:
            lg_json["ulg-liste"] = {}
        lg_json["ulg-liste"]["ulg"] = [ulg_json]
        
        print(f"Debug: Successfully built LG structure with custom content")
        return lg_json
        
    except json.JSONDecodeError as e:
        print(f"Warning: Invalid JSON in database records: {e}")
        return {}
    


