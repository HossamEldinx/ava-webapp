// This file is a "toolbox" of helper functions designed to work with ONLV data,
// which is a structured format for construction project information. Think of ONLV data
// as a complex, nested list, like a tree with branches (groups and sub-groups) and
// leaves (individual work items or "positions").
//
// The main job of the functions in this file is to merge new data into an existing
// ONLV data structure. This is a common task when you load a base project file and then
// need to add or update it with changes from another file or from user input.
//
// These functions help ensure that:
// 1. New items are added correctly into the nested structure.
// 2. Existing items are updated with new information without being duplicated.
// 3. The entire structure remains sorted and organized according to its rules.
//
// This keeps the main application code cleaner because all the complex data-handling
// logic is kept here in this one utility file.

// Helper to mark an ONLV item and its children as "fixed"
/**
 * This function walks through a piece of the ONLV data (an "item") and marks it,
 * along with all its children and sub-children, with a "fixed" status.
 * Think of it as putting a "Do Not Change" sticker on a folder and every file inside it.
 *
 * Why is this useful? Sometimes, we load data from a standard library that should not
 * be accidentally modified by later processes. By marking it as "fixed," we can
 * easily identify and protect this data.
 *
 * @param {object} item - A part of the ONLV data structure, like an LG, ULG, or a position.
 */
export const markOnlvItemFixed = (item) => {
    // First, we do a safety check. If the item is empty (null) or not a valid object,
    // we can't do anything with it, so we stop right away.
    if (!item || typeof item !== "object") return;

    // We add a 'status' property to the item and set its value to "fixed".
    // This is the "sticker" we're adding to the item.
    item.status = "fixed"; // Add status property

    // Now, we need to find all the children of this item and do the same thing to them.
    // This is a "recursive" process, meaning the function will call itself for each child it finds.

    // Check if the item has a list of "ULGs" (sub-groups).
    if (item["ulg-liste"] && item["ulg-liste"].ulg) {
        // ONLV data can be tricky. Sometimes a list with one item is just an object,
        // but a list with many items is an array. We handle both cases here to be safe.
        // We make sure we always have an array to work with.
        const ulgs = Array.isArray(item["ulg-liste"].ulg)
            ? item["ulg-liste"].ulg
            : [item["ulg-liste"].ulg].filter(Boolean); // The .filter(Boolean) removes any empty or invalid entries.
        // Now we loop through each ULG and call this same function on it.
        ulgs.forEach((ulg) => markOnlvItemFixed(ulg));
    }

    // Next, we check if the item has "positionen" (a list of work items).
    if (item.positionen) {
        // A list of positions can contain different types, like "grundtextnr".
        if (item.positionen.grundtextnr) {
            // Again, we make sure we have an array to work with.
            const grundtextnrs = Array.isArray(item.positioners.grundtextnr)
                ? item.positionen.grundtextnr
                : [item.positionen.grundtextnr].filter(Boolean);
            // We loop through each "grundtextnr" (a base work item).
            grundtextnrs.forEach((gt) => {
                // Mark the base item itself as fixed.
                markOnlvItemFixed(gt);
                // A "grundtextnr" can have its own sub-items called "folgeposition".
                if (gt.folgeposition) {
                    // We handle the array-or-object case for folgeposition as well.
                    const folgepositions = Array.isArray(gt.folgeposition)
                        ? gt.folgeposition
                        : [gt.folgeposition].filter(Boolean);
                    // And finally, we loop through the sub-items and mark them as fixed.
                    folgepositions.forEach((fp) => markOnlvItemFixed(fp));
                }
            });
        }
        // The list of positions can also contain "ungeteilteposition" items.
        if (item.positionen.ungeteilteposition) {
            // Make sure we have an array.
            const ungeteiltepositions = Array.isArray(
                item.positionen.ungeteilteposition
            )
                ? item.positionen.ungeteilteposition
                : [item.positionen.ungeteilteposition].filter(Boolean);
            // Loop through and mark each one as fixed.
            ungeteiltepositions.forEach((up) => markOnlvItemFixed(up));
        }
    }
};

// Helper to merge positions (grundtextnr, ungeteilteposition, folgeposition)
/**
 * This function intelligently merges a list of new work items ("positions") into an existing list.
 * It's like updating a contact list: if a person already exists, you update their info;
 * if they are new, you add them to the list.
 *
 * @param {Array} targetList - The original list of items that we want to add to or update.
 * @param {Array} newItems - The list of new items that need to be merged into the target list.
 */
export const mergePositionsInList = (targetList, newItems) => {
    // We go through each of the "new items" one by one.
    newItems.forEach((newItem) => {
        // For each new item, we check if an item with the same ID ('@_nr') already exists in our main list.
        const existingItemIndex = targetList.findIndex(
            (item) => item["@_nr"] === newItem["@_nr"]
        );

        // The findIndex function gives us the position of the item in the list.
        // If it returns -1, it means the item was not found.
        if (existingItemIndex !== -1) {
            // If the item already exists...
            // We get the existing item from our target list.
            const existingItem = targetList[existingItemIndex];
            // We merge the properties from the new item into the existing one.
            // Object.assign is a simple way to copy all properties from one object to another.
            // If a property exists in both, the one from newItem will overwrite the one in existingItem.
            Object.assign(existingItem, newItem);

            // If the item is a "grundtextnr" (a base item), it might have its own sub-items ("folgeposition").
            // We need to merge those sub-items recursively as well.
            if (newItem.folgeposition && existingItem.folgeposition) {
                // Make sure both the existing and new folgeposition lists are arrays,
                // because they could be single objects if there's only one.
                existingItem.folgeposition = Array.isArray(
                    existingItem.folgeposition
                )
                    ? existingItem.folgeposition
                    : existingItem.folgeposition
                    ? [existingItem.folgeposition]
                    : [];
                const newFolgepositions = Array.isArray(newItem.folgeposition)
                    ? newItem.folgeposition
                    : newItem.folgeposition
                    ? [newItem.folgeposition]
                    : [];
                // Here, we call the function on itself! This is recursion.
                // We're telling it to do the same merge logic but for the sub-item list.
                mergePositionsInList(
                    existingItem.folgeposition,
                    newFolgepositions
                );
            }
        } else {
            // If the item does not exist in the target list...
            // We add it.
            // We use JSON.parse(JSON.stringify(newItem)) to create a completely new copy of the item.
            // This prevents bugs where changing the new item later might accidentally change the original.
            const itemToAdd = JSON.parse(JSON.stringify(newItem));
            targetList.push(itemToAdd);
        }
    });

    // After we've merged all the new items, we sort the entire list.
    // This ensures that all items are in the correct order based on their number ('@_nr').
    targetList.sort((a, b) => {
        // We convert the number string (e.g., "10") into an actual number (10) for correct sorting.
        const nrA = parseInt(a["@_nr"], 10);
        const nrB = parseInt(b["@_nr"], 10);
        return nrA - nrB; // This simple subtraction gives us the correct sort order.
    });
};

// Helper to merge ULGs
/**
 * This function works just like `mergePositionsInList`, but at a higher level.
 * It merges a list of "ULGs" (sub-groups) into an existing list of ULGs.
 *
 * Inside each ULG is a list of work items ("positions"). This function uses
 * the `mergePositionsInList` helper to merge those nested items correctly.
 *
 * @param {Array} targetUlgs - The original list of ULGs to be updated.
 * @param {Array} newUlgs - The list of new ULGs to merge in.
 */
export const mergeUlgsInList = (targetUlgs, newUlgs) => {
    // We loop through each new ULG.
    newUlgs.forEach((newUlg) => {
        // We check if a ULG with the same number ('@_nr') already exists.
        const existingUlgIndex = targetUlgs.findIndex(
            (ulg) => ulg["@_nr"] === newUlg["@_nr"]
        );

        if (existingUlgIndex !== -1) {
            // If the ULG exists, we get it from the list.
            const existingUlg = targetUlgs[existingUlgIndex];
            // We merge the top-level properties of the ULG (like its title).
            Object.assign(existingUlg, newUlg);

            // Now, we need to merge the work items ("positions") inside this ULG.
            // We make sure the 'positionen' object exists, creating it if it doesn't.
            existingUlg.positionen = existingUlg.positionen || {};

            // --- Merge "grundtextnr" items within the ULG ---
            // First, we make sure the list of grundtextnr items is an array in the existing ULG.
            existingUlg.positionen.grundtextnr = Array.isArray(
                existingUlg.positionen.grundtextnr
            )
                ? existingUlg.positionen.grundtextnr
                : existingUlg.positionen.grundtextnr
                ? [existingUlg.positionen.grundtextnr]
                : [];
            // Then, we get the list of new grundtextnr items, also ensuring it's an array.
            const newGrundtextnrs = Array.isArray(
                newUlg.positionen?.grundtextnr
            )
                ? newUlg.positionen.grundtextnr
                : newUlg.positionen?.grundtextnr
                ? [newUlg.positionen.grundtextnr]
                : [];
            // We call our other helper function to do the actual merging of these items.
            mergePositionsInList(
                existingUlg.positionen.grundtextnr,
                newGrundtextnrs
            );

            // --- Merge "ungeteilteposition" items within the ULG ---
            // We do the exact same process for the "ungeteilteposition" items.
            // Ensure the existing list is an array.
            existingUlg.positionen.ungeteilteposition = Array.isArray(
                existingUlg.positionen.ungeteilteposition
            )
                ? existingUlg.positionen.ungeteilteposition
                : existingUlg.positionen.ungeteilteposition
                ? [newUlg.positionen.ungeteilteposition]
                : [];
            // Ensure the new list is an array.
            const newUngeteiltepositions = Array.isArray(
                newUlg.positionen?.ungeteilteposition
            )
                ? newUlg.positionen.ungeteilteposition
                : newUlg.positionen?.ungeteilteposition
                ? [newUlg.positionen.ungeteilteposition]
                : [];
            // Call the helper function to merge them.
            mergePositionsInList(
                existingUlg.positionen.ungeteilteposition,
                newUngeteiltepositions
            );
        } else {
            // If the ULG is new, we add it to the list.
            // Again, we create a deep copy to avoid side effects.
            const ulgToAdd = JSON.parse(JSON.stringify(newUlg));
            targetUlgs.push(ulgToAdd);
        }
    });

    // Finally, we sort the list of ULGs by their number to keep everything in order.
    targetUlgs.sort((a, b) => {
        const nrA = parseInt(a["@_nr"], 10);
        const nrB = parseInt(b["@_nr"], 10);
        return nrA - nrB;
    });
};
