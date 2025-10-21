// This file is like a special manager for our ONLV project data.
// ONLV is a system used in construction to organize tasks, materials, and services.
// Think of this file as the "brain" that knows how to add new parts (like tasks or groups of tasks)
// into our big ONLV project plan.

// The main goal of this file is to make sure that when we add something new,
// it goes into the right place in the ONLV structure.
// For example, if we add a new "task" (called a "position"), this file makes sure
// it's placed under the correct "sub-group" (ULG) and "main group" (LG).

// It handles different types of additions:
// - Adding a main task (a "position" or "ungeteilteposition").
// - Adding a variation or sub-task (a "folgeposition") to an existing main task.
// - Adding a sub-group of tasks (a "ULG").
// - Adding a main group of tasks (a "LG").

// It's super important because it keeps our project data organized and correct,
// making sure everything follows the ONLV rules.

import {
    ungeteilteposition,
    folgeposition as folgepositionTemplate,
} from "../CommonData/Postions.js"; // We import some basic templates for different types of positions (tasks) from another file.

/**
 * This function is like a special assistant that helps us add a brand new task (called a "position")
 * into our big ONLV project plan.
 *
 * Imagine our ONLV project plan is like a big outline for a construction project.
 * This function makes sure that when we add a new task, it goes into the correct
 * main section (LG) and sub-section (ULG) of that outline.
 *
 * It's smart enough to:
 * 1. Find the right main group (LG) and sub-group (ULG) where the new task should go.
 * 2. If a group or sub-group doesn't exist yet, it will create it automatically!
 * 3. Then, it carefully places the new task within that sub-group.
 *
 * @param {Object} onlvData - This is our entire ONLV project plan, like the full outline.
 * @param {Object} newPosition - This is the new task we want to add. It contains all the details about the task.
 * @returns {Object} - It gives us back the updated ONLV project plan with our new task added.
 */
const addPositionToOnlv = (onlvData, newPosition) => {
    // First, we make a perfect copy of our entire ONLV project plan (`onlvData`).
    // We do this so we don't accidentally change the original plan while we're working on it.
    // Think of it like making a photocopy of a document before you start writing on it.
    const updatedData = JSON.parse(JSON.stringify(onlvData));

    // These `console.log` lines are like little notes to ourselves.
    // They help us see what's happening inside the code as it runs, which is super useful for checking our work.
    console.log(
        "OnlvPositionManager - Adding position to ONLV structure:",
        newPosition
    );
    console.log("OnlvPositionManager - Position type:", newPosition.type);
    console.log("OnlvPositionManager - Position nr:", newPosition.nr);
    console.log("OnlvPositionManager - Position lgNr:", newPosition.lgNr);
    console.log("OnlvPositionManager - Position ulgNr:", newPosition.ulgNr);
    console.log(
        "OnlvPositionManager - ONLV Data structure before adding position (first 500 chars):",
        JSON.stringify(updatedData).substring(0, 500) + "..."
    );

    // The ONLV project plan has a specific structure, like folders within folders.
    // We need to make sure all the main "folders" (like "ausschreibungs-lv", "gliederung-lg", "lg-liste")
    // exist before we try to put anything inside them.
    // If a "folder" is missing, we create an empty one so we can use it.
    if (!updatedData["ausschreibungs-lv"]) {
        updatedData["ausschreibungs-lv"] = {};
        console.log("Initialized ausschreibungs-lv");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"] = {};
        console.log("Initialized gliederung-lg");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"] = {};
        console.log("Initialized lg-liste");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg = [];
        console.log("Initialized lg array");
    }

    // We get the list of main groups (LG) from our updated project plan.
    let lgList =
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg;

    // Sometimes, if there's only one LG, it might not be stored as a list (array) yet.
    // This line makes sure it's always a list, even if it has only one item, so we can work with it easily.
    if (!Array.isArray(lgList)) {
        lgList = [lgList].filter(Boolean); // We convert it to a list and remove any empty spots.
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg =
            lgList;
        console.log("Converted lg-liste.lg to array.");
    }

    // Now, we try to find the specific main group (LG) where our new task should belong.
    // We use the `lgNr` (LG number) from our `newPosition` to find it.
    let targetLg = lgList.find((lg) => lg && lg["@_nr"] === newPosition.lgNr);

    // If we can't find the LG, it means it doesn't exist yet.
    // So, we create a brand new LG with its number and a default title.
    // We also make sure it has an empty list for sub-groups (ULG) inside it.
    // Then, we add this new LG to our main list of LGs.
    if (!targetLg) {
        console.log(`LG ${newPosition.lgNr} not found. Creating new LG.`);
        targetLg = {
            "@_nr": newPosition.lgNr, // This is the unique number for our new LG.
            "lg-eigenschaften": {
                ueberschrift: `Leistungsgruppe ${newPosition.lgNr}`, // A default title for the LG.
            },
            "ulg-liste": {
                ulg: [], // An empty list where we'll put our sub-groups (ULGs).
            },
        };
        lgList.push(targetLg); // Add the new LG to our main list.
    } else {
        console.log(`Found existing LG: ${newPosition.lgNr}`); // If we found it, we just note that.
    }

    // Similar to LGs, we need to make sure the "ulg-liste" (list of sub-groups)
    // and the "ulg" array (the actual sub-groups) exist within our target LG.
    const currentLgNr = newPosition.lgNr; // We keep track of the current LG number for clarity.

    if (!targetLg["ulg-liste"]) {
        targetLg["ulg-liste"] = { ulg: [] };
        console.log(`Initialized ulg-liste for LG ${currentLgNr}`);
    }
    if (!targetLg["ulg-liste"].ulg) {
        targetLg["ulg-liste"].ulg = [];
        console.log(`Initialized ulg-liste.ulg array for LG ${currentLgNr}`);
    }

    // We get the list of sub-groups (ULG) from our target LG.
    let ulgListInLg = targetLg["ulg-liste"].ulg;
    // Again, we ensure this list is always an array for easy handling.
    if (!Array.isArray(ulgListInLg)) {
        ulgListInLg = [ulgListInLg].filter(Boolean);
        targetLg["ulg-liste"].ulg = ulgListInLg;
        console.log(`Converted ulg-liste.ulg to array for LG ${currentLgNr}`);
    }

    // The ULG number can sometimes be complex (like "01.02").
    // This part of the code figures out the simple ULG number (like "02")
    // that we need to correctly identify or create the ULG.
    const processedLgNr = String(currentLgNr || "").trim();
    const rawUlgNr = String(newPosition.ulgNr || "").trim();
    let simpleUlgNr = rawUlgNr;

    if (processedLgNr && rawUlgNr.includes(".")) {
        const parts = rawUlgNr.split(".");
        if (parts.length === 2 && parts[0] === processedLgNr) {
            const potentialSimple = parts[1].trim();
            if (potentialSimple !== "") {
                simpleUlgNr = potentialSimple;
                console.log(
                    `Derived simpleUlgNr (split): "${simpleUlgNr}" from rawUlgNr: "${rawUlgNr}" (LG: "${processedLgNr}")`
                );
            } else {
                console.warn(
                    `ULG part empty after splitting "${rawUlgNr}" with LG "${processedLgNr}". Using raw: "${simpleUlgNr}"`
                );
            }
        } else {
            console.log(
                `rawUlgNr "${rawUlgNr}" not in matching "LG.ULG" format for LG "${processedLgNr}". Using raw: "${simpleUlgNr}"`
            );
        }
    } else {
        console.log(
            `Using rawUlgNr as simpleUlgNr (no dot or no LG): "${simpleUlgNr}" (LG: "${processedLgNr}")`
        );
    }

    // If for some reason the simple ULG number is still empty, it's a big problem, so we stop here.
    if (!simpleUlgNr) {
        console.error(
            `Fatal: simpleUlgNr is empty. Raw ULG: "${newPosition.ulgNr}", LG: "${newPosition.lgNr}". Aborting position add.`
        );
        return updatedData;
    }

    // Now, we try to find the specific sub-group (ULG) within our target LG.
    let targetUlg = ulgListInLg.find(
        (ulg) => ulg && String(ulg["@_nr"] || "").trim() === simpleUlgNr
    );

    // If we can't find the ULG, we create a new one, just like we did for the LG.
    // We give it its simple number and a default title.
    // We also prepare an empty list for tasks (grundtextnr) inside it.
    if (!targetUlg) {
        console.log(
            `ULG "${simpleUlgNr}" in LG "${processedLgNr}" not found. Creating new ULG.`
        );
        targetUlg = {
            "@_nr": simpleUlgNr, // The unique number for our new ULG.
            "ulg-eigenschaften": {
                ueberschrift: `Unterleistungsgruppe ${processedLgNr}.${simpleUlgNr}`, // A default title for the ULG.
            },
            positionen: {
                grundtextnr: [], // An empty list where we'll put our tasks (positions).
            },
        };
        ulgListInLg.push(targetUlg); // Add the new ULG to the LG's list.
    } else {
        console.log(
            `Found existing ULG: ${newPosition.ulgNr} in LG ${newPosition.lgNr}`
        );
    }

    // We make sure the "positionen" (positions) and "grundtextnr" (base tasks) lists
    // exist within our target ULG, and that "grundtextnr" is always an array.
    if (!targetUlg.positionen) {
        targetUlg.positionen = { grundtextnr: [] };
        console.log(`Initialized positionen for ULG ${newPosition.ulgNr}`);
    }
    if (!targetUlg.positionen.grundtextnr) {
        targetUlg.positionen.grundtextnr = [];
        console.log(
            `Initialized positionen.grundtextnr for ULG ${newPosition.ulgNr}`
        );
    } else if (!Array.isArray(targetUlg.positionen.grundtextnr)) {
        targetUlg.positionen.grundtextnr = [
            targetUlg.positionen.grundtextnr,
        ].filter(Boolean);
        console.log(
            `Converted positionen.grundtextnr to array for ULG ${newPosition.ulgNr}`
        );
    }

    // Now, we prepare our `newPosition` (the task we want to add) into the exact format
    // that the ONLV system expects. This is like putting our task details into a special envelope.
    const actualPositionNr = newPosition.nr; // This is the simple number of our new task.
    let positionForExport; // This variable will hold our task in the correct format.

    // We check the `type` of the new position to format it correctly.
    if (newPosition.type === "grundtext_position") {
        // If it's a "grundtext_position" (a base task), we set up its properties.
        positionForExport = {
            "@_nr": actualPositionNr, // The task's unique number.
            grundtext: {
                langtext: newPosition.grundtext.langtext || { p: [] }, // Its main description.
                herkunftskennzeichen:
                    newPosition.grundtext.herkunftskennzeichen || "", // A special code for its origin.
            },
        };
        // If this base task has any "folgeposition" (sub-tasks or variations), we add them too.
        if (
            newPosition.folgeposition &&
            Array.isArray(newPosition.folgeposition)
        ) {
            positionForExport.folgeposition = newPosition.folgeposition;
            console.log(
                `Included folgeposition data for grundtext_position nr: ${actualPositionNr}`
            );
        } else {
            console.log(
                `No folgeposition data found or not an array for grundtext_position nr: ${actualPositionNr}`
            );
        }
        console.log(
            `Prepared grundtext_position for export with nr: ${actualPositionNr}`
        );
    } else if (newPosition.type === "ungeteilteposition") {
        // If it's an "ungeteilteposition" (a specific type of undivided task), we format it this way.
        console.log(
            "OnlvPositionManager - Creating ungeteilteposition export structure"
        );
        console.log(
            "OnlvPositionManager - newPosition.ungeteilteposition:",
            newPosition.ungeteilteposition
        );

        positionForExport = {
            "@_nr": actualPositionNr, // The task's unique number.
            ungeteilteposition: {
                "@_mfv": newPosition.ungeteilteposition?.["@_mfv"] || "", // A special code.
                "pos-eigenschaften": newPosition.ungeteilteposition?.[
                    "pos-eigenschaften"
                ] || {
                    stichwort: newPosition.stichwort || "", // A short keyword for the task.
                    langtext: newPosition.langtext || { p: [] }, // Its detailed description.
                    herkunftskennzeichen:
                        newPosition.herkunftskennzeichen || "Z", // Its origin code.
                    einheit: newPosition.einheit || "", // The unit of measurement (e.g., "meters", "hours").
                    pzzv: newPosition.pzzv || { normalposition: {} }, // Another special code.
                    lvmenge: newPosition.lvmenge || "0.00", // The quantity for the task (as a string).
                    vorbemerkungskennzeichen:
                        newPosition.vorbemerkungskennzeichen || "", // A code for preliminary remarks.
                    wesentlicheposition: newPosition.wesentlicheposition || "", // Indicates if it's a key task.
                    leistungsteil: newPosition.leistungsteil || [1], // Part of the service.
                    nichtangeboten: newPosition.nichtangeboten || "", // Indicates if it's not offered.
                },
            },
        };
        console.log(
            "OnlvPositionManager - Created positionForExport:",
            JSON.stringify(positionForExport, null, 2)
        );
    } else {
        // If it's a general "position" (regular task), we format it similarly to "ungeteilteposition".
        positionForExport = {
            "@_nr": actualPositionNr, // The task's unique number.
            ungeteilteposition: {
                "@_mfv": newPosition.mfv || "", // A special code.
                "pos-eigenschaften": {
                    stichwort: newPosition.stichwort || "", // A short keyword.
                    langtext: newPosition.langtext || { p: [] }, // Detailed description.
                    herkunftskennzeichen:
                        newPosition.herkunftskennzeichen || "Z", // Origin code.
                    einheit: newPosition.einheit || "", // Unit of measurement.
                    pzzv: newPosition.pzzv || { normalposition: {} }, // Special code.
                    lvmenge: newPosition.lvmenge || "0.00", // Quantity (as a string).
                    vorbemerkungskennzeichen:
                        newPosition.vorbemerkungskennzeichen || "", // Preliminary remarks code.
                    wesentlicheposition: newPosition.wesentlicheposition || "", // Key task indicator.
                    leistungsteil: newPosition.leistungsteil || 1, // Part of the service.
                    // We make sure all other important details from `newPosition` are included here.
                },
            },
        };
        console.log(
            `Prepared ungeteilteposition for export with nr: ${actualPositionNr}`
        );
    }

    // Finally, we add our perfectly formatted task (`positionForExport`) to the list of tasks
    // within its correct sub-group (ULG).
    targetUlg.positionen.grundtextnr.push(positionForExport);
    console.log(
        `Successfully added position ${actualPositionNr} to ULG ${newPosition.ulgNr} in LG ${newPosition.lgNr}.`
    );

    // We log the updated project plan (just the first 500 characters to keep the log clean).
    console.log(
        "ONLV Data structure after adding position (first 500 chars):",
        JSON.stringify(updatedData).substring(0, 500) + "..."
    );
    // And then we give back the updated project plan!
    return updatedData;
};

/**
 * This function is like a special helper for adding a "sub-task" or "variation" (called a "folgeposition")
 * to an existing main task (called a "grundtextnr") in our ONLV project plan.
 *
 * Imagine you have a main task like "Paint the wall." A "folgeposition" could be "Paint the wall (blue color)"
 * or "Paint the wall (with special primer)." This function helps us attach these variations to the main task.
 *
 * It works by:
 * 1. Taking the full path of the main task (like "MainGroup.SubGroup.TaskNumber").
 * 2. Carefully navigating through our ONLV project plan to find that exact main task.
 * 3. Once found, it adds the new sub-task (folgeposition) directly underneath it.
 *
 * @param {Object} onlvData - This is our entire ONLV project plan, like the full outline.
 * @param {string} grundtextNrPath - This is the "address" of the main task where we want to add the sub-task.
 *                                 It looks like "LG.ULG.Position" (e.g., "01.02.03").
 * @param {Object} newFolgeposition - This is the new sub-task (folgeposition) we want to add, with all its details.
 * @returns {Object|null} - It gives us back the updated ONLV project plan with the new sub-task added.
 *                          If it can't find the main task, it returns `null` because it couldn't complete the job.
 */
const addFolgepositionToOnlvStructure = (
    onlvData,
    grundtextNrPath,
    newFolgeposition
) => {
    // Just like before, we make a safe copy of our ONLV data so we don't mess up the original.
    const updatedOnlvData = JSON.parse(JSON.stringify(onlvData));

    // The `grundtextNrPath` tells us where to find the main task. It's like a GPS coordinate.
    // We split it into parts (LG, ULG, Position number) to navigate through our data.
    const pathParts = grundtextNrPath.split(".");
    // If the path doesn't have at least 3 parts, it's not a valid address, so we stop and report an error.
    if (pathParts.length < 3) {
        console.error(
            "Invalid grundtextNrPath for addFolgepositionToOnlvStructure:",
            grundtextNrPath
        );
        return null;
    }

    // We extract the numbers for the main group (LG), sub-group (ULG), and the specific task (Position).
    const lgNrToFind = pathParts[0];
    const ulgNrToFind = pathParts[1];
    const posNrToFind = pathParts[pathParts.length - 1]; // The last part is the task's unique number.

    // We start by looking for the main list of LGs in our project plan.
    let lgList =
        updatedOnlvData["ausschreibungs-lv"]?.["gliederung-lg"]?.["lg-liste"]
            ?.lg;

    // If we can't find the LG list, something is wrong with the data structure, so we stop.
    if (!lgList) {
        console.error("LG list not found in ONLV data.");
        return null;
    }
    // We make sure the LG list is always an array.
    if (!Array.isArray(lgList)) {
        lgList = [lgList];
    }

    // Now, we try to find the specific LG (main group) using its number.
    const targetLg = lgList.find((lg) => lg && lg["@_nr"] === lgNrToFind);
    // If the LG isn't found, we can't proceed, so we stop.
    if (!targetLg) {
        console.error(`LG with nr ${lgNrToFind} not found.`);
        return null;
    }

    // Next, we look for the list of ULGs (sub-groups) within our found LG.
    let ulgList = targetLg["ulg-liste"]?.ulg;
    // If the ULG list is missing, we stop.
    if (!ulgList) {
        console.error(`ULG list not found in LG ${lgNrToFind}.`);
        return null;
    }
    // We make sure the ULG list is always an array.
    if (!Array.isArray(ulgList)) {
        ulgList = [ulgList];
    }

    // Then, we find the specific ULG (sub-group) using its number.
    const targetUlg = ulgList.find((ulg) => ulg && ulg["@_nr"] === ulgNrToFind);
    // If the ULG isn't found, we stop.
    if (!targetUlg) {
        console.error(
            `ULG with nr ${ulgNrToFind} in LG ${lgNrToFind} not found.`
        );
        return null;
    }

    // We need to make sure that the ULG has a place for "positions" (tasks) and specifically "grundtextnr" (base tasks).
    // If these parts of the structure are missing, it means we can't add a folgeposition, so we stop.
    if (!targetUlg.positionen || !targetUlg.positionen.grundtextnr) {
        console.error(
            `Positionen or grundtextnr array not found in ULG ${ulgNrToFind}.`
        );
        // It's possible a ULG might not have positions yet if it only contains vorbemerkungen.
        // Or if it's a new ULG where positions are about to be added.
        // For adding a folgeposition, the grundtextnr must exist.
        return null;
    }

    // We get the list of base tasks (grundtextnr) from our target ULG.
    let grundtextNrList = targetUlg.positionen.grundtextnr;
    // We ensure this list is always an array.
    if (!Array.isArray(grundtextNrList)) {
        grundtextNrList = [grundtextNrList];
    }

    // Finally, we search for the specific main task (grundtextnr) where we want to add our sub-task.
    // We check its number and also make sure it's actually a "grundtext" type.
    const targetGrundtextNr = grundtextNrList.find(
        (gtNr) => gtNr && gtNr["@_nr"] === posNrToFind && gtNr.grundtext
    );

    // If we can't find the main task, we stop.
    if (!targetGrundtextNr) {
        console.error(
            `GrundtextNr with nr ${posNrToFind} in ULG ${ulgNrToFind} not found or is not a grundtext type.`
        );
        return null;
    }

    // Now, we prepare a place for the "folgeposition" (sub-tasks) within our found main task.
    // If it doesn't exist, we create an empty list. If it exists but isn't a list, we convert it.
    if (!targetGrundtextNr.folgeposition) {
        targetGrundtextNr.folgeposition = [];
    } else if (!Array.isArray(targetGrundtextNr.folgeposition)) {
        targetGrundtextNr.folgeposition = [targetGrundtextNr.folgeposition];
    }

    // And here's the magic! We add our new sub-task (`newFolgeposition`) to the list of folgepositionen
    // under the correct main task.
    targetGrundtextNr.folgeposition.push(newFolgeposition);
    console.log(
        `Successfully added folgeposition to GrundtextNr ${posNrToFind} in ULG ${ulgNrToFind}, LG ${lgNrToFind}.`
    );

    // We return the updated ONLV project plan.
    return updatedOnlvData;
};

/**
 * This function is like a special organizer that helps us add a new "sub-group" of tasks (called a "ULG")
 * into our ONLV project plan.
 *
 * Imagine our project plan has main sections (LG) and within those, smaller sub-sections (ULG).
 * This function makes sure that when we create a new ULG, it's placed correctly
 * inside its parent LG.
 *
 * It's smart enough to:
 * 1. Find the right main group (LG) where the new sub-group (ULG) should go.
 * 2. If the parent LG doesn't exist, it will create it first.
 * 3. Then, it adds the new ULG to that LG's list of sub-groups.
 * 4. It also makes sure that ULGs are sorted nicely by their numbers.
 *
 * @param {Object} onlvData - This is our entire ONLV project plan, like the full outline.
 * @param {Object} newUlg - This is the new sub-group (ULG) we want to add, with all its details.
 * @returns {Object} - It gives us back the updated ONLV project plan with our new ULG added.
 */
const addUlgToOnlv = (onlvData, newUlg) => {
    // We start by making a safe copy of our ONLV project plan.
    const updatedData = JSON.parse(JSON.stringify(onlvData));
    console.log("OnlvPositionManager - Adding ULG to ONLV structure:", newUlg);
    console.log("OnlvPositionManager - ULG nr:", newUlg.nr);
    console.log("OnlvPositionManager - ULG lgNr:", newUlg.lgNr);
    console.log("OnlvPositionManager - ULG ulgNr:", newUlg.ulgNr);

    // We ensure that the main parts of the ONLV structure (like "ausschreibungs-lv", "gliederung-lg", "lg-liste")
    // are in place. If any are missing, we create them as empty objects or arrays.
    if (!updatedData["ausschreibungs-lv"]) {
        updatedData["ausschreibungs-lv"] = {};
        console.log("Initialized ausschreibungs-lv");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"] = {};
        console.log("Initialized gliederung-lg");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"] = {};
        console.log("Initialized lg-liste");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg = [];
        console.log("Initialized lg array");
    }

    // We get the list of main groups (LG) from our updated project plan.
    let lgList =
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg;

    // We make sure the LG list is always an array, even if it was a single object.
    if (!Array.isArray(lgList)) {
        lgList = [lgList].filter(Boolean);
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg =
            lgList;
        console.log("Converted lg-liste.lg to array.");
    }

    // We try to find the specific LG (main group) where our new ULG should belong.
    let targetLg = lgList.find((lg) => lg && lg["@_nr"] === newUlg.lgNr);

    // If the target LG doesn't exist, we create it.
    // We give it a number, a default title, and an empty list for its sub-groups (ULG).
    if (!targetLg) {
        console.log(`LG ${newUlg.lgNr} not found. Creating new LG.`);
        targetLg = {
            "@_nr": newUlg.lgNr, // The unique number for the new LG.
            "lg-eigenschaften": {
                ueberschrift: `Leistungsgruppe ${newUlg.lgNr}`, // A default title.
                herkunftskennzeichen: "Z", // A default origin code.
            },
            "ulg-liste": {
                ulg: [], // An empty list for ULGs.
            },
        };
        lgList.push(targetLg); // Add the new LG to the main list.
        console.log(`Created new LG ${newUlg.lgNr} with empty ulg-liste`);
    } else {
        console.log(`Found existing LG: ${newUlg.lgNr}`);
    }

    // We ensure that the "ulg-liste" and "ulg" array exist within our target LG.
    if (!targetLg["ulg-liste"]) {
        targetLg["ulg-liste"] = { ulg: [] };
        console.log(`Initialized ulg-liste for LG ${newUlg.lgNr}`);
    }
    if (!targetLg["ulg-liste"].ulg) {
        targetLg["ulg-liste"].ulg = [];
        console.log(`Initialized ulg-liste.ulg array for LG ${newUlg.lgNr}`);
    }

    // We get the list of ULGs from the target LG.
    let ulgListInLg = targetLg["ulg-liste"].ulg;
    // We make sure this list is always an array.
    if (!Array.isArray(ulgListInLg)) {
        ulgListInLg = [ulgListInLg].filter(Boolean);
        targetLg["ulg-liste"].ulg = ulgListInLg;
        console.log(`Converted ulg-liste.ulg to array for LG ${newUlg.lgNr}`);
    }

    // We get the simple ULG number from the `newUlg` object.
    const simpleUlgNr = String(newUlg.ulgNr || newUlg.nr || "").trim();

    console.log(`Using ULG number: "${simpleUlgNr}" for LG ${newUlg.lgNr}`);

    // If the ULG number is empty, it's an error, so we stop.
    if (!simpleUlgNr) {
        console.error(
            `Fatal: simpleUlgNr is empty. ULG nr: "${newUlg.nr}", ULG ulgNr: "${newUlg.ulgNr}", LG: "${newUlg.lgNr}". Aborting ULG add.`
        );
        return updatedData;
    }

    // We check if a ULG with this number already exists in the current LG.
    // We don't want to add duplicates.
    const existingUlg = ulgListInLg.find(
        (ulg) => ulg && String(ulg["@_nr"] || "").trim() === simpleUlgNr
    );

    if (existingUlg) {
        console.log(`ULG ${simpleUlgNr} already exists in LG ${newUlg.lgNr}`);
        return updatedData; // If it exists, we just return the current data without adding.
    }

    // We prepare the new ULG object in the correct format for export.
    const ulgForExport = {
        "@_nr": simpleUlgNr, // The unique number for the ULG.
        "ulg-eigenschaften": {
            ueberschrift: newUlg["ulg-eigenschaften"].ueberschrift || "", // The title of the ULG.
            vorbemerkung: newUlg["ulg-eigenschaften"].vorbemerkung || { p: "" }, // Optional preliminary remarks.
            herkunftskennzeichen:
                newUlg["ulg-eigenschaften"].herkunftskennzeichen || "Z", // Origin code.
        },
        positionen: newUlg.positionen || { grundtextnr: [] }, // List of positions (tasks) within this ULG.
    };

    console.log(`Adding ULG to LG's ulg-liste:`, ulgForExport);

    // We add the newly prepared ULG to the target LG's list of ULGs.
    ulgListInLg.push(ulgForExport);
    console.log(
        `Successfully added ULG ${simpleUlgNr} to LG ${newUlg.lgNr}'s ulg-liste.`
    );
    console.log(
        `LG ${newUlg.lgNr} now has ${ulgListInLg.length} ULGs in its ulg-liste`
    );

    // We sort the ULGs by their number to keep the list organized.
    ulgListInLg.sort((a, b) => {
        const nrA = parseInt(a["@_nr"], 10);
        const nrB = parseInt(b["@_nr"], 10);
        return nrA - nrB;
    });

    // We update the reference back to the LG to make sure our changes are saved.
    targetLg["ulg-liste"].ulg = ulgListInLg;

    console.log(
        `Final LG structure for LG ${newUlg.lgNr}:`,
        JSON.stringify(targetLg, null, 2)
    );
    console.log(
        "ONLV Data structure after adding ULG (first 500 chars):",
        JSON.stringify(updatedData).substring(0, 500) + "..."
    );
    // We return the updated ONLV project plan.
    return updatedData;
};

/**
 * This function is like a master organizer that helps us add a new "main group" of tasks (called an "LG")
 * into our ONLV project plan.
 *
 * Imagine our project plan is divided into big sections. This function makes sure that when we create a new LG,
 * it's placed correctly in the overall plan.
 *
 * It's smart enough to:
 * 1. Make sure the main structure of the ONLV plan is ready to accept a new LG.
 * 2. Check if an LG with the same number already exists (we don't want duplicates!).
 * 3. If it's a new LG, it creates it with a default title and an empty list for its sub-groups (ULG).
 * 4. Finally, it adds the new LG to the main list of LGs and keeps the list sorted by number.
 *
 * @param {Object} onlvData - This is our entire ONLV project plan, like the full outline.
 * @param {Object} newLg - This is the new main group (LG) we want to add, with all its details.
 * @returns {Object} - It gives us back the updated ONLV project plan with our new LG added.
 */
const addLgToOnlv = (onlvData, newLg) => {
    // We start by making a safe copy of our ONLV project plan.
    const updatedData = JSON.parse(JSON.stringify(onlvData));
    console.log("OnlvPositionManager - Adding LG to ONLV structure:", newLg);
    console.log("OnlvPositionManager - LG nr:", newLg.nr);

    // We ensure that the main parts of the ONLV structure are in place.
    // If any are missing, we create them as empty objects or arrays.
    if (!updatedData["ausschreibungs-lv"]) {
        updatedData["ausschreibungs-lv"] = {};
        console.log("Initialized ausschreibungs-lv");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"] = {};
        console.log("Initialized gliederung-lg");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"]) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"] = {};
        console.log("Initialized lg-liste");
    }
    if (!updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg) {
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg = [];
        console.log("Initialized lg array");
    }

    // We get the list of main groups (LG) from our updated project plan.
    let lgList =
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg;

    // We make sure the LG list is always an array.
    if (!Array.isArray(lgList)) {
        lgList = [lgList].filter(Boolean);
        updatedData["ausschreibungs-lv"]["gliederung-lg"]["lg-liste"].lg =
            lgList;
        console.log("Converted lg-liste.lg to array.");
    }

    // We check if an LG with the same number (`newLg.nr`) already exists in our list.
    const existingLg = lgList.find((lg) => lg && lg["@_nr"] === newLg.nr);

    // If an LG with this number already exists, we don't add a duplicate.
    if (existingLg) {
        console.log(`LG ${newLg.nr} already exists`);
        return updatedData; // We just return the current data without making changes.
    }

    // If it's a new LG, we create the LG object in the correct format for export.
    const lgForExport = {
        "@_nr": newLg.nr, // The unique number for the new LG.
        "lg-eigenschaften": {
            ueberschrift: newLg["lg-eigenschaften"].ueberschrift || "", // The title of the LG.
            herkunftskennzeichen:
                newLg["lg-eigenschaften"].herkunftskennzeichen || "Z", // Origin code.
        },
        "ulg-liste": {
            ulg: [], // An empty list for sub-groups (ULGs) within this LG.
        },
    };

    // We add the newly prepared LG to the main list of LGs.
    lgList.push(lgForExport);
    console.log(`Successfully added LG ${newLg.nr}.`);

    // We sort the entire list of LGs by their number to keep them in order.
    lgList.sort((a, b) => {
        const nrA = parseInt(a["@_nr"], 10);
        const nrB = parseInt(b["@_nr"], 10);
        return nrA - nrB;
    });

    console.log(
        "ONLV Data structure after adding LG (first 500 chars):",
        JSON.stringify(updatedData).substring(0, 500) + "..."
    );
    // Finally, we return the updated ONLV project plan.
    return updatedData;
};

export {
    addPositionToOnlv,
    addFolgepositionToOnlvStructure,
    addUlgToOnlv,
    addLgToOnlv,
};
