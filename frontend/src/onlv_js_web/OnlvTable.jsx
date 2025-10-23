// This file is the heart of our ONLV data viewer. It creates a powerful and interactive table
// that displays construction project data in a hierarchical way (like a tree with main groups, sub-groups, and positions).
// Think of it as the main screen where users can see, filter, search, and interact with all the project items.
//
// The main idea of this file is to:
// 1. Take raw ONLV project data (in JSON format).
// 2. Process and flatten this data so it can be displayed in a table structure.
// 3. Render the data in a hierarchical table where users can expand and collapse sections (LGs and ULGs).
// 4. Provide controls for filtering the table content, exporting the data, and adding new entries.
// 5. Manage various pop-up windows (modals) for editing positions, adding new items (LGs, ULGs, positions),
//    and showing detailed information.
//
// To keep the code organized, this component uses many custom "hooks" (special reusable functions).
// Each hook is responsible for a specific piece of logic, for example:
// - `useOnlvDataProcessor`: Fetches and prepares the initial data.
// - `useExpansionManager`: Handles which rows in the table are expanded or collapsed.
// - `useFiltering`: Manages the search/filter functionality.
// - `useEditModalManager`: Controls the pop-up for editing an existing position.
// - `useFolgepositionModalManager`: Controls the pop-up for adding a follow-up position.
// - `useCreateNewEntryModalManager`: Manages the workflow for creating completely new entries.
// - `useChangeBasedModalManager`: Handles a sequence of modals for creating complex new entries.
//
// By separating these concerns into hooks, the main component `OnlvHierarchicalViewer` stays focused on
// putting everything together and rendering the final user interface.
import React, { useState, useEffect, useCallback, useMemo } from "react"; // We need the main tools from React to build our component.
import { FaCaretRight, FaCaretDown } from "react-icons/fa"; // These are arrow icons to show if a row is expanded or collapsed.
import "./Onlv.css"; // This imports the styles to make our table look good.
import { OnlvTableProvider, useOnlvTableContext } from "./OnlvTableContext"; // This provides a way for different parts of our table to share information without passing it down through many layers.
import programData from "../CommonData/Data.json"; // This file contains some general program information, like its name and version.
import DisplayFixedRules from "../onlb/DisplayFixedRules"; // This component displays a set of predefined "fixed rules" or standard items.
import FixedPositionJson from "../CommonData/FixedPosition.json"; // This JSON file contains the data for the "fixed rules" or standard items.

// --- Imports from our own refactored modules ---
// We've broken our code into smaller, more manageable pieces. Here we import them.
import { EditPositionModal, setErstelltam } from "../onlv/OnlvEdit"; // A pop-up window for editing a position and a helper function.
import { addPositionToOnlv } from "./OnlvPositionManager.js"; // A helper function to add a new position to our main data structure.
import AddFolgepositionModal from "./components/AddFolgepositionModal.jsx"; // A pop-up window for adding a "Folgeposition" (a sub-position).
import { handleExport as exportOnlvData } from "../onlv/OnlvExport"; // The function that handles exporting our data to a file.
import {
    MetadataSection,
    ProjectHeaderSection,
    LeistungsteilSection,
} from "../onlv/components/display/Metadata"; // Components that display different parts of the project's header information.
import { flattenOnlvData } from "../onlv/OnlvDisplay.utils"; // A crucial helper function that takes the complex, nested ONLV data and turns it into a flat list that's easy to show in a table.
import ImageCarousel from "./ImageCarousel"; // A component to display a slideshow of images if they are part of the project data.
import { structureLgsUlgsPositions } from "../onlv/OnlvUtils"; // A helper function to organize the data into a structured format of LGs, ULGs, and Positions.
import OnlvRow from "./OnlvRowRenderer"; // This is the component responsible for rendering a single row in our table.
import { useOnlvDataProcessor } from "./hooks/useOnlvDataProcessor"; // A custom hook that handles loading and processing the raw JSON data.
import { useExpansionManager } from "./hooks/useExpansionManager"; // A custom hook to manage which rows are expanded or collapsed.
import { useFiltering } from "./hooks/useFiltering"; // A custom hook that handles the logic for filtering the table based on user input.
import { useEditModalManager } from "./hooks/useEditModalManager"; // A custom hook to manage the state of the "Edit Position" pop-up window.
import { useFolgepositionModalManager } from "./hooks/useFolgepositionModalManager"; // A custom hook to manage the "Add Folgeposition" pop-up.
import { usePositionInteractionManager } from "./hooks/usePositionInteractionManager"; // A custom hook to manage information about the currently selected position.
import {
    CreateNewEntryModal,
    useCreateNewEntryModalManager,
} from "./CreateOnlvLogic"; // The pop-up and its management hook for creating new entries from scratch.
import ChangeBasedModal from "../onlv/ChangeBasedModal"; // A very flexible pop-up window that changes its form based on what the user wants to create.
import { useChangeBasedModalManager } from "./hooks/useChangeBasedModalManager"; // A custom hook to manage the complex, multi-step "Change Based Modal".
import OnlvTableControls from "./components/OnlvTableControls.jsx"; // The component that holds all the buttons and the search bar above the table.

// --- Main Component ---
// This is the main component that builds and manages the entire ONLV table view.
// It takes the raw `jsonData` as input and a function `onPositionDataUpdate` to communicate changes back to its parent.
// `showHeaderSection` prop controls whether the header section (metadata, project info, etc.) is visible (default: true)
const OnlvHierarchicalViewer = ({
    jsonData,
    onPositionDataUpdate,
    showHeaderSection = true,
}) => {
    console.log("OnlvHierarchicalViewer received jsonData:", jsonData);
    // We get a function `setTableData` from our context. This allows us to update shared data from anywhere inside this component.
    const { setTableData } = useOnlvTableContext();

    // --- Using our Custom Hooks ---
    // Here we call all the custom hooks to get the data and functions we need to run the table.
    // Each hook is like a specialized worker that handles one part of the job.

    // This hook takes the raw JSON, processes it, and gives us back the structured `parsedData` and the `flatData` list for the table.
    // It also tells us if it's currently `loading` or if there was an `error`.
    const {
        parsedData, // The full, structured ONLV data, just like in the original file.
        flatData, // A flattened array version of the data, perfect for rendering in a table, one row at a time.
        loading, // A boolean (true/false) that tells us if the data is still being processed.
        error, // Will contain an error message if something went wrong during processing.
        setFlatData: setHookFlatData, // A function to update the flat data.
        setParsedData: setHookParsedData, // A function to update the parsed data.
    } = useOnlvDataProcessor(jsonData, setTableData);

    console.log("======== Flat", flatData); // A debugging message to see the flattened data in the browser's console.
    console.log("======== parsed", parsedData); // A debugging message to see the structured data.

    // This hook manages which rows in the table are expanded or collapsed.
    const { expandedIds, toggleExpand, expandAll, collapseAll } =
        useExpansionManager(flatData);

    // --- State Management using `useState` ---
    // `useState` is a React hook that lets us add a "state variable" to our component.
    // This means the component can remember information and re-render when that information changes.

    // These states are for handling direct editing of "Einheit" (unit) and "Menge" (quantity) in the table.
    const [editingEinheitForId, setEditingEinheitForId] = useState(null); // Remembers the ID of the row where the "Einheit" is being edited.
    const [editingMengeForId, setEditingMengeForId] = useState(null); // Remembers the ID of the row where the "Menge" is being edited.
    const [currentMengeValue, setCurrentMengeValue] = useState(""); // Remembers the current value while the user is typing in the Menge input.

    // These states control whether different sections of the UI are collapsed or expanded.
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true); // Is the main project header section collapsed?
    const [isImageCarouselCollapsed, setIsImageCarouselCollapsed] =
        useState(true); // Is the image carousel collapsed?
    const [isFixedRulesCollapsed, setIsFixedRulesCollapsed] = useState(true); // Is the "Fixed Rules" section collapsed?

    // This hook manages the state for the flexible "ChangeBasedModal".
    // It's used for complex creation processes that might involve multiple steps (e.g., create LG, then ULG, then Position).
    const {
        committedChangeTypes, // An array of types of changes to be made (e.g., ['lg', 'ulg', 'position']).
        committedChangeValues, // The corresponding values for those changes.
        showChangeBasedModals, // A boolean to show or hide this modal.
        activeChangeModalIndex, // Which step in the sequence are we on?
        currentInitialInfoForChangeModal, // Data to pre-fill the modal.
        handleChangesCommittedForNewModals, // A function to start this multi-step modal process.
        handleCloseChangeBasedModal, // A function to close the modal.
        handleSaveChangeBasedModalInputs, // A function to save the data from the modal.
        setActiveChangeModalIndex,
        setCurrentInitialInfoForChangeModal,
        setShowChangeBasedModals,
        setCommittedChangeTypes,
        setCommittedChangeValues,
    } = useChangeBasedModalManager();

    // This hook manages information about the position the user has clicked on.
    const {
        selectedPositionInfo, // The data of the currently selected position.
        setSelectedPositionInfo, // A function to update the selected position.
    } = usePositionInteractionManager(onPositionDataUpdate);

    // This hook manages the pop-up window for editing an existing position.
    const {
        isModalOpen, // Is the edit modal currently open?
        editingPosition, // The data of the position being edited.
        openEditModalHandler, // A function to open the edit modal for a specific position.
        closeEditModalHandler, // A function to close the edit modal.
        handleSaveEditHandler, // A function to save the changes from the edit modal.
    } = useEditModalManager(
        flatData,
        parsedData,
        setHookFlatData,
        setHookParsedData,
        setTableData,
        setSelectedPositionInfo
    );

    // This hook manages the pop-up for adding a "Folgeposition" (a sub-position).
    const {
        isAddFolgeModalOpen, // Is the "Add Folgeposition" modal open?
        currentGrundtextForFolge, // The base position to which we are adding a sub-position.
        openAddFolgeModalHandler, // A function to open this modal.
        closeAddFolgeModalHandler, // A function to close this modal.
        handleAddFolgepositionHandler, // A function to handle saving the new sub-position.
    } = useFolgepositionModalManager(
        parsedData,
        setHookParsedData,
        setHookFlatData,
        setTableData
    );

    // This hook manages the pop-up for creating a new entry (like an LG, ULG, or Position) from scratch.
    const {
        isCreateModalOpen, // Is the "Create New" modal open?
        openCreateModal, // A function to open it.
        closeCreateModal, // A function to close it.
        handleCreateSave, // A function to handle saving the new entry.
        initialPositionData, // Any initial data to pre-fill the creation form.
    } = useCreateNewEntryModalManager(
        parsedData,
        setHookParsedData,
        setHookFlatData,
        setTableData,
        flatData,
        handleChangesCommittedForNewModals // This connects it to the multi-step modal system.
    );

    // This state remembers the very last item in our flat data list.
    const [lastPositionInfo, setLastPositionInfo] = useState(null);

    // --- `useEffect` Hook ---
    // This hook lets us perform "side effects" in our component.
    // A side effect is anything that happens outside of just rendering the UI, like fetching data,
    // or in this case, updating some state whenever the `flatData` changes.
    useEffect(() => {
        // This code runs whenever `flatData` or `loading` changes.
        if (!loading && flatData && flatData.length > 0) {
            // If the data has finished loading and we have at least one item...
            const lastItem = flatData[flatData.length - 1]; // Get the last item from the list.
            setLastPositionInfo(lastItem); // And save it in our state.
            console.log("Last position info set:", lastItem); // Debugging message.

            // This is for debugging purposes, to see how the data is structured.
            const structuredData = structureLgsUlgsPositions(flatData);
            console.log(
                "Structured LGs/ULGs/Positions (from OnlvTable):",
                structuredData
            );
        }
    }, [flatData, loading]); // The "dependency array": this effect re-runs only if `flatData` or `loading` changes.

    // --- `useCallback` Hook ---
    // This hook "memoizes" a function. This is a performance optimization. It ensures that the function
    // is not recreated on every single render, which can be helpful if we pass this function down to
    // child components, preventing them from re-rendering unnecessarily.
    const handleReceiveFixedPosition = useCallback(
        (fixedLgData) => {
            // This function is called when a user selects a "fixed position" from the `DisplayFixedRules` component.
            // It takes the data for that fixed position and merges it into our main project data.
            console.log(
                "🔥 OnlvTable - handleReceiveFixedPosition called with:",
                fixedLgData
            );
            console.log("🔥 OnlvTable - fixedLgData type:", typeof fixedLgData);
            console.log(
                "🔥 OnlvTable - fixedLgData has ulg-liste property:",
                !!fixedLgData?.["ulg-liste"]
            );
            console.log(
                "🔥 OnlvTable - fixedLgData has lg-eigenschaften property:",
                !!fixedLgData?.["lg-eigenschaften"]
            );
            console.log("🔥 OnlvTable - parsedData before merge:", parsedData);
            console.log("🔥 OnlvTable - parsedData type:", typeof parsedData);

            // First, a safety check to make sure we received valid data.
            if (!fixedLgData || !fixedLgData["@_nr"]) {
                console.error("Invalid fixed LG data received.");
                return; // Stop if the data is bad.
            }

            // This is a helper function to clean up the incoming data.
            // The fixed position data might have a temporary 'status' property that we don't want to save.
            const removeStatusProperty = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(removeStatusProperty);
                } else if (typeof obj === "object" && obj !== null) {
                    delete obj.status; // Delete the status property.
                    // Recursively check all other properties in the object.
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            removeStatusProperty(obj[key]);
                        }
                    }
                }
            };

            // We create a deep copy of the data to avoid modifying the original object directly.
            const cleanedFixedLgData = JSON.parse(JSON.stringify(fixedLgData));
            removeStatusProperty(cleanedFixedLgData); // Clean the copied data.
            const ensureArray = (value) => {
                if (Array.isArray(value)) {
                    return value;
                }
                if (value === undefined || value === null) {
                    return [];
                }
                return [value];
            };
            console.log(
                "🔥 OnlvTable - Cleaned fixed LG data (status removed):",
                JSON.stringify(cleanedFixedLgData, null, 2)
            );

            // Use the same merge logic as BoQLvPage.jsx with UniversalMergingOnlv.js
            if (
                cleanedFixedLgData["ulg-liste"] ||
                cleanedFixedLgData["lg-eigenschaften"]
            ) {
                // This is LG data with ulg-liste structure, use safe merge to avoid circular references
                console.log("🔥 OnlvTable - Using safe merge for LG structure");

                // Create a deep copy of our current main project data to modify it.
                const newParsedData = JSON.parse(JSON.stringify(parsedData));

                // Navigate through the complex ONLV data structure to find the list of LGs.
                // Safety checks are important here because the structure might not exist in a new or empty project.
                if (
                    !newParsedData["ausschreibungs-lv"] ||
                    !newParsedData["ausschreibungs-lv"]["gliederung-lg"] ||
                    !newParsedData["ausschreibungs-lv"]["gliederung-lg"][
                        "lg-liste"
                    ]
                ) {
                    console.error("ONLV structure not found in parsedData.");
                    return;
                }

                // Get the list of LGs.
                let lgList =
                    newParsedData["ausschreibungs-lv"]["gliederung-lg"][
                        "lg-liste"
                    ].lg;

                // The data structure can be tricky. Sometimes a list with one item is not an array.
                // We make sure `lgList` is always an array to handle it consistently.
                if (!Array.isArray(lgList)) {
                    lgList = [lgList].filter(Boolean); // Convert to array, removing any null/undefined items.
                    newParsedData["ausschreibungs-lv"]["gliederung-lg"][
                        "lg-liste"
                    ].lg = lgList;
                }

                // Check if an LG with the same number (`@_nr`) already exists in our project.
                console.log(
                    "🔥 OnlvTable - Looking for existing LG with nr:",
                    cleanedFixedLgData["@_nr"]
                );
                console.log(
                    "🔥 OnlvTable - Current LG list:",
                    lgList.map((lg) => ({
                        nr: lg["@_nr"],
                        type: typeof lg["@_nr"],
                    }))
                );

                const existingLgIndex = lgList.findIndex(
                    (lg) =>
                        String(lg["@_nr"]) ===
                        String(cleanedFixedLgData["@_nr"])
                );

                console.log(
                    "🔥 OnlvTable - Found existing LG at index:",
                    existingLgIndex
                );

                let mergedData;
                if (existingLgIndex !== -1) {
                    // --- If the LG already exists, merge the ULGs ---
                    console.log(
                        `🔥 OnlvTable - Merging into existing LG ${cleanedFixedLgData["@_nr"]}`
                    );
                    const existingLg = lgList[existingLgIndex];

                    // Merge LG properties
                    if (cleanedFixedLgData["lg-eigenschaften"]) {
                        existingLg["lg-eigenschaften"] = {
                            ...existingLg["lg-eigenschaften"],
                            ...cleanedFixedLgData["lg-eigenschaften"],
                        };
                    }

                    // Make sure the ULG list inside the existing LG is an array.
                    existingLg["ulg-liste"] = existingLg["ulg-liste"] || {};
                    existingLg["ulg-liste"].ulg = Array.isArray(
                        existingLg["ulg-liste"].ulg
                    )
                        ? existingLg["ulg-liste"].ulg
                        : existingLg["ulg-liste"].ulg
                        ? [existingLg["ulg-liste"].ulg]
                        : [];

                    // Get the new ULGs from the fixed data, ensuring it's an array.
                    const newUlgs = Array.isArray(
                        cleanedFixedLgData["ulg-liste"]?.ulg
                    )
                        ? cleanedFixedLgData["ulg-liste"].ulg
                        : cleanedFixedLgData["ulg-liste"]?.ulg
                        ? [cleanedFixedLgData["ulg-liste"].ulg]
                        : [];

                    // Merge ULGs intelligently
                    newUlgs.forEach((newUlg) => {
                        const existingUlgIndex = existingLg[
                            "ulg-liste"
                        ].ulg.findIndex(
                            (ulg) =>
                                String(ulg["@_nr"]) === String(newUlg["@_nr"])
                        );

                        console.log(
                            `🔥 OnlvTable - Looking for ULG ${newUlg["@_nr"]}, found at index: ${existingUlgIndex}`
                        );

                        if (existingUlgIndex !== -1) {
                            // Merge existing ULG
                            console.log(
                                `🔥 OnlvTable - Merging existing ULG ${newUlg["@_nr"]}`
                            );
                            const existingUlg =
                                existingLg["ulg-liste"].ulg[existingUlgIndex];

                            if (newUlg["ulg-eigenschaften"]) {
                                existingUlg["ulg-eigenschaften"] = {
                                    ...existingUlg["ulg-eigenschaften"],
                                    ...newUlg["ulg-eigenschaften"],
                                };
                            }

                            existingUlg.positionen =
                                existingUlg.positionen || {};
                            existingUlg.positionen.grundtextnr = ensureArray(
                                existingUlg.positionen.grundtextnr
                            );

                            const incomingGrundtexte = ensureArray(
                                newUlg.positionen?.grundtextnr
                            );

                            incomingGrundtexte.forEach((incomingGrund) => {
                                const grundIndex =
                                    existingUlg.positionen.grundtextnr.findIndex(
                                        (grund) =>
                                            String(grund["@_nr"]) ===
                                            String(incomingGrund["@_nr"])
                                    );

                                if (grundIndex === -1) {
                                    existingUlg.positionen.grundtextnr.push(
                                        incomingGrund
                                    );
                                    return;
                                }

                                const existingGrund =
                                    existingUlg.positionen.grundtextnr[
                                        grundIndex
                                    ];

                                if (incomingGrund.grundtext) {
                                    existingGrund.grundtext =
                                        existingGrund.grundtext
                                            ? {
                                                  ...existingGrund.grundtext,
                                                  ...incomingGrund.grundtext,
                                              }
                                            : incomingGrund.grundtext;
                                }

                                if (incomingGrund.folgeposition) {
                                    const existingFolgen = ensureArray(
                                        existingGrund.folgeposition
                                    );
                                    const incomingFolgen = ensureArray(
                                        incomingGrund.folgeposition
                                    );

                                    incomingFolgen.forEach((incomingFolge) => {
                                        const existingFolgeIndex =
                                            existingFolgen.findIndex(
                                                (folge) =>
                                                    String(folge["@_ftnr"]) ===
                                                    String(
                                                        incomingFolge["@_ftnr"]
                                                    )
                                            );

                                        if (existingFolgeIndex === -1) {
                                            existingFolgen.push(incomingFolge);
                                        } else {
                                            existingFolgen[existingFolgeIndex] =
                                                {
                                                    ...existingFolgen[
                                                        existingFolgeIndex
                                                    ],
                                                    ...incomingFolge,
                                                };
                                        }
                                    });

                                    existingGrund.folgeposition = existingFolgen
                                        .slice()
                                        .sort((a, b) =>
                                            String(a["@_ftnr"]).localeCompare(
                                                String(b["@_ftnr"])
                                            )
                                        );
                                }

                                if (incomingGrund.ungeteilteposition) {
                                    const existingUngeteilte = ensureArray(
                                        existingGrund.ungeteilteposition
                                    );
                                    const incomingUngeteilte = ensureArray(
                                        incomingGrund.ungeteilteposition
                                    );

                                    incomingUngeteilte.forEach(
                                        (incomingUngeteiltePos) => {
                                            const existingUngeteilteIndex =
                                                existingUngeteilte.findIndex(
                                                    (ungeteilte) =>
                                                        String(
                                                            ungeteilte["@_nr"]
                                                        ) ===
                                                        String(
                                                            incomingUngeteiltePos[
                                                                "@_nr"
                                                            ]
                                                        )
                                                );

                                            if (
                                                existingUngeteilteIndex === -1
                                            ) {
                                                existingUngeteilte.push(
                                                    incomingUngeteiltePos
                                                );
                                            } else {
                                                existingUngeteilte[
                                                    existingUngeteilteIndex
                                                ] = {
                                                    ...existingUngeteilte[
                                                        existingUngeteilteIndex
                                                    ],
                                                    ...incomingUngeteiltePos,
                                                };
                                            }
                                        }
                                    );

                                    existingGrund.ungeteilteposition =
                                        existingUngeteilte
                                            .slice()
                                            .sort((a, b) =>
                                                String(a["@_nr"]).localeCompare(
                                                    String(b["@_nr"])
                                                )
                                            );
                                }
                            });

                            existingUlg.positionen.grundtextnr =
                                existingUlg.positionen.grundtextnr
                                    .slice()
                                    .sort((a, b) =>
                                        String(a["@_nr"]).localeCompare(
                                            String(b["@_nr"])
                                        )
                                    );
                        } else {
                            // Add new ULG
                            console.log(
                                `🔥 OnlvTable - Adding new ULG ${newUlg["@_nr"]}`
                            );
                            existingLg["ulg-liste"].ulg.push(newUlg);
                        }
                    });

                    // Sort ULGs
                    existingLg["ulg-liste"].ulg.sort((a, b) => {
                        const nrA = parseInt(a["@_nr"], 10);
                        const nrB = parseInt(b["@_nr"], 10);
                        return nrA - nrB;
                    });
                } else {
                    // --- If the LG is new, just add it to the list ---
                    console.log(
                        `🔥 OnlvTable - Adding new LG ${cleanedFixedLgData["@_nr"]}`
                    );
                    lgList.push(cleanedFixedLgData);
                }

                // After adding or merging, sort the entire LG list by their number to keep it organized.
                lgList.sort((a, b) => {
                    const nrA = parseInt(a["@_nr"], 10);
                    const nrB = parseInt(b["@_nr"], 10);
                    return nrA - nrB;
                });

                console.log(
                    "🔥 OnlvTable - Final LG list after merge:",
                    lgList.map((lg) => lg["@_nr"])
                );

                mergedData = newParsedData;
                console.log("🔥 OnlvTable - Merged data result:", mergedData);
                console.log(
                    "🔥 OnlvTable - Merged data is different from parsedData:",
                    mergedData !== parsedData
                );

                // --- Update all our data states ---
                // Now that we've modified the data, we need to update the state everywhere so React re-renders the UI.
                setHookParsedData(mergedData); // Update the main structured data.

                const updatedFlatData = flattenOnlvData(mergedData); // Re-flatten the data for the table view.
                setHookFlatData(updatedFlatData); // Update the flat data state.

                // Update the data in our shared context.
                setTableData((current) => ({
                    ...current,
                    data: mergedData,
                }));

                console.log(
                    "🔥 OnlvTable - New Parsed Data after merge (handleReceiveFixedPosition):",
                    JSON.stringify(mergedData, null, 2)
                );
                console.log(
                    "🔥 OnlvTable - ONLV data updated with fixed position using smartMerge."
                );
            } else {
                // Fallback to original logic if data structure is not recognized
                console.log("🔥 OnlvTable - Using fallback merge logic");
                console.error(
                    "Unrecognized fixed LG data structure:",
                    cleanedFixedLgData
                );
            }
        },
        [parsedData, setHookParsedData, setHookFlatData, setTableData] // Dependencies for useCallback.
    );

    // This function handles adding a brand new position to the data.
    const handleAddPosition = useCallback(
        (newPosition) => {
            console.log("Adding new position:", newPosition);

            if (!parsedData) {
                console.error("Cannot add position: parsedData is null.");
                return;
            }

            // We enhance the new position object with some default values to ensure it's a valid ONLV item.
            const enhancedPosition = {
                ...newPosition,
                mfv: newPosition.mfv || "",
                langtext: newPosition.langtext || { p: [] },
                herkunftskennzeichen: newPosition.herkunftskennzeichen || "Z",
                lvmenge: newPosition.lvmenge || "n.a.",
                einheit: newPosition.einheit || "",
                pzzv: newPosition.pzzv || { normalposition: {} },
                leistungsteil: newPosition.leistungsteil || 1,
                vorbemerkungskennzeichen:
                    newPosition.vorbemerkungskennzeichen || "",
                wesentlicheposition: newPosition.wesentlicheposition || "",
            };

            // Update the flat data first for a quick UI update.
            setHookFlatData((prevFlatData) => {
                const newFlatData = [...prevFlatData];
                const searchableText =
                    enhancedPosition.stichwort?.toLowerCase() || "";
                let ftnrList = [];
                if (
                    enhancedPosition.folgeposition &&
                    enhancedPosition.folgeposition.length > 0
                ) {
                    ftnrList = enhancedPosition.folgeposition.map(
                        (fp) => fp["@_ftnr"]
                    );
                }
                newFlatData.push({
                    ...enhancedPosition,
                    searchableText,
                    ftnrList: ftnrList,
                    lastFtnr:
                        ftnrList.length > 0
                            ? ftnrList[ftnrList.length - 1]
                            : null,
                });
                console.log("flatData updated with new position");
                return newFlatData;
            });

            // Now, update the main, structured `parsedData`.
            const newOnlvData = JSON.parse(JSON.stringify(parsedData));

            // Update the creation timestamp in the metadata.
            if (newOnlvData.metadaten) {
                setErstelltam(newOnlvData.metadaten);
            }

            // Use our helper function to correctly insert the new position into the complex nested structure.
            const updatedData = addPositionToOnlv(
                newOnlvData,
                enhancedPosition
            );

            // Update the state with the final, correct data.
            setHookParsedData(updatedData);
            setTableData((current) => ({
                ...current,
                data: updatedData,
            }));

            console.log("Position added successfully");
        },
        [parsedData, setHookParsedData, setHookFlatData, setTableData]
    );

    // This function handles the export process when the user clicks the "Export" button.
    const handleExport = useCallback(() => {
        const dataToExport = parsedData
            ? JSON.parse(JSON.stringify(parsedData))
            : null;

        console.log("Preparing data for export:", dataToExport);

        let exportFilename = "exported_onlv.onlv"; // Default filename.

        if (dataToExport && dataToExport.metadaten) {
            // Add program info to the metadata before exporting.
            if (programData) {
                dataToExport.metadaten.programmsystem =
                    programData.programmsystem;
                dataToExport.metadaten.programmversion =
                    programData.programmversion;
            }

            // If a filename is specified in the metadata, use it.
            if (dataToExport.metadaten.dateiname) {
                exportFilename = dataToExport.metadaten.dateiname;
                if (!exportFilename.toLowerCase().endsWith(".onlv")) {
                    exportFilename += ".onlv"; // Ensure it has the correct extension.
                }
            }
        }

        // The data structure can sometimes be nested inside an `onlv` key. We handle that here.
        if (dataToExport && dataToExport.onlv) {
            exportOnlvData(dataToExport.onlv, exportFilename);
        } else {
            // Otherwise, export the data as is.
            exportOnlvData(dataToExport, exportFilename);
        }
    }, [parsedData]); // This function depends only on `parsedData`.

    // --- `useMemo` Hook ---
    // This hook memoizes a calculated value. It's another performance optimization.
    // It will only re-calculate the `parentMap` when `flatData` changes.
    const parentMap = useMemo(() => {
        // We are creating a Map for very fast lookups.
        // This map will store `childId -> parentId` for every item in our table.
        // This helps us quickly find the parent of any item, which is useful for filtering.
        const map = new Map();
        flatData.forEach((item) => {
            map.set(item.id, item.parentId);
        });
        return map;
    }, [flatData]); // Dependency: only recalculate when `flatData` changes.

    // This hook handles the filtering logic.
    // It takes the full `flatData` and returns only the `visibleData` based on the `filterText`.
    const { filterText, setFilterText, visibleData } = useFiltering(
        flatData,
        expandedIds,
        parentMap
    );

    // --- JSX Rendering ---
    // This is where we define what the component looks like in HTML.
    return (
        <div className="onlv-viewer-container">
            {/* The control bar with search, buttons, etc. */}
            <OnlvTableControls
                filterText={filterText}
                setFilterText={setFilterText}
                loading={loading}
                error={error}
                flatData={flatData}
                expandAll={expandAll}
                collapseAll={collapseAll}
                handleExport={handleExport}
                openCreateModal={openCreateModal}
                selectedPositionInfo={selectedPositionInfo}
                lastPositionInfo={lastPositionInfo}
                parsedData={parsedData}
            />

            {/* Show a loading message while data is being processed. */}
            {loading && (
                <div className="loading-message">Verarbeite Daten...</div>
            )}
            {/* Show an error message if something went wrong. */}
            {error && <div className="error-message">Fehler: {error}</div>}

            {/* Only show the main content if loading is done, there's no error, and we have data. */}
            {!loading && !error && parsedData && (
                <>
                    {/* A collapsible section for the project header. Only shown if showHeaderSection prop is true. */}
                    {showHeaderSection && (
                        <>
                            <button
                                onClick={() =>
                                    setIsHeaderCollapsed(!isHeaderCollapsed)
                                }
                                className="viewer-control-button"
                                title={
                                    isHeaderCollapsed
                                        ? "Header ausklappen"
                                        : "Header einklappen"
                                }
                                style={{ marginBottom: "15px" }}
                            >
                                {isHeaderCollapsed ? (
                                    <FaCaretRight />
                                ) : (
                                    <FaCaretDown />
                                )}
                                {isHeaderCollapsed
                                    ? "Header ausklappen"
                                    : "Header einklappen"}
                            </button>
                            {!isHeaderCollapsed && (
                                <div className="onlv-header-sections">
                                    <MetadataSection
                                        metadata={parsedData.metadaten}
                                    />
                                    {parsedData["ausschreibungs-lv"]
                                        ?.kenndaten && (
                                        <ProjectHeaderSection
                                            kenndaten={
                                                parsedData["ausschreibungs-lv"]
                                                    .kenndaten
                                            }
                                        />
                                    )}
                                    {parsedData.leistungsteiltabelle && (
                                        <LeistungsteilSection
                                            leistungsteiltabelle={
                                                parsedData.leistungsteiltabelle
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    {/* The main grid container for our table. */}
                    <div className="grid-container">
                        <h3>Leistungsverzeichnis Gliederung</h3>
                        <div className="table-wrapper">
                            <table className="onlv-grid-table">
                                <thead>
                                    <tr>
                                        <th className="col-nr">Nr.</th>
                                        <th className="col-description">
                                            Positionsstichwort
                                        </th>
                                        <th className="col-menge">Menge</th>
                                        <th className="col-einheit">EH</th>
                                        <th className="col-type">Art</th>
                                        <th className="col-herkunft">Herk.</th>
                                        <th className="col-grafik">Grafik</th>
                                    </tr>
                                </thead>
                                {/* The body of the table. We use a `key` to help React optimize rendering when the data changes. */}
                                <tbody key={filterText + expandedIds.size}>
                                    {visibleData.length > 0 ? (
                                        // If we have data to show, map over it and render a row for each item.
                                        visibleData.map((item) => (
                                            <OnlvRow
                                                key={item.id} // A unique key for each row is essential for React.
                                                item={item} // The data for this specific row.
                                                flatData={flatData}
                                                parentMap={parentMap}
                                                expandedIds={expandedIds}
                                                toggleExpand={toggleExpand}
                                                openEditModal={
                                                    openEditModalHandler
                                                }
                                                handleSaveEdit={
                                                    handleSaveEditHandler
                                                }
                                                handleAddPosition={
                                                    handleAddPosition
                                                }
                                                openAddFolgeModal={
                                                    openAddFolgeModalHandler
                                                }
                                                // Pass down all the state and handlers needed for inline editing.
                                                editingEinheitForId={
                                                    editingEinheitForId
                                                }
                                                setEditingEinheitForId={
                                                    setEditingEinheitForId
                                                }
                                                editingMengeForId={
                                                    editingMengeForId
                                                }
                                                setEditingMengeForId={
                                                    setEditingMengeForId
                                                }
                                                currentMengeValue={
                                                    currentMengeValue
                                                }
                                                setCurrentMengeValue={
                                                    setCurrentMengeValue
                                                }
                                                setSelectedPositionInfo={
                                                    setSelectedPositionInfo
                                                }
                                            />
                                        ))
                                    ) : (
                                        // If there's no data to show (either empty project or filter matches nothing).
                                        <tr>
                                            <td
                                                colSpan="7"
                                                className="no-data-row"
                                            >
                                                {flatData.length === 0
                                                    ? "Keine verarbeitbaren Daten."
                                                    : "Keine Einträge entsprechen dem Filter."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Conditionally render the Image Carousel if there are images in the data. */}
                    {parsedData.grafiktabelle &&
                        parsedData.grafiktabelle.grafikelement &&
                        parsedData.grafiktabelle.grafikelement.length > 0 && (
                            <div
                                className="image-carousel-section-wrapper"
                                style={{ marginTop: "20px" }}
                            >
                                <button
                                    onClick={() =>
                                        setIsImageCarouselCollapsed(
                                            !isImageCarouselCollapsed
                                        )
                                    }
                                    className="viewer-control-button"
                                >
                                    {isImageCarouselCollapsed ? (
                                        <FaCaretRight />
                                    ) : (
                                        <FaCaretDown />
                                    )}
                                    {isImageCarouselCollapsed
                                        ? "Grafiken ausklappen"
                                        : "Grafiken einklappen"}
                                </button>
                                {!isImageCarouselCollapsed && (
                                    <ImageCarousel
                                        grafikTabelle={parsedData.grafiktabelle}
                                    />
                                )}
                            </div>
                        )}
                    {/* The section for displaying and adding "Fixed Rules". */}
                    <div
                        className="fixed-rules-section-wrapper"
                        style={{ marginTop: "20px" }}
                    >
                        <button
                            onClick={() =>
                                setIsFixedRulesCollapsed(!isFixedRulesCollapsed)
                            }
                            className="viewer-control-button"
                        >
                            {isFixedRulesCollapsed ? (
                                <FaCaretRight />
                            ) : (
                                <FaCaretDown />
                            )}
                            {isFixedRulesCollapsed
                                ? "LBH22 ausklappen"
                                : "LBH22 einklappen"}
                        </button>
                        {!isFixedRulesCollapsed && (
                            <DisplayFixedRules
                                data={FixedPositionJson.onlb}
                                onSendFixedPosition={handleReceiveFixedPosition}
                            />
                        )}
                    </div>
                </>
            )}
            {/* A message to show if there's no data at all, but still show the table structure. */}
            {!loading && !error && !parsedData && (
                <>
                    <div className="grid-container">
                        <h3>Leistungsverzeichnis Gliederung</h3>
                        <div className="table-wrapper">
                            <table className="onlv-grid-table">
                                <thead>
                                    <tr>
                                        <th className="col-nr">Nr.</th>
                                        <th className="col-description">
                                            Bezeichnung / Beschreibung
                                        </th>
                                        <th className="col-menge">Menge</th>
                                        <th className="col-einheit">EH</th>
                                        <th className="col-type">Art</th>
                                        <th className="col-herkunft">Herk.</th>
                                        <th className="col-grafik">Grafik</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan="7" className="no-data-row">
                                            Keine ONLV-Daten geladen. Bitte
                                            laden Sie eine ONLV-Datei, um die
                                            Daten anzuzeigen.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* --- Modals (Pop-up Windows) --- */}
            {/* These are only rendered when their corresponding `is...Open` state is true. */}

            {/* The modal for editing a position. */}
            {isModalOpen && editingPosition && (
                <EditPositionModal
                    position={editingPosition}
                    onClose={closeEditModalHandler}
                    onSave={handleSaveEditHandler}
                />
            )}

            {/* The modal for adding a Folgeposition. */}
            {isAddFolgeModalOpen && currentGrundtextForFolge && (
                <AddFolgepositionModal
                    grundtextPosition={currentGrundtextForFolge}
                    onClose={closeAddFolgeModalHandler}
                    onSave={(newFolge) =>
                        handleAddFolgepositionHandler(
                            currentGrundtextForFolge,
                            newFolge
                        )
                    }
                />
            )}

            {/* The modal for creating a new entry from scratch. */}
            {isCreateModalOpen && (
                <CreateNewEntryModal
                    onClose={closeCreateModal}
                    onSave={handleCreateSave}
                    initialPositionInfo={initialPositionData}
                    flatData={flatData}
                />
            )}

            {/* The powerful, multi-step ChangeBasedModal. */}
            {showChangeBasedModals &&
                activeChangeModalIndex >= 0 &&
                activeChangeModalIndex < committedChangeValues.length && (
                    <ChangeBasedModal
                        title={committedChangeValues[activeChangeModalIndex]}
                        type={committedChangeTypes[activeChangeModalIndex]}
                        initialPositionInfoData={
                            currentInitialInfoForChangeModal
                        }
                        onlvData={parsedData}
                        originalIdentifier={
                            currentInitialInfoForChangeModal?.originalIdentifier
                        }
                        // This function is called when one step is done and the next should begin (e.g., after saving a ULG, open the position modal).
                        onOpenPositionModal={(positionContext) => {
                            // This complex logic determines what the next step in the creation process is.
                            if (positionContext.isNewLg) {
                                // If we just created an LG, the next step is to create a ULG.
                                // We set up the data for the ULG modal and show it.
                                setShowChangeBasedModals(false);
                                setActiveChangeModalIndex(-1);
                                setTimeout(() => {
                                    setCommittedChangeTypes([
                                        "ulg",
                                        "position",
                                    ]);
                                    setCommittedChangeValues(["01", "01"]);
                                    setCurrentInitialInfoForChangeModal({
                                        lgNr: positionContext.lgNr,
                                        level: positionContext.level + 1,
                                        parentId:
                                            positionContext.newLg?.id ||
                                            positionContext.parentId,
                                        originalIdentifier:
                                            positionContext.originalIdentifier,
                                    });
                                    setActiveChangeModalIndex(0);
                                    setShowChangeBasedModals(true);
                                }, 100);
                            } else {
                                // If we just created a ULG, the next step is to create a position.
                                // We set up the data for the position modal and show it.
                                setShowChangeBasedModals(false);
                                setActiveChangeModalIndex(-1);
                                setTimeout(() => {
                                    setCommittedChangeTypes([
                                        "ungeteilteposition",
                                    ]);
                                    setCommittedChangeValues(["01"]);
                                    setCurrentInitialInfoForChangeModal({
                                        isUlg: true,
                                        ulgNr: `${positionContext.lgNr}.${positionContext.ulgNr}`,
                                        lgNr: positionContext.lgNr,
                                        level: positionContext.level,
                                        id: positionContext.parentId,
                                        ulgItem: positionContext.newUlg,
                                    });
                                    setActiveChangeModalIndex(0);
                                    setShowChangeBasedModals(true);
                                }, 100);
                            }
                        }}
                        // This logic determines the context (like parent ID and level) for the item being created.
                        parentContext={(() => {
                            const initialData =
                                currentInitialInfoForChangeModal;
                            if (!initialData)
                                return {
                                    lgNr: "01",
                                    ulgNr: "01",
                                    grundtextNrPath: null,
                                    parentId: null,
                                    level: 0,
                                };

                            const currentType =
                                committedChangeTypes[activeChangeModalIndex];
                            if (currentType === "lg") {
                                return {
                                    lgNr:
                                        committedChangeValues[
                                            activeChangeModalIndex
                                        ] || "01",
                                    ulgNr: "01",
                                    grundtextNrPath: null,
                                    parentId: null,
                                    level: 0,
                                };
                            }
                            if (currentType === "ulg") {
                                const lgNr = initialData.lgNr || "01";
                                const parentLg = flatData.find(
                                    (item) =>
                                        item.type === "lg" && item.nr === lgNr
                                );
                                return {
                                    lgNr: lgNr,
                                    ulgNr:
                                        committedChangeValues[
                                            activeChangeModalIndex
                                        ] || "01",
                                    grundtextNrPath: null,
                                    parentId: parentLg?.id || null,
                                    level: 1,
                                };
                            }
                            if (initialData.isUlg) {
                                const ulgNr = initialData.ulgNr || "01.01";
                                const parts = ulgNr.split(".");
                                return {
                                    lgNr: parts[0] || "01",
                                    ulgNr: parts[1] || "01",
                                    grundtextNrPath: null,
                                    parentId:
                                        initialData.ulgItem?.id ||
                                        initialData.id,
                                    level: initialData.level || 2,
                                };
                            }
                            const nr =
                                initialData.grundtextnr ||
                                initialData.nr ||
                                "01.01.01";
                            const parts = nr.split(".");
                            if (parts.length >= 3) {
                                const basePositionNr = parts[2].replace(
                                    /[A-Z]+$/,
                                    ""
                                );
                                return {
                                    lgNr: parts[0],
                                    ulgNr: parts[1],
                                    grundtextNrPath: `${parts[0]}.${parts[1]}.${basePositionNr}`,
                                    parentId: initialData.id,
                                    level: initialData.level || 3,
                                };
                            }
                            return {
                                lgNr: parts[0] || "01",
                                ulgNr: parts[1] || "01",
                                grundtextNrPath: null,
                                parentId: initialData.id,
                                level: initialData.level || 2,
                            };
                        })()}
                        // This function is called when data is saved in the modal. It updates the main application state.
                        onDataUpdate={(updatedOnlvData) => {
                            setHookParsedData(updatedOnlvData);
                            setTableData((current) => ({
                                ...current,
                                data: updatedOnlvData,
                            }));
                            const newFlatData =
                                flattenOnlvData(updatedOnlvData);
                            setHookFlatData(newFlatData);
                        }}
                        onClose={handleCloseChangeBasedModal}
                        onSaveInputs={handleSaveChangeBasedModalInputs}
                    />
                )}
        </div>
    );
};

// This is a wrapper component. Its main job is to provide the `OnlvTableContext` to the
// `OnlvHierarchicalViewer` and all of its children. This makes the shared data available everywhere it's needed.
const OnlvTable = ({
    jsonData,
    onPositionSelect,
    showHeaderSection = true,
}) => {
    // The incoming `jsonData` might be nested inside a `data` property. We handle that here.
    const onlvJsonData = jsonData && jsonData.data ? jsonData.data : jsonData;

    return (
        <OnlvTableProvider>
            <OnlvHierarchicalViewer
                jsonData={onlvJsonData}
                onPositionDataUpdate={onPositionSelect}
                showHeaderSection={showHeaderSection}
            />
        </OnlvTableProvider>
    );
};

export default OnlvTable; // We export the `OnlvTable` component so it can be used in other parts of our application.
