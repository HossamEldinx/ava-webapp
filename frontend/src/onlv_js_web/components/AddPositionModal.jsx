// This file creates a pop-up window (a "modal") that allows users to add new
// "positions" to an existing "ULG" (Unterleistungsgruppe, or sub-group of services)
// within an ONLV (ÖNORM B 2063 Leistungsverzeichnis) project.

// The main purpose of this file is to provide two types of forms for adding positions:
// 1. "Standalone Position": A task or item that stands on its own, with its own details.
// 2. "Shared Base Position" (Grundtext): A common description that can be shared by multiple
//    "Folgepositionen" (sub-positions or variations) later. This modal only creates the
//    base description, not the variations themselves.

// It uses React's state management (`useState`) to keep track of the data entered
// by the user in the forms. When the user submits the form, it generates a unique ID
// and a position number, then calls a function (`onSave`) to add the new position
// to the main project data.

import React, { useState } from "react"; // We need React to build our user interface, and hooks like useState for managing data.
import { v4 as uuidv4 } from "uuid"; // This is a special tool that helps us create unique identification numbers (IDs) for each new position.
import {} from "../../CommonData/Postions.js"; // These templates come from a file that defines common position structures.

/**
 * This is our main pop-up window component for adding new positions.
 * Think of it as a specialized form that appears on top of the main application.
 * It needs some information (called "props") from the part of the app that opened it.
 *
 * @param {Object} props - These are the pieces of information passed into this component.
 * @param {Object} props.parentUlg - This is the "ULG" (sub-group) where we want to add the new position. It contains details like its ID and number.
 * @param {string} props.positionType - This tells us what kind of position we are adding: either 'standalone' (a unique, independent item) or 'shared' (a base description that can have variations).
 * @param {Function} props.onClose - This is a special function that we call when the user wants to close this pop-up window without saving.
 * @param {Function} props.onSave - This is another special function that we call when the user clicks "Save." It sends the new position's data back to the main application.
 */
const AddPositionModal = ({ parentUlg, positionType, onClose, onSave }) => {
    // This function helps us set up the initial data for our form.
    // It checks whether we are adding a "standalone" position or a "shared base position" (grundtext)
    // and prepares the correct starting structure for the form fields.
    const initialState = () => {
        if (positionType === "standalone") {
            // If we are adding a "standalone" position, we set up its properties.
            // These properties include things like its short description (stichwort),
            // detailed description (langtext), unit of measurement (einheit), and more.
            return {
                mfv: "", // "Multiple Use ID": A single character (A-Z, 1-9) that helps differentiate items sharing the same base position number. It's optional.
                "pos-eigenschaften": {
                    // "Position Properties": This object holds most of the details for our position.
                    stichwort: "", // "Short Description": A brief summary of the position, up to 60 characters. This is required.
                    langtext: {
                        // "Detailed Description": A longer explanation of the position.
                        p: [], // This will hold paragraphs of text for the detailed description. It's handled separately to allow for multi-line input.
                    },
                    herkunftskennzeichen: "", // "Origin Mark": Indicates where this position comes from (e.g., from a supplementary list or freely formulated).
                    einheit: "", // "Unit of Measurement": Like "meters," "pieces," or "hours." This is required.
                    pzzv: {
                        // "Position Type/Variant": Describes the specific type of position (e.g., normal, alternative, optional).
                        normalposition: {}, // By default, it's a "normal position."
                    },
                    vorbemerkungskennzeichen: "", // "Affected by Parent Remark": A flag ('V') if this position is influenced by a remark in its parent group.
                    wesentlicheposition: "", // "Key Position": A flag ('W') if this is an important or key position.
                    garantierteangebotssummegruppe: "", // "Guaranteed Sum Group ID": An optional ID for grouping items with a guaranteed sum.
                    teilangebotskennzeichen: "", // "Partial Tender ID": An optional number (1-99) for partial tenders.
                    teilsummenkennzeichen: "", // "Partial Sum ID (Flat LV)": An optional number (1-9999) for partial sums in a flat rate list.
                    leistungsteil: 1, // "Performance Part": Indicates which part of the work this position belongs to (e.g., 1 for main works).
                    lvmenge: "", // "Quantity": The amount of this position (e.g., 10 meters, 5 pieces). This is required.
                    grafiklinks: {}, // "Graphics Links": An object to hold links to any related graphics.
                },
            };
        } else {
            // If we are adding a "shared base position" (grundtext), we set up its specific properties.
            // This type of position provides a common description that can be reused.
            return {
                grundtext: {
                    // "Base Text": This object holds the details for the shared base description.
                    langtext: {
                        // "Detailed Description": The main text for the shared base description.
                        p: [], // This will hold paragraphs of text. It's important that there are NO gaps (empty lines) in this text.
                    },
                    herkunftskennzeichen: "", // "Origin Mark for grundtext": Indicates the origin of this base description.
                },
                // The "folgeposition" (sub-position) array was removed from here because this modal
                // is only for creating the *base* description, not the variations themselves.
            };
        }
    };

    // `positionData` is a special variable that holds all the information
    // the user types into the form fields. When `positionData` changes,
    // React automatically updates what you see on the screen.
    // `setPositionData` is the function we use to update `positionData`.
    const [positionData, setPositionData] = useState(initialState);

    // `grundtextValue` is another special variable that specifically holds
    // the text for the "Shared Base Description" (Grundtext) input field.
    // `setGrundtextValue` is used to update this text.
    const [grundtextValue, setGrundtextValue] = useState("");

    // This function is called whenever the user types something into a basic text input or selects an option from a dropdown.
    // It figures out which field was changed and updates the `positionData` accordingly.
    const handleInputChange = (e) => {
        const { name, value } = e.target; // We get the name of the input field and the new value the user typed.

        if (positionType === "standalone") {
            // If we are working with a "standalone" position:
            if (name.includes(".")) {
                // If the input name has a dot (like "parent.child"), it means it's a nested property.
                const [parent, child] = name.split("."); // We split the name to get the parent and child parts.
                setPositionData((prev) => ({
                    // We update the `positionData` based on its previous state.
                    ...prev, // Keep all other properties of `positionData` the same.
                    "pos-eigenschaften": {
                        // Go into the "pos-eigenschaften" (position properties) object.
                        ...prev["pos-eigenschaften"], // Keep all other properties inside "pos-eigenschaften" the same.
                        [parent]: {
                            // Update the specific parent property (e.g., "langtext").
                            ...prev["pos-eigenschaften"][parent], // Keep other properties of the parent the same.
                            [child]: value, // Update the child property (e.g., "p" inside "langtext") with the new value.
                        },
                    },
                }));
            } else if (name === "mfv") {
                // If the input name is "mfv" (Multiple Use ID), it's a top-level property.
                setPositionData((prev) => ({
                    // Update `positionData`.
                    ...prev, // Keep other properties the same.
                    mfv: value, // Update the "mfv" property directly.
                }));
            } else {
                // For other direct properties of "pos-eigenschaften" (like "stichwort," "einheit," etc.).
                setPositionData((prev) => ({
                    // Update `positionData`.
                    ...prev, // Keep other properties the same.
                    "pos-eigenschaften": {
                        // Go into "pos-eigenschaften."
                        ...prev["pos-eigenschaften"], // Keep other properties inside "pos-eigenschaften" the same.
                        [name]: value, // Update the specific property (e.g., "stichwort") with the new value.
                    },
                }));
            }
        } else {
            // If we are working with a "shared base position" (grundtext):
            if (name === "grundtext.herkunftskennzeichen") {
                // If the input name is for the "Origin Mark" of the grundtext.
                setPositionData((prev) => ({
                    // Update `positionData`.
                    ...prev, // Keep other properties the same.
                    grundtext: {
                        // Go into the "grundtext" object.
                        ...prev.grundtext, // Keep other properties inside "grundtext" the same.
                        herkunftskennzeichen: value, // Update the "herkunftskennzeichen" property.
                    },
                }));
            }
            // The handling for "folgeposition.*" (sub-position fields) was removed because
            // this modal no longer deals with creating variations directly.
        }
    };

    // This function is called when a checkbox is clicked.
    // It updates the `positionData` based on whether the checkbox is checked or unchecked.
    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target; // Get the name of the checkbox and whether it's checked.

        if (positionType === "standalone") {
            // If it's a "standalone" position:
            // We set the value to "W" for "wesentlicheposition" (Key Position) or "V" for "vorbemerkungskennzeichen" (Affected by Parent Remark) if checked, otherwise empty.
            const value = name === "wesentlicheposition" ? "W" : "V";
            setPositionData((prev) => ({
                // Update `positionData`.
                ...prev, // Keep other properties the same.
                "pos-eigenschaften": {
                    // Go into "pos-eigenschaften."
                    ...prev["pos-eigenschaften"], // Keep other properties inside "pos-eigenschaften" the same.
                    [name]: checked ? value : "", // Set the property based on checkbox state.
                },
            }));
        } else {
            // Logic for "shared position" (folgeposition) checkboxes was removed.
        }
    };

    // This function is called when the user selects a different "Position Type/Variant" from the dropdown.
    // It updates the `pzzv` (Position Type/Variant) structure in `positionData` to match the selected type.
    const handlePositionTypeChange = (e) => {
        const { value, name } = e.target; // Get the selected value and the input name.
        let pzzv = {}; // Start with an empty object for the `pzzv` structure.

        // We use a "switch" statement to set the correct `pzzv` structure based on the selected value.
        switch (value) {
            case "normalposition": // If "Normal Position" is selected.
                pzzv = { normalposition: {} }; // Set `pzzv` to have a "normalposition" object.
                break; // Stop here.
            case "normalposition_einer_variante": // If "Normal Position of a Variant" is selected.
                pzzv = { normalposition_einer_variante: {} }; // Set `pzzv` to have a "normalposition_einer_variante" object.
                break; // Stop here.
            case "wahlposition": // If "Alternative/Choice Position" is selected.
                pzzv = { wahlposition: {} }; // Set `pzzv` to have a "wahlposition" object.
                break; // Stop here.
            case "eventualposition": // If "Optional/Eventual Position" is selected.
                pzzv = { eventualposition: {} }; // Set `pzzv` to have an "eventualposition" object.
                break; // Stop here.
            default: // If none of the above match (or if it's the default selection).
                pzzv = { normalposition: {} }; // Default to "normalposition."
        }

        if (positionType === "standalone" || !name) {
            // If it's a "standalone" position (or if the name is not provided, which implies standalone context).
            setPositionData((prev) => ({
                // Update `positionData`.
                ...prev, // Keep other properties the same.
                "pos-eigenschaften": {
                    // Go into "pos-eigenschaften."
                    ...prev["pos-eigenschaften"], // Keep other properties inside "pos-eigenschaften" the same.
                    pzzv, // Update the `pzzv` property with the newly determined structure.
                },
            }));
        }
        // Handling for "folgeposition-positionType" was removed.
    };

    // This function is specifically for handling changes to the "Langtext" (Detailed Description)
    // field for "standalone" positions. It takes the simple text input and converts it
    // into a structured format (an array of paragraphs) for storage.
    const handleLangtextChange = (e) => {
        const { value } = e.target; // Get the text the user typed.

        if (positionType === "standalone") {
            // If it's a "standalone" position:
            // We split the text by new lines, remove any empty lines, and then
            // format each line as a paragraph object (e.g., { "#text": "Your paragraph here" }).
            const paragraphs = value
                .split("\n") // Split the text into an array of lines based on new line characters.
                .filter((p) => p.trim() !== "") // Remove any lines that are just empty spaces.
                .map((p) => ({ "#text": p })); // Convert each non-empty line into an object with a "#text" property.

            setPositionData((prev) => ({
                // Update `positionData`.
                ...prev, // Keep other properties the same.
                "pos-eigenschaften": {
                    // Go into "pos-eigenschaften."
                    ...prev["pos-eigenschaften"], // Keep other properties inside "pos-eigenschaften" the same.
                    langtext: {
                        // Update the "langtext" (detailed description) object.
                        // Update the "p" (paragraphs) array.
                        p:
                            paragraphs.length > 0 // If there are actual paragraphs...
                                ? paragraphs // Use the formatted paragraphs.
                                : [{ "#text": value }], // Otherwise, use the original value as a single paragraph.
                    },
                },
            }));
        }
    };

    // This function handles changes to the "Shared Base Description" (Grundtext) input field.
    // Similar to `handleLangtextChange`, it converts the simple text into a structured paragraph format.
    const handleGrundtextChange = (e) => {
        const { value } = e.target; // Get the text the user typed.
        setGrundtextValue(value); // Also update the `grundtextValue` state variable.

        // Convert simple text to paragraph structure. It's important that NO GAPS (empty lines) are allowed here.
        const paragraphs = value
            .split("\n") // Split the text into an array of lines.
            .filter((p) => p.trim() !== "") // Remove any empty lines.
            .map((p) => ({ "#text": p })); // Convert each line into a paragraph object.

        setPositionData((prev) => ({
            // Update `positionData`.
            ...prev, // Keep other properties the same.
            grundtext: {
                // Go into the "grundtext" object.
                ...prev.grundtext, // Keep other properties inside "grundtext" the same.
                langtext: {
                    // Update the "langtext" (detailed description) object within "grundtext."
                    // Update the "p" (paragraphs) array.
                    p:
                        paragraphs.length > 0 // If there are actual paragraphs...
                            ? paragraphs // Use the formatted paragraphs.
                            : [{ "#text": value }], // Otherwise, use the original value as a single paragraph.
                },
            },
        }));
    };

    // This function is called when the user clicks the "Save" button on the form.
    // It prevents the default form submission behavior, generates a position number,
    // creates the new position object with all the collected data, and then calls
    // the `onSave` function (passed from the parent component) to save the new position.
    const handleSubmit = (e) => {
        e.preventDefault(); // Stop the browser from doing its default form submission (which would refresh the page).

        // Generate a unique position number for the new item.
        const positionNr = generatePositionNumber(parentUlg);

        if (positionType === "standalone") {
            // If we are saving a "standalone" position:
            const newPosition = {
                // Create a new object to hold all the data for this position.
                id: uuidv4(), // Generate a unique ID using the `uuidv4` tool.
                type: "position", // Mark this as a general "position" type.
                parentId: parentUlg.id, // Store the ID of its parent ULG.
                level: parentUlg.level + 1, // Set its level in the hierarchy (one level deeper than its parent).
                nr: positionNr, // Assign the newly generated position number.
                stichwort: positionData["pos-eigenschaften"].stichwort, // Get the short description from the form data.
                lvmenge: positionData["pos-eigenschaften"].lvmenge || "n.a.", // Get the quantity, or "n.a." if it's empty.
                einheit: positionData["pos-eigenschaften"].einheit || "", // Get the unit of measurement.
                pzzv: positionData["pos-eigenschaften"].pzzv, // Get the position type/variant.
                herkunftskennzeichen:
                    positionData["pos-eigenschaften"].herkunftskennzeichen, // Get the origin mark.
                leistungsteil: positionData["pos-eigenschaften"].leistungsteil, // Get the performance part.
                langtext: positionData["pos-eigenschaften"].langtext, // Get the detailed description.
                childrenCount: 0, // Initialize children count to 0 (no sub-items yet).
                // Include all other relevant fields from the `positionData` state.
                mfv: positionData.mfv,
                vorbemerkungskennzeichen:
                    positionData["pos-eigenschaften"].vorbemerkungskennzeichen,
                wesentlicheposition:
                    positionData["pos-eigenschaften"].wesentlicheposition,
                garantierteangebotssummegruppe:
                    positionData["pos-eigenschaften"]
                        .garantierteangebotssummegruppe,
                teilangebotskennzeichen:
                    positionData["pos-eigenschaften"].teilangebotskennzeichen,
                teilsummenkennzeichen:
                    positionData["pos-eigenschaften"].teilsummenkennzeichen,
                grafiklinks: positionData["pos-eigenschaften"].grafiklinks,
            };

            onSave(newPosition); // Call the `onSave` function (from the parent) with the new position data.
        } else {
            // If we are saving a "shared base position" (grundtext):
            const newPosition = {
                // Create a new object for the grundtext position.
                id: uuidv4(), // Generate a unique ID.
                type: "grundtext_position", // Mark this as a "grundtext_position" type.
                parentId: parentUlg.id, // Store the ID of its parent ULG.
                level: parentUlg.level + 1, // Set its level in the hierarchy.
                nr: positionNr, // Assign the newly generated position number.
                grundtext: positionData.grundtext, // Include all the grundtext data.
                // "folgeposition" data and UI-specific properties related to variations are removed here.
                // The `OnlvTable` (another part of the app) will display the `langtext` from `grundtext`.
                // Other fields like `stichwort`, `lvmenge`, `einheit` that are specific to variations
                // are not part of this base description. If they were needed for the "Shared Base Position" itself,
                // they would have to be added to "Part A" of the form.
                langtext: positionData.grundtext.langtext, // Use the grundtext's detailed description for display.
                childrenCount: 0, // Initialize children count to 0.
            };

            onSave(newPosition); // Call the `onSave` function with the new grundtext position data.
        }
    };

    // This is a helper function that creates a new position number.
    // Currently, it's a placeholder that combines the parent ULG's number with a random number.
    // In a real application, this would have more specific logic to ensure correct numbering.
    const generatePositionNumber = (parentUlg) => {
        // This is a placeholder. In a real system, this would follow a specific numbering scheme,
        // often based on the parent's number and a sequential counter for siblings.
        return `${parentUlg.nr}.${Math.floor(Math.random() * 1000)}`;
    };

    return (
        // This is the main structure of our pop-up window.
        // The `modal-overlay` creates a dimmed background that covers the rest of the app,
        // making the pop-up stand out.
        <div className="modal-overlay">
            {/* The `modal-content` is the actual white box that contains our form. */}
            <div className="modal-content">
                {/* The `modal-header` contains the title of the pop-up and the close button. */}
                <div className="modal-header">
                    {/* The title changes based on whether we are adding a "standalone" or "shared base" position. */}
                    <h2>
                        {positionType === "standalone"
                            ? "Neue Standalone Position hinzufügen" // "Add New Standalone Position"
                            : "Neue Shared Base Position hinzufügen"}{" "}
                        {/* "Add New Shared Base Position" */}
                    </h2>
                    {/* This button closes the modal when clicked. */}
                    <button className="close-button" onClick={onClose}>
                        ×{" "}
                        {/* The "×" symbol is a common way to show a close button. */}
                    </button>
                </div>

                {/* This is the form itself, where users will enter data. */}
                <form onSubmit={handleSubmit}>
                    {/* We use a "conditional rendering" here: if `positionType` is "standalone,"
                        we show the "Standalone Position Form"; otherwise, we show the "Shared Position Form." */}
                    {positionType === "standalone" ? (
                        // This is the form section for adding a "Standalone Position."
                        <>
                            {/* "Multiple Use ID" field: An optional single character to help identify items. */}
                            <div className="form-group">
                                <label htmlFor="mfv">
                                    Multiple Use ID (A-Z, 1-9, Optional):
                                </label>
                                <input
                                    type="text"
                                    id="mfv"
                                    name="mfv"
                                    value={positionData.mfv}
                                    onChange={handleInputChange}
                                    pattern="[A-Z1-9]?" // This ensures only A-Z or 1-9 are allowed.
                                    maxLength={1} // Only one character is allowed.
                                    title="A single character (A-Z, 1-9) or empty" // A helpful tooltip.
                                />
                                <small>
                                    For differentiating items sharing the same
                                    Base Position Number
                                </small>
                            </div>

                            {/* "Stichwort" (Short Description) field: A required brief summary. */}
                            <div className="form-group">
                                <label htmlFor="stichwort">
                                    Stichwort (Short Description) *:
                                </label>
                                <input
                                    type="text"
                                    id="stichwort"
                                    name="stichwort"
                                    value={
                                        positionData["pos-eigenschaften"]
                                            .stichwort
                                    }
                                    onChange={handleInputChange}
                                    maxLength={60} // Maximum 60 characters.
                                    required // This field must be filled out.
                                />
                            </div>

                            {/* "LV Menge" (Quantity) field: A required number for the amount. */}
                            <div className="form-group">
                                <label htmlFor="lvmenge">
                                    Quantity (LV Menge) *:
                                </label>
                                <input
                                    type="number"
                                    id="lvmenge"
                                    name="lvmenge"
                                    value={
                                        positionData["pos-eigenschaften"]
                                            .lvmenge
                                    }
                                    onChange={handleInputChange}
                                    step="0.01" // Allows decimal numbers (e.g., 1.50).
                                    min="0" // Minimum value is 0.
                                    required // This field must be filled out.
                                />
                            </div>

                            {/* "Einheit" (Unit of Measurement) field: A required dropdown for units. */}
                            <div className="form-group">
                                <label htmlFor="einheit">
                                    Unit of Measurement *:
                                </label>
                                <select
                                    id="einheit"
                                    name="einheit"
                                    value={
                                        positionData["pos-eigenschaften"]
                                            .einheit
                                    }
                                    onChange={handleInputChange}
                                    required // This field must be selected.
                                >
                                    <option value="">Select unit...</option>
                                    <option value="m">m (Meter)</option>
                                    <option value="m²">
                                        m² (Square Meter)
                                    </option>
                                    <option value="m³">m³ (Cubic Meter)</option>
                                    <option value="Stk">Stk (Piece)</option>
                                    <option value="PA">PA (Pauschal)</option>
                                    <option value="h">h (Hour)</option>
                                    <option value="kg">kg (Kilogram)</option>
                                    <option value="t">t (Ton)</option>
                                    <option value="lfm">
                                        lfm (Linear Meter)
                                    </option>
                                </select>
                            </div>

                            {/* "Langtext" (Detailed Description) field: An optional multi-line text area. */}
                            <div className="form-group">
                                <label htmlFor="langtext">
                                    Langtext (Detailed Description):
                                </label>
                                <textarea
                                    id="langtext"
                                    name="langtext"
                                    value={grundtextValue}
                                    onChange={(e) => {
                                        setGrundtextValue(e.target.value); // Update the `grundtextValue` state.
                                        handleLangtextChange(e); // Call the specific handler for langtext.
                                    }}
                                    rows={5} // Shows 5 lines of text at once.
                                    placeholder="Enter detailed description here..."
                                />
                                <small>
                                    Basic formatting supported. Use new lines
                                    for paragraphs.
                                </small>
                            </div>

                            {/* "Herkunftskennzeichen" (Origin Mark) field: An optional dropdown. */}
                            <div className="form-group">
                                <label htmlFor="herkunftskennzeichen">
                                    Origin Mark:
                                </label>
                                <select
                                    id="herkunftskennzeichen"
                                    name="herkunftskennzeichen"
                                    value={
                                        positionData["pos-eigenschaften"]
                                            .herkunftskennzeichen
                                    }
                                    onChange={handleInputChange}
                                >
                                    <option value="">None</option>
                                    <option value="+">
                                        + (From Supplementary LB)
                                    </option>
                                    <option value="Z">
                                        Z (Freely Formulated)
                                    </option>
                                </select>
                            </div>

                            {/* "Position Type/Variant" field: A required dropdown to specify the position's behavior. */}
                            <div className="form-group">
                                <label htmlFor="positionType">
                                    Position Type/Variant *:
                                </label>
                                <select
                                    id="positionType"
                                    name="positionType"
                                    onChange={handlePositionTypeChange}
                                    required // This field must be selected.
                                    defaultValue="normalposition" // Sets the initial selected option.
                                >
                                    <option value="normalposition">
                                        Normal Position
                                    </option>
                                    <option value="normalposition_einer_variante">
                                        Normal Position of a Variant
                                    </option>
                                    <option value="wahlposition">
                                        Alternative/Choice Position
                                        (Wahlposition)
                                    </option>
                                    <option value="eventualposition">
                                        Optional/Eventual Position
                                    </option>
                                </select>
                            </div>

                            {/* "Leistungsteil" (Performance Part) field: A required dropdown for price adjustments. */}
                            <div className="form-group">
                                <label htmlFor="leistungsteil">
                                    Performance Part (for Price Adj.) *:
                                </label>
                                <select
                                    id="leistungsteil"
                                    name="leistungsteil"
                                    value={
                                        positionData["pos-eigenschaften"]
                                            .leistungsteil
                                    }
                                    onChange={handleInputChange}
                                    required // This field must be selected.
                                >
                                    <option value="1">1 - Main Works</option>
                                    <option value="2">
                                        2 - Secondary Works
                                    </option>
                                    {/* More options could be added here based on a "leistungsteiltabelle" (performance part table). */}
                                </select>
                            </div>

                            {/* "Optional Fields" Section: A group of checkboxes and inputs for less common properties. */}
                            <fieldset>
                                <legend>Optional Fields</legend>

                                {/* "Affected by Parent Remark" checkbox. */}
                                <div className="form-group checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="vorbemerkungskennzeichen"
                                        name="vorbemerkungskennzeichen"
                                        checked={
                                            positionData["pos-eigenschaften"]
                                                .vorbemerkungskennzeichen ===
                                            "V"
                                        }
                                        onChange={handleCheckboxChange}
                                    />
                                    <label htmlFor="vorbemerkungskennzeichen">
                                        Affected by Parent Remark ('V')
                                    </label>
                                </div>

                                {/* "Key Position" checkbox. */}
                                <div className="form-group checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="wesentlicheposition"
                                        name="wesentlicheposition"
                                        checked={
                                            positionData["pos-eigenschaften"]
                                                .wesentlicheposition === "W"
                                        }
                                        onChange={handleCheckboxChange}
                                    />
                                    <label htmlFor="wesentlicheposition">
                                        Key Position ('W')
                                    </label>
                                </div>

                                {/* "Guaranteed Sum Group ID" field. */}
                                <div className="form-group">
                                    <label htmlFor="garantierteangebotssummegruppe">
                                        Guaranteed Sum Group ID:
                                    </label>
                                    <input
                                        type="text"
                                        id="garantierteangebotssummegruppe"
                                        name="garantierteangebotssummegruppe"
                                        value={
                                            positionData["pos-eigenschaften"]
                                                .garantierteangebotssummegruppe
                                        }
                                        onChange={handleInputChange}
                                        pattern="[A-Z0-9]?" // Allows A-Z or 0-9.
                                        maxLength={1} // Only one character.
                                    />
                                </div>

                                {/* "Partial Tender ID" field. */}
                                <div className="form-group">
                                    <label htmlFor="teilangebotskennzeichen">
                                        Partial Tender ID:
                                    </label>
                                    <input
                                        type="number"
                                        id="teilangebotskennzeichen"
                                        name="teilangebotskennzeichen"
                                        value={
                                            positionData["pos-eigenschaften"]
                                                .teilangebotskennzeichen
                                        }
                                        onChange={handleInputChange}
                                        min="1" // Minimum value is 1.
                                        max="99" // Maximum value is 99.
                                    />
                                </div>

                                {/* "Partial Sum ID (Flat LV)" field. */}
                                <div className="form-group">
                                    <label htmlFor="teilsummenkennzeichen">
                                        Partial Sum ID (Flat LV):
                                    </label>
                                    <input
                                        type="number"
                                        id="teilsummenkennzeichen"
                                        name="teilsummenkennzeichen"
                                        value={
                                            positionData["pos-eigenschaften"]
                                                .teilsummenkennzeichen
                                        }
                                        onChange={handleInputChange}
                                        min="1" // Minimum value is 1.
                                        max="9999" // Maximum value is 9999.
                                    />
                                </div>
                            </fieldset>
                        </>
                    ) : (
                        // This is the form section for adding a "Shared Position" (Grundtext).
                        <>
                            {/* PART A: GRUNDTEXT (SHARED BASE DESCRIPTION) */}
                            <fieldset>
                                <legend>
                                    Part A: Shared Base Description (Grundtext)
                                </legend>

                                {/* "Grundtext Langtext" (Shared Base Description) field: A required multi-line text area. */}
                                <div className="form-group">
                                    <label htmlFor="grundtext-langtext">
                                        Shared Base Description (Grundtext) *:
                                    </label>
                                    <textarea
                                        id="grundtext-langtext"
                                        name="grundtext-langtext"
                                        value={grundtextValue}
                                        onChange={handleGrundtextChange}
                                        rows={5} // Shows 5 lines of text.
                                        placeholder="Enter shared base description here (NO gap placeholders allowed)..."
                                        required // This field must be filled out.
                                    />
                                    <small>
                                        This text will be shared by all
                                        variations. NO gap placeholders (al, bl,
                                        blo, rw) allowed.
                                    </small>
                                </div>

                                {/* "Grundtext Herkunftskennzeichen" (Origin Mark for Base Description) field: An optional dropdown. */}
                                <div className="form-group">
                                    <label htmlFor="grundtext-herkunftskennzeichen">
                                        Origin Mark (for Base Description):
                                    </label>
                                    <select
                                        id="grundtext-herkunftskennzeichen"
                                        name="grundtext.herkunftskennzeichen"
                                        value={
                                            positionData.grundtext
                                                .herkunftskennzeichen
                                        }
                                        onChange={handleInputChange}
                                    >
                                        <option value="">None</option>
                                        <option value="+">
                                            + (From Supplementary LB)
                                        </option>
                                        <option value="Z">
                                            Z (Freely Formulated)
                                        </option>
                                    </select>
                                </div>
                            </fieldset>

                            {/* PART B: FIRST VARIATION (FOLGEPOSITION) was removed from this modal. */}
                        </>
                    )}

                    {/* Action buttons at the bottom of the modal. */}
                    <div className="modal-actions">
                        {/* "Cancel" button: Closes the modal without saving. */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="cancel-button"
                        >
                            Abbrechen {/* "Cancel" */}
                        </button>
                        {/* "Save" button: Submits the form and saves the new position. */}
                        <button type="submit" className="save-button">
                            Speichern {/* "Save" */}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPositionModal;
