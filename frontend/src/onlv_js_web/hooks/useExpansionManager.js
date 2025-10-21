// This file creates a custom "hook" for React called `useExpansionManager`.
// A hook in React is like a reusable tool that you can use in your components.
// This specific hook is designed to manage which rows in a table are "expanded" (open)
// and which are "collapsed" (closed).
//
// Imagine you have a list of folders and files, like in a file explorer.
// You can click a folder to see what's inside (expand it) and click it again to hide the contents (collapse it).
// This hook does exactly that for a table in our application that has rows with children (nested rows).
//
// The main job of this hook is to:
// 1. Keep track of all the rows that are currently expanded. It uses a special list (a "Set") to store their unique IDs.
// 2. Provide simple functions to other parts of our app, like:
//    - `toggleExpand`: A function to open or close a single row.
//    - `expandAll`: A function to open all rows that can be opened.
//    - `collapseAll`: A function to close all currently open rows.
// By creating this hook, we can reuse this logic in any component that needs to manage expandable rows,
// keeping our code clean and organized.

import { useState, useCallback, useEffect } from "react"; // We import some basic tools from React.

// `useState`: This is one of the most important React hooks. It lets our component have its own "state" or "memory." We use it to remember which rows are currently expanded.
// `useCallback`: This is a performance hook. It helps us prevent functions from being recreated every time our component updates. This can make the app run faster, especially with complex tables.
// `useEffect`: This hook lets us run code in response to certain events, like when the component is first loaded or when its data changes. In this file, it's commented out, and we'll explain why later.

/**
 * @function useExpansionManager
 * @description This is our custom React hook. It's a function that gives a component all the tools it needs to manage expandable rows.
 * It remembers which rows are open and provides functions to change that.
 *
 * @param {Array<object>} initialFlatData - This is the list of all rows in our table. We need this list to know which rows have children and can be expanded when the user wants to "Expand All".
 *
 * @returns {object} The hook returns an object with several helpful tools:
 *   - `expandedIds`: A `Set` (a special, fast list) that holds the unique IDs of all rows that are currently open.
 *   - `toggleExpand`: A function to open a closed row or close an open one.
 *   - `expandAll`: A function to open every single row that has children.
 *   - `collapseAll`: A function to close all the open rows at once.
 *   - `setExpandedIds`: A function that lets us directly set which rows are expanded. This is for more advanced cases.
 */
export const useExpansionManager = (initialFlatData = []) => {
    // Here, we use `useState` to create our "memory" for the expanded rows.
    // We initialize it with a `new Set()`, which is an empty set. A Set is like an array, but it's much faster for checking if an item exists, which is perfect for our needs.
    const [expandedIds, setExpandedIds] = useState(new Set());

    // This function handles opening or closing a single row.
    // We wrap it in `useCallback` to make sure it doesn't get recreated unnecessarily, which helps with performance.
    const toggleExpand = useCallback((id, flatData) => {
        console.log(`toggleExpand called with ID: ${id}`);
        // `setExpandedIds` is the function that updates our state.
        // We give it a function that receives the previous state (`prev`) to make sure our update is safe.
        setExpandedIds((prev) => {
            console.log(`Previous expanded IDs:`, Array.from(prev));
            // We create a new Set based on the previous one. It's important to create a new one instead of changing the old one directly. This is a core rule in React.
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                // If the row's ID is already in our Set, it means the row is expanded. So, we remove the ID to collapse it.
                console.log(`Collapsing ID: ${id}`);
                newSet.delete(id);

                // Also collapse all grundtext_desc children when collapsing ULG
                if (flatData) {
                    flatData.forEach((item) => {
                        if (
                            item.parentId === id &&
                            item.type === "grundtext_desc"
                        ) {
                            newSet.delete(item.id);
                        }
                    });
                }
            } else {
                // If the row's ID is not in our Set, it means the row is collapsed. So, we add the ID to expand it.
                console.log(`Expanding ID: ${id}`);
                newSet.add(id);

                // Auto-expand grundtext_desc children when expanding ULG
                if (flatData) {
                    flatData.forEach((item) => {
                        if (
                            item.parentId === id &&
                            item.type === "grundtext_desc"
                        ) {
                            console.log(
                                `Auto-expanding grundtext_desc child: ${item.id}`
                            );
                            newSet.add(item.id);
                        }
                    });
                }
            }
            console.log(`New expanded IDs:`, Array.from(newSet));
            // Finally, we return the new Set, and React will update the component.
            return newSet;
        });
    }, []); // The empty array `[]` means this function will never be recreated, which is good for performance.

    // This function expands all rows that are able to be expanded (i.e., they have children).
    // We also wrap it in `useCallback` for performance.
    const expandAll = useCallback(
        (currentFlatData) => {
            // Sometimes, the table data might be filtered or sorted. `currentFlatData` is the data that is currently visible.
            // If `currentFlatData` is provided, we use it. Otherwise, we fall back to the `initialFlatData` the hook was created with.
            const dataToUse =
                currentFlatData && currentFlatData.length > 0
                    ? currentFlatData
                    : initialFlatData;

            // We go through the data and find all the rows that are "expandable".
            // An expandable row is a specific type (like "lg", "ulg", etc.) and has a `childrenCount` greater than 0.
            const expandableIds = dataToUse
                .filter((item) => {
                    // This logic checks if a row is a "parent" row that can be opened.
                    return (
                        (item.type === "lg" && item.childrenCount > 0) ||
                        (item.type === "ulg" &&
                            (item.childrenCount > 0 ||
                                dataToUse.some(
                                    (child) => child.parentId === item.id
                                ))) ||
                        (item.type === "grundtext_desc" &&
                            item.childrenCount > 0) ||
                        (item.type === "svb" &&
                            (item.childrenCount > 0 ||
                                (item.data && item.data.text))) ||
                        // Add positions that have expandable content (langtext)
                        ((item.type === "position" ||
                            item.type === "grundtext_position" ||
                            item.type === "ungeteilteposition") &&
                            (item.langtext ||
                                item.langtextRaw ||
                                (item.folgeposition &&
                                    Array.isArray(item.folgeposition) &&
                                    item.folgeposition.length > 0) ||
                                item.folgepositionLangtext))
                    );
                })
                .map((item) => item.id); // After filtering, we create a new array containing only the IDs of the expandable rows.

            // We update our state with a new Set containing all the expandable IDs. This makes all of them open.
            setExpandedIds(new Set(expandableIds));
        },
        [initialFlatData] // This function depends on `initialFlatData`, so it will be recreated if `initialFlatData` ever changes.
    );

    // This function collapses all expanded rows.
    // It's very simple: it just resets our state to an empty Set.
    const collapseAll = useCallback(() => {
        setExpandedIds(new Set());
    }, []); // This function has no dependencies, so it will only be created once.

    // This `useEffect` block is commented out, but it's here for a reason.
    // The original idea was to automatically collapse all rows whenever the main data (`initialFlatData`) changes,
    // for example, when a completely new file is loaded.
    // However, this caused a problem: it would also collapse everything every time a small edit was made to the data,
    // which was not a good user experience. The user would lose their place.
    // So, it was decided to comment it out. The expansion state will now stay the same even when the data is updated.
    // If we ever need to reset the expansion when a new file is loaded, we would need a more specific way to do it.
    //
    // useEffect(() => {
    //     setExpandedIds(new Set());
    // }, [initialFlatData]);

    // This is the final step. The hook returns an object containing all the tools
    // (the state and the functions) so that the component using this hook can access and use them.
    return {
        expandedIds,
        toggleExpand,
        expandAll,
        collapseAll,
        setExpandedIds,
    };
};
