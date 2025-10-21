// This file is all about helping you Exporting the onlv data!

// The main job of this code is to:
// 1. Take the data from our app (which is in a format called JSON, like a structured list).
// 2. Change that JSON data into a different format called XML (specifically, ONLV XML).
//    XML is another way to organize data, often used for sharing information between different programs.
// 3. Once the data is in XML, it lets you download it as a file to your computer.
//    This is super useful if you need to share your project with someone else or open it in another program.

// Think of it like this: our app speaks "JSON," but other programs might speak "XML."
// This file acts as a translator and a delivery service, converting your project
// and saving it so you can use it anywhere!

import React, { useState, useCallback } from "react"; // We need React to build our user interface, and special tools (hooks) like useState and useCallback to manage data and make our code efficient.
import { saveAs } from "file-saver"; // This is a helpful tool that lets us save files directly to your computer from the web browser.
import { FaFileExport } from "react-icons/fa"; // This gives us a cool export icon (like a little file with an arrow) to make the button look nice.
import { useOnlvTableContext } from "./OnlvTableContext"; // This imports a special "context" that lets us easily get the main project data (the "tableData") from anywhere in our app without passing it around manually.
import "./ExportOnlv.css"; // This imports a separate file that contains styling rules (CSS) to make our export button and progress bar look good.

// This is our main component, like a small app within our bigger app, specifically for exporting.
// It's a "function component" in React, which means it's a JavaScript function that returns what should be shown on the screen.
function ExportOnlv() {
    // Here, we're getting the main project data that we want to export.
    // `tableData` holds all the information from your current project in the app.
    const { tableData } = useOnlvTableContext();

    // These are special "state" variables. Think of them as little memory slots
    // that React watches. When their values change, React knows it might need
    // to update what you see on the screen.

    // `isExporting` tells us if the export process is currently happening (true) or not (false).
    const [isExporting, setIsExporting] = useState(false);
    // `progress` keeps track of how far along the export process is, from 0 to 100.
    const [progress, setProgress] = useState(0);
    // `error` will store any messages if something goes wrong during the export.
    const [error, setError] = useState(null);

    // This is a special function that takes our app's data (JSON) and turns it into ONLV XML format.
    // `useCallback` is used here to make sure this function doesn't get recreated unnecessarily,
    // which helps our app run faster.
    const convertToOnlvXml = useCallback((data) => {
        // First, we check if the data we received is valid. If it's empty or not in the right format,
        // we stop and show an error. This is important for preventing crashes!
        if (!data || !data.data) {
            throw new Error("Invalid or empty data provided");
        }

        // This is where we build the basic structure of our ONLV XML file.
        // XML files often start with a special line (`?xml`) that tells programs
        // how to read them (like which version of XML and what kind of characters are used).
        const onlvData = {
            "?xml": {
                "@_version": "1.0", // This means we're using XML version 1.0.
                "@_encoding": "utf-8", // This tells the computer to read the text using UTF-8 characters (which supports many languages).
            },
            onlv: {
                // This is the main "onlv" tag, like the root folder for all our project data.
                metadaten: {
                    // This section holds "metadata," which is information about the file itself.
                    erstelltam: new Date().toISOString(), // This records the exact date and time the file was created.
                    dateiname: "exported.onlv", // This is the default name for the exported file.
                    programmsystem: "ConWello Export Tool", // This tells you which program created the file.
                    programmversion: "1.0", // This is the version of the export tool.
                },
                ...data.data, // This is a clever JavaScript trick! It takes all the existing project data (`data.data`)
                // and "spreads" it directly into our `onlv` structure.
                // So, if `data.data` has sections like "lg" or "ulg", they will appear here.
            },
        };

        return onlvData; // We return the newly structured data, ready to be turned into an XML string.
    }, []); // The empty array `[]` means this function only gets created once when the component starts.

    // This function is like a master builder for XML. It takes a JavaScript object (our `onlvData`)
    // and carefully turns it into a long string of XML text.
    // `indent` helps us make the XML string look neat and organized with spaces.
    const jsonToXml = useCallback((obj, indent = "") => {
        let xml = ""; // This variable will slowly build up our XML string.

        // We go through each piece of information (key) in our JavaScript object.
        for (const key in obj) {
            // We make sure the key actually belongs to the object and isn't something inherited.
            if (obj.hasOwnProperty(key)) {
                // Special handling for the XML declaration (the `<?xml ... ?>` line).
                if (key === "?xml") {
                    // We take all the properties of `?xml` (like `version` and `encoding`)
                    // and turn them into attributes for the XML declaration.
                    const attrs = Object.entries(obj[key])
                        .map(([k, v]) => `${k.replace("@_", "")}="${v}"`) // We remove the "@_" prefix because it's just for our internal JSON, not for the final XML.
                        .join(" "); // We join them together with spaces.
                    xml += `<?xml ${attrs} ?>`; // We add the full XML declaration to our string.
                    continue; // We're done with this part, so we move to the next key.
                }

                // If a key starts with "@_", it means it's an attribute for the *parent* XML tag.
                // We don't process it as a separate tag here; it will be handled when its parent is processed.
                if (key.startsWith("@_")) {
                    continue;
                }

                const value = obj[key]; // This is the actual data associated with the current key.
                // We collect all attributes (keys starting with "@_") that belong to the *current* object.
                const attrs = Object.entries(obj)
                    .filter(([k]) => k.startsWith("@_"))
                    .map(([k, v]) => `${k.replace("@_", "")}="${v}"`)
                    .join(" ");

                // Now, we decide how to write the XML based on whether the value is another object or a simple piece of text.
                if (typeof value === "object" && value !== null) {
                    // If the value is another object (like a nested section in our project data),
                    // we create an opening XML tag for it.
                    xml += `${indent}<${key}${attrs ? " " + attrs : ""}>\n`;
                    // Then, we call this `jsonToXml` function again for the nested object.
                    // This is called "recursion" – the function calls itself to handle smaller parts of the problem.
                    xml += jsonToXml(value, indent + "  "); // We add more indentation for neatness.
                    // Finally, we add the closing XML tag for the nested object.
                    xml += `${indent}</${key}>\n`;
                } else {
                    // If the value is just a simple piece of text or a number,
                    // we create a single XML tag with the value inside.
                    xml += `${indent}<${key}${
                        attrs ? " " + attrs : ""
                    }>${value}</${key}>\n`;
                }
            }
        }

        return xml; // We return the complete XML string for this part of the object.
    }, []); // This function also only gets created once.

    // This is the main function that kicks off the whole export process when you click the button.
    const handleExport = useCallback(async () => {
        // We update our state variables to show that exporting has started.
        setIsExporting(true); // Set to true, so the button changes to "Exporting..."
        setProgress(0); // Reset progress to 0%.
        setError(null); // Clear any previous error messages.

        try {
            // Step 1: Check if there's any data to export.
            if (!tableData) {
                throw new Error("No table data available for export"); // If no data, we throw an error.
            }
            setProgress(10); // Update progress to 10%.

            // Step 2: Convert our JSON data into the ONLV XML structure.
            const onlvData = convertToOnlvXml(tableData);
            setProgress(30); // Update progress to 30%.

            // Step 3: Turn the structured ONLV data into a raw XML text string.
            let xmlString = "";
            try {
                xmlString = jsonToXml(onlvData); // Call our XML builder function.
            } catch (e) {
                throw new Error(`XML conversion failed: ${e.message}`); // If something goes wrong during XML conversion, we catch it.
            }
            setProgress(70); // Update progress to 70%.

            // Step 4: Create a "Blob" (a special kind of file-like object in the browser)
            // and then use `file-saver` to download it to your computer.
            const blob = new Blob([xmlString], { type: "application/xml" }); // We tell the browser it's an XML file.
            saveAs(
                blob, // This is the file content.
                `export_${new Date().toISOString().slice(0, 10)}.onlv` // This creates a filename like "export_2023-10-27.onlv".
            );
            setProgress(100); // Update progress to 100% (done!).
        } catch (err) {
            // If any error happens during the whole process, we catch it here.
            console.error("Export failed:", err); // Log the error to the console (for developers).
            setError(err.message); // Show the error message to the user.
        } finally {
            // This `finally` block always runs, whether there was an error or not.
            setIsExporting(false); // Set `isExporting` back to false, so the button goes back to "Export ONLV".
        }
    }, [tableData, convertToOnlvXml, jsonToXml]); // These are the "dependencies" – if any of these change, `handleExport` will be recreated.

    // This is the part that React uses to draw things on your screen.
    // It's like a blueprint for our export button and progress display.
    return (
        // This is the main container for our export feature.
        <div className="export-container">
            {/* This is the button you click to start the export. */}
            <button
                onClick={handleExport} // When clicked, it calls our `handleExport` function.
                disabled={isExporting || !tableData} // The button is disabled if we're already exporting or if there's no data to export.
                className="export-button" // This applies styling from our CSS file.
            >
                <FaFileExport /> {/* This displays the export icon. */}
                {/* The text on the button changes based on whether we're exporting or not. */}
                {isExporting ? "Exporting..." : "Export ONLV"}
            </button>

            {/* This section only shows up if `isExporting` is true. */}
            {isExporting && (
                <div className="progress-container">
                    {/* This is a visual progress bar. */}
                    <progress value={progress} max="100" />
                    {/* This shows the percentage of progress. */}
                    <span>{progress}%</span>
                </div>
            )}

            {/* This section only shows up if there's an `error` message. */}
            {error && (
                <div className="error-message">Export failed: {error}</div>
            )}
        </div>
    );
}

export default ExportOnlv; // This line makes our `ExportOnlv` component available to be used in other parts of our application.
