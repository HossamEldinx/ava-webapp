// This file contains special functions called "hooks" that help manage the data
// and actions for the `ChangeBasedModal.jsx` pop-up window.
// Think of these hooks as the "brain" behind the modal's forms. They handle:
// 1. Storing all the information the user types into the different forms (like LG, ULG, Position, etc.).
// 2. Updating this information as the user types or makes selections.
// 3. Preparing the data in the correct format so it can be saved back to the main ONLV project.
// 4. Deciding what happens when the "Save & Proceed" button is clicked, including saving the data
//    and sometimes opening another pop-up window for the next step.

// These hooks make sure the modal works smoothly by keeping track of its internal state
// and providing ways to interact with it, without making the main `ChangeBasedModal.jsx` file too complicated.

import { useEffect, useState } from "react"; // We need these from React to manage data that changes over time.
import {
    addPositionToOnlv, // This function helps add a new "Position" (like a task) to our project data.
    addFolgepositionToOnlvStructure, // This function helps add a "Folgeposition" (a sub-task or variation) to an existing "Grundtext" (base task).
    addUlgToOnlv, // This function helps add a "ULG" (sub-group of services) to our project data.
    addLgToOnlv, // This function helps add an "LG" (main group of services) to our project data.
} from "../../onlv_js_web/OnlvPositionManager.js"; // These functions come from a file that manages how we add things to our ONLV project.
import {
    transformFolgepositionToNewPosition, // This function changes "Folgeposition" data into a format that can be saved as a new "Grundtext" position.
    transformToStandalonePosition, // This function changes data into a format for a "Standalone Position" (a task that stands on its own).
    transformUngeteiltepositionToNewPosition, // This function changes "Ungeteilte Position" data into a format that can be saved.
    transformUlgToNewUlg, // This function changes "ULG" data into a format that can be saved as a new ULG.
    transformLgToNewLg, // This function changes "LG" data into a format that can be saved as a new LG.
} from "./ChangeBasedModal.utils.js"; // These functions help us change the form data into the correct structure for our project.
import {
    createFolgepositionFormData, // This function gives us the starting data structure for a "Folgeposition" form.
    createStandalonePositionFormData, // This function gives us the starting data structure for a "Standalone Position" form.
    createUngeteiltepositionFormData, // This function gives us the starting data structure for an "Ungeteilte Position" form.
    createUlgFormData, // This function gives us the starting data structure for a "ULG" form.
    createLgFormData, // This function gives us the starting data structure for an "LG" form.
} from "./ChangeBasedModal.constants.js"; // These functions provide the initial, empty data structures for our different forms.

// This is our main "hook" function. It's like a special helper that gives the modal
// all the tools it needs to manage its forms and data.
// It takes a lot of information (like `type`, `title`, `onlvData`) to know what kind of form to show
// and how to save the data back to the main project.
export const useChangeBasedModalHandlers = (
    type, // This tells us what kind of item (LG, ULG, Position, etc.) the modal is currently working with.
    title, // This is the title of the modal, often used to identify the specific item being created or edited.
    initialPositionInfoData, // If we are editing an existing item, this holds its current information.
    onlvData, // This is the entire ONLV project data, which we might need to read from or update.
    parentContext, // This tells us where in the project structure the new item should be added (e.g., under which LG or ULG).
    onDataUpdate, // This is a function that tells the main application to update its view after we save changes.
    onOpenPositionModal, // This is a function to open another modal, often used for a follow-up action (like adding positions after creating a ULG).
    originalIdentifier, // A unique code for the original item, useful when we are modifying an existing entry.
    onClose, // This function tells the modal to close itself.
    onSaveInputs // This function is used to pass the final, saved data back to the component that opened the modal.
) => {
    // These are special "state" variables. They are like little containers that hold information
    // that can change over time, and when they change, React knows to update the screen.

    // This holds the text typed into a simple input field for generic types.
    const [currentInputValue, setCurrentInputValue] = useState("");
    // This holds the "long text" description for a "Grundtext" (base position), especially for "Folgepositionen".
    const [grundtextLangtext, setGrundtextLangtext] = useState(null);

    // These state variables hold all the data for each specific form type.
    // They start as `null` (empty) and get filled when the modal opens for a specific type.
    const [folgepositionData, setFolgepositionData] = useState(null); // Data for "Folgeposition" form.
    const [standalonePositionData, setStandalonePositionData] = useState(null); // Data for "Standalone Position" form.
    const [ungeteiltepositionData, setUngeteiltepositionData] = useState(null); // Data for "Ungeteilte Position" form.
    const [ulgData, setUlgData] = useState(null); // Data for "ULG" form.
    const [lgData, setLgData] = useState(null); // Data for "LG" form.

    // This is a "useEffect" hook. It's like a special instruction that runs
    // whenever certain pieces of information (like `initialPositionInfoData`, `type`, or `title`) change.
    // Its job is to set up the correct form data when the modal first opens or when its type changes.
    useEffect(() => {
        // If we have existing data (meaning we are editing an item), we log it for debugging.
        if (initialPositionInfoData) {
            console.log(
                "ChangeBasedModal - Current initialPositionInfoData:",
                JSON.parse(JSON.stringify(initialPositionInfoData))
            );
            // If it's a "folgeposition" and has "langtext" data, we store it.
            if (
                type === "folgeposition" &&
                initialPositionInfoData.data &&
                initialPositionInfoData.data.langtext
            ) {
                setGrundtextLangtext(initialPositionInfoData.data.langtext);
                console.log(
                    "Extracted langtext for folgeposition (from Grundtext):",
                    initialPositionInfoData.data.langtext
                );
            } else {
                // Otherwise, we clear the "grundtextLangtext".
                setGrundtextLangtext(null);
            }
        } else {
            // If there's no initial data, we log that the modal opened without it.
            console.log(
                "ChangeBasedModal opened without initialPositionInfoData or data is null/undefined."
            );
            setGrundtextLangtext(null);
        }

        // Based on the `type` of the modal, we create and set the appropriate starting form data.
        if (type === "folgeposition") {
            const formData = createFolgepositionFormData(title); // Get initial data for "Folgeposition".
            setFolgepositionData(formData); // Store it in our state.
            console.log("Initialized folgeposition form data:", formData);
        } else if (type === "position") {
            const formData = createStandalonePositionFormData(title); // Get initial data for "Standalone Position".
            setStandalonePositionData(formData); // Store it.
            console.log("Initialized standalone position form data:", formData);
        } else if (type === "ungeteilteposition") {
            const formData = createUngeteiltepositionFormData(title); // Get initial data for "Ungeteilte Position".
            setUngeteiltepositionData(formData); // Store it.
            console.log("Initialized ungeteilteposition form data:", formData);
        } else if (type === "ulg") {
            const formData = createUlgFormData(title); // Get initial data for "ULG".
            setUlgData(formData); // Store it.
            console.log("Initialized ULG form data:", formData);
        } else if (type === "lg") {
            const formData = createLgFormData(title); // Get initial data for "LG".
            setLgData(formData); // Store it.
            console.log("Initialized LG form data:", formData);
        }
    }, [initialPositionInfoData, type, title]); // These are the "dependencies" – the effect runs when any of these change.

    // This function handles changes in the "Folgeposition" form's input fields.
    // It updates the `folgepositionData` state based on what the user types.
    const handleFolgepositionInputChange = (field, value) => {
        if (!folgepositionData) return; // If there's no data yet, do nothing.

        setFolgepositionData((prev) => {
            // We create a copy of the previous data to make changes safely.
            const updated = { ...prev };

            // We check which field was changed and update the corresponding part of the data.
            if (field === "stichwort") {
                updated.folgeposition["pos-eigenschaften"].stichwort = value;
            } else if (field === "langtext") {
                updated.folgeposition["pos-eigenschaften"].langtext.p = value;
            } else if (field === "grundtext_langtext") {
                updated.grundtext.langtext.p = value;
            } else if (field === "grundtext_herkunftskennzeichen") {
                updated.grundtext.herkunftskennzeichen = value;
            } else if (field === "herkunftskennzeichen") {
                updated.folgeposition[
                    "pos-eigenschaften"
                ].herkunftskennzeichen = value;
            } else if (field === "einheit") {
                updated.folgeposition["pos-eigenschaften"].einheit = value;
            } else if (field === "lvmenge") {
                // For "lvmenge" (quantity), we make sure it's a number.
                const numValue = parseFloat(value);
                updated.folgeposition["pos-eigenschaften"].lvmenge = isNaN(
                    numValue
                )
                    ? 0
                    : numValue;
            }

            return updated; // We return the updated data to save it in the state.
        });
    };

    // This function handles changes in the "Standalone Position" form's input fields.
    // It updates the `standalonePositionData` state.
    const handleStandalonePositionInputChange = (field, value) => {
        if (!standalonePositionData) return; // If no data, do nothing.

        setStandalonePositionData((prev) => {
            const updated = { ...prev }; // Copy the previous data.

            // Update the specific field based on its name.
            if (field === "stichwort") {
                updated.stichwort = value;
            } else if (field === "langtext") {
                updated.langtext.p = value;
            } else if (field === "herkunftskennzeichen") {
                updated.herkunftskennzeichen = value;
            } else if (field === "einheit") {
                updated.einheit = value;
            } else if (field === "lvmenge") {
                // For "lvmenge", ensure it's a number and convert to string for consistency.
                const numValue = parseFloat(value);
                updated.lvmenge = isNaN(numValue) ? "0.00" : String(numValue);
            } else if (field === "leistungsteil") {
                // For "leistungsteil", ensure it's an integer.
                updated.leistungsteil = parseInt(value) || 1;
            } else if (field === "mfv") {
                updated.mfv = value;
            } else if (field === "vorbemerkungskennzeichen") {
                updated.vorbemerkungskennzeichen = value ? "V" : "";
            } else if (field === "wesentlicheposition") {
                updated.wesentlicheposition = value ? "W" : "";
            }

            return updated; // Return the updated data.
        });
    };

    // This function handles changes in the "Ungeteilte Position" form's input fields.
    // It updates the `ungeteiltepositionData` state.
    const handleUngeteiltepositionInputChange = (field, value) => {
        if (!ungeteiltepositionData) return; // If no data, do nothing.

        setUngeteiltepositionData((prev) => {
            const updated = { ...prev }; // Copy the previous data.

            // Update the specific field.
            if (field === "stichwort") {
                updated.ungeteilteposition["pos-eigenschaften"].stichwort =
                    value;
            } else if (field === "langtext") {
                updated.ungeteilteposition["pos-eigenschaften"].langtext.p[
                    "#text"
                ] = value;
            } else if (field === "herkunftskennzeichen") {
                updated.ungeteilteposition[
                    "pos-eigenschaften"
                ].herkunftskennzeichen = value;
            } else if (field === "einheit") {
                updated.ungeteilteposition["pos-eigenschaften"].einheit = value;
            } else if (field === "lvmenge") {
                // For "lvmenge", ensure it's a number.
                const numValue = parseFloat(value);
                updated.ungeteilteposition["pos-eigenschaften"].lvmenge = isNaN(
                    numValue
                )
                    ? 0
                    : numValue;
            }

            return updated; // Return the updated data.
        });
    };

    // This function handles changes in the "ULG" form's input fields.
    // It updates the `ulgData` state.
    const handleUlgInputChange = (field, value) => {
        if (!ulgData) return; // If no data, do nothing.

        setUlgData((prev) => {
            const updated = { ...prev }; // Copy the previous data.

            // Update the specific field.
            if (field === "ueberschrift") {
                updated["ulg-eigenschaften"].ueberschrift = value;
            } else if (field === "vorbemerkung") {
                updated["ulg-eigenschaften"].vorbemerkung.p = value;
            } else if (field === "herkunftskennzeichen") {
                updated["ulg-eigenschaften"].herkunftskennzeichen = value;
            }

            return updated; // Return the updated data.
        });
    };

    // This function handles changes in the "LG" form's input fields.
    // It updates the `lgData` state.
    const handleLgInputChange = (field, value) => {
        if (!lgData) return; // If no data, do nothing.

        setLgData((prev) => {
            const updated = { ...prev }; // Copy the previous data.

            // Update the specific field.
            if (field === "ueberschrift") {
                updated["lg-eigenschaften"].ueberschrift = value;
            } else if (field === "herkunftskennzeichen") {
                updated["lg-eigenschaften"].herkunftskennzeichen = value;
            }

            return updated; // Return the updated data.
        });
    };

    // This is the most important function! It's called when the user clicks the "Save & Proceed" button.
    // It takes all the collected form data, transforms it into the correct ONLV project structure,
    // and then saves it using the `addPositionToOnlv`, `addFolgepositionToOnlvStructure`, `addUlgToOnlv`, or `addLgToOnlv` functions.
    const handleSaveAndProceed = () => {
        console.log(
            "ChangeBasedModal - handleSaveAndProceed called for type:",
            type
        );

        // Logic for saving a "Folgeposition".
        if (type === "folgeposition" && folgepositionData) {
            console.log(
                "ChangeBasedModal - Saving folgepositionData:",
                JSON.parse(JSON.stringify(folgepositionData))
            );

            // We need `onlvData`, `parentContext`, and `onDataUpdate` to save successfully.
            if (onlvData && parentContext && onDataUpdate) {
                try {
                    // If there's an existing "Grundtext" to add the "Folgeposition" to.
                    if (parentContext.grundtextNrPath) {
                        const newFolgeposition = {
                            "@_ftnr": folgepositionData.folgeposition["@_ftnr"],
                            "@_mfv":
                                folgepositionData.folgeposition["@_mfv"] || "",
                            "pos-eigenschaften":
                                folgepositionData.folgeposition[
                                    "pos-eigenschaften"
                                ],
                        };

                        // Add the "Folgeposition" to the existing ONLV structure.
                        const updatedOnlvData = addFolgepositionToOnlvStructure(
                            onlvData,
                            parentContext.grundtextNrPath,
                            newFolgeposition
                        );

                        if (updatedOnlvData) {
                            console.log(
                                "Successfully added folgeposition to ONLV structure"
                            );
                            onDataUpdate(updatedOnlvData); // Update the main app's data.
                            console.log(
                                "ChangeBasedModal - Calling onClose after successful folgeposition save"
                            );
                            onClose(); // Close the modal.
                        } else {
                            console.error(
                                "Failed to add folgeposition to ONLV structure"
                            );
                        }
                    } else {
                        // If it's a new "Grundtext" that includes a "Folgeposition".
                        const newPosition = transformFolgepositionToNewPosition(
                            folgepositionData,
                            parentContext,
                            title
                        );
                        const updatedOnlvData = addPositionToOnlv(
                            onlvData,
                            newPosition
                        ); // Add the new "Grundtext" position.
                        console.log(
                            "Successfully added new grundtext position with folgeposition to ONLV structure"
                        );
                        onDataUpdate(updatedOnlvData); // Update the main app's data.
                        console.log(
                            "ChangeBasedModal - Calling onClose after successful new grundtext position save"
                        );
                        onClose(); // Close the modal.
                    }
                } catch (error) {
                    console.error(
                        "Error adding folgeposition to ONLV structure:",
                        error
                    );
                }
            }
        }
        // Logic for saving a "Standalone Position".
        else if (type === "position" && standalonePositionData) {
            console.log("ChangeBasedModal - Saving standalone position data");
            if (onlvData && parentContext && onDataUpdate) {
                try {
                    // Prepare the form data in the correct structure.
                    const formData = {
                        stichwort: standalonePositionData.stichwort,
                        langtext: {
                            p: [{ "#text": standalonePositionData.langtext.p }],
                        },
                        herkunftskennzeichen:
                            standalonePositionData.herkunftskennzeichen,
                        einheit: standalonePositionData.einheit,
                        pzzv: standalonePositionData.pzzv,
                        leistungsteil: standalonePositionData.leistungsteil,
                        lvmenge: standalonePositionData.lvmenge,
                        mfv: standalonePositionData.mfv,
                        vorbemerkungskennzeichen:
                            standalonePositionData.vorbemerkungskennzeichen,
                        wesentlicheposition:
                            standalonePositionData.wesentlicheposition,
                        garantierteangebotssummegruppe:
                            standalonePositionData.garantierteangebotssummegruppe,
                        teilangebotskennzeichen:
                            standalonePositionData.teilangebotskennzeichen,
                        teilsummenkennzeichen:
                            standalonePositionData.teilsummenkennzeichen,
                        grafiklinks: standalonePositionData.grafiklinks,
                    };

                    // Transform the data and add the new position to the ONLV structure.
                    const newPosition = transformToStandalonePosition(
                        formData,
                        parentContext,
                        title
                    );
                    const updatedOnlvData = addPositionToOnlv(
                        onlvData,
                        newPosition
                    );
                    console.log(
                        "Successfully added standalone position to ONLV structure"
                    );
                    onDataUpdate(updatedOnlvData); // Update the main app's data.
                    console.log(
                        "ChangeBasedModal - Calling onClose after successful standalone position save"
                    );
                    onClose(); // Close the modal.
                } catch (error) {
                    console.error(
                        "Error adding standalone position to ONLV structure:",
                        error
                    );
                }
            }
        }
        // Logic for saving an "Ungeteilte Position".
        else if (type === "ungeteilteposition" && ungeteiltepositionData) {
            console.log("ChangeBasedModal - Saving ungeteilteposition data");
            console.log(
                "ChangeBasedModal - ungeteiltepositionData:",
                JSON.stringify(ungeteiltepositionData, null, 2)
            );
            console.log(
                "ChangeBasedModal - parentContext:",
                JSON.stringify(parentContext, null, 2)
            );
            console.log("ChangeBasedModal - title:", title);

            if (onlvData && parentContext && onDataUpdate) {
                try {
                    // Transform the data and add the new position to the ONLV structure.
                    const newPosition =
                        transformUngeteiltepositionToNewPosition(
                            ungeteiltepositionData,
                            parentContext,
                            title
                        );
                    console.log(
                        "ChangeBasedModal - Transformed newPosition:",
                        JSON.stringify(newPosition, null, 2)
                    );

                    const updatedOnlvData = addPositionToOnlv(
                        onlvData,
                        newPosition
                    );
                    console.log(
                        "Successfully added ungeteilteposition to ONLV structure"
                    );
                    console.log(
                        "ChangeBasedModal - updatedOnlvData structure check:",
                        !!updatedOnlvData
                    );

                    onDataUpdate(updatedOnlvData); // Update the main app's data.
                    console.log(
                        "ChangeBasedModal - Called onDataUpdate with updatedOnlvData"
                    );
                    console.log(
                        "ChangeBasedModal - Calling onClose after successful ungeteilteposition save"
                    );
                    onClose(); // Close the modal.
                } catch (error) {
                    console.error(
                        "Error adding ungeteilteposition to ONLV structure:",
                        error
                    );
                }
            } else {
                console.error(
                    "ChangeBasedModal - Missing required data for ungeteilteposition save:",
                    {
                        hasOnlvData: !!onlvData,
                        hasParentContext: !!parentContext,
                        hasOnDataUpdate: !!onDataUpdate,
                    }
                );
            }
        }
        // Logic for saving a "ULG" (sub-group).
        else if (type === "ulg" && ulgData) {
            console.log("ChangeBasedModal - Saving ULG data");
            console.log(
                "ChangeBasedModal - ulgData:",
                JSON.stringify(ulgData, null, 2)
            );
            console.log(
                "ChangeBasedModal - parentContext:",
                JSON.stringify(parentContext, null, 2)
            );
            console.log("ChangeBasedModal - title:", title);

            if (onlvData && parentContext && onDataUpdate) {
                try {
                    // Transform the data and add the new ULG to the ONLV structure.
                    const newUlg = transformUlgToNewUlg(
                        ulgData,
                        parentContext,
                        title
                    );
                    console.log(
                        "ChangeBasedModal - Transformed newUlg:",
                        JSON.stringify(newUlg, null, 2)
                    );

                    const updatedOnlvData = addUlgToOnlv(onlvData, newUlg);
                    console.log("Successfully added ULG to ONLV structure");
                    console.log(
                        "ChangeBasedModal - updatedOnlvData structure check:",
                        !!updatedOnlvData
                    );

                    onDataUpdate(updatedOnlvData); // Update the main app's data.
                    console.log(
                        "ChangeBasedModal - Called onDataUpdate with updatedOnlvData"
                    );

                    // If `onOpenPositionModal` is provided, it means we should open another modal
                    // (e.g., to add positions to the newly created ULG).
                    if (onOpenPositionModal) {
                        console.log(
                            "ChangeBasedModal - Triggering position modal after ULG save"
                        );
                        // Prepare the context for the next modal.
                        const positionContext = {
                            lgNr: newUlg.lgNr,
                            ulgNr: newUlg.ulgNr,
                            parentId: newUlg.id,
                            level: newUlg.level + 1,
                            isNewUlg: true,
                            ulgTitle: newUlg.ueberschrift,
                            newUlg: newUlg,
                            originalIdentifier: originalIdentifier,
                        };

                        onOpenPositionModal(positionContext); // Open the next modal.
                        return; // Stop here, as another modal will take over.
                    }

                    console.log(
                        "ChangeBasedModal - Calling onClose after successful ULG save"
                    );
                    onClose(); // Close the current modal.
                } catch (error) {
                    console.error("Error adding ULG to ONLV structure:", error);
                }
            } else {
                console.error(
                    "ChangeBasedModal - Missing required data for ULG save:",
                    {
                        hasOnlvData: !!onlvData,
                        hasParentContext: !!parentContext,
                        hasOnDataUpdate: !!onDataUpdate,
                    }
                );
            }
        }
        // Logic for saving an "LG" (main group).
        else if (type === "lg" && lgData) {
            console.log("ChangeBasedModal - Saving LG data");
            console.log(
                "ChangeBasedModal - lgData:",
                JSON.stringify(lgData, null, 2)
            );
            console.log("ChangeBasedModal - title:", title);

            if (onlvData && onDataUpdate) {
                try {
                    // Transform the data and add the new LG to the ONLV structure.
                    const newLg = transformLgToNewLg(
                        lgData,
                        parentContext,
                        title
                    );
                    console.log(
                        "ChangeBasedModal - Transformed newLg:",
                        JSON.stringify(newLg, null, 2)
                    );

                    const updatedOnlvData = addLgToOnlv(onlvData, newLg);
                    console.log("Successfully added LG to ONLV structure");
                    console.log(
                        "ChangeBasedModal - updatedOnlvData structure check:",
                        !!updatedOnlvData
                    );

                    onDataUpdate(updatedOnlvData); // Update the main app's data.
                    console.log(
                        "ChangeBasedModal - Called onDataUpdate with updatedOnlvData"
                    );

                    // If `onOpenPositionModal` is provided, it means we should open another modal
                    // (e.g., to add ULGs to the newly created LG).
                    if (onOpenPositionModal) {
                        console.log(
                            "ChangeBasedModal - Triggering ULG modal after LG save"
                        );
                        // Prepare the context for the next modal.
                        const ulgContext = {
                            lgNr: newLg.lgNr,
                            parentId: newLg.id,
                            level: newLg.level + 1,
                            isNewLg: true,
                            lgTitle: newLg.ueberschrift,
                            newLg: newLg,
                            originalIdentifier: originalIdentifier,
                        };

                        onOpenPositionModal(ulgContext); // Open the next modal.
                        return; // Stop here.
                    }

                    console.log(
                        "ChangeBasedModal - Calling onClose after successful LG save"
                    );
                    onClose(); // Close the current modal.
                } catch (error) {
                    console.error("Error adding LG to ONLV structure:", error);
                }
            } else {
                console.error(
                    "ChangeBasedModal - Missing required data for LG save:",
                    {
                        hasOnlvData: !!onlvData,
                        hasOnDataUpdate: !!onDataUpdate,
                    }
                );
            }
        }
        // Logic for saving a simple "position" (if `currentInputValue` is used).
        else if (type === "position" && currentInputValue) {
            console.log(
                "ChangeBasedModal - Saving simple position with currentInputValue:",
                currentInputValue
            );
            if (onlvData && parentContext && onDataUpdate) {
                try {
                    // Create a basic form data structure from the input value.
                    const formData = {
                        stichwort: currentInputValue,
                        langtext: { p: [{ "#text": currentInputValue }] },
                        herkunftskennzeichen: "Z",
                        einheit: "Stk",
                        pzzv: { normalposition: {} },
                        leistungsteil: 1,
                        lvmenge: "1.00",
                    };

                    // Transform and add the new position.
                    const newPosition = transformToStandalonePosition(
                        formData,
                        parentContext,
                        title
                    );
                    const updatedOnlvData = addPositionToOnlv(
                        onlvData,
                        newPosition
                    );
                    console.log(
                        "Successfully added simple standalone position to ONLV structure"
                    );
                    onDataUpdate(updatedOnlvData); // Update the main app's data.
                    console.log(
                        "ChangeBasedModal - Calling onClose after successful simple position save"
                    );
                    onClose(); // Close the modal.
                } catch (error) {
                    console.error(
                        "Error adding simple standalone position to ONLV structure:",
                        error
                    );
                }
            }
        }
        // Logic for saving other generic types (if not one of the specific position/group types).
        else {
            console.log(
                "ChangeBasedModal - Saving currentInputValue:",
                currentInputValue,
                "for type:",
                type
            );
            // If it's not a specific position or group type, just pass the input value back.
            if (
                type !== "position" &&
                type !== "folgeposition" &&
                type !== "ungeteilteposition" &&
                type !== "ulg"
            ) {
                onSaveInputs({
                    inputValue: currentInputValue,
                    type: type,
                });
            }
            console.log(
                "ChangeBasedModal - Calling onClose after saving other type"
            );
            onClose(); // Close the modal.
        }
    };

    // Finally, this hook returns all the state variables and functions that the `ChangeBasedModal.jsx`
    // component needs to display the forms and handle user interactions.
    return {
        currentInputValue, // The current value of the generic input field.
        setCurrentInputValue, // Function to update the generic input field.
        grundtextLangtext, // The long text for the base position (if applicable).
        setGrundtextLangtext, // Function to update the base position long text.
        folgepositionData, // Data for the "Folgeposition" form.
        setFolgepositionData, // Function to update "Folgeposition" data.
        standalonePositionData, // Data for the "Standalone Position" form.
        setStandalonePositionData, // Function to update "Standalone Position" data.
        ungeteiltepositionData, // Data for the "Ungeteilte Position" form.
        setUngeteiltepositionData, // Function to update "Ungeteilte Position" data.
        ulgData, // Data for the "ULG" form.
        setUlgData, // Function to update "ULG" data.
        lgData, // Data for the "LG" form.
        setLgData, // Function to update "LG" data.
        handleFolgepositionInputChange, // Function to handle changes in "Folgeposition" form inputs.
        handleStandalonePositionInputChange, // Function to handle changes in "Standalone Position" form inputs.
        handleUngeteiltepositionInputChange, // Function to handle changes in "Ungeteilte Position" form inputs.
        handleUlgInputChange, // Function to handle changes in "ULG" form inputs.
        handleLgInputChange, // Function to handle changes in "LG" form inputs.
        handleSaveAndProceed, // The main function to call when saving the form.
    };
};
