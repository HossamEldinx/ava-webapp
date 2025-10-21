// This file defines a custom React hook called `useFolgepositionModalManager`.
// A "hook" is a reusable function that lets us use special React features, like state.
// The name "Manager" tells us that this hook is responsible for managing all the logic
// related to a specific pop-up window (a "modal") for adding a "Folgeposition".
//
// A "Folgeposition" is like a sub-task or a variation of a main task ("Grundtext").
//
// In simple terms, this hook does the following:
// 1. It keeps track of whether the "Add Folgeposition" modal should be open or closed.
// 2. It remembers which main task (Grundtext) we are adding the sub-task to.
// 3. It provides the functions to open and close the modal.
// 4. It contains the main logic for what happens when the user clicks "Save" in the modal.
//    This includes updating the main project data with the new Folgeposition.
//
// By putting all this logic into one hook, we keep our main component code cleaner and more organized.

import { useState, useCallback } from "react"; // We import `useState` and `useCallback` from React.
// `useState`: A hook to let our component "remember" things, like if a modal is open.
// `useCallback`: A hook to optimize performance. It ensures that functions are not recreated on every render, which can make the app faster.

import { flattenOnlvData } from "../../onlv/OnlvDisplay.utils"; // A helper function to transform our nested data into a flat list, which is easier for the table to display.
import { setErstelltam } from "../../onlv/OnlvEdit"; // A helper function to update the "created at" timestamp in the data.
import { addFolgepositionToOnlvStructure } from "../OnlvPositionManager"; // The core helper function that knows how to correctly insert a new Folgeposition into our complex data structure.

// This is our custom hook. It takes the main data and functions to update that data as arguments.
export const useFolgepositionModalManager = (
    parsedData, // The current, complete ONLV data object.
    setHookParsedData, // A function to update the main data object.
    setHookFlatData, // A function to update the flattened version of the data.
    setTableData // A function to update the data used specifically by the table component.
) => {
    // We use `useState` to create a state variable `isAddFolgeModalOpen`.
    // It will be `true` if the modal is open, and `false` if it's closed. It starts as `false`.
    const [isAddFolgeModalOpen, setIsAddFolgeModalOpen] = useState(false);

    // Another state variable to "remember" the specific "Grundtext" item that the user
    // wants to add a new Folgeposition to. It starts as `null` (nothing selected).
    const [currentGrundtextForFolge, setCurrentGrundtextForFolge] =
        useState(null);

    // This function is responsible for OPENING the modal.
    // It's wrapped in `useCallback` for performance.
    const openAddFolgeModalHandler = useCallback((grundtextItem) => {
        // When this function is called, it receives the `grundtextItem` the user clicked on.
        // We save this item in our state.
        setCurrentGrundtextForFolge(grundtextItem);
        // And we set the modal's visibility to `true`.
        setIsAddFolgeModalOpen(true);
    }, []); // The empty array `[]` means this function will never be recreated.

    // This function is responsible for CLOSING the modal.
    const closeAddFolgeModalHandler = useCallback(() => {
        // It sets the modal's visibility back to `false`.
        setIsAddFolgeModalOpen(false);
        // It also resets the selected `grundtextItem` to `null`, cleaning up for next time.
        setCurrentGrundtextForFolge(null);
    }, []); // Also never needs to be recreated.

    // This is the most important function. It handles the logic when the user clicks "Save".
    // It takes the `grundtextFlatItem` (the parent) and `newFolgepositionObject` (the new data from the modal form).
    const handleAddFolgepositionHandler = useCallback(
        (grundtextFlatItem, newFolgepositionObject) => {
            // --- Step 1: Safety Checks ---
            // It's very important to make sure we have the data we need before trying to change it.

            // Check if the main `parsedData` exists. If not, we can't do anything.
            if (!parsedData) {
                console.error(
                    "handleAddFolgepositionHandler: Cannot add folgeposition: parsedData is null."
                );
                closeAddFolgeModalHandler(); // Close the modal to prevent further errors.
                return; // Stop the function here.
            }
            // Check if we have a valid parent item (`grundtextFlatItem`) to add the new item to.
            if (!grundtextFlatItem || !grundtextFlatItem.nr) {
                console.error(
                    "handleAddFolgepositionHandler: Cannot add folgeposition: grundtextFlatItem or its nr is invalid."
                );
                closeAddFolgeModalHandler();
                return;
            }

            // --- Step 2: Prepare the Data ---
            // We create a deep copy of the original data. This is a crucial step.
            // We should never modify the original data directly ("mutation"). Instead, we create a copy
            // and then tell React to use this new, updated copy.
            const newOnlvData = JSON.parse(JSON.stringify(parsedData));

            // If the data has a metadata section, we update its timestamp.
            if (newOnlvData.metadaten) {
                setErstelltam(newOnlvData.metadaten);
            }

            // --- Step 3: Add the New Item ---
            let updatedData;
            try {
                // We call our specialized helper function to do the hard work of inserting
                // the `newFolgepositionObject` into the correct place in our `newOnlvData` structure,
                // identifying the parent by its unique number (`grundtextFlatItem.nr`).
                updatedData = addFolgepositionToOnlvStructure(
                    newOnlvData,
                    grundtextFlatItem.nr,
                    newFolgepositionObject
                );

                // Another safety check. If the function didn't return updated data, something went wrong.
                if (!updatedData) {
                    console.error(
                        "handleAddFolgepositionHandler: addFolgepositionToOnlvStructure did not return updated data."
                    );
                    closeAddFolgeModalHandler();
                    return;
                }
            } catch (error) {
                // If any error happens during the process, we log it and stop.
                console.error(
                    "handleAddFolgepositionHandler: Error calling addFolgepositionToOnlvStructure:",
                    error
                );
                closeAddFolgeModalHandler();
                return;
            }

            // --- Step 4: Update the Application State ---
            // If we've made it this far, the new item was added successfully to our data copy.
            // Now we need to tell the rest of the app about the changes.

            // Update the main parsed data state with the new version.
            setHookParsedData(updatedData);
            // Re-flatten the newly updated data so the table can display it correctly.
            const newFlatData = flattenOnlvData(updatedData);
            // Update the flat data state.
            setHookFlatData(newFlatData);
            // If a function to update the table data was provided, call it too.
            if (setTableData) {
                setTableData((current) => ({ ...current, data: updatedData }));
            }

            // --- Step 5: Clean Up ---
            // The process is complete, so we close the modal.
            closeAddFolgeModalHandler();
        },
        [
            // This is the dependency array for `useCallback`.
            // It tells React that this function only needs to be recreated if one of these values changes.
            parsedData,
            setHookParsedData,
            setHookFlatData,
            setTableData,
            closeAddFolgeModalHandler,
        ]
    );

    // Finally, the hook returns an object containing the state variables and handler functions.
    // The component that uses this hook can then use these to control the modal and its logic.
    return {
        isAddFolgeModalOpen, // The current visibility of the modal (true/false).
        currentGrundtextForFolge, // The parent item we're adding to.
        openAddFolgeModalHandler, // The function to open the modal.
        closeAddFolgeModalHandler, // The function to close the modal.
        handleAddFolgepositionHandler, // The function to save the new data.
    };
};
