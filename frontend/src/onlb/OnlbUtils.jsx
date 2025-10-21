// This file provides utility functions for working with ONLB (construction specification) data
// Think of it as a helper toolbox that contains useful functions for checking and validating construction codes

// The main purpose of this file is to:
// - Check if construction codes exist in a predefined list of valid codes
// - Provide fast lookup functionality for large datasets
// - Handle validation and error checking for code searches

// This is particularly useful in construction projects where you need to verify that
// position codes, material codes, or other identifiers are valid according to official standards

"use client"; // This tells Next.js that this code should run on the client side (in the browser)
import nrlist from "../CommonData/nrlist.json"; // We import a large JSON file that contains all the valid construction codes

// This variable stores a Set (a special data structure for fast lookups) that we create from the nrlist
// We use "memoization" here, which means we only create this Set once and reuse it for all future searches
// This is much faster than creating a new Set every time we want to search for a code
let nrlistSet = null; // Start with null - we'll create the Set when we first need it

/**
 * This function checks if a construction code exists in our list of valid codes
 * Think of it like looking up a word in a dictionary - we want to know if the code is "official" or not
 *
 * Why do we need this? In construction projects, there are official code lists that define
 * valid position numbers, material codes, etc. This function helps us verify that a code
 * is legitimate according to those official standards.
 *
 * The function is optimized for speed because we might need to check thousands of codes,
 * and we want the app to stay responsive.
 *
 * @param {string} codeToSearch - The construction code we want to check (like "12345" or "ABC-123")
 * @returns {boolean} - Returns true if the code exists in our official list, false if it doesn't
 */
export function isCodeInNrlist(codeToSearch) {
    // Step 1: Create our fast lookup Set if we haven't already
    // This only happens once, no matter how many times we call this function
    if (nrlistSet === null) {
        // First, let's make sure the imported nrlist data is actually an array
        // If the JSON file is corrupted or missing, we need to handle that gracefully
        if (!Array.isArray(nrlist)) {
            console.error(
                "isCodeInNrlist: nrlist.json content is not an array or could not be loaded."
            );
            return false; // If we can't load the code list, we can't validate anything
        }

        // Create a Set from the array for super-fast lookups
        // A Set is like an array, but checking if something exists in it is much faster
        // Array lookup: has to check each item one by one (slow for large lists)
        // Set lookup: uses a hash table to find items instantly (very fast)
        nrlistSet = new Set(nrlist);
    }

    // Step 2: Validate that the user gave us a string to search for
    // We need to be defensive and check that the input is the right type
    if (typeof codeToSearch !== "string") {
        console.error("isCodeInNrlist: codeToSearch must be a string.");
        return false; // If it's not a string, we can't search for it
    }

    // Step 3: Perform the actual lookup
    // Set.has() is extremely fast - it uses a hash table internally
    // This means even if we have 100,000 codes in our list, the lookup is nearly instant
    // Technical note: Set.has() has O(1) average time complexity, meaning it takes the same
    // amount of time whether we have 10 codes or 10 million codes in our list
    return nrlistSet.has(codeToSearch);
}
