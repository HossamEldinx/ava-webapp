// This file is like a specialized "XML Chef" for our ONLV project data.
// Its main job is to take the project data (which is in a JavaScript format)
// and carefully cook it into a specific XML file format called "ONLV XML".
// This is important because ONLV XML is a standard way to share construction project data.

// The key things this file does are:
// 1. Cleans up the data: It removes any temporary or "new" items that were just created
//    in the app but shouldn't be part of the final exported file.
// 2. Builds the XML structure: It uses a special tool (`xmlbuilder2`) to create
//    all the necessary XML tags and put the data in the right places.
// 3. Formats numbers: It makes sure that numbers like quantities (`lvmenge`) are
//    formatted correctly with two decimal places, as required by the ONLV standard.
// 4. Fixes empty tags: Sometimes, the XML builder might create empty tags in a way
//    that's not quite right for the ONLV standard (like `<tag/>` instead of `<tag></tag>`).
//    This file fixes those to ensure compatibility.
// 5. Downloads the file: Finally, it helps you download the finished ONLV XML file
//    to your computer, ready to be used in other construction software.

import { create } from "xmlbuilder2"; // This is a powerful library that helps us build XML documents programmatically. Think of it as a specialized tool for creating XML tags and structures.

// --- Export Handler ---
// This is the main function that gets called when you want to export your ONLV data.
// `parsedData`: This is the project data from our application, usually in a JavaScript object format.
// `filename`: This is the name the exported file will have when you download it (default is "exported_onlv.onlv").
export const handleExport = (parsedData, filename = "exported_onlv.onlv") => {
    console.log("handleExport called."); // Just a message to help developers know the function started.

    // First, we check if there's any data to export. If not, we show an error message and stop.
    if (!parsedData) {
        console.error("No data found in parsedData to export.");
        alert(
            "Export fehlgeschlagen: Keine verarbeiteten Daten im Zustand gefunden." // This is a German message meaning "Export failed: No processed data found in state."
        );
        return; // Stop the function here.
    }

    // We make a "deep copy" of the data. This is like taking a perfect snapshot of the data
    // so that any changes we make during the export process don't accidentally mess up
    // the original data still being used in the application.
    const onlvData = JSON.parse(JSON.stringify(parsedData));

    // This section is important for cleaning up the data before export.
    // Sometimes, we create temporary "new" entries in the app (e.g., new positions)
    // that have special IDs like "new-entry-XYZ". These shouldn't be in the final exported file.
    if (
        onlvData["ausschreibungs-lv"] && // Check if the main "ausschreibungs-lv" (tender list) section exists.
        onlvData["ausschreibungs-lv"].positionen // And if it has a "positionen" (positions) list.
    ) {
        const originalPositionen = onlvData["ausschreibungs-lv"].positionen; // Get the original list of positions.
        if (Array.isArray(originalPositionen)) {
            // Make sure it's actually a list (array).
            onlvData["ausschreibungs-lv"].positionen =
                originalPositionen.filter((position) => {
                    // We use `filter` to create a *new* list without the unwanted items.
                    // We check if the position has an `id` and if that `id` starts with "new-entry-".
                    if (
                        position.id &&
                        typeof position.id === "string" &&
                        position.id.startsWith("new-entry-")
                    ) {
                        console.log(
                            "Filtering out programmatically created entry:",
                            position.id
                        );
                        return false; // If it's a "new-entry-", we return `false` to remove it from the list.
                    }
                    return true; // For all other positions, we return `true` to keep them.
                });
            console.log(
                `Filtered ${
                    originalPositionen.length -
                    onlvData["ausschreibungs-lv"].positionen.length
                } programmatically created entries from export`
            ); // Log how many entries were removed.
        }
    }

    console.log("Using onlvData for export:", onlvData); // Show the data that will be used for export.

    // This section is for debugging. It helps developers quickly check if the main parts
    // of the ONLV data structure are present before trying to build the XML.
    console.log("Export data structure check:");
    console.log("- Has ausschreibungs-lv:", !!onlvData["ausschreibungs-lv"]);
    if (onlvData["ausschreibungs-lv"]) {
        console.log(
            "- Has gliederung-lg:",
            !!onlvData["ausschreibungs-lv"]["gliederung-lg"]
        );
        if (onlvData["ausschreibungs-lv"]["gliederung-lg"]) {
            console.log(
                "- Has lg-liste:",
                !!onlvData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]
            );
            if (onlvData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]) {
                console.log(
                    "- Has lg array:",
                    !!onlvData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]
                        .lg
                );
                if (
                    onlvData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]
                        .lg
                ) {
                    console.log(
                        "- Number of LGs:",
                        onlvData["ausschreibungs-lv"]["gliederung-lg"][
                            "lg-liste"
                        ].lg.length
                    );
                }
            }
        }
    }

    // --- Define keys needing number formatting ---
    // This is a list (Set) of specific data fields (keys) that should always be formatted
    // with exactly two decimal places when they are numbers in the XML output.
    const keysRequiringTwoDecimals = new Set([
        "lvmenge", // "lvmenge" means "tender quantity" or "bill of quantities amount".
        // You can add other keys here if they also need to be formatted as numbers with two decimals.
        // For example: 'einheitspreis' (unit price), 'gesamtpreis' (total price)
    ]);

    // --- buildXml function with Number Formatting ---
    // This is a "recursive" function, meaning it calls itself to handle nested parts of the data.
    // It takes a `parentElement` (the current XML tag we're adding to) and a `jsonNode`
    // (the current piece of JavaScript data we're converting).
    const buildXml = (parentElement, jsonNode) => {
        // If the current `jsonNode` is not an object (it's a simple value like a string or number),
        // we just add its text content to the `parentElement`.
        if (jsonNode === null || typeof jsonNode !== "object") {
            if (parentElement && typeof parentElement.txt === "function") {
                let textValue;
                const parentKey = parentElement.node?.nodeName || ""; // Get the name of the parent XML tag.
                // If the parent tag's name is in our `keysRequiringTwoDecimals` list AND the value is a number,
                // we format it to two decimal places.
                if (
                    keysRequiringTwoDecimals.has(parentKey) &&
                    typeof jsonNode === "number"
                ) {
                    textValue = jsonNode.toFixed(2); // Format to two decimal places.
                } else {
                    // Otherwise, just convert the value to a string. Handle null/undefined as empty string.
                    textValue =
                        jsonNode === null || jsonNode === undefined
                            ? ""
                            : String(jsonNode);
                }
                parentElement.txt(textValue); // Add the text to the XML element.
            }
            return; // We're done with this node.
        }

        // If `jsonNode` is an object, we go through each of its properties (keys).
        for (const key in jsonNode) {
            if (!jsonNode.hasOwnProperty(key)) continue; // Skip inherited properties.
            const value = jsonNode[key]; // Get the value of the current property.

            // Special handling for `#text` key: This usually means the actual text content of an XML element.
            if (key === "#text") {
                let textValue;
                const parentKey = parentElement.node?.nodeName || "";
                // Again, check if the parent tag needs number formatting.
                if (
                    keysRequiringTwoDecimals.has(parentKey) &&
                    typeof value === "number"
                ) {
                    textValue = value.toFixed(2);
                } else {
                    textValue = String(value);
                }
                parentElement.txt(textValue); // Add the text content.
            } else if (key.startsWith("@_")) {
                // If a key starts with "@_", it means it's an XML attribute (like `id="123"`).
                // We add it as an attribute to the `parentElement`. We remove the "@_" prefix.
                parentElement.att(key.substring(2), String(value));
            } else {
                // If it's not `#text` or an attribute, it's a nested XML element.
                if (Array.isArray(value)) {
                    // If the value is an array, it means there are multiple elements with the same tag name.
                    value.forEach((item) => {
                        const childElement = parentElement.ele(key); // Create a new child XML element with the current `key` as its tag name.
                        if (item !== null && typeof item === "object") {
                            buildXml(childElement, item); // If the item is an object, recursively call `buildXml` for it.
                        } else {
                            // If it's a simple value, add it as text content, with number formatting if needed.
                            let textValue;
                            if (
                                keysRequiringTwoDecimals.has(key) && // Check if the *current* tag name needs formatting.
                                typeof item === "number"
                            ) {
                                textValue = item.toFixed(2);
                            } else {
                                textValue =
                                    item === null || item === undefined
                                        ? ""
                                        : String(item);
                            }
                            childElement.txt(textValue);
                        }
                    });
                } else {
                    // If the value is not an array, it's a single nested element.
                    const childElement = parentElement.ele(key); // Create a new child XML element.
                    if (value !== null && typeof value === "object") {
                        buildXml(childElement, value); // Recursively call `buildXml` for the nested object.
                    } else {
                        // If it's a simple value, add it as text content, with number formatting if needed.
                        let textValue;
                        if (
                            keysRequiringTwoDecimals.has(key) &&
                            typeof value === "number"
                        ) {
                            textValue = value.toFixed(2);
                        } else {
                            textValue =
                                value === null || value === undefined
                                    ? ""
                                    : String(value);
                        }
                        childElement.txt(textValue);
                    }
                }
            }
        }
    };

    // --- Build XML using xmlbuilder2 ---
    // This is where the actual XML document creation begins.
    try {
        // `create` initializes a new XML document with version and encoding.
        // `.ele("onlv", ...)` creates the very first (root) XML tag, which is "onlv".
        const root = create({ version: "1.0", encoding: "utf-8" }).ele("onlv", {
            // `xmlns` is a special XML attribute that defines the "namespace" for the document,
            // telling other programs what kind of ONLV XML this is.
            xmlns:
                onlvData["@_xmlns"] || // Use the existing namespace if available.
                "http://www.oenorm.at/schema/A2063/2021-03-01", // Otherwise, use a default one.
            // We also add any other top-level attributes (starting with "@_") to the "onlv" root tag.
            ...Object.keys(onlvData)
                .filter((key) => key.startsWith("@_") && key !== "@_xmlns")
                .reduce((acc, key) => {
                    acc[key.substring(2)] = onlvData[key];
                    return acc;
                }, {}),
        });

        // Now, we go through all the main sections of our `onlvData` (like "metadaten", "ausschreibungs-lv")
        // and use our `buildXml` function to convert them into XML elements under the `root`.
        for (const key in onlvData) {
            if (onlvData.hasOwnProperty(key) && !key.startsWith("@_")) {
                const topLevelElement = root.ele(key); // Create a new top-level XML element.
                buildXml(topLevelElement, onlvData[key]); // Recursively build XML for this section.
            }
        }

        // `.end({ prettyPrint: true, allowEmpty: true })` finishes building the XML document
        // and converts it into a nicely formatted (prettyPrint) string.
        // `allowEmpty: true` means it will create empty tags if there's no content.
        let xmlString = root.end({ prettyPrint: true, allowEmpty: true });
        console.log(
            "Initial XML (with number format attempt):\n",
            xmlString.substring(0, 500) + "..."
        ); // Log a part of the generated XML for debugging.

        // Sometimes, `xmlbuilder2` might not add the `<?xml ...?>` declaration at the very beginning.
        // This check ensures it's always there, as it's crucial for valid XML files.
        if (!xmlString.startsWith("<?xml")) {
            xmlString = '<?xml version="1.0" encoding="utf-8"?>\n' + xmlString;
        }

        console.log("Applying string replacement fallback for empty tags...");
        // This is a list of specific XML tags that, according to the ONLV standard,
        // should always appear as `<tag></tag>` (an opening and closing tag)
        // even if they are empty, instead of a self-closing tag like `<tag/>`.
        const tagsToFix = [
            "festpreise",
            "aufsummen",
            "auflvsumme",
            "preisanteile",
            "normalposition",
            "nichtangeboten",
            "p",
            "keinepreisanteile",
            "nichtinteilausgabe",
            "aufpreisanteile",
            "aufhgsummen",
            "aufogsummen",
            "auflgsummen",
            "aufulgsummen",
            "benutzerdefiniert",
            "text-mehrzeilig",
            "janein",
            "datum",
            "summebilden",
            "mengenabhaengig",
            "br",
            "b",
            "i",
            "tt",
            "sub",
            "sup",
            "u",
            "h1",
            "h2",
            "h3",
            "li",
            "td",
            "al",
            "bl",
            "blo",
            "rw",
            "eventualposition",
            "stichwort-luecke",
            "fuellzeichen",
            "kommunikation",
        ];
        // We loop through each tag in our list and use a "regular expression" (regex)
        // to find any self-closing versions of these tags (`<tag/>`) and replace them
        // with the full opening and closing tags (`<tag></tag>`).
        tagsToFix.forEach((tag) => {
            const selfClosingRegex = new RegExp(`<${tag}\\s*/>`, "gi"); // This regex finds `<tag/>` or `<tag />`.
            xmlString = xmlString.replace(
                selfClosingRegex,
                `<${tag}></${tag}>` // Replace with the full opening and closing tags.
            );
        });
        console.log("Empty tag replacement complete.");
        console.log(
            "Final XML after replacements:\n",
            xmlString.substring(0, 500) + "..."
        ); // Log the final XML string.

        // Finally, we prepare the XML string to be downloaded as a file.
        const blob = new Blob([xmlString], { type: "application/xml" }); // Create a "Blob" (a file-like object) with our XML content.
        const url = URL.createObjectURL(blob); // Create a temporary URL for this Blob.
        const a = document.createElement("a"); // Create a temporary link element.
        a.href = url; // Set the link's destination to our Blob URL.
        a.download = filename; // Set the filename for the download.
        document.body.appendChild(a); // Add the link to the webpage (it's hidden).
        a.click(); // Programmatically "click" the link to start the download.
        document.body.removeChild(a); // Remove the temporary link from the webpage.
        URL.revokeObjectURL(url); // Release the temporary URL to free up memory.
    } catch (error) {
        // If anything goes wrong during XML generation or download, we catch the error here.
        console.error("Error during XML generation or export:", error); // Log the error for developers.
        alert("Fehler beim Exportieren der XML-Datei: " + error.message); // Show an alert message to the user (in German).
    }
};
