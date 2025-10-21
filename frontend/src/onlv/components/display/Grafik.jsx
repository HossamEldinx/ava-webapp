// This file is all about displaying graphics (images) that are part of an ONLV project.
// It provides two main components: one for showing a single graphic and another for displaying a collection of graphics.

// The main idea is to take graphic data, which is often stored as a special kind of text (base64 encoded),
// and turn it back into a visible image. It also handles cases where the graphic data might be missing or in an unexpected format,
// showing a placeholder instead of breaking the display.

// It's important because ONLV documents can include visual elements, and this file ensures
// those elements are correctly rendered for the user to see.

import React from "react"; // We need React to build our user interface components.
import { getValue } from "../../OnlvEdit"; // This helper function helps us safely get values from our data, even if they are nested or missing.

// This is a special component that displays a single graphic.
// `React.memo` is used here to make it more efficient: it will only re-render if its inputs (props) change.
export const GrafikDisplay = React.memo(
    ({
        linkId, // This is the unique ID that links to a specific graphic in our data.
        grafikTabelle, // This is the whole table of graphic data, where we'll look up our graphic by `linkId`.
        fullSize = false, // This is a switch: if `true`, the graphic will be shown larger; otherwise, it's a small thumbnail.
    }) => {
        // If we don't have a `linkId` or there's no `grafikelement` (graphic data) in our table, we can't show anything, so we return nothing.
        if (!linkId || !grafikTabelle?.grafikelement) return null;

        // The `grafikelement` can be a single item or a list of items. We make sure it's always an array
        // so we can easily search through it.
        const elements = Array.isArray(grafikTabelle.grafikelement)
            ? grafikTabelle.grafikelement
            : [grafikTabelle.grafikelement];
        // We try to find the specific graphic in our `elements` list that matches our `linkId`.
        const grafik = elements.find((g) => g && g["@_id"] === linkId);

        // If we couldn't find the graphic with the given `linkId`, we show a small text indicating the missing ID.
        if (!grafik) return <small className="grafik-ref">ID:{linkId}</small>;

        // We extract the graphic's description (`bezeichnung`), its format (like "image/png"),
        // and the actual image data (`daten`) using our `getValue` helper.
        const bezeichnung = getValue(grafik.bezeichnung);
        const format = getValue(grafik.format);
        const daten = getValue(grafik.daten);

        // We check if we have actual image data (not just "...") and if the format starts with "image/".
        if (daten && daten !== "..." && format?.startsWith("image/")) {
            try {
                // We create a special URL (`src`) that tells the browser to display the base64 encoded image data.
                const src = `data:${format};base64,${daten}`;
                return (
                    // This `div` acts as a container for our graphic, applying different styles based on `fullSize`.
                    <div
                        className={
                            fullSize ? "grafik-full" : "grafik-thumbnail"
                        }
                    >
                        <img
                            src={src} // The source of our image.
                            alt={bezeichnung || `Grafik ${linkId}`} // Text for screen readers, describing the image.
                            style={{
                                maxWidth: fullSize ? "300px" : "60px", // Set maximum width based on `fullSize`.
                                maxHeight: fullSize ? "300px" : "60px", // Set maximum height based on `fullSize`.
                                display: "block", // Make sure it behaves like a block element.
                                marginBottom: "2px", // A little space below.
                                border: "1px solid #555", // A small border around the image.
                            }}
                            className={
                                fullSize
                                    ? "grafik-image-full"
                                    : "grafik-image-thumb"
                            } // Apply specific CSS classes.
                            loading="lazy" // This tells the browser to load the image only when it's about to be seen, saving resources.
                        />
                        {bezeichnung && (
                            // If there's a description, we display it below the image.
                            <small className="grafik-caption">
                                {" "}
                                {bezeichnung}{" "}
                            </small>
                        )}
                    </div>
                );
            } catch (e) {
                // If something goes wrong while trying to display the image, we log an error.
                console.error("Error displaying image:", e);
            }
        }
        // If the data isn't an image or is missing, we show a text placeholder with the graphic's description or ID and format.
        return (
            <small className="grafik-ref">
                {" "}
                {bezeichnung || `Grafik ${linkId}`} ({format || "N/A"}){" "}
            </small>
        );
    }
);

// This component displays a gallery of all graphics found in the `grafikTabelle`.
export const GrafikGallery = ({ grafikTabelle }) => {
    // If there's no graphic data, we return nothing.
    if (!grafikTabelle?.grafikelement) return null;
    // We get all graphic elements, ensuring it's an array and filtering out any empty ones.
    const elements = Array.isArray(grafikTabelle.grafikelement)
        ? grafikTabelle.grafikelement
        : [grafikTabelle.grafikelement].filter(Boolean);

    // If there are no elements after filtering, we return nothing.
    if (!elements || elements.length === 0) return null;

    return (
        // This `div` is the main container for our gallery.
        <div className="grafik-gallery-section info-section">
            <h3>Referenzierte Grafiken</h3> {/* A heading for the gallery. */}
            <div className="grafik-gallery-items">
                {/* We go through each graphic element and display it using our `GrafikDisplay` component,
                making sure to show them in full size within the gallery. */}
                {elements.map((grafik) => (
                    <GrafikDisplay
                        key={grafik["@_id"]} // Each graphic needs a unique key for React to manage it efficiently.
                        linkId={grafik["@_id"]} // Pass the graphic's ID.
                        grafikTabelle={grafikTabelle} // Pass the whole graphics table.
                        fullSize={true} // Always show full size in the gallery.
                    />
                ))}
            </div>
        </div>
    );
};
