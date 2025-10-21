// This file defines a React component that creates a set of control buttons and a filter input for an ONLV (ÖNORM LV) data table.
// Think of this as the "control panel" for our main data table. It gives the user ways to interact with the table, such as:
// - Filtering the data to find specific items.
// - Expanding or collapsing all the nested rows at once.
// - Exporting the current ONLV data to a file.
// - Opening a pop-up window (a "modal") to create a new entry in the table.
// This component doesn't manage any data itself; it just displays the controls and calls functions (passed in as "props") when the user interacts with them.
// This keeps our code organized, as the logic for filtering, expanding, etc., is handled in a different part of the application.

import React from "react"; // We need React to build our user interface components.
import { FaExpand, FaCompress, FaFileExport, FaPlus } from "react-icons/fa"; // These are icons from the 'react-icons' library. We use them to make our buttons look nice and intuitive.
import "../Onlv.css"; // This imports a CSS file that contains the styles for our controls, making them look good.

// This is our main component for the table controls. It's a "functional component" in React.
// It receives a bunch of information and functions (called "props") from its parent component.
// These props tell the component what to display and what to do when the user clicks a button or types in the filter box.
const OnlvTableControls = ({
    // --- Props related to Filtering ---
    filterText, // This is the current text that the user has typed into the filter box. It's a string.
    setFilterText, // This is a function that the parent component gives us. We call it whenever the user types in the filter box to update the filter text.

    // --- Props related to the state of the data ---
    loading, // This is a boolean (true/false) that tells us if the main table data is still loading. We use this to disable the controls so the user can't click them while data is being fetched.
    error, // This is a boolean that tells us if there was an error loading the data. We also use this to disable controls.
    flatData, // This is a simple, "flattened" list of all the rows in the table. We use its length to see if there's any data in the table to interact with.
    parsedData, // This holds the full, original ONLV data structure. We need this for actions like exporting the data or creating a new item.

    // --- Props for actions the user can take ---
    expandAll, // This is a function to expand all the nested rows in the table. It's called when the user clicks the "Expand All" button.
    collapseAll, // This is a function to collapse all the nested rows. It's called when the user clicks the "Collapse All" button.
    handleExport, // This is a function that gets called when the user clicks the "Export" button. It handles the logic for creating and downloading the export file.
    openCreateModal, // This is a function to open a pop-up window (a "modal") for creating a new entry.

    // --- Props for context when creating a new item ---
    selectedPositionInfo, // This holds information about the currently selected row in the table. We use this to provide context when creating a new item.
    lastPositionInfo, // This holds information about the last selected row, in case no row is currently selected. This is a fallback.
}) => {
    // The `return` statement describes what the component should look like on the screen.
    // It's written in JSX, which looks like HTML but is actually JavaScript.
    return (
        // This is the main container for all our controls. The `className` is used for styling from our CSS file.
        <div className="viewer-controls">
            {/* This section contains the filter input field. */}
            <div className="filter-area">
                <input
                    type="text" // This makes it a standard text input box.
                    placeholder="Filter..." // This is the greyed-out text that appears in the box before the user types anything.
                    value={filterText} // We connect the input's value to the `filterText` prop. This makes it a "controlled component," meaning React is in control of its state.
                    onChange={(e) => setFilterText(e.target.value)} // This is the event handler that gets called every time the user types. `e.target.value` is what the user typed, and we pass it to our `setFilterText` function to update the state.
                    className="filter-input" // A class for styling the input box.
                    disabled={loading || !!error || flatData.length === 0} // The `disabled` attribute makes the input field un-editable. We disable it if data is loading, if there was an error, or if there's no data to filter.
                />
            </div>
            {/* This section contains all the action buttons (Expand, Collapse, Export, Add). */}
            <div className="view-actions">
                {/* Expand All Button */}
                <button
                    onClick={() => expandAll(flatData)} // When clicked, this calls the `expandAll` function that was passed in as a prop.
                    disabled={loading || flatData.length === 0} // We disable the button if data is loading or if there are no rows to expand.
                    title="Alle Einträge ausklappen" // This text appears as a tooltip when the user hovers over the button.
                    className="viewer-control-button" // A class for styling.
                >
                    <FaExpand style={{ marginRight: "5px" }} />{" "}
                    {/* This is the "Expand" icon. We add a little space to its right. */}
                </button>

                {/* Collapse All Button */}
                <button
                    onClick={collapseAll} // When clicked, this calls the `collapseAll` function.
                    disabled={loading || flatData.length === 0} // We disable it if data is loading or if there's nothing to collapse.
                    title="Alle Einträge einklappen" // The tooltip for this button.
                    className="viewer-control-button"
                >
                    <FaCompress style={{ marginRight: "5px" }} />{" "}
                    {/* The "Collapse" icon. */}
                </button>

                {/* Export Button */}
                <button
                    onClick={handleExport} // When clicked, this calls the `handleExport` function.
                    disabled={loading || !parsedData} // We disable it if data is loading or if there's no parsed data to export.
                    title="ONLV Daten exportieren" // The tooltip.
                    className="viewer-control-button"
                >
                    <FaFileExport style={{ marginRight: "5px" }} />{" "}
                    {/* The "Export" icon. */}
                </button>

                {/* Create New Entry Button */}
                <button
                    onClick={() => {
                        // When this button is clicked, we first figure out what data to pass to the creation modal.
                        // We prefer to use the currently selected position, but if nothing is selected, we fall back to the last known position.
                        const dataToPass =
                            selectedPositionInfo || lastPositionInfo;
                        // Then, we call the `openCreateModal` function and pass that data along.
                        openCreateModal(dataToPass);
                    }}
                    disabled={loading || !parsedData} // We disable it if data is loading or if there's no data context to create a new item within.
                    title="Neuen Eintrag erstellen" // The tooltip.
                    className="viewer-control-button"
                >
                    <FaPlus style={{ marginRight: "5px" }} />{" "}
                    {/* The "Plus" icon, for adding something new. */}
                </button>
            </div>
        </div>
    );
};

// We export our component so that other parts of our application can import and use it.
export default OnlvTableControls;
