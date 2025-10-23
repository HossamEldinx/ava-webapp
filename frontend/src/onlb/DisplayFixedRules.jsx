// This file creates a complex table display that shows construction project rules and positions
// in a hierarchical, collapsible format. Think of it like a detailed project breakdown structure.

// The main purpose of this file is to:
// - Display construction data (LG, ULG, positions) in an organized table format
// - Allow users to expand/collapse different sections to see more or less detail
// - Let users click on specific positions to select them and send them to another part of the app
// - Handle complex text formatting that might include bold, italic, underlined text, and line breaks
// - Process and clean up data by removing unwanted fields and adding required ones

// The data structure this file works with has multiple levels:
// - LG (Leistungsgruppe): Main service groups - the top level
// - ULG (Unterleistungsgruppe): Sub-service groups - under each LG
// - Grundtext: Base text descriptions - under each ULG
// - Folgeposition: Follow-up positions (variations of the base text)
// - Ungeteilteposition: Undivided positions (standalone items)

"use client"; // This tells Next.js that this component should run on the client side (in the browser)
import React, { useState, useCallback, memo } from "react"; // We import React tools we need: useState for managing data that changes, useCallback for optimizing functions, memo for optimizing components
import { FaPlus } from "react-icons/fa"; // This gives us a simple "+" icon that we'll use for buttons

// This helper function takes a number and makes sure it has a specific number of digits by adding zeros at the beginning
// For example: formatNumber(5, 3) would return "005", formatNumber(12, 3) would return "012"
// This is useful for creating consistent numbering like "01", "02", "03" instead of "1", "2", "3"
const formatNumber = (num, length) => {
    return String(num).padStart(length, "0"); // Convert the number to a string, then add zeros at the start until it reaches the desired length
};

// This helper function cleans up position data by removing unwanted information and adding required fields
// Think of it like a data cleaner that prepares the information before sending it to another part of the app
// It works recursively, meaning it goes through all nested objects and arrays to clean everything
const processPositionObject = (obj) => {
    // If the input is not an object (like a string, number, or null), just return it as-is
    if (typeof obj !== "object" || obj === null) {
        return obj;
    }

    // If the input is an array, process each item in the array and return a new cleaned array
    if (Array.isArray(obj)) {
        return obj.map((item) => processPositionObject(item)); // Apply this same cleaning function to each item
    }

    // Create a copy of the object so we don't modify the original data
    const newObj = { ...obj };

    // Remove specific fields that we don't want in the final cleaned data
    delete newObj.kommentar; // Remove comment fields
    delete newObj.aenderungskennzeichnungen; // Remove change marking fields

    // Add a special field "@_mfv" to certain types of positions
    // We identify the position type by looking for specific identifying fields:
    // - A folgeposition (follow-up position) has a field called "@_ftnr"
    // - An ungeteilteposition (undivided position) has both "@_nr" and "pos-eigenschaften" fields
    if (
        newObj["@_ftnr"] !== undefined || // This means it's a folgeposition
        (newObj["@_nr"] !== undefined && newObj["pos-eigenschaften"]) // This means it's an ungeteilteposition
    ) {
        newObj["@_mfv"] = ""; // Add the required "@_mfv" field with an empty value
    }

    // Go through all the properties in this object and recursively clean them too
    // This ensures that nested objects and arrays are also cleaned
    for (const key in newObj) {
        if (Object.prototype.hasOwnProperty.call(newObj, key)) {
            // Make sure this property actually belongs to this object
            newObj[key] = processPositionObject(newObj[key]); // Recursively clean this property
        }
    }

    return newObj; // Return the cleaned object
};

// --- Helper Icons ---
// These are small arrow icons that we use to show whether sections are expanded (open) or collapsed (closed)
// Think of them like the arrows you see next to folders in a file explorer

// This icon points downward and indicates that a section is expanded (showing its contents)
// It's an SVG (Scalable Vector Graphics) which means it's a small, crisp icon that looks good at any size
const ChevronDownIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg" // This tells the browser it's an SVG element
        viewBox="0 0 20 20" // This defines the coordinate system for the icon (20x20 units)
        fill="currentColor" // This makes the icon use the same color as the text around it
        className="w-5 h-5 transition-transform" // CSS classes: make it 5x5 size units and add smooth animation when it changes
    >
        <path
            fillRule="evenodd" // This defines how overlapping shapes should be filled
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z" // This is the actual shape data for the downward-pointing arrow
            clipRule="evenodd" // This defines how the shape should be clipped
        />
    </svg>
);

// This icon points to the right and indicates that a section is collapsed (hiding its contents)
// When users see this, they know they can click to expand and see more information
const ChevronRightIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg" // Same as above - tells browser it's an SVG
        viewBox="0 0 20 20" // Same coordinate system as the down arrow
        fill="currentColor" // Uses the current text color
        className="w-5 h-5 transition-transform" // Same size and animation as the down arrow
    >
        <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" // This is the shape data for the right-pointing arrow
            clipRule="evenodd"
        />
    </svg>
);

// --- Helper to render complex text nodes ---
// This function is like a smart text processor that can handle different types of formatted text
// The construction data sometimes contains text that has special formatting like bold, italic, underlined text, line breaks, and placeholders
// This function takes that complex text data and converts it into proper HTML elements that the browser can display

// Think of it like a translator that converts special text codes into visual formatting:
// - "i" becomes italic text (like <em> in HTML)
// - "u" becomes underlined text
// - "b" becomes bold text (like <strong> in HTML)
// - "br" becomes line breaks
// - "al" becomes input placeholders
// - "#text" is the actual text content

const renderTextNode = (node, keyPrefix) => {
    // If the input is just a simple string (like "Hello world"), return it directly - no special processing needed
    if (typeof node === "string") {
        return node;
    }
    // If the input is empty, null, or not an object, there's nothing to render, so return null
    if (!node || typeof node !== "object") return null;

    const children = []; // This array will collect all the different pieces of formatted text we create
    let textContentFromInlineTag = null; // This variable helps us avoid showing the same text twice when we have both formatting tags and plain text

    // 1. Handle <br> tags first - these create line breaks in the text
    // Line breaks are structural elements that affect the layout, so we process them first
    if (node.br) {
        // The br data might be a single item or an array of items, so we handle both cases
        const brs = Array.isArray(node.br) ? node.br : [node.br];
        brs.forEach(
            (_brVal, i) => children.push(<br key={`${keyPrefix}-br-${i}`} />) // Create HTML <br> elements for each line break
        );
    }

    // 2. Handle <al> (Auslassung) tags - these are placeholders where users can input information
    // "Auslassung" is German for "omission" or "blank space" - it's like a fill-in-the-blank
    if (Object.prototype.hasOwnProperty.call(node, "al")) {
        if (
            node.al === "" ||
            (Array.isArray(node.al) && node.al.length === 0)
        ) {
            // If the placeholder is empty, show a visual indicator that something should be entered here
            children.push(
                <span
                    key={`${keyPrefix}-al-placeholder`}
                    className="text-gray-300 italic" // Make it gray and italic so it looks like a placeholder
                >
                    [Eingabe]{" "}
                    {/* German for "Input" - shows users they can enter something here */}
                </span>
            );
        } else if (typeof node.al === "string") {
            // If the placeholder already has text content, just display that text
            children.push(
                <span key={`${keyPrefix}-al-content`}>{node.al}</span>
            );
        } else if (typeof node.al === "object") {
            // If the placeholder contains complex formatting, recursively process it using this same function
            children.push(renderTextNode(node.al, `${keyPrefix}-al-child`));
        }
    }

    // 3. Handle formatting tags: <i> (italic), <u> (underlined), <b> (bold)
    // These tags apply visual formatting to text and can contain either simple strings or complex nested objects
    // We also keep track of any direct string content to avoid showing duplicate text later

    if (node.i) {
        // Handle italic text
        const renderedI = renderTextNode(node.i, `${keyPrefix}-i-child`); // Recursively process the italic content
        children.push(<em key={`${keyPrefix}-i`}>{renderedI}</em>); // Wrap it in HTML <em> tags for italic display
        if (typeof node.i === "string") textContentFromInlineTag = node.i; // Remember this text to avoid duplication
    }
    if (node.u) {
        // Handle underlined text
        const renderedU = renderTextNode(node.u, `${keyPrefix}-u-child`); // Recursively process the underlined content
        children.push(<u key={`${keyPrefix}-u`}>{renderedU}</u>); // Wrap it in HTML <u> tags for underlined display
        if (typeof node.u === "string") textContentFromInlineTag = node.u; // Remember this text to avoid duplication
    }
    if (node.b) {
        // Handle bold text
        const renderedB = renderTextNode(node.b, `${keyPrefix}-b-child`); // Recursively process the bold content
        children.push(<strong key={`${keyPrefix}-b`}>{renderedB}</strong>); // Wrap it in HTML <strong> tags for bold display
        if (typeof node.b === "string") textContentFromInlineTag = node.b; // Remember this text to avoid duplication
    }

    // 4. Handle #text - this is the main text content
    // Sometimes the data has both formatting tags (like "u": "hello") and separate text content ("#text": "hello")
    // We need to be smart about this to avoid showing the same text twice
    if (node["#text"] !== undefined && node["#text"] !== null) {
        // Only show the #text content if it's different from what we already showed in a formatting tag
        // For example, if we have {"u": "underlined_text", "#text": "underlined_text"}, we don't want to show "underlined_text" twice
        // But if we have {"u": "underlined_text", "#text": ":"}, we want to show both the underlined text AND the colon
        if (node["#text"] !== textContentFromInlineTag) {
            children.push(node["#text"]); // Add the additional text content
        }
    }

    return <>{children}</>; // Return all the formatted text pieces wrapped in a React fragment (invisible container)
};

// This function takes complex text data and converts it into properly formatted paragraphs
// Construction documents often have long text descriptions that need to be broken into readable paragraphs
// This function handles that formatting and makes sure the text displays nicely on the screen

// Think of this like a paragraph formatter that:
// - Takes raw text data that might be in different formats
// - Converts it into HTML paragraphs (<p> tags)
// - Handles both simple strings and complex formatted text
// - Makes sure empty lines show up as proper line breaks

const renderLangtextParagraphs = (
    langtextObj, // This is the text data that might contain paragraphs - could be a string, object, or array
    baseKey, // This is a unique identifier used by React to keep track of each paragraph
    fontSizeClass = "text-sm" // This sets the text size - defaults to "text-sm" (small text) if not specified
) => {
    // If there's no text data at all, don't render anything
    if (!langtextObj) return null;

    // If the text data is just a simple string, wrap it in a paragraph and return it
    if (typeof langtextObj === "string") {
        // This is a fallback for simple cases where we just have plain text
        return <p className={`my-1 ${fontSizeClass}`}>{langtextObj}</p>; // my-1 adds small margins above and below
    }

    // If the text data doesn't have a "p" property (which contains the paragraphs), there's nothing to render
    if (!langtextObj.p) return null;

    // The paragraph data might be a single paragraph or an array of paragraphs
    // We normalize it to always be an array so we can process it consistently
    const paragraphs = Array.isArray(langtextObj.p)
        ? langtextObj.p // If it's already an array, use it as-is
        : [langtextObj.p]; // If it's a single item, put it in an array

    // Process each paragraph and convert it to HTML
    return paragraphs
        .map((pItem, index) => {
            // Go through each paragraph item
            const itemKey = `${baseKey}-p-${index}`; // Create a unique key for React
            if (pItem === null || pItem === undefined) return null; // Skip empty items

            if (typeof pItem === "string") {
                // If this paragraph is a simple string
                // Check if it has actual content or is just empty/whitespace
                return pItem.trim() ? ( // If it has content
                    <p key={itemKey} className={`my-1 ${fontSizeClass}`}>
                        {pItem} {/* Show the text content */}
                    </p>
                ) : (
                    // If it's empty or just whitespace
                    <p key={itemKey} className={`my-1 ${fontSizeClass}`}>
                        <br />{" "}
                        {/* Show it as a line break to preserve spacing */}
                    </p>
                );
            }

            if (typeof pItem === "object") {
                // If this paragraph contains complex formatting (bold, italic, etc.)
                return (
                    <p key={itemKey} className={`my-1 ${fontSizeClass}`}>
                        {renderTextNode(pItem, itemKey)}{" "}
                        {/* Use our text formatting function to process it */}
                    </p>
                );
            }
            return null; // If it's neither string nor object, skip it
        })
        .filter(Boolean); // Remove any null entries from the final array
};

// --- GrundtextNr Item Component ---
// This component displays individual "grundtextnr" items (base text positions)
// Think of a grundtextnr as a main task description that can have multiple variations (folgepositionen)
// For example: "Paint walls" might be the grundtext, and "Paint walls - white", "Paint walls - blue" would be folgepositionen

// This component shows:
// - The position number and main description (grundtext)
// - Any comments about the main task
// - All the variations of this task (folgepositionen) with their details

const GrundtextNrItem = ({ grundtextNrItem, lgNr, ulgNr, index }) => {
    const nr = grundtextNrItem["@_nr"]; // Get the position number from the data
    const baseKey = `gt-${lgNr}-${ulgNr}-${nr || index}`; // Create a unique identifier for React - use index as fallback if nr is missing

    return (
        <div className="ml-0 md:ml-4 pl-3 md:pl-4 border-l-2 border-gray-600 py-2 my-2 bg-gray-700 shadow-sm rounded-r-md">
            {/* This creates a card-like container with:
                - Left margin that's responsive (none on mobile, 4 units on medium screens and up)
                - Left padding that's also responsive
                - A left border to show hierarchy
                - Padding, margins, background color, shadow, and rounded corners for nice appearance */}

            <div className="font-semibold text-sm text-white mb-1 px-2">
                Position {nr}: {/* Show the position number as a header */}
            </div>

            {/* Display the main text description (langtext) of this position if it exists */}
            {grundtextNrItem.grundtext?.langtext && (
                <div className="prose prose-xs max-w-none text-gray-300 px-2 mb-1">
                    {/* The "prose" classes make text look nice and readable */}
                    {renderLangtextParagraphs(
                        grundtextNrItem.grundtext.langtext, // The text content to display
                        `${baseKey}-grund`, // Unique key for React
                        "text-sm" // Text size class
                    )}
                </div>
            )}

            {/* Display any comments about this position if they exist */}
            {grundtextNrItem.grundtext?.kommentar && (
                <div className="mt-1 mx-2 p-1 bg-gray-600 border border-gray-500 rounded text-sm text-gray-100 prose prose-xs max-w-none">
                    {/* This creates a highlighted box for comments with light background and border */}
                    <strong className="font-semibold block mb-0.5">
                        Kommentar (Grundtext):{" "}
                        {/* German for "Comment (Base Text)" */}
                    </strong>
                    {renderLangtextParagraphs(
                        grundtextNrItem.grundtext.kommentar, // The comment content
                        `${baseKey}-grund-kommentar`, // Unique key
                        "text-sm" // Text size
                    )}
                </div>
            )}

            {/* Display all the variations (folgepositionen) of this main position if they exist */}
            {grundtextNrItem.folgeposition &&
                Array.isArray(grundtextNrItem.folgeposition) &&
                grundtextNrItem.folgeposition.length > 0 && (
                    <div className="mt-2 ml-2 md:ml-4">
                        {/* Add some margin and indentation to show these are sub-items */}
                        <h4 className="text-xs font-bold text-gray-300 mb-1">
                            Folgepositionen:{" "}
                            {/* German for "Follow-up positions" - these are the variations */}
                        </h4>
                        {grundtextNrItem.folgeposition.map(
                            (folgePos, fpIndex) => (
                                <div
                                    key={`${baseKey}-fp-${
                                        folgePos["@_ftnr"] || fpIndex
                                    }-${fpIndex}`} // Create unique key for each folgeposition
                                    className="mb-1 py-1 pl-2 md:pl-3 border-l-2 border-dashed border-gray-500"
                                    // Dashed left border to show this is a sub-item of the main position
                                >
                                    <p className="text-sm font-semibold text-gray-300">
                                        {folgePos["@_ftnr"]}{" "}
                                        {/* The folgeposition number */}
                                        {". "}
                                        {folgePos["pos-eigenschaften"]
                                            ?.stichwort &&
                                            `${folgePos["pos-eigenschaften"].stichwort}`}{" "}
                                        {/* The short description/keyword */}
                                    </p>
                                    {/* Display the detailed description (langtext) of this folgeposition if it exists and has content */}
                                    {folgePos["pos-eigenschaften"]?.langtext &&
                                        Object.keys(
                                            folgePos["pos-eigenschaften"]
                                                .langtext
                                        ).length > 0 && (
                                            <div className="prose prose-2xs max-w-none text-gray-300">
                                                {/* Use very small text (prose-2xs) for the detailed description */}
                                                {renderLangtextParagraphs(
                                                    folgePos[
                                                        "pos-eigenschaften"
                                                    ].langtext, // The detailed text content
                                                    `${baseKey}-fp-${
                                                        folgePos["@_ftnr"] ||
                                                        fpIndex
                                                    }-${fpIndex}-lang`, // Unique key
                                                    "text-xs" // Extra small text size
                                                )}
                                            </div>
                                        )}

                                    {/* Display change markings (aenderungskennzeichnungen) if they exist */}
                                    {/* These show what version of the specification this position was changed in */}
                                    {folgePos["pos-eigenschaften"]
                                        ?.aenderungskennzeichnungen && (
                                        <div className="mt-0.5 p-1 bg-gray-600 border border-gray-500 rounded text-gray-100 prose prose-xs max-w-none">
                                            <strong className="font-semibold block mb-0.5">
                                                Änderungskennzeichnungen:{" "}
                                                {/* German for "Change markings" */}
                                            </strong>
                                            {/* The change markings might be an array or a single object, so we handle both cases */}
                                            {Array.isArray(
                                                folgePos["pos-eigenschaften"]
                                                    .aenderungskennzeichnungen
                                            ) ? (
                                                // If it's an array, show each change marking as a separate badge
                                                folgePos[
                                                    "pos-eigenschaften"
                                                ].aenderungskennzeichnungen.map(
                                                    (a, idx) => (
                                                        <span
                                                            key={`${baseKey}-fp-${
                                                                folgePos[
                                                                    "@_ftnr"
                                                                ] || fpIndex
                                                            }-aend-${idx}`}
                                                            className="inline-block bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded mr-0.5 mb-0.5"
                                                            // Red background to indicate this is a change
                                                        >
                                                            {a.lbversion &&
                                                                `v${a.lbversion}`}{" "}
                                                            {/* Show the version number */}
                                                        </span>
                                                    )
                                                )
                                            ) : // If it's a single object, show it as one badge
                                            folgePos["pos-eigenschaften"]
                                                  .aenderungskennzeichnungen
                                                  .lbversion ? (
                                                <span className="inline-block bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded">
                                                    v
                                                    {
                                                        folgePos[
                                                            "pos-eigenschaften"
                                                        ]
                                                            .aenderungskennzeichnungen
                                                            .lbversion
                                                    }
                                                </span>
                                            ) : (
                                                "-" // Show dash if no version info
                                            )}
                                        </div>
                                    )}

                                    {/* Display any comments specific to this folgeposition */}
                                    {folgePos["pos-eigenschaften"]
                                        ?.kommentar && (
                                        <div className="mt-0.5 p-1 bg-gray-600 border border-gray-500 rounded text-gray-100 prose prose-xs max-w-none">
                                            <strong className="font-semibold block mb-0.5">
                                                Kommentar (Folgeposition):{" "}
                                                {/* German for "Comment (Follow-up position)" */}
                                            </strong>
                                            {renderLangtextParagraphs(
                                                folgePos["pos-eigenschaften"]
                                                    .kommentar, // The comment content
                                                `${baseKey}-fp-${
                                                    folgePos["@_ftnr"] ||
                                                    fpIndex
                                                }-${fpIndex}-kommentar`, // Unique key
                                                "text-sm" // Text size
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}
        </div>
    );
};

// --- ULG Item Component ---
// This component displays a "ULG" (Unterleistungsgruppe = Sub-service group)
// Think of a ULG as a section within a main service group that contains related tasks
// For example, within "Painting work" (LG), you might have "Interior painting" (ULG) and "Exterior painting" (ULG)

// This component:
// - Shows the ULG title and number
// - Can be expanded/collapsed to show or hide the positions inside it
// - Contains multiple GrundtextNr items (the actual work positions)
// - Shows any preliminary remarks (vorbemerkung) or comments about this ULG

const UlgItem = ({ ulg, lgNr }) => {
    const [isOpen, setIsOpen] = useState(false); // Track whether this ULG section is expanded (showing contents) or collapsed (hiding contents)
    const ulgNr = ulg["@_nr"]; // Get the ULG number from the data
    const ueberschrift = ulg["ulg-eigenschaften"]?.ueberschrift; // Get the ULG title/heading

    const grundtextNummern = ulg.positionen?.grundtextnr; // Get all the position items within this ULG
    const hasGrundtextNummern =
        Array.isArray(grundtextNummern) && grundtextNummern.length > 0; // Check if there are actually any positions to display

    return (
        <div className="ml-0 md:ml-4 my-2 p-2 md:p-2 border border-indigo-600 rounded-lg shadow-md bg-gray-700">
            {/* Create a container with blue styling to distinguish ULG items from other levels */}
            {/* Responsive margins and padding that adjust based on screen size */}

            <button
                onClick={() => setIsOpen(!isOpen)} // Toggle the expanded/collapsed state when clicked
                className="w-full flex justify-between items-center text-left py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150"
                // Full width button with hover effects and focus styling for accessibility
            >
                <h3 className="text-sm md:text-base font-semibold text-white">
                    ULG {ulgNr}: {ueberschrift || "Unbenannte ULG"}{" "}
                    {/* Show ULG number and title, with fallback text if no title */}
                </h3>
                {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}{" "}
                {/* Show appropriate arrow icon based on expanded state */}
            </button>

            {/* Only show the content when the ULG is expanded (isOpen is true) */}
            {isOpen && (
                <div className="mt-2 px-1 md:px-2">
                    {/* Add some margin and padding for the content area */}

                    {/* Display preliminary remarks (vorbemerkung) if they exist */}
                    {ulg["ulg-eigenschaften"]?.vorbemerkung && (
                        <div className="mb-1.5 p-1.5 bg-gray-600 border border-gray-500 rounded prose prose-sm max-w-none text-gray-100">
                            {/* Light gray background to distinguish this as supplementary information */}
                            <strong className="font-bold block mb-0.5">
                                Vorbemerkung:{" "}
                                {/* German for "Preliminary remark" - introductory information about this ULG */}
                            </strong>
                            {renderLangtextParagraphs(
                                ulg["ulg-eigenschaften"].vorbemerkung, // The preliminary remark content
                                `ulg-${lgNr}-${ulgNr}-vorbem`, // Unique key
                                "text-sm" // Text size
                            )}
                        </div>
                    )}

                    {/* Display any comments about this ULG if they exist */}
                    {ulg["ulg-eigenschaften"]?.kommentar && (
                        <div className="mb-1.5 p-1.5 bg-gray-600 border border-gray-500 rounded prose prose-sm max-w-none text-gray-100">
                            {/* Similar styling to vorbemerkung but with slightly different border */}
                            <strong className="font-bold block mb-0.5">
                                Kommentar: {/* German for "Comment" */}
                            </strong>
                            {renderLangtextParagraphs(
                                ulg["ulg-eigenschaften"].kommentar, // The comment content
                                `ulg-${lgNr}-${ulgNr}-komm`, // Unique key
                                "text-sm" // Text size
                            )}
                        </div>
                    )}

                    {/* Display all the position items (grundtextnr) within this ULG */}
                    {hasGrundtextNummern
                        ? grundtextNummern.map((gtNrItem, index) => (
                              <GrundtextNrItem
                                  key={`gtNr-${lgNr}-${ulgNr}-${
                                      gtNrItem["@_nr"] || index
                                  }-${index}`} // Create unique key for each position item
                                  grundtextNrItem={gtNrItem} // Pass the position data
                                  lgNr={lgNr} // Pass the parent LG number for context
                                  ulgNr={ulgNr} // Pass this ULG number for context
                                  index={index} // Pass the index as fallback identifier
                              />
                          ))
                        : ulg.positionen && ( // If there are no grundtextnr items but the positionen object exists
                              <p className="text-sm text-gray-300 ml-4 mt-1 italic">
                                  Keine Grundtextnummern für diese ULG.{" "}
                                  {/* German for "No base text numbers for this ULG" */}
                              </p>
                          )}
                </div>
            )}
        </div>
    );
};

// --- LG Item Component ---
// Displays an "lg" item, making it collapsible. Contains ULG items.
// eslint-disable-next-line no-unused-vars
const LgItem = ({ lg }) => {
    const [isOpen, setIsOpen] = useState(false);
    // State for Vorbemerkung visibility, initialized to false (collapsed)
    const [showVorbemerkung, setShowVorbemerkung] = useState(false); // Initialize to false for collapsed state by default
    const lgNr = lg["@_nr"];
    const ueberschrift = lg["lg-eigenschaften"]?.ueberschrift;

    const ulgListe = lg["ulg-liste"]?.ulg;
    const hasUlgItems = Array.isArray(ulgListe) && ulgListe.length > 0;

    return (
        <div className="mb-4 p-2 md:p-3 border border-green-600 rounded-xl shadow-lg bg-gray-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-2 px-3 bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-150"
            >
                <h2 className="text-base md:text-lg font-bold text-white">
                    LG {lgNr}: {ueberschrift || "Unbenannte LG"}
                </h2>
                {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
            {isOpen && (
                <div className="mt-3 px-1 md:px-3">
                    {lg["lg-eigenschaften"]?.vorbemerkung && (
                        <div className="mb-2">
                            <button
                                onClick={() =>
                                    setShowVorbemerkung(!showVorbemerkung)
                                }
                                className="text-gray-300 hover:text-indigo-400 text-sm flex items-center focus:outline-none"
                            >
                                {showVorbemerkung ? (
                                    <ChevronDownIcon className="w-3 h-3 mr-1" />
                                ) : (
                                    <ChevronRightIcon className="w-3 h-3 mr-1" />
                                )}
                                {showVorbemerkung
                                    ? "Vorbemerkung ausblenden"
                                    : "Vorbemerkung anzeigen"}
                            </button>
                            {showVorbemerkung && (
                                <div className="mt-1 p-2 bg-gray-600 border border-gray-500 rounded prose prose-sm max-w-none text-gray-100">
                                    <strong className="font-bold block mb-0.5">
                                        Vorbemerkung:
                                    </strong>
                                    {renderLangtextParagraphs(
                                        lg["lg-eigenschaften"].vorbemerkung,
                                        `lg-${lgNr}-vorbem`,
                                        "text-sm"
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {lg["lg-eigenschaften"]?.kommentar && (
                        <div className="mb-2 p-2 bg-gray-600 border border-gray-500 rounded prose prose-sm max-w-none text-gray-100">
                            <strong className="font-bold block mb-0.5">
                                Kommentar:
                            </strong>
                            {renderLangtextParagraphs(
                                lg["lg-eigenschaften"].kommentar,
                                `lg-${lgNr}-komm`,
                                "text-sm"
                            )}
                        </div>
                    )}

                    {hasUlgItems
                        ? ulgListe.map((ulgItem, ulgIndex) => (
                              <UlgItem
                                  key={`ulg-${lgNr}-${
                                      ulgItem["@_nr"] || ulgIndex
                                  }-${ulgIndex}`}
                                  ulg={ulgItem}
                                  lgNr={lgNr}
                              />
                          ))
                        : lg["ulg-liste"] && (
                              <p className="text-xs text-gray-300 ml-4 mt-1 italic">
                                  Keine ULGs für diese LG.
                              </p>
                          )}
                </div>
            )}
        </div>
    );
};

// --- Table Row Component ---
const TableRow = memo(
    ({
        row,
        level,
        isExpanded,
        toggleExpand,
        hasChildren,
        onPositionClick,
        isSelected, // New prop for selection state
    }) => {
        const [showComment, setShowComment] = useState(false); // State for comment visibility
        // State for langtext (Vorbemerkung for LG items) visibility
        const [showLangtext, setShowLangtext] = useState(false);
        // New state for combined langtext visibility for level 3 items
        const [showCombinedLangtext, setShowCombinedLangtext] = useState(false);

        // Determine if the row is a clickable position (level 2: grundtextnr, level 3: folgeposition/ungeteilteposition)
        const isClickablePosition = level === 2 || level === 3;

        return (
            <tr
                className={
                    (level === 0
                        ? "bg-gray-800"
                        : level === 1
                        ? "bg-gray-700"
                        : "bg-gray-600") +
                    (isExpanded || isSelected ? " bg-indigo-600" : "") +
                    " text-gray-100"
                }
            >
                <td
                    className={`border border-gray-600 px-2 py-1 align-top whitespace-nowrap text-sm ${
                        isClickablePosition
                            ? "cursor-pointer hover:bg-gray-500"
                            : ""
                    }`}
                    onClick={
                        isClickablePosition
                            ? () => onPositionClick(row)
                            : undefined
                    }
                >
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${level * 1.5}rem` }}
                    >
                        {hasChildren && (
                            <button
                                onClick={toggleExpand}
                                className="mr-1 focus:outline-none"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? (
                                    <ChevronDownIcon />
                                ) : (
                                    <ChevronRightIcon />
                                )}
                            </button>
                        )}
                        {/* Display the position number. If it's a clickable position, add a visual cue. */}
                        <span
                            className={
                                isClickablePosition
                                    ? "font-medium text-indigo-400"
                                    : ""
                            }
                        >
                            {/* Display displayNr if available, otherwise fallback to nr */}
                            {row.displayNr !== undefined &&
                            row.displayNr !== null
                                ? row.displayNr
                                : row.nr || "-"}
                        </span>
                    </div>
                </td>
                <td className="border border-gray-600 px-2 py-1 align-top text-sm flex">
                    <div className="flex items-center">
                        {/* Display bezeichnung (stichwort for folgeposition) */}
                        <span className="mr-2">
                            {typeof row.bezeichnung === "string" &&
                            row.bezeichnung
                                ? row.bezeichnung
                                : row.ueberschrift
                                ? row.ueberschrift
                                : "-"}
                        </span>

                        {/* Collapsible parent grundtext langtext for level 3 items - now only the icon button */}
                        {row.level === 3 &&
                            (row.parentGrundtextLangtext || row.langtext) && (
                                <button
                                    onClick={() =>
                                        setShowCombinedLangtext(
                                            !showCombinedLangtext
                                        )
                                    }
                                    className="text-gray-300 hover:text-indigo-400 text-xs flex items-center focus:outline-none"
                                >
                                    {showCombinedLangtext ? (
                                        <ChevronDownIcon className="w-3 h-3" />
                                    ) : (
                                        <ChevronRightIcon className="w-3 h-3" />
                                    )}
                                </button>
                            )}
                    </div>

                    {/* The collapsible content for combined langtext remains outside the flex container but within the td */}
                    {row.level === 3 &&
                        showCombinedLangtext &&
                        (row.parentGrundtextLangtext || row.langtext) && (
                            <div className="mt-1 p-1 bg-gray-600 border border-gray-500 rounded prose prose-2xs max-w-none text-gray-100">
                                {row.parentGrundtextLangtext && (
                                    <div className="mb-5">
                                        {renderLangtextParagraphs(
                                            row.parentGrundtextLangtext,
                                            `parent-gt-langtext-${row.id}`,
                                            "text-xs"
                                        )}
                                    </div>
                                )}
                                {row.langtext && (
                                    <div>
                                        {renderLangtextParagraphs(
                                            row.langtext,
                                            `desc-${row.id}`,
                                            "text-xs"
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Display langtext for other levels (level 0, 1, 2) */}
                    {row.langtext && level !== 3 && (
                        <div className="mt-1">
                            {level === 0 ? ( // Only make Vorbemerkung (langtext for level 0) collapsible
                                <>
                                    <button
                                        onClick={() =>
                                            setShowLangtext(!showLangtext)
                                        }
                                        className="text-gray-300 hover:text-indigo-400 text-sm flex items-center focus:outline-none"
                                    >
                                        {showLangtext ? (
                                            <ChevronDownIcon className="w-3 h-3 mr-1" />
                                        ) : (
                                            <ChevronRightIcon className="w-3 h-3 mr-1" />
                                        )}
                                        {showLangtext
                                            ? "Vorbemerkung ausblenden"
                                            : "Vorbemerkung anzeigen"}
                                    </button>
                                    {showLangtext && (
                                        <div className="mt-1 p-1 bg-gray-600 border border-gray-500 rounded prose prose-xs max-w-none text-gray-100">
                                            {renderLangtextParagraphs(
                                                row.langtext,
                                                `desc-${row.id}`,
                                                "text-sm"
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                // For other levels (1, 2), langtext is always displayed
                                <div className="prose prose-xs max-w-none text-gray-100">
                                    {renderLangtextParagraphs(
                                        row.langtext,
                                        `desc-${row.id}`,
                                        "text-sm"
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Collapsible Kommentar section */}
                    {row.kommentar && (
                        <div className="mt-1">
                            <button
                                onClick={() => setShowComment(!showComment)}
                                className="text-gray-300 hover:text-indigo-400 text-sm flex items-center focus:outline-none"
                            >
                                {showComment ? (
                                    <ChevronDownIcon className="w-3 h-3 mr-1" />
                                ) : (
                                    <ChevronRightIcon className="w-3 h-3 mr-1" />
                                )}
                                {showComment
                                    ? "Kommentar ausblenden"
                                    : "Kommentar anzeigen"}
                            </button>
                            {showComment && (
                                <div className="mt-1 p-1 bg-gray-600 border border-gray-500 rounded prose prose-xs max-w-none text-gray-100">
                                    <strong className="font-semibold block mb-0.5">
                                        Kommentar:
                                    </strong>
                                    {renderLangtextParagraphs(
                                        row.kommentar,
                                        `kommentar-${row.id}`,
                                        "text-sx"
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </td>
                <td className="border border-gray-600 px-2 py-1 align-top text-right text-sm">
                    {row.menge || ""}
                </td>
                <td className="border border-gray-600 px-2 py-1 align-top text-sm">
                    {row.einheit || ""}
                </td>
                <td className="border border-gray-600 px-2 py-1 align-top text-sm">
                    {row.herkunft || ""}
                </td>
                <td className="border border-gray-600 px-2 py-1 align-top text-center text-sm">
                    {row.grafik ? (
                        <img
                            src={row.grafik}
                            alt="Grafik"
                            className="h-6 mx-auto"
                        />
                    ) : (
                        "-"
                    )}
                </td>
                {/* <td className="border px-2 py-1 align-top text-xs">
                {row.aenderungskennzeichnungen &&
                    (Array.isArray(row.aenderungskennzeichnungen) ? (
                        row.aenderungskennzeichnungen.map((a, idx) => (
                            <span
                                key={`aend-${row.id}-${idx}`}
                                className="inline-block bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded mr-0.5 mb-0.5"
                            >
                                {a.aenderungsumfang && `${a.aenderungsumfang}`}
                                {a.lbversion && ` (v${a.lbversion})`}
                                {!a.aenderungsumfang &&
                                    !a.lbversion &&
                                    "Änderung"}
                            </span>
                        ))
                    ) : // Handle single object case if it's not an array
                    row.aenderungskennzeichnungen.aenderungsumfang ||
                      row.aenderungskennzeichnungen.lbversion ? (
                        <span className="inline-block bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded">
                            {row.aenderungskennzeichnungen.aenderungsumfang &&
                                `${row.aenderungskennzeichnungen.aenderungsumfang}`}
                            {row.aenderungskennzeichnungen.lbversion &&
                                ` (v${row.aenderungskennzeichnungen.lbversion})`}
                        </span>
                    ) : (
                        "-"
                    ))}
            </td> */}
                {/* <td className="border px-2 py-1 align-top text-xs">
                {row.aenderungsbeschreibung
                    ? renderLangtextParagraphs(
                          row.aenderungsbeschreibung,
                          `aendbeschr-${row.id}`,
                          "text-xs"
                      )
                    : "-"}
            </td> */}
            </tr>
        );
    }
); // Wrap TableRow with React.memo

// --- Data Flattening Helper ---
function flattenData(data) {
    if (!data || !data["lg-liste"] || !Array.isArray(data["lg-liste"].lg))
        return [];
    const rows = [];
    let idCounter = 1;
    data["lg-liste"].lg.forEach((lg) => {
        const lgId = `lg-${lg["@_nr"] || idCounter++}`;
        rows.push({
            id: lgId,
            parentId: null,
            level: 0,
            nr: lg["@_nr"],
            bezeichnung: lg["lg-eigenschaften"]?.ueberschrift,
            langtext: lg["lg-eigenschaften"]?.vorbemerkung,
            kommentar: lg["lg-eigenschaften"]?.kommentar,
            aenderungskennzeichnungen:
                lg["lg-eigenschaften"]?.aenderungskennzeichnungen,
            aenderungsbeschreibung:
                lg["lg-eigenschaften"]?.aenderungskennzeichnungen?.[0]
                    ?.aenderungsbeschreibung,
            menge: "",
            einheit: "",
            herkunft: "",
            grafik: "",
            children: [],
            raw: lg,
        });
        const ulgList = lg["ulg-liste"]?.ulg || [];
        ulgList.forEach((ulg) => {
            const ulgId = `ulg-${lg["@_nr"] || 0}-${
                ulg["@_nr"] || idCounter++
            }`;
            // For ULG items (level 1), format the display number as "LG_NRULG_NR"
            const formattedLgNrForUlg = formatNumber(lg["@_nr"] || 0, 2);
            const formattedUlgNr = formatNumber(ulg["@_nr"] || idCounter++, 2);
            rows.push({
                id: ulgId,
                parentId: lgId,
                level: 1,
                nr: ulg["@_nr"],
                displayNr: `${formattedLgNrForUlg}${formattedUlgNr}`, // Combined LG and ULG number
                bezeichnung: ulg["ulg-eigenschaften"]?.ueberschrift,
                langtext: ulg["ulg-eigenschaften"]?.vorbemerkung,
                kommentar: ulg["ulg-eigenschaften"]?.kommentar,
                aenderungskennzeichnungen:
                    ulg["ulg-eigenschaften"]?.aenderungskennzeichnungen,
                aenderungsbeschreibung:
                    ulg["ulg-eigenschaften"]?.aenderungskennzeichnungen?.[0]
                        ?.aenderungsbeschreibung,
                menge: "",
                einheit: "",
                herkunft: "",
                grafik: "",
                children: [],
                raw: ulg,
            });
            const grundtextList = ulg.positionen?.grundtextnr || [];
            grundtextList.forEach((gt, idx) => {
                // Format the display number for GrundtextNr (level 2) as "LG_NRULG_NRGT_NR"
                const formattedGtNr = formatNumber(gt["@_nr"] || idx, 2);
                // The grundtextnr row itself is "escaped" and its children are displayed instead.
                // Therefore, we do not push the grundtextnr row to the 'rows' array.
                // Its children (folgeposition and ungeteilteposition) will be re-parented to the ulgId.
                if (Array.isArray(gt.folgeposition)) {
                    gt.folgeposition.forEach((fp, fpIdx) => {
                        const fpId = `fp-${lg["@_nr"] || 0}-${
                            ulg["@_nr"] || 0
                        }-${gt["@_nr"] || idx}-${fp["@_ftnr"] || fpIdx}`;
                        rows.push({
                            id: fpId,
                            parentId: ulgId,
                            level: 3,
                            nr: fp["@_ftnr"],
                            // Format displayNr for folgeposition: parent GTNr + ftnr
                            displayNr: `${formattedLgNrForUlg}${formattedUlgNr}${formattedGtNr}${fp["@_ftnr"]}`,
                            parentGrundtextNr: gt["@_nr"],
                            bezeichnung: fp["pos-eigenschaften"]?.stichwort,
                            langtext: fp["pos-eigenschaften"]?.langtext,
                            kommentar: fp["pos-eigenschaften"]?.kommentar,
                            // Pass the grundtext's langtext to folgeposition for collapsible display
                            parentGrundtextLangtext: gt.grundtext?.langtext,
                            aenderungskennzeichnungen:
                                fp["pos-eigenschaften"]
                                    ?.aenderungskennzeichnungen,
                            aenderungsbeschreibung:
                                fp["pos-eigenschaften"]
                                    ?.aenderungskennzeichnungen?.[0]
                                    ?.aenderungsbeschreibung,
                            menge:
                                fp["pos-eigenschaften"]?.lvmenge ||
                                fp["pos-eigenschaften"]?.menge ||
                                "",
                            einheit: fp["pos-eigenschaften"]?.einheit || "",
                            herkunft:
                                fp["pos-eigenschaften"]?.herkunftskennzeichen ||
                                fp["pos-eigenschaften"]?.herkunft ||
                                "",
                            grafik: fp["pos-eigenschaften"]?.grafik || "",
                            children: [],
                            raw: fp,
                        });
                    });
                }
                // Handle ungeteilteposition if it exists
                if (Array.isArray(gt.ungeteilteposition)) {
                    gt.ungeteilteposition.forEach((up, upIdx) => {
                        const upId = `up-${lg["@_nr"] || 0}-${
                            ulg["@_nr"] || 0
                        }-${gt["@_nr"] || idx}-${up["@_nr"] || upIdx}`;
                        rows.push({
                            id: upId,
                            parentId: ulgId,
                            level: 3, // Same level as folgeposition
                            nr: up["@_nr"],
                            // Format displayNr for ungeteilteposition: parent GTNr + nr
                            displayNr: `${formattedLgNrForUlg}${formattedUlgNr}${formattedGtNr}${up["@_nr"]}`,
                            parentGrundtextNr: gt["@_nr"],
                            bezeichnung: up["pos-eigenschaften"]?.stichwort,
                            langtext: up["pos-eigenschaften"]?.langtext,
                            kommentar: up["pos-eigenschaften"]?.kommentar,
                            // Pass the grundtext's langtext to ungeteilteposition for collapsible display
                            parentGrundtextLangtext: gt.grundtext?.langtext,
                            aenderungskennzeichnungen:
                                up["pos-eigenschaften"]
                                    ?.aenderungskennzeichnungen,
                            aenderungsbeschreibung:
                                up["pos-eigenschaften"]
                                    ?.aenderungskennzeichnungen?.[0]
                                    ?.aenderungsbeschreibung,
                            menge:
                                up["pos-eigenschaften"]?.lvmenge ||
                                up["pos-eigenschaften"]?.menge ||
                                "",
                            einheit: up["pos-eigenschaften"]?.einheit || "",
                            herkunft:
                                up["pos-eigenschaften"]?.herkunftskennzeichen ||
                                up["pos-eigenschaften"]?.herkunft ||
                                "",
                            grafik: up["pos-eigenschaften"]?.grafik || "",
                            children: [],
                            raw: up,
                        });
                    });
                }
            });
        });
    });
    // Build children arrays for collapse logic
    const idToRow = Object.fromEntries(rows.map((r) => [r.id, r]));
    rows.forEach((row) => {
        if (row.parentId && idToRow[row.parentId]) {
            idToRow[row.parentId].children.push(row.id);
        }
    });
    return rows;
}

// --- Main Table Component ---
const DisplayFixedRules = ({ data, onSendFixedPosition }) => {
    const [expandedIds, setExpandedIds] = useState(new Set());
    // State to store the currently selected position object
    const [selectedPosition, setSelectedPosition] = useState(null);
    // State to track the selected row ID for styling
    const [selectedRowId, setSelectedRowId] = useState(null);
    const rows = flattenData(data);

    // Create a map for quick lookup of rows by their ID
    const idToRowMap = new Map(rows.map((row) => [row.id, row]));

    /**
     * Handles the click event on a position row (level 2 or 3).
     * Extracts the full position object, its ULG, and LG parent information,
     * saves it to state, and logs it to the console.
     * @param {object} clickedRow The row object that was clicked.
     */
    const handlePositionClick = (clickedRow) => {
        console.log("Clicked Row:", clickedRow); // Log the clicked row

        // Start with a deep copy of the clicked position's raw data.
        let finalPosition = JSON.parse(JSON.stringify(clickedRow.raw));

        // Apply processing to remove unwanted tags and add @_mfv
        finalPosition = processPositionObject(finalPosition);

        const fullPositionDetails = {
            position: null,
            ulg: null,
            lg: null,
        };

        let currentChildForParent = null;
        let initialParentId = clickedRow.parentId;

        // Store the actual display number for later verification
        const actualDisplayNr = clickedRow.displayNr;

        const targetGrundtextNr =
            clickedRow.parentGrundtextNr !== undefined &&
            clickedRow.parentGrundtextNr !== null
                ? String(clickedRow.parentGrundtextNr)
                : null;

        if (clickedRow.level === 3) {
            // For level 3 (folgeposition/ungeteilteposition), the clicked row itself is the position.
            fullPositionDetails.position = finalPosition;
            currentChildForParent = finalPosition; // This is the folgeposition/ungeteilteposition

            // Find the original grundtextnr parent from the ULG's raw data
            const ulgRow = idToRowMap.get(clickedRow.parentId); // This is the ULG row
            if (
                ulgRow &&
                ulgRow.raw &&
                ulgRow.raw.positionen &&
                ulgRow.raw.positionen.grundtextnr
            ) {
                const originalGrundtextnrs = Array.isArray(
                    ulgRow.raw.positionen.grundtextnr
                )
                    ? ulgRow.raw.positionen.grundtextnr
                    : [ulgRow.raw.positionen.grundtextnr].filter(Boolean);

                console.log(
                    "Searching for grundtextnr. Original Grundtextnrs:",
                    JSON.stringify(originalGrundtextnrs, null, 2)
                );
                console.log(
                    "Final Position to find:",
                    JSON.stringify(finalPosition, null, 2)
                );

                let foundGrundtextnr = null;
                for (const gt of originalGrundtextnrs) {
                    const currentGrundtextNr =
                        gt && gt["@_nr"] !== undefined
                            ? String(gt["@_nr"])
                            : null;

                    if (
                        targetGrundtextNr &&
                        currentGrundtextNr &&
                        currentGrundtextNr === targetGrundtextNr
                    ) {
                        foundGrundtextnr = gt;
                        break;
                    }

                    console.log(`Checking grundtextnr ${gt["@_nr"]}:`, gt);
                    if (gt.folgeposition) {
                        const folgepositions = Array.isArray(gt.folgeposition)
                            ? gt.folgeposition
                            : [gt.folgeposition].filter(Boolean);
                        // Check for a match using both the ftnr and also verify the display number
                        const isFolgepositionMatch = folgepositions.some(
                            (fp) => {
                                // Exact match by ID
                                const idMatch =
                                    fp["@_ftnr"] === finalPosition["@_ftnr"];

                                // Check if the clicked position's display number matches what we expect
                                // This ensures we're selecting the exact position that was clicked
                                const displayNrMatch =
                                    actualDisplayNr &&
                                    actualDisplayNr.includes(fp["@_ftnr"]);

                                return (
                                    idMatch &&
                                    (displayNrMatch || !actualDisplayNr)
                                );
                            }
                        );

                        console.log(
                            `  - Has folgeposition match: ${isFolgepositionMatch}, Display Nr: ${actualDisplayNr}`
                        );

                        if (isFolgepositionMatch) {
                            foundGrundtextnr = gt;
                            break;
                        }
                    }
                    if (gt.ungeteilteposition) {
                        const ungeteiltepositions = Array.isArray(
                            gt.ungeteilteposition
                        )
                            ? gt.ungeteilteposition
                            : [gt.ungeteilteposition].filter(Boolean);
                        // Similar improvement for ungeteilteposition matching
                        const isUngeteiltepositionMatch =
                            ungeteiltepositions.some((up) => {
                                // Exact match by ID
                                const idMatch =
                                    up["@_nr"] === finalPosition["@_nr"];

                                // Check if the clicked position's display number matches what we expect
                                const displayNrMatch =
                                    actualDisplayNr &&
                                    actualDisplayNr.includes(up["@_nr"]);

                                return (
                                    idMatch &&
                                    (displayNrMatch || !actualDisplayNr)
                                );
                            });
                        console.log(
                            `  - Has ungeteilteposition match: ${isUngeteiltepositionMatch}, Display Nr: ${actualDisplayNr}`
                        );
                        if (isUngeteiltepositionMatch) {
                            foundGrundtextnr = gt;
                            break;
                        }
                    }
                }

                if (foundGrundtextnr) {
                    // Create a new grundtextnr object that will only contain the selected position
                    const newGrundtextnr = {
                        "@_nr": foundGrundtextnr["@_nr"],
                        grundtext: foundGrundtextnr.grundtext, // Keep the grundtext of the parent
                    };

                    // Add only the finalPosition to the correct array within newGrundtextnr
                    if (finalPosition["@_ftnr"] !== undefined) {
                        // It's a folgeposition
                        newGrundtextnr.folgeposition = [finalPosition];
                    } else if (
                        finalPosition["@_nr"] !== undefined &&
                        finalPosition["pos-eigenschaften"]
                    ) {
                        // It's an ungeteilteposition
                        newGrundtextnr.ungeteilteposition = [finalPosition];
                    }

                    currentChildForParent = newGrundtextnr; // Now currentChildForParent is the newly constructed grundtextnr
                    console.log(
                        "Constructed Grundtextnr with only selected position:",
                        JSON.stringify(newGrundtextnr, null, 2)
                    );
                } else {
                    console.warn(
                        "Could not find original grundtextnr for clicked position:",
                        clickedRow
                    );
                    // Fallback: if grundtextnr not found, still use the position directly, but this is a problem.
                    currentChildForParent = finalPosition;
                }
            } else {
                console.warn(
                    "ULG row or its positionen.grundtextnr not found for clicked position:",
                    clickedRow
                );
                currentChildForParent = finalPosition; // Fallback
            }

            // The parentId for level 3 items is now the ULG.
            initialParentId = clickedRow.parentId;
        } else if (clickedRow.level === 2) {
            // Level 2 (grundtextnr) rows are no longer displayed, so this block should ideally not be hit.
            // If it were, it would set the position to the grundtextnr itself.
            // If a grundtextnr is clicked, it should be the currentChildForParent.
            fullPositionDetails.position = finalPosition; // This is the grundtextnr
            currentChildForParent = finalPosition;
        }

        // Traverse up the hierarchy to find ULG and LG, pruning as we go.
        let currentParentId = initialParentId; // Start traversal from the correct parent

        // Traverse up the hierarchy to find ULG and LG, pruning as we go.
        while (currentParentId) {
            const parentRow = idToRowMap.get(currentParentId);

            if (!parentRow) {
                break;
            }

            // If the parent is a ULG (level 1)
            if (parentRow.level === 1) {
                const originalUlg = parentRow.raw;
                // Manually construct prunedUlg to ensure only desired properties are copied
                const prunedUlg = {
                    "@_nr": originalUlg["@_nr"],
                    "ulg-eigenschaften": originalUlg["ulg-eigenschaften"]
                        ? processPositionObject(
                              originalUlg["ulg-eigenschaften"]
                          )
                        : undefined,
                    positionen: {
                        grundtextnr: [currentChildForParent], // Now currentChildForParent is the pruned grundtextnr
                    },
                };
                fullPositionDetails.ulg = prunedUlg;
                currentChildForParent = prunedUlg;
            }
            // If the parent is an LG (level 0)
            else if (parentRow.level === 0) {
                const originalLg = parentRow.raw;
                // Manually construct prunedLg to ensure only desired properties are copied
                const prunedLg = {
                    "@_nr": originalLg["@_nr"],
                    "lg-eigenschaften": originalLg["lg-eigenschaften"]
                        ? processPositionObject(originalLg["lg-eigenschaften"])
                        : undefined,
                    "ulg-liste": {
                        ulg: [currentChildForParent], // Add the relevant child (pruned ULG)
                    },
                };
                fullPositionDetails.lg = prunedLg;
                currentChildForParent = prunedLg;
            }

            // Move up to the next parent in the hierarchy.
            currentParentId = parentRow.parentId;
        }

        setSelectedPosition(fullPositionDetails);
        setSelectedRowId(clickedRow.id); // Track clicked row for styling
        console.log(
            "Full Position Details before sending:",
            JSON.stringify(fullPositionDetails, null, 2)
        ); // Log before setting
    };

    // Expand/collapse logic
    const toggleExpand = useCallback((id) => {
        setExpandedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []); // Empty dependency array ensures this function is stable across renders
    // Show only rows whose parents are expanded
    const getVisibleRows = () => {
        const visible = [];
        const idToRow = Object.fromEntries(rows.map((r) => [r.id, r]));
        function addRow(row) {
            // Add all rows including level 2 (grundtextnr)
            visible.push(row);

            // Process children if the row is expanded and has children
            if (
                row.children &&
                row.children.length > 0 &&
                expandedIds.has(row.id)
            ) {
                row.children.forEach((childId) => {
                    const child = idToRow[childId];
                    if (child) addRow(child);
                });
            }
        }
        rows.forEach((row) => {
            if (!row.parentId) addRow(row);
        });
        return visible;
    };

    const visibleRows = getVisibleRows();

    return (
        <div className="relative">
            {selectedPosition && selectedPosition.lg && (
                <div className="sticky top-0 z-10 flex justify-end mb-2">
                    <button
                        onClick={() => {
                            console.log(
                                "Add button clicked with position:",
                                selectedPosition.lg
                            );
                            try {
                                onSendFixedPosition(selectedPosition.lg);
                            } catch (err) {
                                console.error(
                                    "Error in onSendFixedPosition:",
                                    err
                                );
                            }
                        }}
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm shadow-lg"
                    >
                        <FaPlus className="mr-1" />
                        Add
                    </button>
                </div>
            )}
            <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                <table className="min-w-full bg-gray-700 border border-gray-600 rounded-lg shadow-md">
                    <thead className="bg-gray-600">
                        <tr>
                            <th className="border-b border-gray-500 px-2 py-1 text-left text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Nr.
                            </th>
                            <th className="border-b border-gray-500 px-2 py-1 text-left text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Bezeichnung / Überschrift
                            </th>
                            <th className="border-b border-gray-500 px-2 py-1 text-right text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Menge
                            </th>
                            <th className="border-b border-gray-500 px-2 py-1 text-left text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Einheit
                            </th>
                            <th className="border-b border-gray-500 px-2 py-1 text-left text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Herkunft
                            </th>
                            <th className="border-b border-gray-500 px-2 py-1 text-center text-xs font-semibold text-gray-100 uppercase tracking-wider">
                                Grafik
                            </th>
                            {/* <th className="border-b px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Änderung
                        </th> */}
                            {/* <th className="border-b px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Änderungsbeschreibung
                        </th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Render only the visible rows, as getVisibleRows already handles expansion */}
                        {visibleRows.map((row) => (
                            <TableRow
                                key={row.id}
                                row={row}
                                level={row.level}
                                isExpanded={expandedIds.has(row.id)}
                                toggleExpand={() => toggleExpand(row.id)}
                                hasChildren={
                                    row.children && row.children.length > 0
                                }
                                onPositionClick={handlePositionClick}
                                isSelected={row.id === selectedRowId}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DisplayFixedRules;
