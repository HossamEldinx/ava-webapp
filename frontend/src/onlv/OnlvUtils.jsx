// This file contains a collection of helper functions (or "utilities") specifically designed
// to work with and manage data for ONLV (Online Leistungsverzeichnis) projects.
// Think of it as a toolbox that helps organize, process, and manipulate the complex
// structure of construction project data, such as LGs (main groups), ULGs (sub-groups),
// and various types of positions (tasks or items).

// The main purpose of this file is to:
// - Extract and format information about different project items (like positions or groups).
// - Generate unique identification numbers (Nrs) for new items, ensuring they follow
//   a specific numbering scheme (e.g., "99.10.01A").
// - Structure the flat project data into a more organized, hierarchical view.
// - Provide functions to add new items, like "Folgepositionen" (sub-tasks), into the
//   correct place within the existing project structure.

// These utilities are crucial for maintaining data consistency and enabling the
// application to correctly display, edit, and manage ONLV project details.

/**
 * This function is like a detective that looks at a specific item in our project
 * (like a task or a group) and gathers all important information about it.
 * It helps us understand what kind of item it is, where it belongs in the project,
 * and what its unique number is. This is very useful when a user clicks on an item
 * and we need to show them the right information or editing options.
 *
 * @param {object} positionItem - The specific item we want to investigate.
 * @param {Array} flatData - A big list of ALL items in our project, but without
 *                           any special organization (it's "flat").
 * @returns {object|null} - An object containing all the gathered details about the item, or null if it fails.
 */
export const extractPositionInfo = (positionItem, flatData) => {
    // If we don't have an item or the full project data, we can't do anything, so we stop.
    if (!positionItem || !flatData) return null;

    // First, we check if the item is a "ULG" (a sub-group). These need special handling.
    if (positionItem.type === "ulg") {
        // We need to find the main group ("LG") that this ULG belongs to.
        // We look through the flat data to find an 'lg' item that is the parent of our ULG.
        const lgParent = flatData.find(
            (item) => item.type === "lg" && item.id === positionItem.parentId
        );

        // Next, we find all the tasks (positions) that are direct children of this ULG.
        const childPositions = flatData.filter(
            (item) =>
                item.parentId === positionItem.id &&
                (item.type === "position" ||
                    item.type === "grundtext_position" ||
                    item.type === "grundtext_desc" ||
                    item.type === "grundtext_static_desc")
        );

        // This part is a bit tricky. We need to find the number of the VERY LAST item in this ULG.
        // This is important for figuring out what the NEXT number should be if we add a new item.
        let itemToDetermineLastNr = null;
        if (childPositions.length > 0) {
            const lastDirectChild = childPositions[childPositions.length - 1];

            // If the last child is a "grundtext" (a main task that can have sub-tasks),
            // the "real" last item might be one of its sub-tasks ("folgepositions").
            if (
                lastDirectChild.type === "grundtext_position" ||
                lastDirectChild.type === "grundtext_desc" ||
                lastDirectChild.type === "grundtext_static_desc"
            ) {
                // So, we look for all sub-tasks belonging to that last main task.
                const folgePositionsOfLastGrundtext = flatData.filter(
                    (fp) =>
                        fp.parentId === lastDirectChild.id &&
                        fp.type === "position"
                );

                if (folgePositionsOfLastGrundtext.length > 0) {
                    // If there are sub-tasks, the true last item is the last one of them.
                    itemToDetermineLastNr =
                        folgePositionsOfLastGrundtext[
                            folgePositionsOfLastGrundtext.length - 1
                        ];
                } else {
                    // If there are no sub-tasks, then the main task itself is the last item.
                    itemToDetermineLastNr = lastDirectChild;
                }
            } else {
                // If the last child is not a grundtext, then it's simple: it's the last item.
                itemToDetermineLastNr = lastDirectChild;
            }
        }

        // Finally, we gather all the information about the ULG into one object.
        return {
            isUlg: true, // A flag to say "yes, this is a ULG".
            ulgItem: positionItem, // The original ULG item.
            ulgNr: positionItem.nr, // The ULG's own number.
            lgNr: lgParent?.nr || null, // The parent LG's number.
            childCount: childPositions.length, // How many direct children it has.
            // The full number of the very last item we found. We use another helper function, getDisplayNr, to format it correctly.
            lastPositionNr: itemToDetermineLastNr
                ? getDisplayNr(
                      itemToDetermineLastNr,
                      flatData,
                      new Map(flatData.map((item) => [item.id, item.parentId]))
                  )
                : null,
            timestamp: new Date().toISOString(), // The current time, just for tracking.
            type: "ulg",
            info_type: "ulg", // A specific type for our UI to know what to do.
            title:
                positionItem.data?.ueberschrift ||
                positionItem.data?.title ||
                "", // The title of the ULG.
            childPositions: childPositions.map((p) => ({
                id: p.id,
                nr: p.nr,
                type: p.type,
            })), // A simplified list of its children.
        };
    }

    // If the item is NOT a ULG, it's a regular position (a task), so we handle it here.
    // We find its parent ULG. This is a bit complex because the direct parent might be a grundtext,
    // so we might have to look one level higher to find the ULG.
    const ulgParent = flatData.find(
        (item) =>
            item.type === "ulg" &&
            (item.id === positionItem.parentId ||
                item.id ===
                    flatData.find((p) => p.id === positionItem.parentId)
                        ?.parentId)
    );

    // Once we have the ULG, we can find the LG it belongs to.
    const lgParent = ulgParent
        ? flatData.find(
              (item) => item.type === "lg" && item.id === ulgParent.parentId
          )
        : null;

    // If the item is a "grundtext" (a main task), we check if it has any "folgepositions" (sub-tasks).
    const folgePositions =
        positionItem.type === "grundtext_desc" ||
        positionItem.type === "grundtext_position" ||
        positionItem.type === "grundtext_static_desc"
            ? flatData.filter(
                  (item) =>
                      item.parentId === positionItem.id &&
                      item.type === "position"
              )
            : [];

    // We create a list of all the sub-task numbers (ftnr).
    const ftnrList = folgePositions.map((fp) => fp.nr);

    // This part is to find the last sub-task number for the correct main task.
    // This is needed to generate the next sub-task number correctly (e.g., after 'A' comes 'B').
    let determinedLastFtnr = null;
    let actualGrundtextItemForLastFtnr = null;

    if (
        positionItem.type === "grundtext_position" ||
        positionItem.type === "grundtext_desc" ||
        positionItem.type === "grundtext_static_desc"
    ) {
        // If the clicked item is a grundtext, that's the one we're interested in.
        actualGrundtextItemForLastFtnr = positionItem;
    } else if (positionItem.type === "position") {
        // If the clicked item is a sub-task (folgeposition), we find its parent, which is the grundtext.
        const directParentOfFolge = flatData.find(
            (p) => p.id === positionItem.parentId
        );
        if (
            directParentOfFolge &&
            (directParentOfFolge.type === "grundtext_desc" ||
                directParentOfFolge.type === "grundtext_static_desc" ||
                directParentOfFolge.type === "grundtext_position")
        ) {
            actualGrundtextItemForLastFtnr = directParentOfFolge;
        }
    }

    // If we found the relevant grundtext, we find its sub-tasks and get the number of the last one.
    if (actualGrundtextItemForLastFtnr) {
        const folgepositionsOfActualGrundtext = flatData.filter(
            (fp) =>
                fp.parentId === actualGrundtextItemForLastFtnr.id &&
                fp.type === "position"
        );
        if (folgepositionsOfActualGrundtext.length > 0) {
            determinedLastFtnr =
                folgepositionsOfActualGrundtext[
                    folgepositionsOfActualGrundtext.length - 1
                ].nr;
        }
    }

    // If the item is a sub-task (folgeposition), we need to find the description ("langtext") of its main task (grundtext).
    let grundtextLangtext = null;
    let grundtextParent = null;

    if (positionItem.type === "position") {
        const parentId = positionItem.parentId;
        if (parentId) {
            grundtextParent = flatData.find(
                (parent) =>
                    parent.id === parentId &&
                    (parent.type === "grundtext_desc" ||
                        parent.type === "grundtext_static_desc")
            );

            if (grundtextParent) {
                // We try to get the text from a couple of possible places in the data.
                if (grundtextParent.langtext) {
                    grundtextLangtext = grundtextParent.langtext;
                } else if (grundtextParent.data && grundtextParent.data.text) {
                    grundtextLangtext = grundtextParent.data.text;
                }
            }
        }
    }

    // We determine a more specific "info_type" for the UI.
    let info_type = "ungeteilteposition"; // This is the default, meaning a simple, standalone task.

    if (
        positionItem.type === "grundtext_desc" ||
        positionItem.type === "grundtext_position" ||
        positionItem.type === "grundtext_static_desc"
    ) {
        // If it's a grundtext type and has sub-tasks, its type is "grundtext".
        if (folgePositions.length > 0) {
            info_type = "grundtext";
        } else {
            // Otherwise, it's just a simple task.
            info_type = "ungeteilteposition";
        }
    } else if (positionItem.type === "position") {
        // If it's a sub-task, it's part of a "grundtext".
        if (grundtextParent) {
            info_type = "grundtext";
        } else {
            // Otherwise, it's a standalone task.
            info_type = "ungeteilteposition";
        }
    }

    // We gather all the information for this position into a final object.
    const info = {
        position: positionItem, // The original item.
        grundtextnr: positionItem.nr, // The item's own number.
        lgNr: lgParent?.nr || null, // The parent LG's number.
        ulgNr: ulgParent?.nr || null, // The parent ULG's number.
        ftnrList: ftnrList, // The list of sub-task numbers.
        lastFtnr: determinedLastFtnr, // The last sub-task number.
        timestamp: new Date().toISOString(), // The current time.
        type: positionItem.type,
        info_type: info_type, // The specific type for the UI.
        grundtextParent: grundtextParent, // The parent grundtext item, if it exists.
        grundtextLangtext: grundtextLangtext, // The parent's description.
        isUlg: false, // A flag to say this is NOT a ULG.
    };

    console.log("Selected Position Info (from OnlvUtils):", info);
    return info;
};

/**
 * This function builds the "pretty" full number for an item (e.g., "99.10.91A")
 * from its parts. The data often stores numbers in pieces, and this function
 * assembles them into the final version you see on the screen.
 *
 * @param {object} item - The item whose number we want to display.
 * @param {Array} flatData - The full list of all project items.
 * @param {Map} parentMap - A helper Map to quickly find the parent of any item.
 * @returns {string} The fully formatted display number.
 */
export const getDisplayNr = (item, flatData, parentMap) => {
    // Check 1: Is the item a "folgeposition" (a sub-task)?
    // We identify it by checking if its type is 'position' and its parent is a 'grundtext_desc' or 'grundtext_position'.
    if (item.type === "position") {
        const parentId = parentMap.get(item.id);
        if (parentId) {
            const parentItem = flatData.find((d) => d.id === parentId);
            if (
                parentItem &&
                (parentItem.type === "grundtext_desc" ||
                    parentItem.type === "grundtext_position")
            ) {
                // This is a folgeposition. Now we need to build its full number.
                // The full number looks like: ULG_NR.GRUNDTEXT_NR + FTNR (e.g., "99.10.91A")

                // We find the ULG that the grundtext parent belongs to.
                const grundtextParentId = parentMap.get(parentItem.id);
                if (grundtextParentId) {
                    const ulgItem = flatData.find(
                        (d) => d.id === grundtextParentId && d.type === "ulg"
                    );
                    if (ulgItem) {
                        // The item's own number (`item.nr`) should be its sub-task identifier (e.g., "A", "B").
                        // Sometimes, the data might be messy and `item.nr` could contain the full number already.
                        // We need to handle this carefully.
                        const rawFtnrString =
                            typeof item.nr === "string" ||
                            typeof item.nr === "number"
                                ? String(item.nr).trim()
                                : "";

                        // This is a special check for a weird data duplication bug we found.
                        // It looks for patterns like "99.10.0399.10.03A" and fixes them to "99.10.03A".
                        const duplicationPattern =
                            /^(\d+\.\d+\.\d+)\1([A-Za-z]*)$/;
                        const duplicationMatch =
                            rawFtnrString.match(duplicationPattern);

                        if (duplicationMatch) {
                            const [_, baseNumber, ftnrPart] = duplicationMatch;
                            return `${baseNumber}${ftnrPart}`;
                        }

                        // We extract just the letter part (e.g., "A") from the item's number,
                        // in case it accidentally contains the full number like "99.10.91A".
                        const ftnrString = rawFtnrString.replace(
                            /^[0-9.]+/,
                            ""
                        );

                        // We get the number of the parent grundtext.
                        const rawParentNrString =
                            parentItem &&
                            (typeof parentItem.nr === "string" ||
                                typeof parentItem.nr === "number")
                                ? String(parentItem.nr).trim()
                                : "";

                        // We get the number of the ULG.
                        const rawUlgNrString =
                            ulgItem &&
                            (typeof ulgItem.nr === "string" ||
                                typeof ulgItem.nr === "number")
                                ? String(ulgItem.nr).trim()
                                : "";

                        // ULG numbers should be in the format "XX.YY", so we make sure of that.
                        const ulgParts = rawUlgNrString.split(".");
                        const ulgNrString =
                            ulgParts.length >= 2
                                ? `${ulgParts[0]}.${ulgParts[1]}`
                                : rawUlgNrString;

                        // We extract just the simple number of the grundtext (e.g., "91" from "99.10.91").
                        const parentNrParts = rawParentNrString.split(".");
                        const parentSimpleNrString =
                            parentNrParts.length > 0
                                ? parentNrParts[parentNrParts.length - 1]
                                : "";

                        // Another check: if the item's number already looks like a full number, we can use its parts.
                        const numberPattern = /^(\d+\.\d+)\.(\d+)([A-Za-z]*)$/;
                        const match = rawFtnrString.match(numberPattern);

                        if (match) {
                            const [
                                _,
                                existingUlgPrefix,
                                existingGrundtextNr,
                                existingFtnr,
                            ] = match;
                            // We trust the ULG number from our hierarchy but use the other parts from the item itself.
                            const result = `${ulgNrString}.${existingGrundtextNr}${existingFtnr}`;
                            return result;
                        }

                        // If everything is clean, we assemble the number from its parts.
                        const finalFtnr = item.lastFtnr || ftnrString;
                        if (ulgNrString && parentSimpleNrString && finalFtnr) {
                            const result = `${ulgNrString}.${parentSimpleNrString}${finalFtnr}`;
                            return result; // e.g., "99.10.91C"
                        }

                        // Fallback scenarios in case some data is missing.
                        if (parentSimpleNrString && ftnrString) {
                            return `${parentSimpleNrString}${ftnrString}`; // e.g., "91C"
                        }
                        return finalFtnr || item.nr || ""; // Default to whatever we have.
                    }
                }
                // More fallbacks if we can't find the ULG parent.
                const itemNr = String(item.nr || "");
                const parentNr = String(parentItem.nr || "");

                const numberPattern = /^(\d+\.\d+)\.(\d+)([A-Za-z]*)$/;
                const match = itemNr.match(numberPattern);

                if (match) {
                    return itemNr;
                }

                if (itemNr.startsWith(parentNr)) {
                    return itemNr;
                }

                const folgeId = itemNr.replace(/^[0-9.]+/, "");
                const result = `${parentNr}${folgeId}`;
                return result;
            }
        }
    }

    // Check 2: Is it a grundtext or a standalone position directly under a ULG?
    if (
        item.type === "grundtext_position" ||
        item.type === "grundtext_desc" ||
        (item.type === "position" &&
            parentMap.has(item.id) &&
            flatData.find((d) => d.id === parentMap.get(item.id))?.type ===
                "ulg")
    ) {
        const parentId = parentMap.get(item.id);
        if (parentId) {
            const parentItem = flatData.find((d) => d.id === parentId);

            if (parentItem && parentItem.type === "ulg") {
                if (
                    parentItem.nr &&
                    typeof item.nr === "string" &&
                    item.nr.trim() !== ""
                ) {
                    let baseNr;
                    // We check if the item's number already includes the parent's number to avoid duplication like "99.10.99.10.01".
                    if (item.nr.startsWith(parentItem.nr + ".")) {
                        baseNr = item.nr;
                    } else {
                        // We extract the simple number part (e.g., "01") and combine it with the parent's number.
                        const simpleItemNr = item.nr.includes(".")
                            ? item.nr.split(".").pop()
                            : item.nr;
                        baseNr = `${parentItem.nr}.${simpleItemNr}`; // e.g., "99.10.01"
                    }

                    // This is a special case for displaying a grundtext that has sub-tasks.
                    if (
                        item.type === "grundtext_position" &&
                        item.ftnrList &&
                        item.ftnrList.length > 0
                    ) {
                        const ftnrSuffix = String(
                            item.ftnrList[0] || ""
                        ).trim();
                        if (ftnrSuffix && !baseNr.endsWith(ftnrSuffix)) {
                            return `${baseNr}${ftnrSuffix}`;
                        }
                    }
                    return baseNr;
                }
            }
        }
    }

    // Fallback: For all other item types (like LGs, ULGs themselves), or if something goes wrong,
    // we just return the number as it is stored in the data.
    return item.nr;
};

/**
 * A small helper function to increment a single letter (A -> B, B -> C, ...).
 * It also handles the "rollover" from Z back to A and tells us if it did (the "carry").
 *
 * @param {string} char - The letter to increment.
 * @returns {{nextChar: string, carry: boolean}} - The next letter and a boolean indicating if it rolled over.
 */
export const incrementLetter = (char) => {
    if (!char) return { nextChar: "", carry: false };
    const charCode = char.charCodeAt(0);

    // Uppercase A-Z
    if (charCode >= 65 && charCode <= 90) {
        if (charCode === 90) return { nextChar: "A", carry: true }; // Z -> A, with carry
        return { nextChar: String.fromCharCode(charCode + 1), carry: false };
    }
    // Lowercase a-z
    else if (charCode >= 97 && charCode <= 122) {
        if (charCode === 122) return { nextChar: "a", carry: true }; // z -> a, with carry
        return { nextChar: String.fromCharCode(charCode + 1), carry: false };
    }
    // If it's not a letter, just return it as is.
    return { nextChar: char, carry: false };
};

/**
 * A helper function to handle the "carry-over" logic for numbers, just like in manual addition.
 * For example, if we increment "09", it becomes "10". If we increment "99", it becomes "00"
 * and produces a "carry" that needs to be added to the number on its left.
 *
 * @param {Array<string>} parts - The numeric parts of a number, e.g., ["99", "10", "99"].
 * @returns {Array<string>} The new numeric parts after handling carries.
 */
const propagateNumericCarry = (parts) => {
    let carry = false;
    const newParts = [...parts];

    for (let i = newParts.length - 1; i >= 0; i--) {
        let num = parseInt(newParts[i], 10);
        const originalLength = newParts[i].length;

        if (carry) {
            num++;
            carry = false;
        }

        // If a number segment goes above 99, it rolls over to "00" and creates a new carry.
        if (num > 99) {
            carry = true;
            newParts[i] = "00";
        } else if (num > 9) {
            newParts[i] = String(num);
        } else {
            // We make sure to keep leading zeros if they were there before (e.g., "08" -> "09").
            if (originalLength === 2) {
                newParts[i] = String(num).padStart(2, "0");
            } else {
                newParts[i] = String(num);
            }
        }
    }

    // If a carry is left over at the very end, we add a new "1" at the beginning.
    if (carry) {
        newParts.unshift("1");
    }

    return newParts;
};

/**
 * This is the main function for generating the next number in a sequence.
 * For example, given "99.10.01A", it will return "99.10.01B".
 * Given "99.10.09", it will return "99.10.10".
 * Given "99.10.01Z", it will return "99.10.02".
 *
 * @param {string} currentNr - The current number in the sequence.
 * @returns {string} The next number.
 */
export const generateNextNr = (currentNr) => {
    if (!currentNr) return "1"; // If there's no current number, we start with "1".

    const lastChar = currentNr.slice(-1);
    const isLetterSuffix = /[a-zA-Z]/.test(lastChar);

    let numericPart = currentNr;
    let letterSuffix = "";
    let shouldIncrementNumeric = false;

    // If the number ends with a letter, we increment the letter first.
    if (isLetterSuffix) {
        numericPart = currentNr.slice(0, -1);
        letterSuffix = lastChar;
        const { nextChar, carry } = incrementLetter(letterSuffix);
        letterSuffix = nextChar;
        // We only increment the numeric part if the letter rolled over (e.g., from Z to A).
        shouldIncrementNumeric = carry;
    } else {
        // If there's no letter, we always increment the numeric part.
        shouldIncrementNumeric = true;
    }

    // If we need to increment the number, we do it here.
    if (shouldIncrementNumeric) {
        const parts = numericPart.split(".");
        if (parts.length > 0) {
            let lastNum = parseInt(parts[parts.length - 1], 10);
            lastNum++;
            parts[parts.length - 1] = String(lastNum);
            numericPart = parts.join(".");
        }
    }

    // Now, we handle any "carries" that might have been created.
    const numericSegments = numericPart.split(".").filter((s) => s !== "");
    let newNumericSegments = propagateNumericCarry(numericSegments);

    // Finally, we put the numeric part and the letter part back together.
    return newNumericSegments.join(".") + letterSuffix;
};

/**
 * This function takes the "flat list" of all project items and organizes it into a
 * "tree" structure: Main Groups (LGs) containing Sub-Groups (ULGs), which in turn
 * contain their tasks (Positions). This is essential for displaying the data in a
 * nested, organized way in the UI.
 *
 * @param {Array} flatData - The flat list of all project items.
 * @returns {Array} A structured array of LGs, with nested ULGs and positions.
 */
export const structureLgsUlgsPositions = (flatData) => {
    if (!flatData || !Array.isArray(flatData) || flatData.length === 0) {
        return [];
    }

    // First, we find all the main groups (LGs).
    const lgs = flatData.filter((item) => item.type === "lg");

    // Then, for each LG, we find its children.
    return lgs.map((lg) => {
        // Find all ULGs that belong to this LG.
        const ulgs = flatData.filter(
            (item) => item.type === "ulg" && item.parentId === lg.id
        );

        // For each ULG, we find its children (the positions/tasks).
        const structuredUlgs = ulgs.map((ulg) => {
            const directUlgChildren = flatData.filter(
                (item) =>
                    item.parentId === ulg.id &&
                    (item.type === "position" ||
                        item.type === "grundtext_position" ||
                        item.type === "grundtext_desc" ||
                        item.type === "grundtext_static_desc")
            );

            // We process the children to get a clean list of their numbers.
            const formattedPositionNrs = directUlgChildren.flatMap((pos) => {
                // A helper to get just the last part of a number (e.g., "99.10.91" -> "91").
                const simplifyNr = (nrStr) => {
                    const nrString = String(nrStr || "");
                    return nrString.includes(".")
                        ? nrString.split(".").pop()
                        : nrString;
                };

                const simplifiedPosNr = simplifyNr(pos.nr);

                // If it's a grundtext, we need to check for its sub-tasks.
                if (
                    pos.type === "grundtext_position" ||
                    pos.type === "grundtext_desc" ||
                    pos.type === "grundtext_static_desc"
                ) {
                    const folgepositions = flatData.filter(
                        (fp) => fp.parentId === pos.id && fp.type === "position"
                    );
                    if (folgepositions.length > 0) {
                        // If it has sub-tasks, we format them as "91A", "91B", etc.
                        return folgepositions.map((fp) => {
                            const ftnrSuffix = String(fp.nr || "").replace(
                                /^[0-9.]+/,
                                ""
                            );
                            return `${simplifiedPosNr}${ftnrSuffix}`;
                        });
                    } else {
                        // If no sub-tasks, just return its own number.
                        return [simplifiedPosNr];
                    }
                } else if (pos.type === "position") {
                    // If it's a standalone position, just return its number.
                    return [simplifiedPosNr];
                }
                return [];
            });

            return {
                ulgNr: ulg.nr,
                positions: formattedPositionNrs,
            };
        });

        return {
            lgNr: lg.nr,
            ulgs: structuredUlgs,
        };
    });
};

/**
 * This function is for inserting a new sub-task ("folgeposition") into the main,
 * deeply nested ONLV data object. It's like finding the right folder in a series
 * of nested folders and putting a new file inside it.
 *
 * @param {object} onlvData - The complete, nested ONLV data structure.
 * @param {string} grundtextNrPath - The path to the parent task, e.g., "01.02.03".
 * @param {object} newFolgeposition - The new sub-task object to add.
 * @returns {object|null} The updated ONLV data, or null if it fails.
 */
export const addFolgepositionToOnlvStructure = (
    onlvData,
    grundtextNrPath,
    newFolgeposition
) => {
    // We make a deep copy of the data to avoid accidentally changing the original data.
    const updatedOnlvData = JSON.parse(JSON.stringify(onlvData));

    // We split the path to find our way through the data structure.
    const pathParts = grundtextNrPath.split(".");
    if (pathParts.length < 3) {
        console.error(
            "Invalid path for adding folgeposition:",
            grundtextNrPath
        );
        return null;
    }

    const lgNrToFind = pathParts[0];
    const ulgNrToFind = pathParts[1];
    const posNrToFind = pathParts[pathParts.length - 1];

    // Find the list of LGs.
    let lgList =
        updatedOnlvData["ausschreibungs-lv"]?.["gliederung-lg"]?.["lg-liste"]
            ?.lg;

    if (!lgList) {
        console.error("LG list not found in ONLV data.");
        return null;
    }
    // Sometimes a list with one item isn't an array, so we make sure it is.
    if (!Array.isArray(lgList)) {
        lgList = [lgList];
    }

    // Find the correct LG in the list.
    const targetLg = lgList.find((lg) => lg && lg["@_nr"] === lgNrToFind);
    if (!targetLg) {
        console.error(`LG with nr ${lgNrToFind} not found.`);
        return null;
    }

    // Find the list of ULGs inside that LG.
    let ulgList = targetLg["ulg-liste"]?.ulg;
    if (!ulgList) {
        console.error(`ULG list not found in LG ${lgNrToFind}.`);
        return null;
    }
    if (!Array.isArray(ulgList)) {
        ulgList = [ulgList];
    }

    // Find the correct ULG in the list.
    const targetUlg = ulgList.find((ulg) => ulg && ulg["@_nr"] === ulgNrToFind);
    if (!targetUlg) {
        console.error(
            `ULG with nr ${ulgNrToFind} in LG ${lgNrToFind} not found.`
        );
        return null;
    }

    // Find the list of positions inside that ULG.
    if (!targetUlg.positionen || !targetUlg.positionen.grundtextnr) {
        console.error(`Position list not found in ULG ${ulgNrToFind}.`);
        return null;
    }

    let grundtextNrList = targetUlg.positionen.grundtextnr;
    if (!Array.isArray(grundtextNrList)) {
        grundtextNrList = [grundtextNrList];
    }

    // Find the correct parent grundtext in the list.
    const targetGrundtextNr = grundtextNrList.find(
        (gtNr) => gtNr && gtNr["@_nr"] === posNrToFind && gtNr.grundtext
    );

    if (!targetGrundtextNr) {
        console.error(
            `Grundtext with nr ${posNrToFind} in ULG ${ulgNrToFind} not found.`
        );
        return null;
    }

    // Now that we've found the right place, we add the new sub-task.
    // We make sure the `folgeposition` property exists and is an array.
    if (!targetGrundtextNr.folgeposition) {
        targetGrundtextNr.folgeposition = [];
    } else if (!Array.isArray(targetGrundtextNr.folgeposition)) {
        targetGrundtextNr.folgeposition = [targetGrundtextNr.folgeposition];
    }

    // Add the new item to the array.
    targetGrundtextNr.folgeposition.push(newFolgeposition);
    console.log(
        `Successfully added folgeposition to GrundtextNr ${posNrToFind}.`
    );

    // Return the completely updated data object.
    return updatedOnlvData;
};
