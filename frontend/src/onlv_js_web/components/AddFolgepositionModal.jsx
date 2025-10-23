// This file creates a pop-up window (a "modal") that allows users to add a new
// "Folgeposition" (sub-position or variation) to an existing "Grundtext" (base text) position.
//
// The main idea is to provide a form where users can input details for a new
// variation, such as its unique ID (like A, B, C), a short keyword, quantity,
// unit of measurement, and a detailed description.
//
// This modal ensures that the new Folgeposition is correctly structured and
// linked to its parent Grundtext, following the ONLV data format. It also
// automatically suggests the next available variation ID (A, B, C, etc.) to
// help users maintain proper numbering.
//
// When the user fills out the form and clicks "Save," the new Folgeposition
// data is passed back to the main application to be added to the ONLV project structure.

import React, { useState, useEffect } from "react";
import { folgeposition as folgepositionTemplate } from "../../CommonData/Postions.js"; // This imports a basic structure (a "template") for a new Folgeposition. It's like a blank form we fill out.

/**
 * This is our special pop-up window (modal) component.
 * It's used specifically for adding a new "Folgeposition" (a variation or sub-item)
 * to an existing "Grundtext" (main item).
 *
 * Think of it as a small, focused form that appears on top of your main screen.
 *
 * @param {Object} props - These are like settings or pieces of information we give to this component.
 * @param {Object} props.grundtextPosition - This is the main item (Grundtext) to which we want to add a new variation. It contains all the details of the parent item.
 * @param {Function} props.onClose - This is a special instruction (a function) that tells the modal to close itself when the user clicks "Cancel" or the "X" button.
 * @param {Function} props.onSave - This is another special instruction that tells the main app what to do with the new variation data after the user clicks "Save."
 */
const AddFolgepositionModal = ({ grundtextPosition, onClose, onSave }) => {
    // This is where we store all the information for our new "Folgeposition" (variation).
    // `useState` is a special tool from React that lets our component remember and update information.
    // We start by making a copy of our `folgepositionTemplate` (our blank form) so we can fill it in.
    const [folgepositionData, setFolgepositionData] = useState(
        JSON.parse(JSON.stringify(folgepositionTemplate))
    );

    // This state variable holds the text for the "Langtext" (detailed description) field.
    // We keep it separate because it's a simple text input that needs to be converted into a special format later.
    const [folgepositionLangtextValue, setFolgepositionLangtextValue] =
        useState("");

    // `useEffect` is another special React tool. It's like a little helper that runs code
    // when certain things change (like when the modal first opens or when the parent item changes).
    // Here, its job is to figure out the next available "FTNR" (variation ID, like A, B, C)
    // for our new Folgeposition, so we don't accidentally use an ID that's already taken.
    useEffect(() => {
        // First, we look at the existing variations (Folgepositionen) of the parent "Grundtext"
        // to see which FTNRs (A, B, C, etc.) are already in use.
        let existingFtnrs = [];
        if (
            grundtextPosition &&
            grundtextPosition.originalData && // We try to get the original, full data of the Grundtext.
            grundtextPosition.originalData.folgeposition &&
            Array.isArray(grundtextPosition.originalData.folgeposition)
        ) {
            // If we find existing variations, we collect their FTNRs.
            existingFtnrs = grundtextPosition.originalData.folgeposition.map(
                (fp) => fp["@_ftnr"]
            );
        } else if (
            grundtextPosition &&
            grundtextPosition.folgeposition &&
            Array.isArray(grundtextPosition.folgeposition)
        ) {
            // If the data is structured a bit differently, we try this way to get the FTNRs.
            existingFtnrs = grundtextPosition.folgeposition.map(
                (fp) => fp["@_ftnr"]
            );
        }

        // We define the alphabet to go through A, B, C...
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let nextFtnr = "A"; // We start by assuming "A" is the next available ID.
        // We loop through the alphabet to find the first letter that is NOT already used.
        for (let i = 0; i < alphabet.length; i++) {
            if (!existingFtnrs.includes(alphabet[i])) {
                nextFtnr = alphabet[i]; // Found an unused letter!
                break; // We stop searching because we found our letter.
            }
            // If we've gone through all letters (A-Z) and they are all used,
            // we show a warning because the system might not be designed for more than 26 variations.
            if (i === alphabet.length - 1) {
                console.warn(
                    "All standard FTNRs (A-Z) might be in use for this grundtext."
                );
            }
        }

        // Now, we update our `folgepositionData` (our form data) with the `nextFtnr` we found.
        setFolgepositionData((prev) => ({
            ...prev, // Keep all the previous data we had.
            "@_ftnr": nextFtnr, // Set the new FTNR.
            // We also make sure other important fields are set from our template or have default values.
            "@_mfv": prev["@_mfv"] || "",
            "pos-eigenschaften": {
                ...folgepositionTemplate["pos-eigenschaften"], // Start with the basic properties from our template.
                ...prev["pos-eigenschaften"], // Add any properties that were already set (e.g., if the user started typing).
                stichwort: prev["pos-eigenschaften"]?.stichwort || "", // Make sure "stichwort" has a default empty value if not set.
                langtext: prev["pos-eigenschaften"]?.langtext || { p: [] }, // Make sure "langtext" has a default empty paragraph structure.
                herkunftskennzeichen:
                    prev["pos-eigenschaften"]?.herkunftskennzeichen || "",
                einheit: prev["pos-eigenschaften"]?.einheit || "",
                pzzv: prev["pos-eigenschaften"]?.pzzv || { normalposition: {} },
                leistungsteil: prev["pos-eigenschaften"]?.leistungsteil || 1,
                lvmenge: prev["pos-eigenschaften"]?.lvmenge || "",
            },
        }));
    }, [grundtextPosition]); // This tells `useEffect` to re-run this code if `grundtextPosition` changes.

    // This function is called whenever the user types something into a basic input field
    // (like the Variation ID, Multiple Use ID, Stichwort, Quantity, Unit, or Origin Mark).
    const handleInputChange = (e) => {
        const { name, value } = e.target; // We get the name of the input field and what the user typed.

        if (name === "ftnr") {
            // If it's the "ftnr" field, we update that specific part of our data.
            setFolgepositionData((prev) => ({
                ...prev,
                "@_ftnr": value,
            }));
        } else if (name === "mfv") {
            // If it's the "mfv" field, we update that specific part.
            setFolgepositionData((prev) => ({
                ...prev,
                "@_mfv": value,
            }));
        } else {
            // For all other input fields, they belong to the "pos-eigenschaften" section,
            // so we update the correct property within that section.
            setFolgepositionData((prev) => ({
                ...prev,
                "pos-eigenschaften": {
                    ...prev["pos-eigenschaften"], // Keep all existing properties in "pos-eigenschaften".
                    [name]: value, // Update the specific property that changed.
                },
            }));
        }
    };

    // This function is called when the user selects a different "Position Type" from the dropdown.
    const handlePositionTypeChange = (e) => {
        const { value } = e.target; // We get the selected value (e.g., "normalposition", "wahlposition").
        let pzzv = {}; // This variable will hold the special structure for the position type.

        // We use a `switch` statement to set the correct structure for `pzzv`
        // based on what the user selected. Each type has a slightly different empty object.
        switch (value) {
            case "normalposition":
                pzzv = { normalposition: {} };
                break;
            case "normalposition_einer_variante":
                pzzv = { normalposition_einer_variante: {} };
                break;
            case "wahlposition":
                pzzv = { wahlposition: {} };
                break;
            case "eventualposition":
                pzzv = { eventualposition: {} };
                break;
            default:
                pzzv = { normalposition: {} }; // Default to normal position if nothing matches.
        }

        // We update our `folgepositionData` with the new `pzzv` structure.
        setFolgepositionData((prev) => ({
            ...prev,
            "pos-eigenschaften": {
                ...prev["pos-eigenschaften"],
                pzzv, // Set the new position type structure.
            },
        }));
    };

    // This function handles changes to the "Langtext" (detailed description) textarea.
    // It also converts the simple text into a special "paragraph" format required by the data structure.
    const handleFolgepositionLangtextChange = (e) => {
        const { value } = e.target; // Get the text the user typed.
        setFolgepositionLangtextValue(value); // Update the state for the textarea's value.

        // This part is a bit tricky: we take the text, split it into lines (paragraphs),
        // remove any empty lines, and then format each line into an object like `{ "#text": "your paragraph" }`.
        const paragraphs = value
            .split("\n") // Split the text by new lines.
            .filter((p) => p.trim() !== "") // Remove any lines that are just empty spaces.
            .map((p) => ({ "#text": p })); // Format each line into the required object structure.

        // Finally, we update the `langtext` property in our `folgepositionData`.
        setFolgepositionData((prev) => ({
            ...prev,
            "pos-eigenschaften": {
                ...prev["pos-eigenschaften"],
                langtext: {
                    p:
                        paragraphs.length > 0
                            ? paragraphs // If we have paragraphs, use them.
                            : [{ "#text": value }], // Otherwise, use the whole text as one paragraph.
                },
            },
        }));
    };

    // This function is called when the user clicks the "Save" button on the form.
    const handleSubmit = (e) => {
        e.preventDefault(); // This stops the browser from refreshing the page, which is the default behavior for forms.
        onSave(folgepositionData); // We call the `onSave` function (which was passed from the parent component)
        // and give it all the `folgepositionData` we've collected.
    };

    return (
        // This is the main container for our modal, making it appear as an overlay.
        <div className="modal-overlay">
            {/* This is the actual content box of the modal. */}
            <div className="modal-content">
                {/* The header section of the modal, with a title and a close button. */}
                <div className="modal-header">
                    <h2>Neue Folgeposition hinzufügen</h2>{" "}
                    {/* The title of our modal. */}
                    {/* The close button, which calls the `onClose` function when clicked. */}
                    <button className="close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* This is the form where the user will enter all the details for the new Folgeposition. */}
                <form onSubmit={handleSubmit}>
                    {/* Each `div` with `form-group` class represents a section for an input field. */}
                    <div className="form-group">
                        <label htmlFor="folgeposition-ftnr">
                            Variation ID (A-Z) *:{" "}
                            {/* Label for the input field. */}
                        </label>
                        <input
                            type="text"
                            id="folgeposition-ftnr"
                            name="ftnr"
                            value={folgepositionData["@_ftnr"]}
                            onChange={handleInputChange} // When the user types, `handleInputChange` is called.
                            pattern="[A-Z]" // This makes sure only capital letters A-Z are allowed.
                            maxLength={1} // Only one character is allowed.
                            title="A single character (A-Z)"
                            required // This field must be filled out.
                        />
                        <small>
                            Single letter (A-Z) identifying this variation{" "}
                            {/* A small hint for the user. */}
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-mfv">
                            Multiple Use ID (A-Z, 1-9, Optional):
                        </label>
                        <input
                            type="text"
                            id="folgeposition-mfv"
                            name="mfv"
                            value={folgepositionData["@_mfv"]}
                            onChange={handleInputChange}
                            pattern="[A-Z1-9]?" // Allows A-Z or 1-9, or can be empty.
                            maxLength={1}
                            title="A single character (A-Z, 1-9) or empty"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-stichwort">
                            Stichwort for Variation{" "}
                            {folgepositionData["@_ftnr"]} *:
                        </label>
                        <input
                            type="text"
                            id="folgeposition-stichwort"
                            name="stichwort"
                            value={
                                folgepositionData["pos-eigenschaften"].stichwort
                            }
                            onChange={handleInputChange}
                            maxLength={60}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-lvmenge">
                            Quantity for Variation {folgepositionData["@_ftnr"]}{" "}
                            *:
                        </label>
                        <input
                            type="number"
                            id="folgeposition-lvmenge"
                            name="lvmenge"
                            value={
                                folgepositionData["pos-eigenschaften"].lvmenge
                            }
                            onChange={handleInputChange}
                            step="0.01" // Allows decimal numbers (e.g., 1.25).
                            min="0" // Minimum value is 0.
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-einheit">
                            Unit of Measurement for Variation{" "}
                            {folgepositionData["@_ftnr"]} *:
                        </label>
                        <select
                            id="folgeposition-einheit"
                            name="einheit"
                            value={
                                folgepositionData["pos-eigenschaften"].einheit
                            }
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select unit...</option>
                            {/* These are the different measurement units the user can choose from. */}
                            <option value="m">m (Meter)</option>
                            <option value="m²">m² (Square Meter)</option>
                            <option value="m³">m³ (Cubic Meter)</option>
                            <option value="Stk">Stk (Piece)</option>
                            <option value="PA">PA (Pauschal)</option>
                            <option value="h">h (Hour)</option>
                            <option value="kg">kg (Kilogram)</option>
                            <option value="t">t (Ton)</option>
                            <option value="lfm">lfm (Linear Meter)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-langtext">
                            Specific Description for Variation{" "}
                            {folgepositionData["@_ftnr"]}:
                        </label>
                        <textarea
                            id="folgeposition-langtext"
                            name="folgeposition-langtext"
                            value={folgepositionLangtextValue}
                            onChange={handleFolgepositionLangtextChange} // This calls our special function to handle text and format it.
                            rows={5}
                            placeholder="Enter variation-specific description here (CAN include gap placeholders)..."
                        />
                        <small>
                            Additional text specific to this variation. CAN
                            include gap placeholders (al, bl, blo, rw).
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-herkunftskennzeichen">
                            Origin Mark (for Variation Text):
                        </label>
                        <select
                            id="folgeposition-herkunftskennzeichen"
                            name="herkunftskennzeichen"
                            value={
                                folgepositionData["pos-eigenschaften"]
                                    .herkunftskennzeichen
                            }
                            onChange={handleInputChange}
                        >
                            <option value="">None</option>
                            <option value="+">+ (From Supplementary LB)</option>
                            <option value="Z">Z (Freely Formulated)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-positionType">
                            Position Type for Variation{" "}
                            {folgepositionData["@_ftnr"]} *:
                        </label>
                        <select
                            id="folgeposition-positionType"
                            name="positionType"
                            onChange={handlePositionTypeChange} // This calls our function to handle position type changes.
                            required
                            defaultValue="normalposition"
                        >
                            <option value="normalposition">
                                Normal Position
                            </option>
                            <option value="normalposition_einer_variante">
                                Normal Position of a Variant
                            </option>
                            <option value="wahlposition">
                                Alternative/Choice Position (Wahlposition)
                            </option>
                            <option value="eventualposition">
                                Optional/Eventual Position
                            </option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="folgeposition-leistungsteil">
                            Performance Part for Variation{" "}
                            {folgepositionData["@_ftnr"]} *:
                        </label>
                        <select
                            id="folgeposition-leistungsteil"
                            name="leistungsteil"
                            value={
                                folgepositionData["pos-eigenschaften"]
                                    .leistungsteil
                            }
                            onChange={handleInputChange}
                            required
                        >
                            <option value="1">1 - Main Works</option>
                            <option value="2">2 - Secondary Works</option>
                        </select>
                    </div>

                    {/* This section contains the action buttons for the modal. */}
                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose} // Calls `onClose` to close the modal without saving.
                            className="cancel-button"
                        >
                            Abbrechen {/* "Cancel" button. */}
                        </button>
                        <button type="submit" className="save-button">
                            Speichern{" "}
                            {/* "Save" button, which triggers `handleSubmit`. */}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFolgepositionModal;
