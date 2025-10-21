// This file is like a toolbox for editing and managing "ONLV" project data.
// ONLV stands for "ÖNORM A 2063 Leistungsverzeichnis," which is a standard
// for describing services and quantities in construction projects in Austria.
//
// The main goal of this file is to provide functions and a special pop-up
// window (a "modal") that help users change details of different parts
// of an ONLV project, like:
// - "Positions": These are individual tasks or items in the project.
// - "Units": The measurements used for these tasks (like meters, hours, pieces).
// - "Timestamps": Keeping track of when changes were made.
//
// It also includes helper functions to make sure the data is in the correct
// format and can be easily updated within the complex ONLV structure.
//
// Think of it as the "editor" part of the ONLV application, allowing users
// to fine-tune the details of their construction project entries.

import React, { useState, useCallback } from "react";

// --- Einheit Options (Unit Options) ---
// This is a list of standard units of measurement that users can choose from.
// It's organized into categories like "Length," "Area," "Volume," etc.,
// to make it easy to find the right unit.
// For example, under "Length," you'll find "cm" (centimeter) and "m" (meter).
// This list is shared with other parts of the application, like the ONLV table,
// so everyone uses the same units.
export const einheitOptions = [
    {
        label: "Length",
        options: [
            { value: "cm", label: "cm (Centimeter)" },
            { value: "m", label: "m (Meter)" },
            { value: "km", label: "km (Kilometer)" },
        ],
    },
    {
        label: "Area",
        options: [
            { value: "cm²", label: "cm² (Square Centimeter)" },
            { value: "m²", label: "m² (Square Meter)" },
        ],
    },
    {
        label: "Volume",
        options: [
            { value: "cm³", label: "cm³ (Cubic Centimeter)" },
            { value: "m³", label: "m³ (Cubic Meter)" },
            { value: "l", label: "l (Liter)" },
        ],
    },
    {
        label: "Mass",
        options: [
            { value: "g", label: "g (Gram)" },
            { value: "kg", label: "kg (Kilogram)" },
            { value: "t", label: "t (Tonne / Metric Ton)" },
        ],
    },
    {
        label: "Count / Pieces",
        options: [
            { value: "Stk", label: "Stk (Stück - Piece/Item)" },
            { value: "PA", label: "PA (Pauschale - Lump Sum)" },
        ],
    },
    {
        label: "Time",
        options: [
            { value: "h", label: "h (Stunde - Hour)" },
            { value: "d", label: "d (Tag - Day)" },
            { value: "Wo", label: "Wo (Woche - Week)" },
            { value: "Mo", label: "Mo (Monat - Month)" },
        ],
    },
    {
        label: "Other",
        options: [
            { value: "VE", label: "VE (Verrechnungseinheit - Billing Unit)" },
        ],
    },
];

// --- Helper Functions ---

/**
 * This function helps us get the actual text value from different kinds of data.
 * Sometimes, text might be directly a string, or it might be inside a special
 * object like { "#text": "Hello" }. This function checks for these cases
 * and gives us just the "Hello" part.
 *
 * @param {any} obj - The data we want to get the value from.
 * @param {any} defaultValue - What to return if we can't find a value (defaults to an empty string).
 * @returns {any} The extracted value or the default value.
 */
export const getValue = (obj, defaultValue = "") => {
    if (obj === null || typeof obj === "undefined") return defaultValue;
    if (
        typeof obj === "object" &&
        "#text" in obj &&
        Object.keys(obj).length === 1
    ) {
        return obj["#text"];
    }
    if (typeof obj !== "object") return obj;
    return typeof defaultValue === "string" ? defaultValue : obj;
};

/**
 * This function is like a "text extractor." It goes through different types
 * of data (strings, numbers, arrays, or complex objects) and pulls out
 * all the basic text content. This is useful when we have data that might
 * contain special formatting (like bold text or lists) but we only need
 * the plain words.
 *
 * @param {any} node - The data structure (could be a string, number, array, or object) to extract text from.
 * @returns {string} All the basic text content joined together.
 */
export const extractBasicText = (node) => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractBasicText).join(" ");
    if (typeof node === "object" && node !== null) {
        let objText = "";
        if (node["#text"]) objText += node["#text"] + " ";
        for (const key in node) {
            if (key !== "#text" && !key.startsWith("@_")) {
                objText += extractBasicText(node[key]) + " ";
            }
        }
        return objText;
    }
    return "";
};

/**
 * This function creates a special timestamp (date and time) that follows
 * a specific international standard called "xs:dateTime" and is always
 * in UTC (Coordinated Universal Time). This is important for making sure
 * dates and times are consistent across different systems and time zones.
 *
 * @returns {string} The current date and time formatted as "YYYY-MM-DDTHH:MM:SSZ".
 */
export const getCurrentOenormTimestamp = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed (0 = January, 11 = December)
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
};

/**
 * This function updates the "erstelltam" (created at) property of an ONLV
 * metadata object. It uses the `getCurrentOenormTimestamp` function to
 * set the creation time to the current UTC timestamp. This helps keep
 * track of when an ONLV document or a part of it was last modified or created.
 *
 * @param {object} onlvMetadatenObject - The ONLV metadata object that needs its timestamp updated.
 */
export const setErstelltam = (onlvMetadatenObject) => {
    if (onlvMetadatenObject && typeof onlvMetadatenObject === "object") {
        onlvMetadatenObject.erstelltam = getCurrentOenormTimestamp();
    } else {
        console.error("Invalid onlvMetadatenObject provided to setErstelltam.");
    }
};

/**
 * This is a very important function that helps us update a specific "position"
 * (a task or item) within the complex, nested structure of an ONLV project.
 * Imagine your ONLV project data is like a big tree with many branches and leaves.
 * This function helps us find a specific leaf (a position) and change its details.
 *
 * It takes the entire ONLV project data and the updated information for one position.
 * It then navigates through the "LG" (main groups), "ULG" (sub-groups), and
 * "Grundtextnr" (base text numbers) to locate the exact position to update.
 *
 * @param {object} onlvData - The complete ONLV project data (the "tree").
 * @param {object} updatedPosition - The new information for the position we want to change.
 * @returns {boolean} True if the position was successfully updated, false otherwise.
 */
export const updatePositionInNestedOnlv = (onlvData, updatedPosition) => {
    // First, we do some checks to make sure we have valid data to work with.
    // If the data is missing or the item isn't a "position," we can't proceed.
    if (
        !onlvData ||
        !onlvData["ausschreibungs-lv"] ||
        !updatedPosition ||
        updatedPosition.type !== "position"
    ) {
        console.error("Invalid data or not a position item for update.");
        return false;
    }

    // We start by getting to the main parts of the ONLV structure.
    const lv = onlvData["ausschreibungs-lv"];
    const gliederung = lv["gliederung-lg"];
    // More checks to ensure the main group (LG) structure exists.
    if (!gliederung || !gliederung["lg-liste"] || !gliederung["lg-liste"].lg) {
        console.error("Missing LG structure in data.");
        return false;
    }

    // We get all the main groups (LG) from the list. We make sure it's always an array,
    // even if there's only one LG, to make it easier to work with.
    const lgs = Array.isArray(gliederung["lg-liste"].lg)
        ? gliederung["lg-liste"].lg
        : [gliederung["lg-liste"].lg];

    // The `updatedPosition.id` is like a unique address for each position.
    // It looks something like "pos-ulg-LGNR.ULGNR-GTNR-SUFFIX".
    // We split this address into its different parts to find the right place in our data tree.
    const idParts = updatedPosition.id.split("-");
    if (idParts.length !== 5 || idParts[0] !== "pos" || idParts[1] !== "ulg") {
        console.error("Invalid position ID format:", updatedPosition.id);
        return false;
    }

    const ulgNrFull = idParts[2]; // This part tells us the ULG number, like "1.1"
    const gtNr = idParts[3]; // This is the Grundtext number, like "1"
    const suffix = idParts[4]; // This tells us if it's a "Folgeposition" (A, B, C...) or "Ungeteilteposition" (U)

    // We split the ULG number to get the main LG number and the ULG suffix.
    const [lgNr, ulgNrSuffix] = ulgNrFull.split(".");

    // Now, we try to find the specific LG (main group) using its number.
    const targetLg = lgs.find((lg) => lg && lg["@_nr"] === lgNr);
    if (!targetLg || !targetLg["ulg-liste"] || !targetLg["ulg-liste"].ulg) {
        console.warn(`LG ${lgNr} not found or missing ULG list.`);
        return false;
    }

    // We do the same for the ULG (sub-group) within the found LG.
    const ulgs = Array.isArray(targetLg["ulg-liste"].ulg)
        ? targetLg["ulg-liste"].ulg
        : [targetLg["ulg-liste"].ulg];
    const targetUlg = ulgs.find((ulg) => ulg && ulg["@_nr"] === ulgNrSuffix);
    if (
        !targetUlg ||
        !targetUlg.positionen ||
        !targetUlg.positionen.grundtextnr
    ) {
        console.warn(`ULG ${ulgNrFull} not found or missing positionen.`);
        return false;
    }

    // And finally, we find the specific Grundtextnr (base text number) within the ULG.
    const grundtextnrs = Array.isArray(targetUlg.positionen.grundtextnr)
        ? targetUlg.positionen.grundtextnr
        : [targetUlg.positionen.grundtextnr];
    const targetGtNr = grundtextnrs.find((gt) => gt && gt["@_nr"] === gtNr);
    if (!targetGtNr) {
        console.warn(`Grundtextnr ${gtNr} not found under ULG ${ulgNrFull}.`);
        return false;
    }

    let targetPosEigenschaften = null;

    // Now we check the suffix to know if we are updating an "Ungeteilteposition"
    // (a specific type of undivided position) or a "Folgeposition" (a sub-position).
    if (suffix === "U") {
        // If it's an "Ungeteilteposition," we look for its properties.
        if (
            targetGtNr.ungeteilteposition &&
            targetGtNr.ungeteilteposition["pos-eigenschaften"]
        ) {
            targetPosEigenschaften =
                targetGtNr.ungeteilteposition["pos-eigenschaften"];
        } else {
            console.warn(
                `Ungeteilteposition not found for GT ${gtNr} with suffix U.`
            );
            return false;
        }
    } else {
        // If it's a "Folgeposition," we find the correct one based on its suffix (like A, B, etc.).
        if (targetGtNr.folgeposition) {
            const folgePosArray = Array.isArray(targetGtNr.folgeposition)
                ? targetGtNr.folgeposition
                : [targetGtNr.folgeposition];
            const targetFolgePos = folgePosArray.find(
                (fPos) => fPos && fPos["@_ftnr"] === suffix
            );
            if (targetFolgePos && targetFolgePos["pos-eigenschaften"]) {
                targetPosEigenschaften = targetFolgePos["pos-eigenschaften"];
            } else {
                console.warn(
                    `Folgeposition with suffix ${suffix} not found for GT ${gtNr}.`
                );
                return false;
            }
        } else {
            console.warn(`Folgeposition list not found for GT ${gtNr}.`);
            return false;
        }
    }

    // If we successfully found the position's properties, we update them with the new data.
    if (targetPosEigenschaften) {
        targetPosEigenschaften.stichwort = updatedPosition.stichwort;
        targetPosEigenschaften.langtext = updatedPosition.langtextRaw;

        // We also update the unit ("Einheit") and quantity ("lvmenge") if they are provided.
        if (typeof updatedPosition.einheit !== "undefined") {
            targetPosEigenschaften.einheit = updatedPosition.einheit;
        }
        if (typeof updatedPosition.lvmenge !== "undefined") {
            const mengeValue = parseFloat(updatedPosition.lvmenge);
            targetPosEigenschaften.lvmenge = isNaN(mengeValue)
                ? updatedPosition.lvmenge === ""
                    ? ""
                    : updatedPosition.lvmenge
                : mengeValue;
        }

        // If there's a "Grundtext Langtext" (base text long description) to update, we do that too.
        if (
            targetGtNr &&
            typeof updatedPosition.grundtextLangtextRaw !== "undefined"
        ) {
            if (!targetGtNr.grundtext) {
                targetGtNr.grundtext = {};
            }
            targetGtNr.grundtext.langtext =
                updatedPosition.grundtextLangtextRaw;
            console.log(
                "Successfully updated grundtext.langtext for GT:",
                targetGtNr["@_nr"]
            );
        }

        console.log(
            "Successfully updated position in nested data:",
            updatedPosition.id
        );
        return true;
    }

    console.error(
        "Failed to find target pos-eigenschaften for ID:",
        updatedPosition.id
    );
    return false;
};

/**
 * This is a special pop-up window (a "modal") that allows users to edit
 * the details of an existing "position" (a task or item) in the ONLV project.
 *
 * When you click on a position in the main ONLV table, this modal appears,
 * showing you the current details of that position, like its "Stichwort" (keyword),
 * "Einheit" (unit), "Menge" (quantity), and "Langtext" (long description).
 *
 * Users can change these details in the input fields. When they click "Speichern" (Save),
 * the changes are sent back to the main application to update the ONLV data.
 *
 * @param {object} position - The data of the position to be edited. This object contains all the current details.
 * @param {function} onClose - A function that tells the modal to close (e.g., when the user clicks "Abbrechen" or outside the modal).
 * @param {function} onSave - A function that is called when the user clicks "Speichern." It sends the updated position data back.
 */
export const EditPositionModal = ({ position, onClose, onSave }) => {
    console.log("Getting this postions ===> ", position);
    // We get the actual position item from the 'position' prop.
    // This ensures we are working with the correct data, even if the 'position'
    // object has extra information around the core item.
    const actualPositionItem = position.position || position;

    // These are special "state" variables that React uses to keep track of
    // what the user types into the input fields. When these variables change,
    // React automatically updates what you see on the screen.
    const [editedStichwort, setEditedStichwort] = useState(
        actualPositionItem.stichwort || ""
    );
    const [editedEinheit, setEditedEinheit] = useState(
        actualPositionItem.einheit || ""
    );
    const [editedLvMenge, setEditedLvMenge] = useState(
        actualPositionItem.lvmenge !== undefined
            ? String(actualPositionItem.lvmenge)
            : ""
    );

    // This state variable holds the long description ("Langtext") of the position.
    // We try to extract the plain text from the original data, which might be
    // in a complex format, so it can be easily edited in a simple text area.
    const [editedLangtext, setEditedLangtext] = useState(() => {
        if (!actualPositionItem.langtextRaw) return "";
        if (actualPositionItem.langtextRaw.p) {
            const paragraphs = Array.isArray(actualPositionItem.langtextRaw.p)
                ? actualPositionItem.langtextRaw.p
                : [actualPositionItem.langtextRaw.p];
            return paragraphs
                .map((pNode) => {
                    if (typeof pNode === "string") return pNode;
                    if (typeof pNode === "object" && pNode !== null) {
                        return extractBasicText(pNode);
                    }
                    return "";
                })
                .join("\n")
                .trim();
        }
        return extractBasicText(actualPositionItem.langtextRaw);
    });

    // This state variable holds the long description of the "Grundtext" (base text)
    // associated with the position. This is only shown if the position has a parent
    // Grundtext that can be edited.
    const [editedGrundtextLangtext, setEditedGrundtextLangtext] = useState(
        () => {
            if (
                position.grundtextParent &&
                position.grundtextParent.originalData &&
                position.grundtextParent.originalData.grundtext &&
                position.grundtextParent.originalData.grundtext.langtext
            ) {
                const grundtextLangtextNode =
                    position.grundtextParent.originalData.grundtext.langtext;
                if (grundtextLangtextNode.p) {
                    const paragraphs = Array.isArray(grundtextLangtextNode.p)
                        ? grundtextLangtextNode.p
                        : [grundtextLangtextNode.p];
                    return paragraphs
                        .map((pNode) => {
                            if (typeof pNode === "string") return pNode;
                            if (typeof pNode === "object" && pNode !== null) {
                                return extractBasicText(pNode);
                            }
                            return "";
                        })
                        .join("\n")
                        .trim();
                }
                return extractBasicText(grundtextLangtextNode).trim();
            }
            return "";
        }
    );

    // This function is called when the user clicks the "Speichern" (Save) button.
    // It takes all the edited information from the input fields and puts it
    // back into a format that the ONLV data structure understands.
    // It then calls the `onSave` function (which was given to this modal from
    // the main application) to actually save the changes.
    const handleSaveClick = () => {
        // We take the lines from the "Langtext" textarea and turn them back into
        // a format that can be saved in the ONLV data. Each line becomes a `<p>` (paragraph) element.
        // Note: This simple conversion might lose some fancy formatting (like bold text)
        // if the original text had it. For full formatting, a more advanced editor would be needed.
        const lines = editedLangtext.split("\n");
        const pElements = lines;

        let newLangtextRaw;
        if (pElements.length === 0) {
            newLangtextRaw = null;
        } else if (pElements.length === 1) {
            newLangtextRaw = { p: pElements[0] };
        } else {
            newLangtextRaw = { p: pElements };
        }

        // We create an object with all the updated data for the position.
        // We include the original properties of the position and then
        // overwrite them with the new, edited values.
        const saveData = {
            ...actualPositionItem,
            stichwort: editedStichwort,
            langtextRaw: newLangtextRaw,
            einheit: editedEinheit,
            lvmenge: editedLvMenge,
            grundtextLangtextRaw: (() => {
                const lines = editedGrundtextLangtext.split("\n");
                const pElements = lines;
                if (pElements.length === 0) return null;
                if (pElements.length === 1) return { p: pElements[0] };
                return { p: pElements };
            })(),
        };

        // Finally, we call the `onSave` function to send the updated data
        // back to the main application.
        onSave(saveData);
    };

    return (
        <>
            {/* This is the dark overlay that covers the background when the modal is open.
                Clicking on it will close the modal. */}
            <div
                className="fixed inset-0 bg-black bg-opacity-70 z-[999]"
                onClick={onClose}
            ></div>
            {/* This is the main box of our pop-up window (the modal itself).
                It's centered on the screen and has a nice shadow. */}
            <div
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                           bg-gray-800 p-6 rounded-lg shadow-xl z-[1000]
                           w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl text-gray-200
                           flex flex-col max-h-[90vh]"
            >
                {/* The title of the modal, showing which position is being edited. */}
                <h3 className="text-xl font-semibold mb-4 flex-shrink-0">
                    Position {actualPositionItem.nr} bearbeiten
                </h3>

                {/* This is the scrollable area where all the input fields are.
                    If there are many fields, you can scroll down to see them all. */}
                <div className="overflow-y-auto flex-grow space-y-4 pr-2 py-2">
                    {/* Input field for "Stichwort" (Keyword/Short Description) */}
                    <div>
                        <label
                            htmlFor="stichwort"
                            className="block text-sm font-medium text-gray-300 mb-1"
                        >
                            Stichwort:
                        </label>
                        <input
                            id="stichwort"
                            type="text"
                            value={editedStichwort}
                            onChange={(e) => setEditedStichwort(e.target.value)}
                            className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    {/* This section groups the "Menge" (Quantity) and "Einheit" (Unit) inputs
                        so they appear side-by-side. */}
                    <div className="flex space-x-4">
                        {/* Input field for "Menge" (Quantity) */}
                        <div className="flex-1">
                            <label
                                htmlFor="menge"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                Menge:
                            </label>
                            <input
                                id="menge"
                                type="text" // We use "text" type here to allow special values like "n.a." (not applicable)
                                value={editedLvMenge}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // This checks if the input is valid (empty, "n.a.", or a non-negative number)
                                    if (
                                        val === "" ||
                                        val.toLowerCase() === "n.a." ||
                                        (!isNaN(parseFloat(val)) &&
                                            parseFloat(val) >= 0) ||
                                        (val.startsWith("-") &&
                                            !isNaN(
                                                parseFloat(val.substring(1))
                                            ))
                                    ) {
                                        setEditedLvMenge(val);
                                    }
                                }}
                                onBlur={(e) => {
                                    // When the user clicks away from the input, we clean up the value.
                                    let val = e.target.value;
                                    if (val.toLowerCase() === "n.a.") {
                                        setEditedLvMenge("n.a.");
                                    } else if (!isNaN(parseFloat(val))) {
                                        if (parseFloat(val) < 0) {
                                            setEditedLvMenge("0"); // Don't allow negative quantities
                                        } else {
                                            setEditedLvMenge(
                                                String(parseFloat(val))
                                            );
                                        }
                                    } else if (val !== "") {
                                        setEditedLvMenge(""); // Clear if invalid input
                                    }
                                }}
                                className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {/* Dropdown for "Einheit" (Unit) selection */}
                        <div className="flex-1">
                            <label
                                htmlFor="einheit"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                Einheit:
                            </label>
                            <select
                                id="einheit"
                                value={editedEinheit}
                                onChange={(e) =>
                                    setEditedEinheit(e.target.value)
                                }
                                className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            >
                                <option value="">Wählen...</option>
                                {einheitOptions.map((group) => (
                                    <optgroup
                                        label={group.label}
                                        key={group.label}
                                        className="bg-gray-600 text-gray-200"
                                    >
                                        {group.options.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                                className="bg-gray-700 text-gray-200"
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Textarea for "Grundtext Langtext" (Base Text Long Description) */}
                    {/* This is only shown if the position is linked to a "Grundtext" that can be edited. */}
                    {position.grundtextParent && (
                        <div className="flex flex-col flex-grow min-h-[150px]">
                            <label
                                htmlFor="grundtextLangtext"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                Grundtext Langtext (vereinfacht):
                            </label>
                            <textarea
                                id="grundtextLangtext"
                                value={editedGrundtextLangtext}
                                onChange={(e) =>
                                    setEditedGrundtextLangtext(e.target.value)
                                }
                                className="w-full flex-grow p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono whitespace-pre-wrap"
                                rows="6"
                            />
                            <small className="block mt-1 text-xs text-gray-400">
                                Hinweis: Bearbeitung des übergeordneten
                                Grundtext-Langtextes.
                            </small>
                        </div>
                    )}
                    {/* Textarea for "Position Langtext" (Position Long Description) */}
                    <div className="flex flex-col flex-grow min-h-[150px]">
                        <label
                            htmlFor="langtext"
                            className="block text-sm font-medium text-gray-300 mb-1"
                        >
                            Position Langtext (vereinfacht):
                        </label>
                        <textarea
                            id="langtext"
                            value={editedLangtext}
                            onChange={(e) => setEditedLangtext(e.target.value)}
                            className="w-full flex-grow p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono whitespace-pre-wrap"
                            rows="6"
                        />
                        <small className="block mt-1 text-xs text-gray-400">
                            Hinweis: Komplexe Formatierungen (Fett, Listen)
                            gehen bei der Bearbeitung hier verloren.
                        </small>
                    </div>
                </div>

                {/* Action Buttons at the bottom of the modal */}
                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    {/* "Abbrechen" (Cancel) button - closes the modal without saving changes. */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition ease-in-out duration-150"
                    >
                        Abbrechen
                    </button>
                    {/* "Speichern" (Save) button - saves the changes and closes the modal. */}
                    <button
                        type="button"
                        onClick={handleSaveClick}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition ease-in-out duration-150"
                    >
                        Speichern
                    </button>
                </div>
            </div>
        </>
    );
};
