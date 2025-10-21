// This file defines a special "manager" (a custom React hook) that controls a series of pop-up windows (modals).
// Think of this manager as a traffic controller for modals. When a user decides to make several changes at once,
// this manager ensures that the right pop-up appears in the right order, one after another.
//
// The main idea is to create a step-by-step workflow. For example, if a user wants to add a new "LG" (main group)
// and then a "ULG" (sub-group) inside it, this manager will first show the modal for the LG, and after that's done,
// it will automatically open the modal for the ULG.
//
// It keeps track of all the changes the user wants to make (the "committed changes") and which step (which modal)
// is currently active. It handles moving from one step to the next and cleaning everything up when the process is finished.

import { useState, useCallback } from "react"; // We need these basic tools from React to create state (memory for our component) and stable functions.

// This is our custom hook, the "manager" for the modals.
// A hook in React is just a reusable function that lets you "hook into" React features like state and lifecycle.
// We name it with "use" at the beginning, which is a React convention.
export const useChangeBasedModalManager = () => {
    // --- STATE VARIABLES ---
    // State is like a component's memory. When state changes, React re-renders the component.

    // `committedChangeTypes`: This holds a list (an array) of the *kinds* of changes the user wants to make.
    // For example, if the user wants to add a new LG, then a ULG, this array would look like: ["lg", "ulg"]
    const [committedChangeTypes, setCommittedChangeTypes] = useState([]);

    // `committedChangeValues`: This holds the data associated with each change type.
    // It's a parallel array to `committedChangeTypes`. For the example above, it might hold the titles:
    // ["New Main Group", "New Sub Group"]
    const [committedChangeValues, setCommittedChangeValues] = useState([]);

    // `showChangeBasedModals`: This is a simple true/false switch (a boolean).
    // When it's `true`, our application knows it should display the modal workflow.
    // When `false`, all modals managed by this hook are hidden.
    const [showChangeBasedModals, setShowChangeBasedModals] = useState(false);

    // `activeChangeModalIndex`: This number keeps track of which step we are on in our workflow.
    // It's an index that points to an item in the `committedChangeTypes` and `committedChangeValues` arrays.
    // We start at -1, which means no modal is active. 0 is the first modal, 1 is the second, and so on.
    const [activeChangeModalIndex, setActiveChangeModalIndex] = useState(-1);

    // `currentInitialInfoForChangeModal`: This holds any pre-existing data for an item we are *editing*.
    // If the user clicks "edit" on an existing position, this state will hold that position's original data.
    // This allows the pop-up form to be pre-filled with the current values. It's `null` when creating new items.
    const [
        currentInitialInfoForChangeModal,
        setCurrentInitialInfoForChangeModal,
    ] = useState(null);

    // --- HANDLER FUNCTIONS ---
    // These functions handle events, like a user clicking a button. We wrap them in `useCallback`
    // for performance. `useCallback` tells React not to recreate the function on every render,
    // unless one of its dependencies (the values in the `[]` array at the end) changes.

    // `handleChangesCommittedForNewModals`: This function is the starting gun for our modal workflow.
    // It's called when the user has confirmed the list of changes they want to make.
    const handleChangesCommittedForNewModals = useCallback(
        (types, values, receivedInitialPositionData) => {
            // It receives the list of change types (e.g., ["lg", "ulg"]) and their values.
            setCommittedChangeTypes(types); // We store the types in our state.
            setCommittedChangeValues(values); // We store the values in our state.
            setCurrentInitialInfoForChangeModal(receivedInitialPositionData); // We store any initial data for editing.

            // We check if there are actually any changes to process.
            if (types && types.length > 0) {
                // If there are changes, we kick off the workflow.
                setActiveChangeModalIndex(0); // Set the active modal to the very first one (index 0).
                setShowChangeBasedModals(true); // Set the flag to `true` to show the modal container.
            } else {
                // If the user somehow committed an empty list of changes, we make sure everything is turned off and reset.
                setShowChangeBasedModals(false);
                setActiveChangeModalIndex(-1);
                setCurrentInitialInfoForChangeModal(null);
            }
            // These console.log calls are for debugging. They help developers see what's happening inside the hook in the browser's console.
            console.log(
                "useChangeBasedModalManager: Changes committed, preparing to show new modals:",
                { types, values, receivedInitialPositionData }
            );
            console.log(
                "useChangeBasedModalManager: receivedInitialPositionData structure:",
                JSON.stringify(receivedInitialPositionData, null, 2)
            );
        },
        [] // The empty dependency array `[]` means this function will be created only once and never change.
    );

    // `handleCloseChangeBasedModal`: This function is called when a single modal in the sequence is closed,
    // for example, by the user clicking a "Cancel" button or the "X" icon.
    const handleCloseChangeBasedModal = useCallback(() => {
        // We figure out what the index of the *next* modal in the sequence would be.
        const nextIndex = activeChangeModalIndex + 1;

        // We check if there is a next modal in our list (`committedChangeTypes`).
        if (nextIndex < committedChangeTypes.length) {
            // If there is another modal to show, we simply update the index to move to the next one.
            setActiveChangeModalIndex(nextIndex);
        } else {
            // If we've reached the end of the list, the entire workflow is finished.
            // We must clean up and reset all our state variables to their initial, empty state.
            setShowChangeBasedModals(false); // Hide the modal container.
            setActiveChangeModalIndex(-1); // Reset the active index.
            setCommittedChangeTypes([]); // Clear the list of changes.
            setCommittedChangeValues([]); // Clear the list of values.
            setCurrentInitialInfoForChangeModal(null); // Clear any leftover initial data.
        }
    }, [activeChangeModalIndex, committedChangeTypes.length]); // This function depends on these state variables, so it will be recreated if they change.

    // `handleSaveChangeBasedModalInputs`: This function is called when the user clicks the "Save" button inside one of the modals.
    const handleSaveChangeBasedModalInputs = useCallback(
        (inputs) => {
            // This console.log is for developers to inspect the data that was just saved from the modal form.
            console.log(
                "useChangeBasedModalManager: Data from ChangeBasedModal:",
                {
                    ...inputs, // The data from the modal's form fields.
                    originalType: committedChangeTypes[activeChangeModalIndex], // We add the type of change this was for (e.g., "lg").
                    originalValue:
                        committedChangeValues[activeChangeModalIndex], // And the original value associated with it.
                }
            );

            // This `if` block is a filter. The newer, more complex forms (like for "position", "ulg", etc.)
            // have their own dedicated save logic elsewhere. This part of the code is a fallback to handle
            // any other, simpler types of changes that might be introduced in the future.
            if (
                inputs.type !== "position" &&
                inputs.type !== "folgeposition" &&
                inputs.type !== "ungeteilteposition" &&
                inputs.type !== "ulg"
            ) {
                console.log(
                    "useChangeBasedModalManager: Processing non-position type:",
                    inputs.type,
                    inputs
                );
                // Future logic for saving other data types could be added here.
            }

            // After "saving", we need to move to the next modal in the sequence, or finish if we're at the end.
            // This logic is identical to the `handleCloseChangeBasedModal` function.
            const nextIndex = activeChangeModalIndex + 1;
            if (nextIndex < committedChangeTypes.length) {
                // If there's a next modal, we update the index to show it.
                setActiveChangeModalIndex(nextIndex);
            } else {
                // If not, the workflow is complete, and we reset everything.
                setShowChangeBasedModals(false);
                setActiveChangeModalIndex(-1);
                setCommittedChangeTypes([]);
                setCommittedChangeValues([]);
                setCurrentInitialInfoForChangeModal(null);
            }
        },
        [activeChangeModalIndex, committedChangeTypes, committedChangeValues] // This function depends on these state variables.
    );

    // --- RETURN VALUE ---
    // The hook returns an object containing all the state variables and handler functions.
    // This allows any component that *uses* this hook to access the state and call the functions
    // to control the modal workflow.
    return {
        committedChangeTypes,
        committedChangeValues,
        showChangeBasedModals,
        activeChangeModalIndex,
        currentInitialInfoForChangeModal,
        handleChangesCommittedForNewModals,
        handleCloseChangeBasedModal,
        handleSaveChangeBasedModalInputs,
        // We also expose the "setter" functions directly. This gives other components more power
        // to manually control the state if needed, which can be useful in complex scenarios.
        setActiveChangeModalIndex,
        setCurrentInitialInfoForChangeModal,
        setShowChangeBasedModals,
        setCommittedChangeTypes,
        setCommittedChangeValues,
    };
};
