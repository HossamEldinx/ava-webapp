// This file contains React components that are used to display various metadata
// and header information from an ONLV (Open Standard for Service Descriptions) project.
// Think of metadata as "data about data" – it provides important context and details
// about the project, like its name, client, and other descriptive information.

// The main idea is to present this structured information in a user-friendly way,
// making it easy for someone to quickly understand the key details of an ONLV document.
// It includes sections for general metadata, project-specific header data,
// and details about different "Leistungsteile" (service parts).

import React from "react"; // We need React to build our user interface components.
import { getValue } from "../../OnlvEdit"; // This helper function helps us safely get values from our data, even if they are nested or missing.

// This component is designed to display general metadata about the ONLV project.
// `React.memo` is used here to make it more efficient: it will only re-render if its inputs (props) change.
export const MetadataSection = React.memo(({ metadata }) => {
    // If there's no metadata provided, we display a message saying so.
    if (!metadata)
        return <div className="info-section">Keine Metadaten vorhanden.</div>;
    // If metadata exists, we display it in a structured list.
    return (
        <div className="metadata-section info-section">
            <h3>Metadaten</h3> {/* A heading for this section. */}
            <ul>
                {/* We go through each key-value pair in the `metadata` object.
                `Object.entries` turns the object into an array of `[key, value]` pairs. */}
                {Object.entries(metadata).map(([key, value]) => (
                    <li key={key}>
                        {/* For each item, we display the key in bold and its corresponding value. */}
                        <strong>{key}:</strong> {getValue(value)}
                    </li>
                ))}
            </ul>
        </div>
    );
});

// This component displays important header information about the ONLV project,
// such as the project name, description, and client details.
export const ProjectHeaderSection = React.memo(({ kenndaten }) => {
    // If there's no `kenndaten` (key data) provided, we display a message.
    if (!kenndaten)
        return <div className="info-section">Keine Kenndaten vorhanden.</div>;
    // If `kenndaten` exists, we display specific project details.
    return (
        <div className="project-header-section info-section">
            <h3>Projektdaten</h3> {/* A heading for the project data. */}
            <p>
                {/* Display the project's "Vorhaben" (undertaking/project name). */}
                <strong>Vorhaben:</strong> {getValue(kenndaten.vorhaben)}
            </p>
            <p>
                {/* Display the "LV Bezeichnung" (tender service description name). */}
                <strong>LV Bezeichnung:</strong>{" "}
                {getValue(kenndaten.lvbezeichnung)}
            </p>
            <p>
                {/* Display the "Auftraggeber" (client's) company name.
                We use `?.` (optional chaining) to safely access nested properties like `firma?.name`. */}
                <strong>Auftraggeber:</strong>{" "}
                {getValue(kenndaten.auftraggeber?.firma?.name)}
            </p>
        </div>
    );
});

// This component displays a list of "Leistungsteile" (service parts) from the ONLV document.
// These are often sub-sections or categories within the overall service description.
export const LeistungsteilSection = React.memo(({ leistungsteiltabelle }) => {
    // If there's no `leistungsteiltabelle` or no `leistungsteil` within it, we return nothing.
    if (!leistungsteiltabelle || !leistungsteiltabelle.leistungsteil)
        return null;
    // The `leistungsteil` can be a single item or a list of items. We make sure it's always an array
    // so we can easily go through each part.
    const teile = Array.isArray(leistungsteiltabelle.leistungsteil)
        ? leistungsteiltabelle.leistungsteil
        : [leistungsteiltabelle.leistungsteil];

    // If `teile` is empty after this, we might still return null, but the map below would just render nothing.
    // For clarity, we could add `if (teile.length === 0) return null;` here, but it's not strictly necessary.

    return (
        <div className="leistungsteil-section info-section">
            <h3>Leistungsteile</h3> {/* A heading for the service parts. */}
            {/* We go through each `teil` (service part) in our `teile` array. */}
            {teile.map((teil) => (
                <div
                    key={teil["@_nr"]} // Each service part needs a unique key for React to manage it efficiently.
                    style={{
                        marginBottom: "10px", // Space below each part.
                        borderBottom: "1px solid #4a5568", // A line to separate parts.
                        paddingBottom: "5px", // Padding above the separating line.
                    }}
                >
                    <p>
                        {/* Display the "Nr" (number) of the service part. */}
                        <strong>Nr:</strong> {teil["@_nr"]}
                    </p>
                    <p>
                        {/* Display the "Bezeichnung" (description/name) of the service part. */}
                        <strong>Bezeichnung:</strong>{" "}
                        {getValue(teil.bezeichnung)}
                    </p>
                </div>
            ))}
        </div>
    );
});
