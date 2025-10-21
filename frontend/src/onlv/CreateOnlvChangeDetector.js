// This file is like a smart detective for special codes used in ONLV project.
// If you have NR, like "010203A".
// This detective helps us understand if these NR are valid and what changes when they are updated.

// The main goal of this file is to:
// 1. Check if an ONLV code (identifier) is correctly formatted (e.g., has the right number of digits and letters).
// 2. Break down a complex ONLV code into its smaller, meaningful parts (like LG, ULG, and Positions).
// 3. Compare two ONLV NR to see what has changed between them (e.g., did the LG or ULG change, or just the poistion?).
// 4. Give a simple explanation of what kind of change happened.

// This is super useful for tracking updates in the project. For example, if a user changes
// a position ID, this code can tell us exactly which part of the NR was modified,
// helping other parts of the application react correctly.

/**
 * This is like a blueprint for how we understand an ONLV code.
 * When we break down an ONLV code (like "010203A"), we want to store its pieces in a neat way.
 * @typedef {Object} OnlvIdentifier
 * @property {string} lg - This is the "Logical Group" (LG). It's the first two numbers of the code, like "01" in "010203A".
 * @property {string} ulg - This is the "Subgroup" (ULG). It's the next two numbers, like "02" in "010203A".
 * @property {string} grundtextnr - This is the "Main Text Number". It's the last two numbers, like "03" in "010203A".
 * @property {string|null} ftnr - This is the "Follow-up Position Letter". It's an optional letter at the very end, like "A" in "010203A". If there's no letter, it will be `null`.
 * @property {boolean} isStandalone - This tells us if the code is a "Standalone Position" (meaning it doesn't have a follow-up letter). It's `true` if `ftnr` is `null`, and `false` if `ftnr` has a letter.
 * @property {string} raw - This is the original, full ONLV code string, exactly as it was given to us (e.g., "010203A").
 * @property {number} digitCount - This is how many numbers are in the code, not counting the optional letter (e.g., 6 for "010203A", 4 for "0102").
 */

/**
 * This is like a report card that tells us exactly what changed between two ONLV codes.
 * @typedef {Object} ChangeDetectionResult
 * @property {boolean} hasChanges - This is `true` if anything at all changed between the two codes, and `false` if they are exactly the same.
 * @property {Object} changes - This is a detailed list of what changed for each part of the code (LG, ULG, etc.).
 * @property {Object} changes.lg - This tells us if the "Logical Group" (LG) changed. It will show `changed: true` and what it changed `from` and `to`.
 * @property {Object} changes.ulg - This tells us if the "Subgroup" (ULG) changed.
 * @property {Object} changes.grundtextnr - This tells us if the "Main Text Number" changed.
 * @property {Object} changes.ftnr - This tells us if the "Follow-up Position Letter" changed.
 * @property {Object} previousValues - This stores the old values of only the parts that actually changed.
 * @property {Array<string>} changedComponents - This is a simple list (like ["lg", "ftnr"]) of all the parts that were different.
 * @property {boolean} isValid - This tells us if both the old and new ONLV codes were correctly formatted. If either was bad, this will be `false`.
 * @property {Array<string>} errors - If `isValid` is `false`, this list will explain why (e.g., "Identifier must have at least 2 digits").
 */

/**
 * This function is like a bouncer at a club, checking if an ONLV code is allowed in.
 * It makes sure the code follows all the strict rules for how ONLV identifiers should look.
 *
 * @param {string} identifier - This is the ONLV code (like "010203A") that we want to check.
 * @returns {Object} It gives us back an object that says if the code is `isValid` (true or false)
 *                   and a list of `errors` if something is wrong.
 */
function validateIdentifier(identifier) {
    const errors = []; // We start with an empty list to collect any problems we find.

    // Rule 1: Is it actually text and not empty?
    // If the identifier is missing or not a string (like a number), it's wrong.
    if (!identifier || typeof identifier !== "string") {
        errors.push("Identifier must be a non-empty string");
        return { isValid: false, errors }; // Stop here, it's definitely not valid.
    }

    const trimmed = identifier.trim(); // We clean up any extra spaces at the beginning or end.

    // Rule 2: Is it empty after we trim it?
    if (trimmed.length === 0) {
        errors.push("Identifier cannot be empty");
        return { isValid: false, errors }; // Still not valid.
    }

    // Rule 3: Does it have numbers and maybe one letter at the end?
    // We use a special pattern (regex) to check this.
    // `^(\d+)([a-zA-Z]?)$` means:
    // `^` - starts here
    // `(\d+)` - one or more digits (numbers 0-9) - this is our `numericPart`
    // `([a-zA-Z]?)` - optionally (that's the `?`) one letter (a-z or A-Z) - this is our `ftnr`
    // `$` - ends here
    const letterMatch = trimmed.match(/^(\d+)([a-zA-Z]?)$/);

    if (!letterMatch) {
        errors.push(
            "Identifier must contain only digits and optionally one trailing letter"
        );
        return { isValid: false, errors }; // If it doesn't match the pattern, it's wrong.
    }

    const numericPart = letterMatch[1]; // This is the numbers part of the code (e.g., "010203").
    const digitCount = numericPart.length; // This is how many numbers there are.

    // Rule 4: Check the number of digits. ONLV codes have very specific lengths.
    if (digitCount < 2) {
        errors.push("Identifier must have at least 2 digits");
        return { isValid: false, errors };
    }

    if (digitCount === 3) {
        errors.push("Identifier cannot have exactly 3 digits");
        return { isValid: false, errors };
    }

    if (digitCount === 5) {
        errors.push("Identifier cannot have exactly 5 digits");
        return { isValid: false, errors };
    }

    if (digitCount > 6) {
        errors.push("Identifier cannot have more than 6 digits");
        return { isValid: false, errors };
    }

    // The only allowed number of digits are 2, 4, or 6.
    if (![2, 4, 6].includes(digitCount)) {
        errors.push(
            `Invalid digit count: ${digitCount}. Must be 2, 4, or 6 digits`
        );
        return { isValid: false, errors };
    }

    // If we made it this far, no errors were found! The code is valid.
    return { isValid: true, errors: [] };
}

/**
 * This function is like a puzzle solver. It takes a valid ONLV code and breaks it down
 * into its individual pieces (LG, ULG, Grundtextnr, FTNR) so we can understand each part separately.
 *
 * @param {string} identifier - The ONLV code string (e.g., "010203A") that we want to break apart.
 * @returns {OnlvIdentifier|null} It returns a special object (`OnlvIdentifier`) with all the pieces,
 *                                or `null` if the code isn't valid (because we can't solve a broken puzzle).
 */
function parseIdentifier(identifier) {
    // First, we ask our "bouncer" (validateIdentifier) to check if the code is even valid.
    const validation = validateIdentifier(identifier);

    // If the code is not valid, we can't parse it, so we stop here.
    if (!validation.isValid) {
        console.warn("Invalid identifier:", identifier, validation.errors);
        return null;
    }

    const trimmed = identifier.trim(); // Clean up spaces again, just in case.
    // We use the same pattern matching as in `validateIdentifier` to get the numeric part and the optional letter.
    const letterMatch = trimmed.match(/^(\d+)([a-zA-Z]?)$/);
    const numericPart = letterMatch[1]; // The numbers part (e.g., "010203").
    const ftnr = letterMatch[2] || null; // The optional letter (e.g., "A") or `null` if no letter.
    const digitCount = numericPart.length; // How many numbers are there (2, 4, or 6).

    let lg = null; // We start with no LG, ULG, or Grundtextnr.
    let ulg = null;
    let grundtextnr = null;

    // Now, based on how many numbers we have, we figure out what each part means.
    if (digitCount === 2) {
        // If there are only 2 digits (e.g., "03"), it's just the Grundtextnr.
        lg = null; // No LG or ULG in this case.
        ulg = null;
        grundtextnr = numericPart;
    } else if (digitCount === 4) {
        // If there are 4 digits (e.g., "0103"), the first two are LG, and the last two are Grundtextnr.
        lg = numericPart.substring(0, 2); // Get the first 2 digits.
        ulg = null; // No ULG in this case.
        grundtextnr = numericPart.substring(2, 4); // Get the next 2 digits.
    } else if (digitCount === 6) {
        // If there are 6 digits (e.g., "010203"), the first two are LG, next two are ULG, and last two are Grundtextnr.
        lg = numericPart.substring(0, 2); // Get the first 2 digits.
        ulg = numericPart.substring(2, 4); // Get the next 2 digits.
        grundtextnr = numericPart.substring(4, 6); // Get the last 2 digits.
    }

    // Finally, we put all the pieces into our `OnlvIdentifier` blueprint and return it.
    return {
        lg, // The Logical Group part.
        ulg, // The Subgroup part.
        grundtextnr, // The Main Text Number part.
        ftnr, // The Follow-up Position Letter part.
        isStandalone: !ftnr, // Is it a standalone position (no FTNR letter)?
        raw: trimmed, // The original code string.
        digitCount, // The number of digits.
    };
}

/**
 * This function is the core of our "detective" work. It takes two ONLV codes
 * (an old one and a new one) and figures out exactly what's different between them.
 *
 * @param {string} previousIdentifier - The old ONLV code string (e.g., "010203A").
 * @param {string} currentIdentifier - The new ONLV code string (e.g., "010204A").
 * @returns {ChangeDetectionResult} It returns a detailed report (`ChangeDetectionResult`)
 *                                  showing all the changes, or errors if the codes are invalid.
 */
function detectChanges(previousIdentifier, currentIdentifier) {
    // We set up an empty report card to fill in as we find changes.
    const result = {
        hasChanges: false, // Start by assuming no changes.
        changes: {
            // Detailed breakdown for each part.
            lg: { changed: false, from: null, to: null },
            ulg: { changed: false, from: null, to: null },
            grundtextnr: { changed: false, from: null, to: null },
            ftnr: { changed: false, from: null, to: null },
        },
        previousValues: {}, // To store the old values of changed parts.
        changedComponents: [], // A list of which parts changed (e.g., ["lg", "ftnr"]).
        isValid: true, // Assume codes are valid until proven otherwise.
        errors: [], // List of problems if codes are invalid.
    };

    // Step 1: Break down both the old and new codes into their pieces using our `parseIdentifier` function.
    const previous = parseIdentifier(previousIdentifier);
    const current = parseIdentifier(currentIdentifier);

    // Step 2: Check if breaking down the codes was successful.
    // If either the old or new code was invalid, we can't compare them properly.
    if (!previous) {
        result.isValid = false;
        result.errors.push(
            `Invalid previous identifier: ${previousIdentifier}`
        );
    }

    if (!current) {
        result.isValid = false;
        result.errors.push(`Invalid current identifier: ${currentIdentifier}`);
    }

    // If we found any problems with the codes themselves, we stop here and return the errors.
    if (!result.isValid) {
        return result;
    }

    // Step 3: Now that we have both codes broken down, we compare each piece.
    // We look at LG, ULG, Grundtextnr, and FTNR.
    const components = ["lg", "ulg", "grundtextnr", "ftnr"];

    components.forEach((component) => {
        const prevValue = previous[component]; // Get the value of this piece from the old code.
        const currValue = current[component]; // Get the value of this piece from the new code.

        // If the old value is different from the new value, we found a change!
        if (prevValue !== currValue) {
            result.hasChanges = true; // Mark that changes were detected.
            result.changes[component] = {
                // Record the details of this specific change.
                changed: true,
                from: prevValue,
                to: currValue,
            };
            result.previousValues[component] = prevValue; // Store the old value.
            result.changedComponents.push(component); // Add this piece to our list of changed parts.
        }
    });

    // Finally, we return our complete report card with all the detected changes.
    return result;
}

/**
 * This function is like a change classifier. After `detectChanges` tells us *what* changed,
 * this function tells us *what kind* of change it was and how important it is.
 * For example, changing the main group (LG) is a big deal, but changing a follow-up letter (FTNR) is smaller.
 *
 * @param {ChangeDetectionResult} changeResult - This is the report card we got from `detectChanges`.
 * @returns {Object} It gives us an object describing the `type` of change (e.g., "lg_change"),
 *                   a `description`, and its `significance` (how important it is: "high", "medium", "low").
 */
function analyzeChangeType(changeResult) {
    // If there were no changes at all, we say so.
    if (!changeResult.hasChanges) {
        return {
            type: "none",
            description: "No changes detected",
            significance: "none",
        };
    }

    const { changedComponents } = changeResult; // We look at the list of parts that changed.

    // We check for changes in order of importance (from biggest to smallest).
    // If the LG (Logical Group) changed, that's a very significant change.
    if (changedComponents.includes("lg")) {
        return {
            type: "lg_change",
            description: "Logical group (LG) changed",
            significance: "high", // High importance!
            details: "Change in logical group affects the entire hierarchy",
        };
    }

    // If the ULG (Subgroup) changed, that's a medium importance change.
    if (changedComponents.includes("ulg")) {
        return {
            type: "ulg_change",
            description: "Subgroup (ULG) changed",
            significance: "medium", // Medium importance.
            details: "Change in subgroup affects position grouping",
        };
    }

    // If the Grundtextnr (Main Text Number) changed, that's a low importance change.
    if (changedComponents.includes("grundtextnr")) {
        return {
            type: "grundtextnr_change",
            description: "Main text number (Grundtextnr) changed",
            significance: "low", // Low importance.
            details: "Change in main text number affects position numbering",
        };
    }

    // If the FTNR (Follow-up Position Letter) changed, that's also a low importance change.
    if (changedComponents.includes("ftnr")) {
        return {
            type: "ftnr_change",
            description: "Follow-up position (FTNR) changed",
            significance: "low", // Low importance.
            details: "Change in follow-up position letter",
        };
    }

    // If for some reason we found changes but couldn't classify them (shouldn't happen if rules are complete).
    return {
        type: "unknown",
        description: "Unknown change type",
        significance: "unknown",
    };
}

/**
 * This function is like a news reporter, taking the detailed change report
 * and turning it into a simple, easy-to-read summary for a human.
 *
 * @param {ChangeDetectionResult} changeResult - This is the detailed report card from `detectChanges`.
 * @returns {string} A sentence describing what changed (e.g., "Changes detected: LG: 01 → 02, FTNR: A → B").
 */
function generateChangeSummary(changeResult) {
    // If nothing changed, we just say that.
    if (!changeResult.hasChanges) {
        return "No changes detected between identifiers.";
    }

    const summaryParts = []; // We'll collect all the individual change descriptions here.

    // For each part of the code, if it changed, we add a small description to our list.
    if (changeResult.changes.lg.changed) {
        summaryParts.push(
            `LG: ${changeResult.changes.lg.from} → ${changeResult.changes.lg.to}` // Example: "LG: 01 → 02"
        );
    }

    if (changeResult.changes.ulg.changed) {
        summaryParts.push(
            `ULG: ${changeResult.changes.ulg.from} → ${changeResult.changes.ulg.to}` // Example: "ULG: 03 → 04"
        );
    }

    if (changeResult.changes.grundtextnr.changed) {
        summaryParts.push(
            `Grundtextnr: ${changeResult.changes.grundtextnr.from} → ${changeResult.changes.grundtextnr.to}` // Example: "Grundtextnr: 05 → 06"
        );
    }

    if (changeResult.changes.ftnr.changed) {
        // For FTNR, if it was `null` (no letter), we say "none".
        const fromFtnr = changeResult.changes.ftnr.from || "none";
        const toFtnr = changeResult.changes.ftnr.to || "none";
        summaryParts.push(`FTNR: ${fromFtnr} → ${toFtnr}`); // Example: "FTNR: none → A" or "FTNR: A → B"
    }

    // Finally, we join all the small descriptions with ", " to make one full sentence.
    return `Changes detected: ${summaryParts.join(", ")}`;
}

/**
 * This is the main "Change Detector" tool. Think of it as a central control panel
 * for managing and tracking changes to ONLV codes over time.
 * It keeps track of the current code and can compare it to previous ones.
 */
class CreateOnlvChangeDetector {
    // When we first create this tool, it starts with no history and no current code.
    constructor() {
        this.history = []; // This will be a list of all the ONLV codes we've seen before.
        this.currentIdentifier = null; // This stores the most recent ONLV code we're working with.
    }

    /**
     * This function is like telling our detective, "Here's a new ONLV code!"
     * It updates the current code and can also immediately check what's changed
     * compared to the last code it saw.
     *
     * @param {string} identifier - The new ONLV code string (e.g., "010203A") to set as current.
     * @param {boolean} detectChanges - If `true` (which is the default), it will compare this new code
     *                                  with the previous one and report any differences.
     * @returns {Object} It returns an object that tells us if it `success`fully processed the code,
     *                   the `identifier` broken down into parts, any `changes` detected, and a `summary` of changes.
     */
    setIdentifier(identifier, detectChanges = true) {
        // First, we try to break down the new code.
        const parsed = parseIdentifier(identifier);

        // If the new code is not valid, we report an error and stop.
        if (!parsed) {
            return {
                success: false,
                error: "Invalid identifier format",
                identifier: null,
                changes: null,
            };
        }

        let changeResult = null; // We'll store any change detection results here.

        // If we want to detect changes AND we had a previous code, then we compare them.
        if (detectChanges && this.currentIdentifier) {
            changeResult = this.detectChanges(
                this.currentIdentifier, // The old code.
                identifier // The new code.
            );
        }

        // Before updating to the new current code, we save the old one to our history.
        if (this.currentIdentifier) {
            this.history.push({
                identifier: this.currentIdentifier, // The code that *was* current.
                timestamp: new Date().toISOString(), // When we recorded it.
            });
        }

        this.currentIdentifier = identifier; // Now, the new code becomes the current one.

        // We return a success message, the parsed code, the change results (if any), and a summary.
        return {
            success: true,
            identifier: parsed,
            changes: changeResult,
            summary: changeResult ? generateChangeSummary(changeResult) : null,
        };
    }

    /**
     * This is a helper function that simply calls our `detectChanges` function.
     * It's here so that other parts of the program can easily ask this tool
     * to compare any two codes, even if they are not the "current" one.
     *
     * @param {string} previous - The first ONLV code to compare.
     * @param {string} current - The second ONLV code to compare.
     * @returns {ChangeDetectionResult} The detailed report of changes between the two codes.
     */
    detectChanges(previous, current) {
        return detectChanges(previous, current); // We just use the standalone function.
    }

    /**
     * This function lets us ask the tool, "What's the ONLV code you're currently looking at?"
     *
     * @returns {OnlvIdentifier|null} The parsed object of the current ONLV code,
     *                                or `null` if no code has been set yet.
     */
    getCurrentIdentifier() {
        return this.currentIdentifier
            ? parseIdentifier(this.currentIdentifier) // If there's a current code, parse and return it.
            : null; // Otherwise, there's nothing to return.
    }

    /**
     * This function lets us see all the ONLV codes that this tool has processed in the past.
     * It's like looking at a logbook of all the changes.
     *
     * @returns {Array} A copy of the history list, so we don't accidentally change the original.
     */
    getHistory() {
        return [...this.history]; // The `...` creates a new array with the same items.
    }

    /**
     * This function is like pressing a "reset" button for the history.
     * It clears all the past ONLV codes that the tool has remembered.
     */
    clearHistory() {
        this.history = []; // Set the history list back to empty.
    }

    /**
     * This function allows us to check if an ONLV code is valid *without*
     * making it the "current" code or adding it to the history.
     * It's useful for a quick check.
     *
     * @param {string} identifier - The ONLV code to validate.
     * @returns {Object} The validation result (isValid and errors).
     */
    validateIdentifier(identifier) {
        return validateIdentifier(identifier); // We just use the standalone function.
    }

    /**
     * This function allows us to break down an ONLV code into its parts *without*
     * making it the "current" code or adding it to the history.
     * It's useful for just getting the parsed structure.
     *
     * @param {string} identifier - The ONLV code to parse.
     * @returns {OnlvIdentifier|null} The parsed identifier object, or `null` if invalid.
     */
    parseIdentifier(identifier) {
        return parseIdentifier(identifier); // We just use the standalone function.
    }
}

// Here, we make our detective tool and its helper functions available to other parts of the program.
// `export` means "make this available for others to use."

// We export each important function and the main class by their names.
export {
    CreateOnlvChangeDetector, // The main detective tool itself.
    validateIdentifier, // The bouncer function.
    parseIdentifier, // The puzzle solver function.
    detectChanges, // The core comparison function.
    analyzeChangeType, // The change classifier function.
    generateChangeSummary, // The news reporter function.
};

// This is a special export that makes `CreateOnlvChangeDetector` the primary thing
// that other files get when they "import" from this file without specifying a name.
// It's like saying, "If you just ask for 'the main thing' from this file, you get this class."
export default CreateOnlvChangeDetector;
