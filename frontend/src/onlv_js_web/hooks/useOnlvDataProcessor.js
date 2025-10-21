// This file defines a special helper function for React called a "custom hook".
// Think of a custom hook as a reusable toolkit that you can use in different parts of your app
// to perform a specific job.
//
// The main job of this hook (`useOnlvDataProcessor`) is to take raw, complex, and nested
// ONLV (Austrian standard for service specifications) data, which is structured like a tree with many branches,
// and "flatten" it into a simple, single list. This flat list is much easier to display in a table on the web page.
//
// In simple terms, this hook does the following:
// 1. Takes the original ONLV JSON data as input.
// 2. Processes this data to create a flat array where each item represents a row in a table.
// 3. Manages a "loading" state, so we can show a spinner or message while the data is being processed.
// 4. Manages an "error" state, so we can show a helpful message if something goes wrong.
// 5. Provides the final, processed data (both the original and the flat version) to the component that uses it.
// 6. It also allows updating a shared data source (called a "Context") so other parts of the app can access the data.

import { useState, useEffect } from "react"; // We need `useState` to store information and `useEffect` to perform actions when data changes.
import { flattenOnlvData } from "../../onlv/OnlvDisplay.utils"; // This imports a helper function from another file that does the actual "flattening" of the data.
import emptyOnlvTemplate from "../../CommonData/onlv_empty.json"; // Import the empty ONLV template as fallback

/**
 * @function useOnlvDataProcessor
 * @description This is our custom React hook. It's a function that handles everything related to
 * processing the ONLV JSON data for display.
 *
 * @param {object} jsonData - This is the raw, hierarchical JSON data that we get from a file or an API. It's like the blueprint of our ONLV project.
 * @param {function} setTableData - This is a function from a shared space (React Context). We call this function to update the shared data,
 * making the processed ONLV data available to other components in the app.
 *
 * @returns {object} The hook returns an object containing several pieces of useful information and tools:
 *   - `parsedData`: The original, tree-like ONLV data. We keep this in case we need it.
 *   - `flatData`: The new, simple, flat list of data, perfect for displaying in a table.
 *   - `loading`: A true/false value. `true` means "we are busy processing," `false` means "we are done."
 *   - `error`: A message that tells us if something went wrong during processing.
 *   - `setFlatData`: A function to manually update the flat data if needed.
 *   - `setParsedData`: A function to manually update the original data if needed.
 */
export const useOnlvDataProcessor = (jsonData, setTableData) => {
    // Here, we use `useState` to create "state variables". These are like boxes where we can store information.
    // When we update this information, React automatically re-renders the component to show the changes.

    // This box holds the original, unprocessed ONLV data, keeping its tree-like structure.
    const [parsedData, setParsedData] = useState(null);

    // This box holds the flattened data, which is an array of objects, ready for our table.
    const [flatData, setFlatData] = useState([]);

    // This is a simple switch (true/false) to let us know if the data is currently being processed.
    const [loading, setLoading] = useState(true);

    // This box will hold any error message if something goes wrong. It starts as `null` (empty).
    const [error, setError] = useState(null);

    // `useEffect` is a special React hook that lets us perform side effects.
    // In this case, we want to process the data whenever the `jsonData` input changes.
    // Think of it as an automated worker that watches for new data and starts its job.
    useEffect(() => {
        // First, we do a quick check to see if we have data.
        // If `jsonData` or the `onlv` property inside it is missing, we'll use the empty ONLV template.
        if (!jsonData || !jsonData.onlv) {
            // Instead of showing an error, we use the empty ONLV template to show the table structure
            setError(null); // No error - this is a valid state
            setLoading(true); // Start processing the empty template

            // Process the empty template asynchronously
            const processEmptyTemplate = async () => {
                try {
                    await new Promise((resolve) => setTimeout(resolve, 0));

                    // Use the empty ONLV template
                    const emptyOnlvData = emptyOnlvTemplate.onlv;
                    const flattened = flattenOnlvData(emptyOnlvData);

                    setParsedData(emptyOnlvData);
                    setFlatData(flattened);

                    // Update the shared context with empty template data
                    if (setTableData) {
                        setTableData({ data: emptyOnlvData });
                    }
                } catch (err) {
                    setError(
                        `Fehler beim Laden der leeren Vorlage: ${err.message}`
                    );
                } finally {
                    setLoading(false);
                }
            };

            processEmptyTemplate();
            return;
        }

        // This is a safety flag. It helps us prevent errors if the user navigates away
        // from the page while we are still processing the data.
        let isMounted = true;
        setLoading(true); // We turn the loading indicator ON.
        setError(null); // We clear any previous errors.
        setParsedData(null); // We clear out old data before starting.
        setFlatData([]); // We clear out old flat data too.

        // We define an `async` function to do the actual data processing.
        // This helps keep our code organized.
        const processData = async () => {
            try {
                // This line is a small trick to make sure the browser doesn't freeze if the data processing
                // takes a long time. It gives the browser a moment to breathe before continuing.
                await new Promise((resolve) => setTimeout(resolve, 0));

                // Safety check: if the component is no longer on the screen, we stop.
                if (!isMounted) return;

                // This is the core step! We call our imported helper function to transform
                // the complex, nested data into a simple, flat list.
                const flattened = flattenOnlvData(jsonData.onlv);

                // After flattening, we loop through each item in the new list to do some cleanup.
                // This is a data normalization step.
                flattened.forEach((item) => {
                    // Sometimes, a quantity might be stored in a property called `menge`.
                    // We want to make sure it's consistently available in a property called `lvmenge`.
                    if (
                        (item.type === "position" ||
                            item.type === "grundtext_position") &&
                        !item.lvmenge && // If `lvmenge` is missing...
                        item.menge // ...but `menge` exists...
                    ) {
                        item.lvmenge = item.menge; // ...we copy the value over.
                    }
                });

                // Another safety check before we update our state.
                if (!isMounted) return;

                // Now that the processing is done, we update our state variables with the new data.
                setParsedData(jsonData.onlv); // We store the original data.
                setFlatData(flattened); // We store the new flat data.

                // If the component that uses this hook provided the `setTableData` function...
                if (setTableData) {
                    // ...we call it to update the shared (global) data for other components to use.
                    setTableData({ data: jsonData.onlv });
                }
            } catch (err) {
                // This `catch` block runs if any error occurred inside the `try` block.
                if (isMounted) {
                    // We store the error message so we can display it to the user.
                    setError(`Fehler bei Datenverarbeitung: ${err.message}`);
                }
            } finally {
                // The `finally` block runs no matter what, whether there was an error or not.
                if (isMounted) {
                    // We always make sure to turn the loading indicator OFF when we're done.
                    setLoading(false);
                }
            }
        };

        // We call our processing function to kick things off.
        processData();

        // This is a "cleanup" function. React runs this when the component is removed from the screen.
        // It's like a janitor that cleans up after the party is over.
        return () => {
            // We set our safety flag to false, so any pending operations know not to update the state.
            isMounted = false;
        };
    }, [jsonData, setTableData]); // This array tells `useEffect` to re-run only if `jsonData` or `setTableData` changes.

    // Finally, our hook returns all the state variables and setter functions.
    // This makes them available to the component that is using this hook.
    return { parsedData, flatData, loading, error, setFlatData, setParsedData };
};
