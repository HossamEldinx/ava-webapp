// This file defines a React component that displays buttons for adding new "positions" (tasks or items) within a "ULG" (Unterleistungsgruppe, a sub-group of services).
// The main purpose of this component is to provide the user with options to add different types of positions to a specific ULG.
// When a user clicks one of these buttons, a pop-up window (a "modal") appears, allowing them to enter the details for the new position.

// This component manages its own state for the modal (whether it's open or closed) and which type of position is being created.
// It works closely with the `AddPositionModal` component, which is the actual pop-up form.

import React, { useState, useCallback } from "react"; // We need React to build the component. `useState` is a hook to manage component-level state (like if the modal is open). `useCallback` is a hook to optimize functions so they don't get recreated on every render.
import { FaPlus, FaShareAlt } from "react-icons/fa"; // We import icons to make our buttons look nice. `FaPlus` is a plus sign, and `FaShareAlt` is a share icon.
import AddPositionModal from "./AddPositionModal.jsx"; // This imports the modal component that will be shown when a button is clicked.

// This is our main component. It's a functional component that takes two "props" (properties) from its parent.
const UlgPositionButtons = ({
    ulgItem, // This prop contains the data for the specific ULG that these buttons belong to. We need this to know where to add the new position.
    onAddPosition, // This is a function passed down from the parent component. We call this function when the user saves a new position, to update the main application data.
}) => {
    // --- State Management ---
    // `useState` is a React hook that lets us add state to our component.
    // `isModalOpen` is a boolean (true/false) that keeps track of whether the "Add Position" modal is currently visible. It starts as `false`.
    const [isModalOpen, setIsModalOpen] = useState(false);
    // `positionType` is a string that will store what kind of position the user wants to create (e.g., "standalone" or "shared"). It starts as `null`.
    const [positionType, setPositionType] = useState(null);

    // --- Functions to Handle User Actions ---
    // `useCallback` is an optimization. It ensures that these functions are not recreated every time the component re-renders, which can improve performance.

    // This function is called when the user wants to add a "standalone" position.
    const openStandaloneModal = useCallback(() => {
        setPositionType("standalone"); // We set the type of position to "standalone".
        setIsModalOpen(true); // We set the modal state to `true`, which will make it appear on the screen.
    }, []); // The empty array `[]` means this function never needs to be recreated.

    // This function is called when the user wants to add a "shared" base position.
    const openSharedModal = useCallback(() => {
        setPositionType("shared"); // Set the type to "shared".
        setIsModalOpen(true); // Open the modal.
    }, []);

    // This function is called to close the modal.
    const closeModal = useCallback(() => {
        setIsModalOpen(false); // Hide the modal.
        setPositionType(null); // Reset the position type, so we're ready for the next time.
    }, []);

    // This function is called when the user clicks "Save" inside the modal.
    const handleSavePosition = useCallback(
        (newPosition) => {
            // `newPosition` is the data that the user entered in the modal form.
            onAddPosition(newPosition); // We call the function from our parent to actually add the new position to the main data.
            closeModal(); // After saving, we close the modal.
        },
        [onAddPosition, closeModal] // This function depends on `onAddPosition` and `closeModal`. If they change, this function will be recreated.
    );

    // The `return` statement describes what the component renders to the screen.
    return (
        // A React Fragment (`<>...</>`) is used to group multiple elements without adding an extra node to the DOM.
        <>
            {/* This is the container for the buttons themselves. The buttons are currently commented out, meaning they won't appear on the page. */}
            <div className="ulg-position-buttons">
                {/* Button to add a standalone position. It's disabled for now. */}
                {/* <button
                    className="add-position-btn standalone-btn"
                    onClick={openStandaloneModal}
                    title="Standalone Position hinzufügen"
                >
                    <FaPlus /> Standalone
                </button> */}
                {/* Button to add a shared position. Also disabled. */}
                {/* <button
                    className="add-position-btn shared-btn"
                    onClick={openSharedModal}
                    title="Shared Base Position hinzufügen"
                >
                    <FaShareAlt /> Shared
                </button> */}
            </div>

            {/* This is the logic to show the modal.
                The `&&` is a common JavaScript trick for conditional rendering.
                If `isModalOpen` is `true`, the `<AddPositionModal />` component will be rendered.
                If `isModalOpen` is `false`, it will render nothing.
            */}
            {isModalOpen && (
                <AddPositionModal
                    parentUlg={ulgItem} // We pass the ULG data to the modal so it knows its context.
                    positionType={positionType} // We tell the modal what type of position to create.
                    onClose={closeModal} // We give the modal our `closeModal` function so it can close itself.
                    onSave={handleSavePosition} // We give it our `handleSavePosition` function so it can save the data.
                />
            )}
        </>
    );
};

// We export the component so it can be used by other files in our project.
export default UlgPositionButtons;
