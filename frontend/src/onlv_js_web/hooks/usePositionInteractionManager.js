// This file defines a special reusable function for our user interface, called a "custom hook" in React.
// Think of this hook as a "memory manager" for the user's interactions within the ONLV table.
//
// The main purpose of this hook is to:
// 1.  **Remember the Last Clicked Item:** It keeps track of the very last construction position or group (ULG)
//     that the user selected. This is useful so that if the user reloads the page, the application can
//     highlight the same item they were looking at before.
// 2.  **Keep a History of Clicks:** It maintains a list of all the items the user has clicked on during their
//     current session. This could be used to create a "back" button or to analyze which parts of the
//     project the user is most interested in.
// 3.  **Inform Other Parts of the App:** When the user clicks on a new item, this hook tells other parts of the
//     application about this change, so they can update themselves (e.g., display detailed information
//     about the newly selected item).
//
// It uses several tools from React to achieve this:
// - `useState`: To store the currently selected item and the history list.
// - `useEffect`: To perform actions (like saving to the browser's memory) *after* the user clicks on something.
// - `useCallback`: For a small performance improvement, ensuring a helper function isn't recreated unnecessarily.

import { useState, useEffect, useCallback } from "react"; // We need these special tools from the React library to build our hook.

/**
 * @function usePositionInteractionManager
 * @description This is our custom React hook. It's a reusable piece of logic designed to manage everything
 *              related to tracking which position or ULG is currently selected by the user.
 *
 * @param {function} onPositionDataUpdate - This is a function that the parent component gives to us.
 *                                        Our hook will call this function whenever the user selects a new item.
 *                                        It's like a notification system, telling the parent: "Hey, the user
 *                                        just selected something new! Here are the details."
 *
 * @returns {object} The hook gives back an object containing several useful things that other components can use:
 *   - `selectedPositionInfo`: A variable holding all the details of the currently selected item.
 *   - `setSelectedPositionInfo`: The function to *change* which item is currently selected.
 *   - `positionInteractionHistory`: A list (array) containing the history of all selected items.
 *   - `setPositionInteractionHistory`: The function to update this history list.
 *   - `getSelectedPositionData`: A helper function to get the current selection and history together.
 */
export const usePositionInteractionManager = (onPositionDataUpdate) => {
    // Here, we use `useState` to create a piece of "state" or "memory" for our hook.
    // `selectedPositionInfo` will hold the data for the item the user clicks on. It starts as `null` because nothing is selected at first.
    // `setSelectedPositionInfo` is the special function we MUST use to update `selectedPositionInfo`.
    const [selectedPositionInfo, setSelectedPositionInfo] = useState(null);

    // We create another piece of state to keep a history of all the items the user has clicked on.
    // `positionInteractionHistory` is a list (an array) that starts empty.
    // `setPositionInteractionHistory` is the function we'll use to add items to this list.
    const [positionInteractionHistory, setPositionInteractionHistory] =
        useState([]);

    // `useEffect` is a powerful React hook that lets us run code in response to changes.
    // This block of code will automatically run *every time* the `selectedPositionInfo` state changes.
    // This is perfect for when we want to do something immediately after the user selects a new item.
    useEffect(() => {
        // First, we check if an item has actually been selected. If `selectedPositionInfo` is `null`, we do nothing.
        if (selectedPositionInfo) {
            // We need to handle two different kinds of selections: a ULG (a group of positions) or a single position.
            // We check the `isUlg` property to see which one it is.
            if (selectedPositionInfo.isUlg) {
                // If it's a ULG, we save its specific details to the browser's local storage.
                // `localStorage` is a small storage space in the browser that persists even if the user reloads the page.
                // This is how we "remember" the last selection across page reloads.
                // We use `JSON.stringify` to convert our JavaScript object into a text format that can be stored.
                try {
                    localStorage.setItem(
                        "lastSelectedPosition",
                        JSON.stringify({
                            isUlg: true,
                            ulgNr: selectedPositionInfo.ulgNr,
                            lgNr: selectedPositionInfo.lgNr,
                            childCount: selectedPositionInfo.childCount,
                            lastPositionNr: selectedPositionInfo.lastPositionNr,
                            title: selectedPositionInfo.title,
                            timestamp: new Date().toISOString(), // We add a timestamp to know when it was saved.
                            type: "ulg",
                        })
                    );
                } catch (error) {
                    // It's good practice to wrap localStorage access in a try...catch block
                    // in case the user's browser has it disabled or the storage is full.
                    console.error("Failed to save ULG to localStorage:", error);
                }
            } else {
                // If it's a regular position, we save its details.
                try {
                    localStorage.setItem(
                        "lastSelectedPosition",
                        JSON.stringify({
                            isUlg: false,
                            grundtextnr: selectedPositionInfo.grundtextnr,
                            lgNr: selectedPositionInfo.lgNr,
                            ulgNr: selectedPositionInfo.ulgNr,
                            ftnrList: selectedPositionInfo.ftnrList,
                            lastFtnr: selectedPositionInfo.lastFtnr,
                            grundtextParent:
                                selectedPositionInfo.grundtextParent
                                    ? {
                                          id: selectedPositionInfo
                                              .grundtextParent.id,
                                          nr: selectedPositionInfo
                                              .grundtextParent.nr,
                                          type: selectedPositionInfo
                                              .grundtextParent.type,
                                      }
                                    : null,
                            hasGrundtextLangtext:
                                !!selectedPositionInfo.grundtextLangtext,
                            timestamp: new Date().toISOString(),
                            type: selectedPositionInfo.type,
                        })
                    );
                } catch (error) {
                    console.error(
                        "Failed to save position to localStorage:",
                        error
                    );
                }
            }

            // After saving, we check if the parent component gave us an `onPositionDataUpdate` function.
            if (onPositionDataUpdate) {
                // If it did, we call it. This is how we notify the parent component about the new selection.
                // We pass it an object with both the new `currentPosition` and the entire `interactionHistory`.
                onPositionDataUpdate({
                    currentPosition: selectedPositionInfo,
                    interactionHistory: positionInteractionHistory,
                });
            }
        }
    }, [
        // This is the "dependency array". It tells React to re-run this `useEffect` block
        // ONLY when one of these values changes.
        selectedPositionInfo,
        positionInteractionHistory,
        onPositionDataUpdate,
    ]);

    // `useCallback` is a performance optimization hook.
    // It "memoizes" the function, meaning it prevents this function from being recreated on every render,
    // unless its own dependencies (`selectedPositionInfo` or `positionInteractionHistory`) change.
    const getSelectedPositionData = useCallback(() => {
        return {
            currentPosition: selectedPositionInfo,
            interactionHistory: positionInteractionHistory,
        };
    }, [selectedPositionInfo, positionInteractionHistory]);

    // Finally, our hook returns an object with all the state and functions
    // so that any component that uses this hook can access and control them.
    return {
        selectedPositionInfo,
        setSelectedPositionInfo,
        positionInteractionHistory,
        setPositionInteractionHistory,
        getSelectedPositionData,
    };
};
