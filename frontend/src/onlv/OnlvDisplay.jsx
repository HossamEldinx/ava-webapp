// This file acts like a central hub for displaying different parts of an ONLV project.
// Think of it as a toolbox that gathers all the necessary tools (components and functions)
// related to showing information to the user.

// The main idea is to make it easy for other parts of the application to access
// and use these display tools without having to import each one individually from its original location.
// It imports various components for rendering HTML content, displaying graphics,
// and showing project metadata, and then re-exports them.
// This helps keep the code organized and makes it simpler to manage how ONLV data is presented.

import React from "react"; // We need React to build our user interface components.
import {
    RenderHtml, // This component helps display HTML content safely.
    generateHtmlString, // This function helps create HTML strings from data.
} from "./components/display/RenderHtml"; // These are imported from the file that handles HTML rendering.
import {
    GrafikDisplay, // This component shows a single graphic.
    GrafikGallery, // This component shows a collection of graphics.
} from "./components/display/Grafik"; // These are imported from the file that handles graphic displays.
import {
    MetadataSection, // This component displays general project information.
    ProjectHeaderSection, // This component shows important project details like the name and client.
    LeistungsteilSection, // This component displays specific service parts of the project.
} from "./components/display/Metadata"; // These are imported from the file that handles metadata displays.
import { flattenOnlvData } from "./OnlvDisplay.utils"; // This function helps organize complex ONLV data into a simpler, flat list for easier display.

// Here, we are re-exporting all the imported components and functions.
// This means that any other file in our project can now import these tools
// directly from `OnlvDisplay.jsx` instead of needing to know their original paths.
// It's like creating a shortcut for convenience.
export {
    RenderHtml,
    generateHtmlString,
    GrafikDisplay,
    GrafikGallery,
    MetadataSection,
    ProjectHeaderSection,
    LeistungsteilSection,
    flattenOnlvData,
};
