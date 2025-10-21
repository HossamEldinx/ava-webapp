// This file defines a special function called `useFiltering`. In React, a function
// whose name starts with "use" is called a "hook." Hooks let us reuse logic across
// different parts of our app.
//
// The main job of this `useFiltering` hook is to manage the search or "filtering"
// functionality for a table that displays ONLV project data. Think of it as the
// brain behind the search bar you see above a table.
//
// Here's what it does in simple steps:
// 1. It keeps track of what the user is typing into the search box.
// 2. It takes the full list of data and filters it based on the user's search text.
// 3. It's smart about the hierarchy (the parent-child structure) of the data. If a
//    child item matches the search, this hook makes sure its parent (and grandparent, etc.)
//    are also visible, so the user can see where the item belongs.
// 4. It also checks which parts of the table are expanded (opened up) by the user,
//    and only shows items that are inside an expanded section.
//
// By doing all this, it provides a final, clean list of only the data that should be
// visible to the user at any given moment.

import { useState, useMemo } from "react"; // We import two important tools from React.
// - `useState`: This is a hook that lets our component "remember" things. In our case, it remembers what the user has typed into the search box.
// - `useMemo`: This is a performance hook. It helps us avoid slow calculations. It "memoizes" (remembers) the result of a calculation and only re-runs it if the inputs change. This makes our app feel faster.

/**
 * @function useFiltering
 * @description This is our custom React hook. It's designed to handle all the complex logic
 * for filtering the data shown in the ONLV table.
 *
 * It does two main things:
 * 1. Manages the text the user types in the filter/search box.
 * 2. Calculates which rows of data should be visible based on that filter text and which
 *    parent rows are currently expanded (open).
 *
 * When a user searches for something, this hook ensures that any matching items are shown,
 * along with all of their parents, so the user understands the context of the search results.
 *
 * @param {Array<object>} flatData - This is the complete list of all our data, flattened into a simple array. Each object in the array is one row in our table.
 * @param {Set<string>} expandedIds - This is a Set (a special list that's very fast for lookups) containing the unique IDs of all the rows that the user has currently expanded or "opened up."
 * @param {Map<string, string>} parentMap - This is a Map (a special object for fast lookups) that helps us quickly find the parent of any item. The key is an item's ID, and the value is its parent's ID.
 *
 * @returns {object} It returns an object with three things:
 *   - `filterText`: The current text in the search box.
 *   - `setFilterText`: The function we can call to change the search text.
 *   - `visibleData`: The final, calculated array of items that should be visible in the table right now.
 */
export const useFiltering = (flatData, expandedIds, parentMap) => {
    // Here, we use the `useState` hook to create a "state variable" called `filterText`.
    // This is where we'll store the user's input from the search box.
    // `setFilterText` is the function we'll use to update this value whenever the user types.
    // We start with an empty string "" because the search box is empty at the beginning.
    const [filterText, setFilterText] = useState("");

    // Here, we use the `useMemo` hook to calculate `visibleData`.
    // This code block will only re-run if `flatData`, `filterText`, `expandedIds`, or `parentMap` changes.
    // This is a huge performance win because we avoid recalculating the visible data on every single re-render.
    const visibleData = useMemo(() => {
        // We convert the filter text to lowercase and trim any whitespace. This makes the search case-insensitive (e.g., "Apple" matches "apple").
        const lowerFilter = filterText.toLowerCase().trim();
        // We start by assuming all data will be shown.
        let itemsToShow = flatData;

        // This block of code runs only if the user has actually typed something into the search box.
        if (lowerFilter) {
            const matchingIds = new Set(); // A set to store IDs of items that directly match the search.
            const requiredAncestorIds = new Set(); // A set to store IDs of all parents of the matching items.

            // We loop through every single item in our data.
            flatData.forEach((item) => {
                // We check if the item's `searchableText` (a pre-prepared string with all relevant info) includes the filter text.
                if (item.searchableText?.includes(lowerFilter)) {
                    // If it's a match, we add its ID to our `matchingIds` set.
                    matchingIds.add(item.id);
                    // Now, we need to find all its parents and add them to `requiredAncestorIds`.
                    let parentId = parentMap.get(item.id); // Get the direct parent.
                    while (parentId) {
                        // Keep going up the chain until we run out of parents.
                        requiredAncestorIds.add(parentId); // Add the parent's ID.
                        parentId = parentMap.get(parentId); // Get the grandparent.
                    }
                }
            });

            // Combine the matching items and their ancestors into one big set of all IDs that must be visible.
            const allVisibleIds = new Set([
                ...matchingIds,
                ...requiredAncestorIds,
            ]);
            // Filter the original `flatData` to get only the items whose IDs are in our `allVisibleIds` set.
            itemsToShow = flatData.filter((item) => allVisibleIds.has(item.id));
        }

        // Now, `itemsToShow` contains either all items (if no filter) or just the filtered items and their parents.
        // The final step is to figure out which of these should *actually* be rendered, based on what's expanded.
        const finalVisibleItems = [];
        const currentlyExpanded = expandedIds; // A reference to the set of expanded IDs.

        // This part handles the visibility based on the expansion state.
        itemsToShow.forEach((item) => {
            const parentId = parentMap.get(item.id); // Get the item's parent ID.

            // Debug logging for ULG children
            if (parentId && parentId.startsWith("ulg-")) {
                console.log(
                    `Filtering child ${
                        item.id
                    } of parent ${parentId}, parent expanded: ${currentlyExpanded.has(
                        parentId
                    )}`
                );
            }

            // An item is visible if...
            // 1. It has no parent (it's a top-level item).
            // 2. Or, its direct parent is in the `currentlyExpanded` set (meaning its parent folder is open).
            if (!parentId || currentlyExpanded.has(parentId)) {
                finalVisibleItems.push(item);
            }
        });

        // Finally, we return the list of items that are both part of the (optional) filter result AND are in an expanded section.
        return finalVisibleItems;
    }, [flatData, filterText, expandedIds, parentMap]); // These are the dependencies for `useMemo`.

    // The hook returns the current filter text, the function to update it, and the final visible data.
    // The component that uses this hook will then use `visibleData` to render the rows in the table.
    return { filterText, setFilterText, visibleData };
};
