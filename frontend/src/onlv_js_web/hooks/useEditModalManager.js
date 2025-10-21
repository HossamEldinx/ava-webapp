// This file is like a "manager" for a pop-up window (a "modal") that lets users edit an existing item in the ONLV project.
// Think of it as the brain behind the "Edit Position" modal.
//
// The main idea of this file is to create a special tool (a "custom hook" in React)
// that handles all the logic for this pop-up window. This keeps our code organized
// because the visual part of the modal is in another file, and the logic is all here.
//
// This hook, called `useEditModalManager`, does a few key things:
// 1. It keeps track of whether the "Edit" pop-up is currently open or closed.
// 2. It stores the information of the specific item the user wants to edit.
// 3. It provides functions to open the pop-up, close it, and save the changes.
// 4. When the user saves their changes, it updates the main project data in all the right places,
//    making sure both the underlying data structure and what the user sees on the screen are in sync.

import { useState, useCallback } from "react"; // We need these two tools from React. `useState` lets us store information (like if the modal is open), and `useCallback` helps us make our functions more efficient.
import { extractPositionInfo } from "../../onlv/OnlvUtils"; // This is a helper function from another file that can find and pull out all the detailed information about a specific project item.
import { updatePositionInNestedOnlv, setErstelltam } from "../../onlv/OnlvEdit"; // These are two more helpers. `updatePositionInNestedOnlv` knows how to find an item in our complex project data and update it. `setErstelltam` updates the "creation/modification" timestamp.
import { flattenOnlvData } from "../../onlv/OnlvDisplay.utils"; // This helper takes our complex, nested project data and turns it into a simple, flat list that's easy to display in a table.

/**
 * This is our custom hook, `useEditModalManager`. It's a special function that bundles up all the logic for the "Edit" modal.
 * By using this hook, our main component doesn't have to worry about the details of how the modal works.
 * It just uses the tools this hook provides.
 *
 * @param {Array<object>} flatData - This is the simple, flat list of all project items that we show to the user in a table.
 * @param {object} parsedData - This is the full, complex, and nested data structure of the entire ONLV project. It's the "source of truth".
 * @param {function} setHookFlatData - This is a function that lets us update the `flatData` list in our main component. We need this to refresh the user's view after an edit.
 * @param {function} setHookParsedData - This is a function to update the main `parsedData` object.
 * @param {function} setTableData - This function updates the data in a special shared space (called a "Context") so other parts of the app can see the changes.
 * @param {function} setSelectedPositionInfo - This function updates the state that holds information about the currently selected item in the UI.
 *
 * @returns {object} The hook gives back an object with all the tools needed to manage the modal:
 *   - `isModalOpen`: A variable that is `true` if the modal is open and `false` if it's closed.
 *   - `editingPosition`: An object holding all the data for the item currently being edited.
 *   - `openEditModalHandler`: A function to open the modal for a specific item.
 *   - `closeEditModalHandler`: A function to close the modal.
 *   - `handleSaveEditHandler`: A function that saves the changes the user made.
 */
export const useEditModalManager = (
    flatData,
    parsedData,
    setHookFlatData,
    setHookParsedData,
    setTableData,
    setSelectedPositionInfo
) => {
    // Inside our hook, we use `useState` to create two pieces of state.
    // State is like memory for our component. When it changes, React knows to update the screen.

    const [isModalOpen, setIsModalOpen] = useState(false); // This state keeps track of whether the modal is visible or not. It starts as `false` (closed).
    const [editingPosition, setEditingPosition] = useState(null); // This state holds the data of the item the user is currently editing. It starts as `null` because nothing is being edited at the beginning.

    // This function is responsible for opening the pop-up window.
    // We wrap it in `useCallback` to prevent it from being recreated on every render, which makes our app a little faster.
    // It only gets recreated if one of the things in the dependency array `[]` at the end changes.
    const openEditModalHandler = useCallback(
        (positionItem) => {
            // First, we check if we have the item to edit (`positionItem`) and the flat list of data (`flatData`).
            if (positionItem && flatData) {
                // If we do, we use our helper function `extractPositionInfo` to get all the juicy details about this item.
                const positionInfo = extractPositionInfo(
                    positionItem,
                    flatData
                );
                // We then store this detailed information in our `editingPosition` state. If for some reason we can't get the details, we just use the basic item info.
                setEditingPosition(positionInfo || positionItem);
                // If the parent component gave us a function to update the selected position info, we call it.
                if (setSelectedPositionInfo) {
                    setSelectedPositionInfo(positionInfo);
                }
            } else {
                // If we don't have the flat data, we'll just use the basic item info as a fallback.
                setEditingPosition(positionItem);
            }
            // Finally, we set `isModalOpen` to `true` to make the pop-up appear on the screen.
            setIsModalOpen(true);
        },
        [flatData, setSelectedPositionInfo, setEditingPosition, setIsModalOpen] // These are the dependencies for `useCallback`. If any of these change, the function will be recreated.
    );

    // This function closes the pop-up window.
    // It's also wrapped in `useCallback` for efficiency. It has no dependencies `[]`, so it will never be recreated.
    const closeEditModalHandler = useCallback(() => {
        // We set the modal visibility to `false`.
        setIsModalOpen(false);
        // We clear out the editing data, since we're done with it.
        setEditingPosition(null);
    }, []); // No dependencies means this function is created once and never changes.

    // This is the function that runs when the user clicks the "Save" button in the modal.
    const handleSaveEditHandler = useCallback(
        (updatedPosition) => {
            // We don't need to manually update the flat data list anymore.
            // Instead, we'll update the main nested data, and then create a new flat list from it. This is safer.

            // If for some reason we don't have the main project data, we can't save. So we just close the modal and stop.
            if (!parsedData) {
                console.error(
                    "Save handler called without parsedData. Cannot update."
                );
                closeEditModalHandler();
                return;
            }

            // It's a good practice to work on a copy of the data, not the original.
            // `JSON.parse(JSON.stringify(...))` is a quick way to create a deep copy of our project data.
            const newOnlvData = JSON.parse(JSON.stringify(parsedData));

            // We check if the data has a "metadaten" section and update its timestamp to now.
            if (newOnlvData.metadaten) {
                setErstelltam(newOnlvData.metadaten);
            }

            // We use our helper function `updatePositionInNestedOnlv` to find the original item in our data copy and replace it with the `updatedPosition`.
            const updated = updatePositionInNestedOnlv(
                newOnlvData,
                updatedPosition
            );

            // If the update was successful...
            if (updated) {
                // We tell our parent component to update its main nested data state with our modified copy.
                setHookParsedData(newOnlvData);

                // Now that the "source of truth" is updated, we re-flatten it to get a new, correct list for the UI.
                const newFlatItems = flattenOnlvData(newOnlvData);
                // And we tell the parent component to update the flat data state.
                setHookFlatData(newFlatItems);

                // If there's a shared table context, we update its data too, so everything stays in sync.
                if (setTableData) {
                    setTableData((current) => ({
                        ...current,
                        data: newOnlvData, // The table context should also hold the latest nested data.
                    }));
                }
            } else {
                // If for some reason the update failed, we log a message.
                console.warn(
                    "Could not find and update the position in the nested data structure."
                );
            }

            // Whether the save worked or not, we always close the modal when the process is finished.
            closeEditModalHandler();
        },
        [
            parsedData,
            setHookFlatData,
            setHookParsedData,
            setTableData,
            closeEditModalHandler,
        ] // The dependencies for our save handler.
    );

    // Finally, the hook returns an object containing all the states and functions
    // that the parent component will need to interact with the modal.
    return {
        isModalOpen,
        editingPosition,
        openEditModalHandler,
        closeEditModalHandler,
        handleSaveEditHandler,
    };
};
