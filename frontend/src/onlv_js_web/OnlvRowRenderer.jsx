// This file is like a blueprint for creating a single row in our main ONLV data table.
// Think of the main table as a big spreadsheet. This file tells the computer exactly how to draw one line in that spreadsheet.
// The key challenge is that not all rows are the same. Some are main categories ("LG"), some are sub-categories ("ULG"),
// and some are actual work items ("position"). This file handles all that variety.

// The main logic of this file is to:
// 1. Receive data for a single item (the `item` prop).
// 2. Figure out what "type" of item it is (e.g., "lg", "ulg", "position").
// 3. Based on the type, render the row with the correct layout, indentation, and information.
// 4. Handle user interactions for that specific row, such as:
//    - Clicking to expand or collapse it to see more details (like a long description).
//    - Clicking an "edit" icon to change information.
//    - Allowing direct, in-place editing for certain fields like "Menge" (quantity) and "Einheit" (unit).
//    - Showing buttons to add new items within a category (e.g., adding a "position" to a "ULG").
// 5. Displaying special indicators or flags for different kinds of positions.

// We need React to build our user interface components.
import React, { useState } from "react";
// We import some icons (like arrows and a plus sign) from a library called "react-icons".
import { FaEdit, FaPlus, FaCaretRight, FaCaretDown } from "react-icons/fa";
// This is a helper component that knows how to render HTML content safely.
import { RenderHtml } from "../onlv/components/display/RenderHtml";
// This component is used to display graphics or images associated with a row.
import { GrafikDisplay } from "../onlv/components/display/Grafik";
// These are helper functions and data from another file. `getValue` helps get data safely, and `einheitOptions` is a list of measurement units.
import { getValue, einheitOptions } from "../onlv/OnlvEdit"; // Assuming these are needed
// This component shows the buttons for adding different types of positions within a ULG.
import UlgPositionButtons from "./components/UlgPositionButtons"; // Assuming this is needed
// These are more helper functions. `getDisplayNr` calculates the correct item number to show, and `extractPositionInfo` gathers all data for a position.
import { getDisplayNr, extractPositionInfo } from "../onlv/OnlvUtils"; // Import getDisplayNr and extractPositionInfo

// This is our main component for rendering a single row. It's a reusable building block.
// It takes a lot of information (props) to know what to show and how to behave.
const OnlvRow = ({
    item, // The actual data object for the row we are currently rendering.
    flatData, // The entire list of all items in the ONLV, used to find parents or children.
    parentMap, // A special map that helps us quickly find the parent of any item.
    expandedIds, // A list of which rows are currently expanded (so we know whether to show their details).
    toggleExpand, // A function to call when the user clicks the expand/collapse arrow.
    openEditModal, // A function to open a pop-up window to edit the item.
    handleSaveEdit, // A function to save changes made directly in the row (like changing the quantity).
    handleAddPosition, // A function to add a new position to a ULG.
    openAddFolgeModal, // A function to open a pop-up for adding a "Folgeposition" (a follow-up item).
    editingEinheitForId, // A variable that tells us if the "Einheit" (unit) for this row is currently being edited.
    setEditingEinheitForId, // A function to turn the "Einheit" editing mode on or off.
    editingMengeForId, // A variable that tells us if the "Menge" (quantity) for this row is being edited.
    setEditingMengeForId, // A function to turn the "Menge" editing mode on or off.
    currentMengeValue, // This holds the temporary value of the quantity while the user is typing it.
    setCurrentMengeValue, // A function to update that temporary quantity value.
    setSelectedPositionInfo, // A function to tell the main app that this row has been selected.
    setPositionInteractionHistory, // A function to keep a history of which rows the user has clicked on.
}) => {
    const [tooltip, setTooltip] = useState({
        visible: false,
        content: null,
        x: 0,
        y: 0,
    });
    // This is a special rule. A "grundtext" is a base description. If it has "folgeposition" children (follow-up items),
    // we don't want to show the grundtext row itself. Instead, the information will be shown with its children.
    // So, we check if this item is a grundtext and if it has any position children.
    console.log(
        "OnlvRowRenderer - Processing item:",
        item.id,
        item.type,
        "Level:",
        item.level,
        "ParentId:",
        item.parentId,
        "ChildrenCount:",
        item.childrenCount
    );
    if (
        item.type === "grundtext_desc" ||
        item.type === "grundtext_static_desc"
    ) {
        // We look through all the data to see if any item has this item as its parent and is a "position".
        const hasPositionChildren = flatData.some(
            (child) => child.parentId === item.id && child.type === "position"
        );
        console.log(
            `OnlvRowRenderer - Grundtext ${item.id} has position children:`,
            hasPositionChildren
        );
        // If it does have position children, we stop right here and don't render anything for this item.
        if (hasPositionChildren) {
            return null;
        }
    }

    if (item.type === "vorbemerkung") {
        return null; // Don't render vorbemerkung as a separate row
    }

    // This function is called when the user clicks on a row that is a position, ULG, or grundtext.
    const handlePositionSelect = () => {
        // We only do something if the clicked item is one of these types.
        if (
            item.type === "position" ||
            item.type === "grundtext_position" ||
            item.type === "ungeteilteposition" ||
            item.type === "grundtext_desc" ||
            item.type === "grundtext_static_desc" ||
            item.type === "ulg" // Add ULG type to handle ULG clicks
        ) {
            // We use a helper function to gather all the important details about this position.
            const positionInfo = extractPositionInfo(item, flatData);
            // We tell the main app to set this as the currently selected position.
            setSelectedPositionInfo(positionInfo);

            // We also keep a history of the last 10 items the user clicked on.
            setPositionInteractionHistory((prev) => {
                const newHistory = [positionInfo, ...prev.slice(0, 9)];
                console.log(
                    "Position Interaction History (from OnlvRow):",
                    newHistory
                );
                return newHistory;
            });
        }
    };

    // Check if the current item's ID is in the list of expanded IDs.
    const isExpanded = expandedIds.has(item.id);

    // Debug logging for ULG items
    if (item.type === "ulg") {
        console.log(
            `ULG Debug - ID: ${item.id}, childrenCount: ${
                item.childrenCount
            }, hasChildren: ${flatData.some(
                (child) => child.parentId === item.id
            )}, canExpand will be: ${
                item.childrenCount > 0 ||
                flatData.some((child) => child.parentId === item.id)
            }`
        );
    }

    // Determine if this row should have an expand/collapse button.
    // Generally, if it's a category (like LG or ULG) and has children, it can be expanded.
    const canExpand =
        (item.type === "lg" && item.childrenCount > 0) ||
        (item.type === "ulg" &&
            (item.childrenCount > 0 ||
                flatData.some((child) => child.parentId === item.id))) ||
        (item.type === "grundtext_desc" && item.childrenCount > 0) || // This specific grundtext_desc will only be rendered if it has NO folgeposition children
        (item.type === "svb" &&
            (item.childrenCount > 0 || (item.data && item.data.text))) ||
        // Add positions that have expandable content (langtext)
        ((item.type === "position" ||
            item.type === "grundtext_position" ||
            item.type === "ungeteilteposition") &&
            (item.langtext ||
                item.langtextRaw ||
                (item.folgeposition &&
                    Array.isArray(item.folgeposition) &&
                    item.folgeposition.length > 0) ||
                item.folgepositionLangtext));
    // This part calculates how much to indent the row to create a nested, tree-like view.
    // We find the parent of the current item.
    const parentItem = flatData.find(
        (dataItem) => dataItem.id === item.parentId
    );
    // If the parent is an "lg", we add a little extra indentation to its children.
    const isChildOfLg = parentItem && parentItem.type === "lg";
    const extraIndent = isChildOfLg ? 20 : 0; // Add 20px extra indent if child of lg

    // The base indentation is determined by how "deep" the item is in the hierarchy (its level).
    const basePaddingLeft = item.level * 20 + extraIndent;
    // "lg" rows get some extra padding to make them look bigger.
    const additionalPadding = item.type === "lg" ? 20 : 0; // Add 20px padding for lg rows
    // The first column ("Nr.") has a different padding calculation for positions vs. categories.
    const colNrPaddingLeft =
        item.type !== "ulg" && item.type !== "lg"
            ? 60
            : basePaddingLeft + additionalPadding;
    // We create a style object that we can apply to our table cells.
    const indentStyle = {
        paddingLeft: `${colNrPaddingLeft}px`,
        paddingTop: `${additionalPadding}px`,
        paddingBottom: `${additionalPadding}px`,
        paddingRight: `${additionalPadding}px`,
    };
    // We build a string of CSS classes to style the row based on its level and type.
    // This helps us make "lg" rows look different from "ulg" rows, for example.
    let rowClass = `row-level-${item.level} row-type-${item.type}`;
    if (item.status === "fixed") rowClass += " fixed-position-row"; // Add class for fixed positions

    if (item.type === "lg") rowClass += " lg-row";
    if (item.type === "ulg") rowClass += " ulg-row";
    if (item.type === "vorbemerkung") rowClass += " vb-row";
    if (item.type === "grundtext_desc") rowClass += " gt-desc-row";
    if (item.type === "grundtext_static_desc")
        rowClass += " gt-static-desc-row";
    // If the item is any kind of "position", we add more specific classes.
    if (
        item.type === "position" ||
        item.type === "grundtext_position" ||
        item.type === "ungeteilteposition"
    ) {
        rowClass += " position-row";
        // These classes are for special position types, like "eventual" or "not offered".
        if (item.pzzv?.eventualposition !== undefined)
            rowClass += " eventual-position";
        if (item.pzzv?.nichtangeboten !== undefined)
            rowClass += " not-offered-position";
        if (item.pzzv?.wahlposition !== undefined) rowClass += " wahl-position";
        if (item.pzzv?.grundposition !== undefined)
            rowClass += " grund-position";
    }

    // This is a major fork in the logic. We render "position" type rows completely differently
    // from other types like "lg" or "ulg".
    if (
        item.type === "position" ||
        item.type === "grundtext_position" ||
        item.type === "ungeteilteposition"
    ) {
        // This is a small helper function for when the user changes the "Einheit" (unit) from the dropdown.
        const handleEinheitChangeAndSave = (e) => {
            const newEinheit = e.target.value; // Get the new unit from the dropdown.
            const updatedPosition = { ...item, einheit: newEinheit }; // Create an updated version of the item.
            handleSaveEdit(updatedPosition); // Call the main save function.
            setEditingEinheitForId(null); // Turn off the editing mode for the unit.
        };

        // We use React.Fragment because we are rendering multiple table rows (`<tr>`) here:
        // one for the main data and another for the expanded long description.
        return (
            <React.Fragment key={item.id}>
                {/* This is the main row for the position. */}
                <tr
                    className={`${rowClass} stichwort-row`}
                    onClick={handlePositionSelect} // When the row is clicked, we select it.
                    style={{ cursor: "pointer" }} // The mouse cursor changes to a pointer to show it's clickable.
                >
                    {/* Column 1: The position number. */}
                    <td className="col-nr" style={indentStyle}>
                        {getDisplayNr(item, flatData, parentMap)}
                    </td>
                    {/* Column 2: The short description ("Stichwort"). */}
                    <td className="col-description" style={indentStyle}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            {/* The expand/collapse button (the little arrow). */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(item.id, flatData);
                                }}
                                className="expand-toggle"
                                aria-expanded={isExpanded}
                                title={isExpanded ? "Einklappen" : "Ausklappen"}
                            >
                                {isExpanded ? (
                                    <FaCaretDown />
                                ) : (
                                    <FaCaretRight />
                                )}
                            </button>
                            {/* The actual short description text. */}
                            <div
                                className="stichwort-content"
                                style={{ marginLeft: "5px" }}
                            >
                                {item.stichwort}
                            </div>
                            {/* The edit icon. */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginLeft: "10px",
                                }}
                            >
                                {item.type === "grundtext_position" && (
                                    <div style={{ marginRight: "10px" }}></div>
                                )}
                                <FaEdit
                                    onClick={(e) => {
                                        e.stopPropagation(); // This stops the row's click event from firing too.
                                        openEditModal(item); // Open the main edit pop-up.
                                    }}
                                    className="edit-icon-stichwort"
                                    title="Position bearbeiten"
                                />
                            </div>
                        </div>
                    </td>
                    {/* Column 3: The quantity ("Menge"), which can be edited directly in the table. */}
                    <td className="col-menge">
                        {/* If we are in editing mode for this item's quantity... */}
                        {editingMengeForId === item.id ? (
                            // ...render an input field.
                            <input
                                key={`menge-input-${item.id}`} // A key helps React manage focus correctly.
                                type="number"
                                min="0"
                                value={currentMengeValue} // The value is the temporary one from our state.
                                onChange={(e) => {
                                    // When the user types, we update the temporary value.
                                    const val = e.target.value;
                                    let newMenge;
                                    if (val === "") {
                                        newMenge = ""; // Allow the user to clear the input.
                                    } else {
                                        const numVal = parseFloat(val);
                                        newMenge = numVal < 0 ? "0" : val; // Don't allow negative numbers.
                                    }
                                    setCurrentMengeValue(newMenge); // Update the temporary state.
                                }}
                                onBlur={() => {
                                    // When the user clicks away from the input field (onBlur)...
                                    // ...we finalize the edit.
                                    const finalLvMenge =
                                        currentMengeValue === ""
                                            ? "n.a." // If it's empty, save it as "not applicable".
                                            : currentMengeValue;
                                    const updatePayload = {
                                        ...item,
                                        lvmenge: finalLvMenge,
                                    };
                                    handleSaveEdit({
                                        ...updatePayload,
                                    });
                                    setEditingMengeForId(null); // Exit editing mode.
                                }}
                                style={{
                                    padding: "4px 8px",
                                    background: "#2d3748",
                                    border: "1px solid #4a5568",
                                    color: "#e2e8f0",
                                    borderRadius: "4px",
                                    width: "70px", // Adjust width as needed
                                }}
                                autoFocus // Automatically focus the input field when it appears.
                            />
                        ) : (
                            // ...otherwise, just display the quantity text.
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>
                                    {/* This logic formats the number nicely to 2 decimal places. */}
                                    {typeof item.lvmenge === "number"
                                        ? item.lvmenge.toFixed(2)
                                        : !isNaN(parseFloat(item.lvmenge)) &&
                                          item.lvmenge !== null &&
                                          item.lvmenge !== "n.a." &&
                                          item.lvmenge !== ""
                                        ? parseFloat(item.lvmenge).toFixed(2)
                                        : item.lvmenge || "n.a."}
                                </span>
                                {/* The small edit icon next to the quantity. */}
                                <FaEdit
                                    onClick={() => {
                                        // When clicked, we set up the editing mode.
                                        const initialValue =
                                            item.lvmenge === "n.a." ||
                                            !item.lvmenge
                                                ? ""
                                                : item.lvmenge || "";
                                        setCurrentMengeValue(initialValue); // Set the temporary value.
                                        setEditingMengeForId(item.id); // Turn on editing mode for this item.
                                    }}
                                    className="edit-icon-inline"
                                    title="Menge bearbeiten"
                                    style={{
                                        cursor: "pointer",
                                        marginLeft: "5px",
                                    }}
                                />
                            </div>
                        )}
                    </td>
                    {/* Column 4: The unit ("Einheit"), which is also editable. */}
                    <td className="col-einheit">
                        {/* If we are in editing mode for the unit... */}
                        {editingEinheitForId === item.id ? (
                            // ...render a dropdown menu.
                            <select
                                value={item.einheit || ""}
                                onChange={handleEinheitChangeAndSave} // When a new unit is selected, save it.
                                onBlur={() => setEditingEinheitForId(null)} // If the user clicks away, cancel editing.
                                className="einheit-select"
                                title="Einheit ändern"
                                autoFocus
                                style={{
                                    padding: "4px 8px",
                                    background: "#2d3748",
                                    border: "1px solid #4a5568",
                                    color: "#e2e8f0",
                                    borderRadius: "4px",
                                    minWidth: "80px",
                                    appearance: "none",
                                }}
                            >
                                <option value="" disabled>
                                    Wählen...
                                </option>
                                {/* We loop through all the available units and create options for the dropdown. */}
                                {einheitOptions.map((group) => (
                                    <optgroup
                                        label={group.label}
                                        key={group.label}
                                    >
                                        {group.options.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        ) : (
                            // ...otherwise, just display the unit text.
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>{item.einheit}</span>
                                {/* The small edit icon next to the unit. */}
                                <FaEdit
                                    onClick={() =>
                                        setEditingEinheitForId(item.id)
                                    }
                                    className="edit-icon-inline"
                                    title="Einheit bearbeiten"
                                    style={{
                                        cursor: "pointer",
                                        marginLeft: "5px",
                                    }}
                                />
                            </div>
                        )}
                    </td>
                    {/* Column 5: Position Type Flags. */}
                    <td className="col-type">
                        {/* We show single-letter flags for special position types. */}
                        {item.pzzv && (
                            <>
                                {item.pzzv.eventualposition !== undefined && (
                                    <span title="Eventualposition">E</span>
                                )}
                                {item.pzzv.nichtangeboten !== undefined && (
                                    <span
                                        title="Nicht Angeboten"
                                        className="not-offered-flag"
                                    >
                                        N.Ang.
                                    </span>
                                )}
                                {item.pzzv.wahlposition !== undefined && (
                                    <span title="Wahlposition">W</span>
                                )}
                                {item.pzzv.grundposition !== undefined && (
                                    <span title="Grundposition">G</span>
                                )}
                            </>
                        )}
                    </td>
                    {/* Column 6: Origin ("Herkunft"). */}
                    <td className="col-herkunft">{item.herkunft}</td>
                    {/* Column 7: Graphics/Images. */}
                    <td className="col-grafik">
                        {/* If there are any graphics linked, we display them. */}
                        {item.grafikLinkIds?.length > 0 && (
                            <div className="grafik-links-container">
                                {item.grafikLinkIds.map((linkId) => (
                                    <GrafikDisplay
                                        key={linkId}
                                        linkId={linkId}
                                        grafikTabelle={item.grafikTabelle}
                                    />
                                ))}
                            </div>
                        )}
                    </td>
                </tr>
                {/* This is the second row, which is only shown if the item is expanded. */}
                {isExpanded && (
                    <tr
                        key={`${item.id}-langtext`}
                        className={`${rowClass} langtext-row`}
                    >
                        {/* The first cell is empty to maintain alignment. */}
                        <td className="col-nr"></td>
                        {/* The second cell spans across all other columns to hold the long description. */}
                        <td
                            className="col-description"
                            style={{
                                paddingLeft: `${
                                    item.level * 20 + extraIndent
                                }px`,
                            }}
                            colSpan="6"
                        >
                            <div className="langtext-content">
                                {/* This is the most complex part of the file. It decides which long text ("Langtext") to show. */}
                                {/* A "folgeposition" is a child of a "grundtext". It needs to show the grundtext's description first, then its own. */}
                                {(item.type === "position" ||
                                    item.type === "ungeteilteposition") &&
                                item.parentId &&
                                flatData.some(
                                    (parent) =>
                                        parent.id === item.parentId &&
                                        parent.type === "grundtext_desc" &&
                                        parent.data?.text
                                ) ? (
                                    // Case 1: This is a "folgeposition" under a "grundtext_desc".
                                    <>
                                        {/* First, display the parent's (grundtext's) long description. */}
                                        <div className="grundtext-langtext">
                                            {(() => {
                                                const parentGrundtext =
                                                    flatData.find(
                                                        (parent) =>
                                                            parent.id ===
                                                            item.parentId
                                                    );
                                                if (parentGrundtext) {
                                                    if (
                                                        parentGrundtext.langtext
                                                    ) {
                                                        return (
                                                            <RenderHtml
                                                                key={`${
                                                                    parentGrundtext.id
                                                                }-grundtext-langtext-${JSON.stringify(
                                                                    parentGrundtext.langtext
                                                                )}`}
                                                                node={
                                                                    parentGrundtext.langtext
                                                                }
                                                            />
                                                        );
                                                    } else if (
                                                        parentGrundtext.data
                                                            ?.text
                                                    ) {
                                                        return (
                                                            <RenderHtml
                                                                key={`${
                                                                    parentGrundtext.id
                                                                }-grundtext-${JSON.stringify(
                                                                    parentGrundtext
                                                                        .data
                                                                        .text
                                                                )}`}
                                                                node={
                                                                    parentGrundtext
                                                                        .data
                                                                        .text
                                                                }
                                                            />
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        {/* Then, display this item's (the folgeposition's) own long description. */}
                                        <div
                                            className="folgeposition-langtext"
                                            style={{
                                                marginTop: "10px",
                                                paddingTop: "10px",
                                            }}
                                        >
                                            {/* We have a couple of different places the text could be stored, so we check them in order. */}
                                            {(() => {
                                                // Debug logging
                                                console.log(
                                                    `Folgeposition ${item.id} langtext debug:`,
                                                    {
                                                        hasLangtextRaw:
                                                            !!item.langtextRaw,
                                                        langtextRaw:
                                                            item.langtextRaw,
                                                        hasLangtext:
                                                            !!item.langtext,
                                                        langtext: item.langtext,
                                                        stichwort:
                                                            item.stichwort,
                                                    }
                                                );

                                                if (item.langtextRaw) {
                                                    return (
                                                        <RenderHtml
                                                            key={`${
                                                                item.id
                                                            }-folge-langtext-raw-${JSON.stringify(
                                                                item.langtextRaw
                                                            )}`}
                                                            node={
                                                                item.langtextRaw
                                                            }
                                                        />
                                                    );
                                                } else if (item.langtext) {
                                                    return (
                                                        <RenderHtml
                                                            key={`${
                                                                item.id
                                                            }-folge-langtext-${JSON.stringify(
                                                                item.langtext
                                                            )}`}
                                                            node={item.langtext}
                                                        />
                                                    );
                                                } else {
                                                    return (
                                                        <div className="no-langtext-message">
                                                            Keine Beschreibung
                                                            für Folgeposition
                                                            verfügbar
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </>
                                ) : item.type === "grundtext_position" ? (
                                    // Case 2: This is a special "grundtext_position" that contains both the base and follow-up text.
                                    <>
                                        {/* Display the base description. */}
                                        {item.langtext &&
                                        typeof item.langtext.p === "string" &&
                                        item.langtext.p.trim() !== "" ? (
                                            <div className="grundtext-langtext-shared">
                                                <RenderHtml
                                                    key={`${
                                                        item.id
                                                    }-grundtext-shared-${JSON.stringify(
                                                        item.langtext
                                                    )}`}
                                                    node={item.langtext}
                                                />
                                            </div>
                                        ) : (
                                            <div className="no-langtext-message">
                                                Kein Grundtext verfügbar
                                            </div>
                                        )}

                                        {/* Display the follow-up description. */}
                                        {item.folgeposition &&
                                        Array.isArray(item.folgeposition) &&
                                        item.folgeposition.length > 0 ? (
                                            <div
                                                className="folgeposition-langtext-shared"
                                                style={{
                                                    marginTop: "10px",
                                                    paddingTop: "10px",
                                                    borderTop:
                                                        "1px dotted #ccc",
                                                }}
                                            >
                                                {item.folgeposition.map(
                                                    (folge, index) =>
                                                        folge[
                                                            "pos-eigenschaften"
                                                        ]?.langtext ? (
                                                            <div
                                                                key={`folge-${index}`}
                                                                style={{
                                                                    marginBottom:
                                                                        index <
                                                                        item
                                                                            .folgeposition
                                                                            .length -
                                                                            1
                                                                            ? "10px"
                                                                            : "0",
                                                                }}
                                                            >
                                                                <RenderHtml
                                                                    key={`${
                                                                        item.id
                                                                    }-folge-shared-${index}-${JSON.stringify(
                                                                        folge[
                                                                            "pos-eigenschaften"
                                                                        ]
                                                                            .langtext
                                                                    )}`}
                                                                    node={
                                                                        folge[
                                                                            "pos-eigenschaften"
                                                                        ]
                                                                            .langtext
                                                                    }
                                                                />
                                                            </div>
                                                        ) : null
                                                )}
                                            </div>
                                        ) : item.folgepositionLangtext ? (
                                            // This is for newly created positions that haven't been saved to the main structure yet.
                                            <div
                                                className="folgeposition-langtext-shared"
                                                style={{
                                                    marginTop: "10px",
                                                    paddingTop: "10px",
                                                    borderTop:
                                                        "1px dotted #ccc",
                                                }}
                                            >
                                                <RenderHtml
                                                    key={`${
                                                        item.id
                                                    }-folge-langtext-${JSON.stringify(
                                                        item.folgepositionLangtext
                                                    )}`}
                                                    node={
                                                        item.folgepositionLangtext
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="no-langtext-message"
                                                style={{ marginTop: "10px" }}
                                            >
                                                Keine Folgeposition-Beschreibung
                                                verfügbar
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Case 3: This is a simple, regular position. Just show its own long description.
                                    (() => {
                                        const renderedPrimaryLangtext =
                                            item.langtext ? (
                                                <RenderHtml
                                                    key={`${
                                                        item.id
                                                    }-langtext-main-${JSON.stringify(
                                                        item.langtext
                                                    )}`}
                                                    node={item.langtext}
                                                />
                                            ) : null;

                                        const renderedSecondaryLangtext =
                                            item.langtextRaw ? (
                                                <RenderHtml
                                                    key={`${
                                                        item.id
                                                    }-langtext-raw-${JSON.stringify(
                                                        item.langtextRaw
                                                    )}`}
                                                    node={item.langtextRaw}
                                                />
                                            ) : null;

                                        return (
                                            renderedPrimaryLangtext ||
                                            renderedSecondaryLangtext || (
                                                <div className="no-langtext-message">
                                                    Keine Beschreibung verfügbar
                                                </div>
                                            )
                                        );
                                    })()
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            </React.Fragment>
        );
    }

    // This is the rendering logic for all NON-position items (like LG, ULG, Vorbemerkung, etc.).
    // It's much simpler than the position rendering.
    return (
        <tr
            key={item.id}
            className={rowClass}
            onClick={(e) => {
                // Only handle row clicks if they didn't come from the expand button
                if (!e.target.closest(".expand-toggle")) {
                    handlePositionSelect();
                }
            }}
            style={
                item.type === "grundtext_desc" ||
                item.type === "grundtext_static_desc" ||
                item.type === "ulg" // Add ULG type to show pointer cursor
                    ? { cursor: "pointer" }
                    : {}
            }
        >
            {/* Column 1: The item number. */}
            <td className="col-nr" style={indentStyle}>
                {/* If the item can be expanded, we show the expand/collapse arrow next to the number. */}
                {canExpand &&
                (item.type === "lg" ||
                    item.type === "ulg" ||
                    item.type === "svb") ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <button
                            onClick={(e) => {
                                console.log(
                                    `ULG expand button clicked for ID: ${item.id}, type: ${item.type}`
                                );
                                console.log("Event object:", e);
                                console.log("Button element:", e.target);
                                e.stopPropagation();
                                toggleExpand(item.id, flatData);
                            }}
                            onMouseDown={(e) => {
                                console.log(
                                    `ULG button mousedown for ID: ${item.id}`
                                );
                            }}
                            onMouseUp={(e) => {
                                console.log(
                                    `ULG button mouseup for ID: ${item.id}`
                                );
                            }}
                            className="expand-toggle"
                            aria-expanded={isExpanded}
                            title={isExpanded ? "Einklappen" : "Ausklappen"}
                            style={{
                                pointerEvents: "auto",
                                cursor: "pointer",
                                zIndex: 1000,
                                position: "relative",
                            }}
                        >
                            {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
                        </button>
                        {/* Don't show number for SVB type, leave it empty */}
                        {item.type !== "svb" && (
                            <span style={{ marginLeft: "5px" }}>
                                {getDisplayNr(item, flatData, parentMap)}
                            </span>
                        )}
                    </div>
                ) : // Otherwise, just show the number (but not for SVB).
                item.type !== "svb" ? (
                    getDisplayNr(item, flatData, parentMap)
                ) : (
                    ""
                )}
            </td>
            {/* Column 2: The description. */}
            <td className="col-description" style={indentStyle}>
                <div className="description-cell-wrapper">
                    {" "}
                    {/* New wrapper div */}
                    {/* The expand button for grundtext is shown here in the description column. */}
                    {canExpand &&
                        (item.type === "grundtext_desc" ||
                            item.type === "grundtext_static_desc") && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(item.id, flatData);
                                }}
                                className="expand-toggle"
                                aria-expanded={isExpanded}
                                title={isExpanded ? "Einklappen" : "Ausklappen"}
                            >
                                {isExpanded ? (
                                    <FaCaretDown />
                                ) : (
                                    <FaCaretRight />
                                )}
                            </button>
                        )}
                    <div className="description-content">
                        {/* For LG and ULG, we show a bold title. */}
                        {(item.type === "lg" ||
                            item.type === "ulg" ||
                            item.type === "svb") && (
                            <div className="ulg-header-row">
                                <strong
                                    onMouseEnter={(e) => {
                                        if (item.type === "lg") {
                                            const vorbemerkung = flatData.find(
                                                (child) =>
                                                    child.parentId ===
                                                        item.id &&
                                                    child.type ===
                                                        "vorbemerkung"
                                            );
                                            if (
                                                vorbemerkung &&
                                                vorbemerkung.data?.text
                                            ) {
                                                setTooltip({
                                                    visible: true,
                                                    content: (
                                                        <RenderHtml
                                                            node={
                                                                vorbemerkung
                                                                    .data.text
                                                            }
                                                        />
                                                    ),
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                });
                                            }
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setTooltip({
                                            visible: false,
                                            content: null,
                                            x: 0,
                                            y: 0,
                                        });
                                    }}
                                >
                                    {getValue(item.data?.ueberschrift) ||
                                        getValue(item.data?.title)}
                                </strong>

                                {/* For ULG rows, we show buttons to add new positions. */}
                                {item.type === "ulg" && (
                                    <UlgPositionButtons
                                        ulgItem={item}
                                        onAddPosition={handleAddPosition}
                                    />
                                )}
                            </div>
                        )}
                        {/* For other types, we render their text content. */}
                        {/* This is for a grundtext that does NOT have position children (otherwise it would have been hidden earlier). */}
                        {item.type === "grundtext_desc" &&
                            item.data?.text &&
                            !flatData.some(
                                (child) =>
                                    child.parentId === item.id &&
                                    child.type === "position"
                            ) && (
                                <RenderHtml
                                    key={`${item.id}-text-${JSON.stringify(
                                        item.data.text
                                    )}`}
                                    node={item.data.text}
                                />
                            )}
                        {item.type === "grundtext_static_desc" &&
                            item.data?.text &&
                            !flatData.some(
                                (child) =>
                                    child.parentId === item.id &&
                                    child.type === "position"
                            ) && (
                                <RenderHtml
                                    key={`${item.id}-text-${JSON.stringify(
                                        item.data.text
                                    )}`}
                                    node={item.data.text}
                                />
                            )}
                        {/* This is for a "Vorbemerkung" (preliminary note). */}
                        {item.type === "vorbemerkung" && item.data?.text && (
                            <RenderHtml
                                key={`${item.id}-text-${JSON.stringify(
                                    item.data.text
                                )}`}
                                node={item.data.text}
                            />
                        )}

                        {/* For a grundtext, we show a button to add a "Folgeposition". */}
                        {(item.type === "grundtext_desc" ||
                            item.type === "grundtext_static_desc") && (
                            <div
                                className="grundtext-actions"
                                style={{
                                    marginTop: "10px",
                                    paddingTop: "10px",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    borderTop: "1px dashed #4a5568",
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent the row click.
                                        openAddFolgeModal(item); // Open the special modal.
                                    }}
                                    className="add-folgeposition-btn"
                                    title="Folgeposition hinzufügen"
                                    style={{
                                        color: "white",
                                        border: "none",
                                        padding: "3px 6px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        fontSize: "0.8em",
                                    }}
                                >
                                    <FaPlus style={{ marginRight: "5px" }} />
                                    Folgeposition hinzufügen
                                </button>
                            </div>
                        )}
                        {/* For "svb" types, show both SVB text and LB info when expanded. */}
                        {item.type === "svb" && isExpanded && (
                            <div className="svb-lb-combined-display">
                                {/* Display SVB text if available */}
                                {item.data?.text && (
                                    <div className="svb-text-section">
                                        <RenderHtml
                                            key={`${
                                                item.id
                                            }-svb-text-${JSON.stringify(
                                                item.data.text
                                            )}`}
                                            node={item.data.text}
                                        />
                                    </div>
                                )}
                                {/* Display LB info if available */}
                                {item.data?.lb && (
                                    <div
                                        className="lb-info-section"
                                        style={{
                                            marginTop: "15px",
                                            paddingTop: "15px",
                                            borderTop: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <strong>
                                            LB:{" "}
                                            {getValue(item.data.lb.bezeichnung)}
                                        </strong>
                                        {item.data.lb.herausgeber?.firma
                                            ?.name && (
                                            <div style={{ marginTop: "5px" }}>
                                                Herausgeber:{" "}
                                                {
                                                    item.data.lb.herausgeber
                                                        .firma.name
                                                }
                                            </div>
                                        )}
                                        {item.data.lb.versionsnummer && (
                                            <div>
                                                Version:{" "}
                                                {item.data.lb.versionsnummer}
                                                {item.data.lb.versionsdatum &&
                                                    ` (${item.data.lb.versionsdatum})`}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {item.type === "lb_info" && (
                            <div className="lb-info-display">
                                <strong>
                                    LB: {getValue(item.data.bezeichnung)}
                                </strong>{" "}
                            </div>
                        )}
                    </div>
                </div>{" "}
                {tooltip.visible && (
                    <div
                        style={{
                            position: "fixed",
                            top: `${tooltip.y + 15}px`,
                            left: `${tooltip.x + 15}px`,
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            padding: "10px",
                            zIndex: 1000,
                            maxWidth: "400px",
                            color: "black", // Ensure text is readable
                        }}
                    >
                        {tooltip.content}
                    </div>
                )}
                {/* Close new wrapper div */}
            </td>
            {/* These columns are empty for non-position rows. */}
            <td className="col-menge"></td>
            <td className="col-einheit"></td>
            <td className="col-type"></td>
            <td className="col-herkunft"></td>
            <td className="col-grafik"></td>
        </tr>
    );
};

// We export the component so other files in our project can use it.
export default OnlvRow;
