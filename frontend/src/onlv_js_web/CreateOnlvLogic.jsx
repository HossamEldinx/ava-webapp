// This file is the central logic for creating new entries in an ONLV (ÖNORM Leistungsverzeichnis) structure.
// It provides a pop-up window (a "modal") that allows users to input a new ONLV identifier.
//
// The main purpose of this file is to:
// 1.  Provide a user interface (the `CreateNewEntryModal` component) for creating new ONLV items.
// 2.  Intelligently guess the next logical position number based on where the user chose to add a new item.
// 3.  Validate the user's input in real-time to ensure it follows the strict ONLV identifier format (e.g., "991001A").
// 4.  Detect and display every change the user makes to the identifier, explaining what part of the structure is being changed (e.g., "LG changed from 99 to 98").
// 5.  Prevent users from creating an entry with an identifier that is already reserved or exists in the current project.
// 6.  Manage the entire process of creating and saving the new entry through a custom hook (`useCreateNewEntryModalManager`), which keeps the logic separate and reusable.
//
// Think of this file as the "brain" behind the "Add New Entry" button. It handles all the complex rules
// of ONLV identifiers so that the user has a guided and error-free experience.

import React, { useState, useCallback, useEffect } from "react"; // Import useEffect
import { FaTimes } from "react-icons/fa"; // Import FaTimes for close button
import {
    generateNextNr,
    structureLgsUlgsPositions,
} from "../onlv/OnlvUtils.jsx"; // Import the new utility functions
import { isCodeInNrlist } from "../onlb/OnlbUtils.jsx"; // Import the nrlist checking function
import CreateOnlvChangeDetector, {
    validateIdentifier,
    parseIdentifier,
    detectChanges,
    generateChangeSummary,
} from "../onlv/CreateOnlvChangeDetector.js"; // Import change detection logic

// Helper function to convert a dot-less NR string to a dot-ful NR string
// Assumes numeric parts are typically in segments of 2, read from right to left.
// e.g., "991001C" -> "99.10.01C"; "12345" -> "1.23.45"
const addDotsToNr = (dotlessNr) => {
    if (!dotlessNr) return "";
    let letterSuffix = "";
    let numericPart = String(dotlessNr);

    // Check for and separate a trailing letter
    if (/[a-zA-Z]$/.test(numericPart)) {
        letterSuffix = numericPart.slice(-1);
        numericPart = numericPart.slice(0, -1);
    }

    if (!numericPart) return letterSuffix; // Only a letter, or empty after stripping letter

    const segments = [];
    for (let i = numericPart.length; i > 0; i -= 2) {
        segments.unshift(numericPart.substring(Math.max(0, i - 2), i));
    }
    return segments.join(".") + letterSuffix;
};

// Define the standard order for change types
const CHANGE_TYPE_ORDER = [
    "lg",
    "ulg",
    "position",
    "ungeteilteposition",
    "folgeposition",
];

// Helper function to clean and sort session change types
// Ensures "ungeteilteposition" and "folgeposition" are mutually exclusive
// based on the current event's position type.
const getCleanedAndSortedSessionTypes = (baseTypes, currentEventTypes) => {
    // Start with all types from base (previous session) and current event
    let workingTypes = new Set([...baseTypes, ...currentEventTypes]);

    const eventHasFolge = currentEventTypes.includes("folgeposition");
    const eventHasUngeteilt = currentEventTypes.includes("ungeteilteposition");

    // If current event introduces/confirms "folgeposition", remove "ungeteilteposition"
    if (eventHasFolge) {
        workingTypes.delete("ungeteilteposition");
    }
    // Else if current event introduces/confirms "ungeteilteposition", remove "folgeposition"
    else if (eventHasUngeteilt) {
        workingTypes.delete("folgeposition");
    }
    // If the current event has neither position type, any existing position type from baseTypes is preserved.
    // Since baseTypes should also be clean from previous applications of this logic,
    // workingTypes should now correctly reflect at most one of "folgeposition" or "ungeteilteposition".

    let finalTypesArray = Array.from(workingTypes);

    // Sort finalTypesArray according to the defined order
    finalTypesArray.sort((a, b) => {
        const indexA = CHANGE_TYPE_ORDER.indexOf(a);
        const indexB = CHANGE_TYPE_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0; // Both not in order, keep relative order
        if (indexA === -1) return 1; // a is not in order, sort b first
        if (indexB === -1) return -1; // b is not in order, sort a first
        return indexA - indexB;
    });

    return finalTypesArray;
};

// Helper function to determine the type of change based on ONLV identifier components
const determineChangedType = (changedComponents, currentIdentifierParsed) => {
    const types = []; // Initialize an array to hold all detected change types

    // Ensure changedComponents is an array and not empty
    if (!Array.isArray(changedComponents) || changedComponents.length === 0) {
        return types; // Return empty array if no components changed or invalid input
    }

    // Check for LG change
    if (changedComponents.includes("lg")) {
        types.push("lg");
    }

    // Check for ULG change
    if (changedComponents.includes("ulg")) {
        types.push("ulg");
    }

    // Check for Grundtextnr or FTNR change
    // These are grouped because they both relate to the "position" part of the identifier,
    // but are distinguished by the presence of an FTNR.
    if (
        changedComponents.includes("grundtextnr") ||
        changedComponents.includes("ftnr")
    ) {
        // If either grundtextnr or ftnr (or both) changed, determine if it's folge or ungeteilt
        if (currentIdentifierParsed && currentIdentifierParsed.ftnr) {
            // If an FTNR is present in the *current* identifier, it's a folgeposition change
            // We add "folgeposition" even if only grundtextnr changed but ftnr was already there and unchanged.
            // Or if ftnr itself changed.
            if (!types.includes("folgeposition")) {
                // Avoid duplicates if both ftnr and grundtextnr changed
                types.push("folgeposition");
            }
        } else {
            // If no FTNR is present in the *current* identifier, it's an ungeteilteposition change
            if (!types.includes("ungeteilteposition")) {
                // Avoid duplicates
                types.push("ungeteilteposition");
            }
        }
    }

    // Special case: if we only have LG and ULG but no position, and the identifier suggests
    // we're creating a new ULG (e.g., "9910" -> LG=99, ULG=10), then add "position" type
    // to trigger position creation after ULG creation
    if (
        types.includes("ulg") &&
        !types.includes("folgeposition") &&
        !types.includes("ungeteilteposition")
    ) {
        // Check if the identifier only has LG and ULG parts (no position part)
        if (
            currentIdentifierParsed &&
            currentIdentifierParsed.lg &&
            currentIdentifierParsed.ulg &&
            !currentIdentifierParsed.grundtextnr
        ) {
            types.push("position"); // Add position type to create a position after ULG
        }
    }

    // Remove duplicates that might arise if, for example, ftnr was added (ftnr changed)
    // and this logic also flags it as a grundtextnr change.
    // A Set automatically handles uniqueness.
    return Array.from(new Set(types));
};

// Modal Component for creating a new entry
const CreateNewEntryModal = ({
    onClose,
    onSave,
    initialPositionInfo,
    flatData,
}) => {
    // Initialize inputValue with initialPositionInfo if available, otherwise empty string
    const [inputValue, setInputValue] = useState("");
    const [nrExistsMessage, setNrExistsMessage] = useState(null); // State for NR existence warning

    // State for change detection
    const [changeInfo, setChangeInfo] = useState(null);
    const [validationInfo, setValidationInfo] = useState(null);
    const [previousValue, setPreviousValue] = useState("");
    const [changeHistory, setChangeHistory] = useState([]); // Store all changes
    const [cumulativeChanges, setCumulativeChanges] = useState({}); // Track all components that have changed
    const [sessionCumulativeChangeTypes, setSessionCumulativeChangeTypes] =
        useState([]); // Track all types of changes in the session
    const [sessionChangeValues, setSessionChangeValues] = useState([]); // NEW: Track actual string values of changes in the session
    const [
        loggedSessionCumulativeChangeTypes,
        setLoggedSessionCumulativeChangeTypes,
    ] = useState([]); // NEW: Store the exact array used for logging cumulative change types

    // Use useEffect to set inputValue when initialPositionInfo changes
    useEffect(() => {
        // Reset session-specific change tracking when initial info changes (new session)
        setSessionCumulativeChangeTypes([]);
        setSessionChangeValues([]); // Reset new state
        setLoggedSessionCumulativeChangeTypes([]); // Reset new state for logged types
        setChangeInfo(null);
        setChangeHistory([]);
        setCumulativeChanges({});
        let nrToIncrement = null;
        let determinedDotlessValue = ""; // Variable to hold the determined initial NR for the modal

        if (initialPositionInfo) {
            // Check if it's a processed info object from extractPositionInfo
            // These objects have an 'isUlg' property.
            if (typeof initialPositionInfo.isUlg !== "undefined") {
                if (initialPositionInfo.isUlg) {
                    // If it's a ULG, we want to increment the last position within it.
                    // If there are no child positions yet, we start with the ULG's number
                    // and generate the first child (e.g., 99.10.01 or 99.10.A)
                    nrToIncrement =
                        initialPositionInfo.lastPositionNr ||
                        initialPositionInfo.ulgNr;
                } else {
                    // For non-ULG items from extractPositionInfo, the number is in 'grundtextnr'
                    nrToIncrement = initialPositionInfo.grundtextnr;
                }
            } else if (initialPositionInfo.nr) {
                // If 'isUlg' is not defined, it's likely a raw flatData item (e.g., from lastPositionInfo)
                // These raw items have a direct 'nr' property.
                nrToIncrement = initialPositionInfo.nr;
            }
        }

        if (nrToIncrement) {
            const nextGeneratedNrWithDots = generateNextNr(nrToIncrement);
            determinedDotlessValue = nextGeneratedNrWithDots.replace(/\./g, "");
            // setInputValue and setPreviousValue will be called after all branches
        } else {
            // If no relevant NR found, or no initialPositionInfo, default to "1"
            // or if initialPositionInfo is a ULG with no children, start with ULG.01
            if (
                initialPositionInfo?.isUlg &&
                !initialPositionInfo?.lastPositionNr
            ) {
                // If ULG is selected and has no children, start with ULG.01
                const nextGeneratedNrWithDots = generateNextNr(
                    `${initialPositionInfo.ulgNr}.00`
                ); // Generate 99.10.01
                determinedDotlessValue = nextGeneratedNrWithDots.replace(
                    /\./g,
                    ""
                );
                // setInputValue and setPreviousValue will be called after all branches
            } else {
                const nextGeneratedNrWithDots = generateNextNr("0"); // Default for no context
                determinedDotlessValue = nextGeneratedNrWithDots.replace(
                    /\./g,
                    ""
                );
                // setInputValue and setPreviousValue will be called after all branches
            }
        }

        // Set the input value and previous value based on the determined initial NR
        setInputValue(determinedDotlessValue);
        setPreviousValue(determinedDotlessValue);

        // NEW LOGIC: Parse the determinedDotlessValue and set session states for the initial position.
        // This captures the "position" part (grundtextnr + ftnr) of the initially generated/provided NR
        // and its type (folgeposition or ungeteilteposition) right when the modal opens.
        if (determinedDotlessValue) {
            const parsedInitialNr = parseIdentifier(determinedDotlessValue);
            // Ensure parsing was successful and we have a grundtextnr, which defines a "position"
            if (parsedInitialNr && parsedInitialNr.grundtextnr) {
                let positionValue = parsedInitialNr.grundtextnr;
                if (parsedInitialNr.ftnr) {
                    positionValue += parsedInitialNr.ftnr;
                }

                const positionType = parsedInitialNr.ftnr
                    ? "folgeposition"
                    : "ungeteilteposition";

                // Set these states to reflect the initial position's details.
                // These states are arrays, and here we are setting the initial single value.
                setSessionChangeValues([positionValue]);
                setLoggedSessionCumulativeChangeTypes([positionType]);
            }
            // If determinedDotlessValue does not contain a grundtextnr (e.g., it's just an LG "99" or LG+ULG "9910"),
            // sessionChangeValues and loggedSessionCumulativeChangeTypes will remain empty as per the reset
            // at the beginning of this useEffect. This is the desired behavior as there's no "position" part to log.
        }
    }, [initialPositionInfo]); // Re-run when initialPositionInfo changes

    // useEffect to log sessionChangeValues and loggedSessionCumulativeChangeTypes when they change
    useEffect(() => {
        console.log(
            "CreateNewEntryModal: sessionChangeValues updated:",
            sessionChangeValues
        );
        console.log(
            "CreateNewEntryModal: loggedSessionCumulativeChangeTypes updated:",
            loggedSessionCumulativeChangeTypes
        );
    }, [sessionChangeValues, loggedSessionCumulativeChangeTypes]);

    // Callback to check if the NR already exists or is reserved
    const checkNrExists = useCallback(
        (currentNrValue) => {
            if (!currentNrValue) {
                setNrExistsMessage(null);
                return false;
            }

            const dotlessInputNr = String(currentNrValue)
                .replace(/\./g, "")
                .trim();

            // Convert to dotful format for display purposes
            const dotfulInputNr = addDotsToNr(dotlessInputNr);

            // First, check if the position is reserved in the nrlist
            // The nrlist contains dotless entries, so we check the dotless format
            if (isCodeInNrlist(dotlessInputNr)) {
                setNrExistsMessage(
                    `Warnung: Position "${dotfulInputNr}" ist reserviert und kann nicht verwendet werden.`
                );
                return true;
            }

            // Then check if it exists in current flatData (only if flatData is available)
            if (flatData && flatData.length > 0) {
                const structuredNrs = structureLgsUlgsPositions(flatData);

                for (const lg of structuredNrs) {
                    for (const ulg of lg.ulgs) {
                        const dotlessUlgNr = String(ulg.ulgNr)
                            .replace(/\./g, "")
                            .trim();
                        for (const posNr of ulg.positions) {
                            // posNr is already simplified, e.g., "01A" or "20"
                            const fullExistingNr =
                                dotlessUlgNr + String(posNr).trim();
                            if (fullExistingNr === dotlessInputNr) {
                                setNrExistsMessage(
                                    `Warnung: NR "${dotfulInputNr}" existiert bereits.`
                                );
                                return true;
                            }
                        }
                    }
                }
            }

            setNrExistsMessage(null);
            return false;
        },
        [flatData]
    );

    // Effect to check NR existence when inputValue changes or flatData changes
    useEffect(() => {
        if (inputValue) {
            checkNrExists(inputValue);
        } else {
            setNrExistsMessage(null); // Clear message if input is empty
        }
    }, [inputValue, flatData, checkNrExists]);

    // Handle input changes with change detection
    const handleInputChange = useCallback(
        (newValue) => {
            setInputValue(newValue);
            // NR existence check is now handled by the useEffect hook listening to inputValue

            // Validate the new input
            const validation = validateIdentifier(newValue);
            setValidationInfo(validation);

            // If we have a previous value and the new value is valid, detect changes
            if (
                previousValue &&
                validation.isValid &&
                newValue !== previousValue &&
                newValue.trim() !== "" &&
                previousValue.trim() !== ""
            ) {
                const changes = detectChanges(previousValue, newValue);
                const summary = generateChangeSummary(changes);

                // Parse the new value to pass to determineChangedType
                const parsedNewValue = parseIdentifier(newValue);
                // Determine the type of change for the current event
                const currentEventChangeTypes = determineChangedType(
                    changes.changedComponents,
                    parsedNewValue
                );

                // Update session cumulative change types using the helper function
                setSessionCumulativeChangeTypes((prevSessionTypes) => {
                    return getCleanedAndSortedSessionTypes(
                        prevSessionTypes,
                        currentEventChangeTypes
                    );
                });

                // Update cumulative changes - track all components that have changed during this session
                setCumulativeChanges((prev) => {
                    const updated = { ...prev };

                    // For each component that changed in this step, update the cumulative record
                    changes.changedComponents.forEach((component) => {
                        if (!updated[component]) {
                            // First time this component changed
                            updated[component] = {
                                originalValue: changes.changes[component].from,
                                currentValue: changes.changes[component].to,
                                changeCount: 1,
                                firstChanged: new Date().toISOString(),
                                // Potentially add changedtype here if needed for cumulative,
                                // but it's more specific to the event.
                                // For now, keeping it out of cumulative per-component state.
                            };
                        } else {
                            // Component changed again, update current value and increment count
                            updated[component] = {
                                ...updated[component],
                                currentValue: changes.changes[component].to,
                                changeCount: updated[component].changeCount + 1,
                                lastChanged: new Date().toISOString(),
                            };
                        }
                    });

                    return updated;
                });

                // Add to change history - THIS BLOCK WAS DUPLICATED AND IS BEING REMOVED
                // setChangeHistory((prev) => [
                //     ...prev,
                //     {
                //         timestamp: new Date().toISOString(),
                //         from: previousValue,
                //         to: newValue,
                //         changes: changes.changedComponents,
                //         summary,
                //         changedtype: determinedChangedType, // This was the old variable name
                //     },
                // ]);

                // This setChangeInfo call was also part of the duplicated/old logic
                // setChangeInfo({
                //     ...changes,
                //     summary,
                //     previousIdentifier: previousValue,
                //     currentIdentifier: newValue,
                //     // changeInfo.changedtype will now reflect the session's cumulative, ordered types
                //     // We access sessionCumulativeChangeTypes directly in the next render cycle via changeInfo,
                //     // but for immediate logging and history, we use the updated value.
                //     // To ensure the console.log and history get the *updated* session types,
                //     // we'll use a slightly different approach for setting changeInfo.
                // });

                // For changeHistory, store the types specific to THIS event
                setChangeHistory((prev) => [
                    ...prev,
                    {
                        timestamp: new Date().toISOString(),
                        from: previousValue,
                        to: newValue,
                        changes: changes.changedComponents,
                        summary,
                        changedtype: currentEventChangeTypes, // Corrected: Types for this specific event
                    },
                ]);

                // For changeInfo, it should reflect the overall session state.
                // We'll update it in a useEffect or ensure the logger uses the state value
                // that will be updated in the next render.
                // For immediate logging, re-calculate the session cumulative types
                // using the same helper function to ensure the log is accurate and clean.
                // We use `sessionCumulativeChangeTypes` (from previous render state) as the base.
                const finalCumulativeChangeTypesForLog =
                    getCleanedAndSortedSessionTypes(
                        sessionCumulativeChangeTypes, // This is the state from the previous render
                        currentEventChangeTypes
                    );

                // NEW: Extract actual string values for the detected change types
                // 'parsedNewValue' holds the component parts (lg, ulg, grundtextnr, ftnr) of the current input 'newValue'.
                // 'finalCumulativeChangeTypesForLog' lists the types of changes that occurred (e.g., "lg", "ulg").
                const changeValuesForLog = finalCumulativeChangeTypesForLog
                    .map((type) => {
                        let value = "";
                        switch (type) {
                            case "lg":
                                // LG (Leistungsgruppe) is typically the first segment of the identifier.
                                value = parsedNewValue.lg || "";
                                break;
                            case "ulg":
                                // ULG (Unterleistungsgruppe) is typically the second segment.
                                value = parsedNewValue.ulg || "";
                                break;
                            case "ungeteilteposition":
                            case "folgeposition":
                                // Position is formed by 'grundtextnr' (main position number)
                                // and 'ftnr' (an optional suffix, often a letter for Folgepositionen).
                                value = parsedNewValue.grundtextnr || "";
                                if (parsedNewValue.ftnr) {
                                    value += parsedNewValue.ftnr;
                                }
                                break;
                            default:
                                // This case is a fallback for any unexpected change types.
                                // It helps in debugging if new or unhandled types appear.
                                console.warn(
                                    `Unknown change type encountered for value extraction: ${type}`
                                );
                                break;
                        }
                        return value;
                    })
                    .filter((v) => v !== ""); // Remove any empty strings, ensuring only actual values are logged.

                // Update the new state with the extracted change values
                setSessionChangeValues(changeValuesForLog);

                // Update the new state for logged cumulative change types
                setLoggedSessionCumulativeChangeTypes(
                    finalCumulativeChangeTypesForLog
                );

                setChangeInfo({
                    ...changes,
                    summary,
                    previousIdentifier: previousValue,
                    currentIdentifier: newValue,
                    // changeInfo.changedtype will now reflect the session's cumulative, ordered types
                    // We access sessionCumulativeChangeTypes directly in the next render cycle via changeInfo,
                    // but for immediate logging and history, we use the updated value.
                    // To ensure the console.log and history get the *updated* session types,
                    // we'll use a slightly different approach for setting changeInfo.
                });

                console.log("Change detected:", {
                    from: previousValue,
                    to: newValue,
                    changes,
                    summary,
                    eventChangeTypes: currentEventChangeTypes, // Log types for this specific event
                    changeTypeArray: finalCumulativeChangeTypesForLog, // Use the cleaned and sorted version
                    changeValuesArray: changeValuesForLog, // ADDED: Log the array of actual changed values
                    cumulativeChanges: cumulativeChanges, // This is about component values, not types
                    allChangesInSession: Object.keys(cumulativeChanges).map(
                        (component) => ({
                            component: component.toUpperCase(),
                            from: cumulativeChanges[component].originalValue,
                            to: cumulativeChanges[component].currentValue,
                            changeCount:
                                cumulativeChanges[component].changeCount,
                        })
                    ),
                });
            } else if (
                !previousValue &&
                validation.isValid &&
                newValue.trim() !== ""
            ) {
                // Set initial value without change detection
                console.log("Initial identifier set:", newValue);
                setChangeInfo(null);
                // Reset cumulative changes and types for new session
                setCumulativeChanges({});
                setChangeHistory([]);
                setSessionCumulativeChangeTypes([]); // Reset session types
                // setSessionChangeValues([]); // This was already correctly placed by the previous partial application.
                setLoggedSessionCumulativeChangeTypes([]); // Reset new state for logged types
            } else {
                // If not a valid change detection scenario (e.g., invalid input, no actual change)
                // but the input is now empty, we might want to reset session types.
                if (newValue.trim() === "" && previousValue.trim() !== "") {
                    setSessionCumulativeChangeTypes([]);
                    // setSessionChangeValues([]); // This was already correctly placed by the previous partial application.
                    setLoggedSessionCumulativeChangeTypes([]); // Reset new state for logged types
                }
                setChangeInfo(null);
            }

            // Always update previous value for next comparison if valid
            if (validation.isValid && newValue.trim() !== "") {
                setPreviousValue(newValue);
            }
        },
        [previousValue, cumulativeChanges, sessionCumulativeChangeTypes] // Add sessionCumulativeChangeTypes to dependencies
    );

    // Effect to update changeInfo when sessionCumulativeChangeTypes actually changes
    // This ensures changeInfo.changedtype is correctly reflecting the session state
    // for UI rendering purposes if it relies on changeInfo.
    useEffect(() => {
        if (changeInfo) {
            // Only update if changeInfo is already populated
            setChangeInfo((prevChangeInfo) => ({
                ...prevChangeInfo,
                changedtype: sessionCumulativeChangeTypes,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionCumulativeChangeTypes]);

    const handleSave = () => {
        const trimmedValue = inputValue.trim(); // This is the dot-less value from input

        if (!trimmedValue) {
            alert("Bitte geben Sie einen Wert ein.");
            return;
        }

        // Validate the identifier before saving
        const validation = validateIdentifier(trimmedValue);
        if (!validation.isValid) {
            alert(`Ungültiger Identifier:\n${validation.errors.join("\n")}`);
            return;
        }

        // Parse the identifier to get structure information
        const parsed = parseIdentifier(trimmedValue);
        if (!parsed) {
            alert("Fehler beim Parsen des Identifiers.");
            return;
        }

        // Log the change detection results if available
        if (changeInfo && changeInfo.hasChanges) {
            console.log("Saving identifier with detected changes:", {
                identifier: trimmedValue,
                parsed,
                changes: changeInfo,
                loggedSessionCumulativeChangeTypes, // Log these as well
                sessionChangeValues,
            });
        }

        // Convert the (potentially edited) dot-less value back to dot-ful for saving
        const dotfulNrToSave = addDotsToNr(trimmedValue);

        // Pass an object including the nr, change types, and change values
        onSave({
            nr: dotfulNrToSave,
            changeTypes: loggedSessionCumulativeChangeTypes,
            changeValues: sessionChangeValues,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full relative text-gray-100">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <h2 className="text-xl font-semibold text-indigo-600">
                        Neuen Eintrag Erstellen
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-indigo-600"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="mb-4">
                    <label
                        htmlFor="newEntryInput"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Identifier (Format: [LG][ULG][Grundtextnr][FTNR])
                    </label>
                    <input
                        id="newEntryInput"
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="z.B. 991090A oder 9910 oder 99"
                        className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 bg-gray-800 text-gray-100 ${
                            validationInfo?.isValid === false
                                ? "border-red-600 focus:ring-red-600"
                                : validationInfo?.isValid === true
                                ? "border-green-600 focus:ring-green-600"
                                : "border-gray-600 focus:ring-indigo-600"
                        }`}
                    />

                    {/* Validation feedback */}
                    {validationInfo && !validationInfo.isValid && (
                        <div className="mt-2 text-sm text-red-600">
                            <ul className="list-disc list-inside">
                                {validationInfo.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* NR Exists Message */}
                    {nrExistsMessage && (
                        <div className="mt-2 text-sm text-gray-300 bg-gray-800 bg-opacity-50 p-2 rounded-md">
                            {nrExistsMessage}
                        </div>
                    )}

                    {/* Change detection feedback */}
                    {(changeInfo && changeInfo.hasChanges) ||
                        (Object.keys(cumulativeChanges).length > 0 && (
                            <div className="mt-2 p-3 bg-indigo-900 border border-indigo-700 rounded-md">
                                {changeInfo && changeInfo.hasChanges && (
                                    <>
                                        <div className="text-sm text-indigo-300 font-medium mb-2">
                                            Letzte Änderung:
                                        </div>
                                        <div className="text-xs text-indigo-400 mb-3">
                                            {changeInfo.summary}
                                        </div>
                                    </>
                                )}

                                {Object.keys(cumulativeChanges).length > 0 && (
                                    <div className="text-sm text-indigo-300 font-medium mb-2">
                                        Alle Änderungen in dieser Sitzung:
                                    </div>
                                )}

                                {Object.keys(cumulativeChanges).length > 0 && (
                                    <div className="text-xs text-indigo-400">
                                        <ul className="list-disc list-inside ml-2">
                                            {Object.entries(
                                                cumulativeChanges
                                            ).map(([component, info]) => (
                                                <li key={component}>
                                                    <strong>
                                                        {component.toUpperCase()}
                                                        :
                                                    </strong>{" "}
                                                    {info.originalValue ||
                                                        "null"}{" "}
                                                    →{" "}
                                                    {info.currentValue ||
                                                        "null"}
                                                    {info.changeCount > 1 && (
                                                        <span className="text-gray-400 ml-1">
                                                            ({info.changeCount}x
                                                            geändert)
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {changeHistory.length > 1 && (
                                    <div className="mt-2 pt-2 border-t border-indigo-700">
                                        <div className="text-xs text-indigo-300 mb-1">
                                            Änderungsverlauf (
                                            {changeHistory.length} Schritte):
                                        </div>
                                        <div className="text-xs text-indigo-400 max-h-20 overflow-y-auto">
                                            {changeHistory
                                                .slice(-3)
                                                .map((entry, index) => (
                                                    <div
                                                        key={index}
                                                        className="mb-1"
                                                    >
                                                        {entry.from} →{" "}
                                                        {entry.to} (
                                                        {entry.changes.join(
                                                            ", "
                                                        )}
                                                        )
                                                    </div>
                                                ))}
                                            {changeHistory.length > 3 && (
                                                <div className="text-indigo-300">
                                                    ... und{" "}
                                                    {changeHistory.length - 3}{" "}
                                                    weitere
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={handleSave}
                        className={`bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 ${
                            nrExistsMessage
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                        }`}
                        disabled={!!nrExistsMessage} // Disable save if NR exists
                    >
                        Speichern
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
};

// Custom Hook for managing the new entry modal
const useCreateNewEntryModalManager = (
    parsedData,
    setHookParsedData,
    setHookFlatData,
    setTableData,
    flatData, // Add flatData as a parameter
    onChangesCommitted // New callback parameter for when changes are finalized with the save
) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [initialPositionData, setInitialPositionData] = useState(null); // New state to hold initial data
    const [changeDetector] = useState(() => new CreateOnlvChangeDetector()); // Initialize change detector
    const [changeHistory, setChangeHistory] = useState([]); // Track change history

    // useEffect to log structured data when flatData changes
    useEffect(() => {
        if (flatData && flatData.length > 0) {
            const structuredData = structureLgsUlgsPositions(flatData);
            console.log(
                "Structured LGs/ULGs/Positions (from CreateOnlvLogic):",
                structuredData
            );
        }
    }, [flatData]); // Dependency array includes flatData

    const openCreateModal = useCallback((initialData = null) => {
        setInitialPositionData(initialData); // Set the initial data
        setIsCreateModalOpen(true);
    }, []);

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false);
    }, []);

    const handleCreateSave = useCallback(
        // Expect an object: { nr, changeTypes, changeValues }
        ({ nr, changeTypes, changeValues }) => {
            console.log("CreateOnlvLogic: handleCreateSave called with:", {
                nr,
                changeTypes,
                changeValues,
            }); // Log entry into function
            if (!parsedData) {
                console.error("Cannot add new entry: parsedData is null.");
                return;
            }

            // Validate and analyze the identifier using change detection logic
            const validation = validateIdentifier(nr.replace(/\./g, ""));
            if (!validation.isValid) {
                console.error("Invalid identifier:", validation.errors);
                alert(
                    `Ungültiger Identifier:\n${validation.errors.join("\n")}`
                );
                return;
            }

            // Parse the identifier to understand its structure
            const parsedIdentifier = parseIdentifier(nr.replace(/\./g, ""));
            if (!parsedIdentifier) {
                console.error("Failed to parse identifier:", nr);
                return;
            }

            // Set the identifier in the change detector for tracking
            const detectorResult = changeDetector.setIdentifier(
                nr.replace(/\./g, ""),
                true
            );

            // Add to change history
            if (detectorResult.changes) {
                setChangeHistory((prev) => [
                    ...prev,
                    {
                        timestamp: new Date().toISOString(),
                        identifier: nr,
                        parsed: parsedIdentifier,
                        changes: detectorResult.changes,
                        summary: detectorResult.summary,
                    },
                ]);
            }

            console.log("Creating entry with identifier analysis:", {
                identifier: nr,
                parsed: parsedIdentifier,
                validation,
                detectorResult,
            });

            // Generate a unique ID for the new entry
            const newId = `new-entry-${Date.now()}`;

            // Determine entry type based on identifier structure
            let entryType = "LG"; // Default
            if (
                parsedIdentifier.lg &&
                parsedIdentifier.ulg &&
                parsedIdentifier.grundtextnr
            ) {
                entryType = parsedIdentifier.ftnr
                    ? "Folgeposition"
                    : "Position";
            } else if (parsedIdentifier.lg && parsedIdentifier.grundtextnr) {
                entryType = "Position";
            } else if (parsedIdentifier.grundtextnr) {
                entryType = "Grundtext";
            }

            // Create a basic new position object
            const newEntry = {
                id: newId,
                nr: nr, // Use the NR from the modal input (which is now part of the destructured object)
                type: entryType,
                stichwort: `${entryType} ${nr}`,
                langtext: { p: [] },
                mfv: "",
                herkunftskennzeichen: "Z",
                lvmenge: "n.a.",
                einheit: "",
                pzzv: { normalposition: {} },
                leistungsteil: 1,
                vorbemerkungskennzeichen: "",
                wesentlicheposition: "",
            };

            const newOnlvData = JSON.parse(JSON.stringify(parsedData));
            let positionsArray = null;
            if (
                newOnlvData["ausschreibungs-lv"] &&
                newOnlvData["ausschreibungs-lv"].positionen
            ) {
                positionsArray = newOnlvData["ausschreibungs-lv"].positionen;
            } else if (
                newOnlvData.onlv &&
                newOnlvData.onlv["ausschreibungs-lv"] &&
                newOnlvData.onlv["ausschreibungs-lv"].positionen
            ) {
                positionsArray =
                    newOnlvData.onlv["ausschreibungs-lv"].positionen;
            }

            if (positionsArray) {
                if (!Array.isArray(positionsArray)) {
                    newOnlvData["ausschreibungs-lv"].positionen = [
                        positionsArray,
                    ];
                    positionsArray =
                        newOnlvData["ausschreibungs-lv"].positionen;
                }
                positionsArray.push(newEntry);
                console.log("New entry added to parsedData:", newEntry);
            } else {
                console.warn(
                    "Could not find 'positionen' array in parsedData to add new entry."
                );
                if (newOnlvData["ausschreibungs-lv"]) {
                    newOnlvData["ausschreibungs-lv"].positionen = [newEntry];
                } else if (
                    newOnlvData.onlv &&
                    newOnlvData.onlv["ausschreibungs-lv"]
                ) {
                    newOnlvData.onlv["ausschreibungs-lv"].positionen = [
                        newEntry,
                    ];
                } else {
                    console.error(
                        "Unable to find or create 'ausschreibungs-lv' structure for new entry."
                    );
                    return;
                }
            }

            if (newOnlvData.metadaten) {
                newOnlvData.metadaten.erstelltam = new Date().toISOString();
            }

            setHookParsedData(newOnlvData);
            setHookFlatData((prevFlatData) => {
                const searchableText = newEntry.stichwort?.toLowerCase() || "";
                return [...prevFlatData, { ...newEntry, searchableText }];
            });
            setTableData((current) => ({
                ...current,
                data: newOnlvData,
            }));

            console.log("New entry saved successfully:", newEntry);

            // After all existing save logic is done, call the callback to handle committed changes
            if (onChangesCommitted) {
                console.log(
                    "CreateOnlvLogic: About to call onChangesCommitted with:",
                    {
                        changeTypes,
                        changeValues,
                        initialPositionData, // Log this value
                        originalIdentifier: nr, // Log the original identifier
                    }
                );
                // Pass initialPositionData as the third argument and add originalIdentifier
                const enhancedInitialPositionData = {
                    ...initialPositionData,
                    originalIdentifier: nr, // Add the original identifier to the data
                };
                onChangesCommitted(
                    changeTypes,
                    changeValues,
                    enhancedInitialPositionData
                );
            }
        },
        [
            parsedData,
            setHookParsedData,
            setHookFlatData,
            setTableData,
            changeDetector, // Ensure changeDetector is in dependencies if used for more than init
            onChangesCommitted, // Add the new callback to dependencies
            initialPositionData, // Add initialPositionData to dependencies
        ]
    );

    return {
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
        handleCreateSave,
        initialPositionData, // Return initialPositionData
        // Change detection utilities
        changeDetector,
        changeHistory,
        clearChangeHistory: () => setChangeHistory([]),
        validateIdentifier,
        parseIdentifier,
        detectChanges,
    };
};

export { CreateNewEntryModal, useCreateNewEntryModalManager };
