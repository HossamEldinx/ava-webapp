// This file contains helper functions specifically designed to process and
// organize ONLV (Open Standard for Service Descriptions) project data.
// The main goal is to "flatten" complex, nested ONLV data into a simpler,
// single list of items. This makes it much easier to display, search,
// and manage the project's content in a user interface.

// The core logic involves going through different levels of the ONLV structure
// (like main groups, sub-groups, and individual positions) and converting
// each part into a standardized item format. This standardized format includes
// important details like ID, parent ID (to keep track of its place in the hierarchy),
// level (how deep it is in the structure), type (what kind of item it is),
// and all its relevant data. It also creates a special "searchable text"
// for each item, which helps users quickly find what they're looking for.

import { getValue, extractBasicText } from "./OnlvEdit"; // We import helper functions from `OnlvEdit` to get values safely and extract plain text from rich content.

// This function takes the raw, complex ONLV data and transforms it into a flat list of items.
// Imagine you have a tree with many branches and leaves; this function turns it into a simple list of all leaves and branches,
// but each item still remembers its connection to its parent branch.
export const flattenOnlvData = (onlvData) => {
    // If there's no data, we just return an empty list. Nothing to flatten!
    if (!onlvData) return [];
    // We start a timer to see how long this flattening process takes.
    console.time("flattenData");

    // This will be our final flat list of all ONLV items.
    const flatItems = [];
    // We grab the "grafiktabelle" (graphics table) which contains information about images,
    // as positions might link to these graphics.
    const grafikTabelle = onlvData.grafiktabelle;
    // We get the main "ausschreibungs-lv" (tender service description) part of the ONLV data.
    const lv = onlvData["ausschreibungs-lv"];
    // If there's no main LV, we can't do anything, so we return.
    if (!lv) return [];
    // Inside the LV, we look for the "gliederung-lg" (LG structure), which is where the main groups are defined.
    const gliederung = lv["gliederung-lg"];
    // If there's no structure, we return.
    if (!gliederung) return [];

    // This helper function creates a single string of text from an item's data.
    // This string will be used later to search for items easily.
    const getSearchableTextForItem = (itemData) => {
        let parts = []; // We'll collect all text parts here.
        if (itemData.nr) parts.push(itemData.nr); // Add the item's number.
        if (itemData.data?.ueberschrift)
            parts.push(getValue(itemData.data.ueberschrift)); // Add the heading/title.
        if (itemData.data?.title) parts.push(getValue(itemData.data.title)); // Add another possible title field.
        if (itemData.stichwort) parts.push(itemData.stichwort); // Add the keyword.
        if (itemData.langtextRaw)
            parts.push(extractBasicText(itemData.langtextRaw)); // Add the long text, converted to plain text.
        if (itemData.data?.text)
            parts.push(extractBasicText(itemData.data.text)); // Add another possible text field.
        // We join all parts with spaces, convert to lowercase, remove extra spaces, and trim.
        return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
    };

    // Combine SVB and LB into a single "Ständige Vorbemerkung der LB" row
    if (gliederung.svb?.vorbemerkung || gliederung.lb) {
        const item = {
            id: "svb-lb-combined", // A unique ID for this combined item.
            parentId: null, // It has no parent, as it's a top-level item.
            level: 0, // It's at the highest level (level 0).
            type: "svb", // Its type is "svb" (keeping this for styling/rendering purposes).
            nr: "SVB", // Its number is "SVB".
            data: {
                ueberschrift: "Ständige Vorbemerkung der LB", // The combined heading.
                text: gliederung.svb?.vorbemerkung, // The SVB text.
                lb: gliederung.lb, // Include LB data as well.
            },
            childrenCount: 0, // It doesn't have any children in this context.
        };
        item.searchableText = getSearchableTextForItem(item); // Generate searchable text for this item.
        flatItems.push(item); // Add it to our flat list.
    }

    // Now, we process the main "Leistungsgruppen" (LG - main service groups).
    // We make sure `lg` is always an array, even if there's only one LG.
    const lgs = gliederung["lg-liste"]?.lg
        ? Array.isArray(gliederung["lg-liste"].lg)
            ? gliederung["lg-liste"].lg
            : [gliederung["lg-liste"].lg]
        : [];
    // We go through each LG.
    lgs.forEach((lg) => {
        // If an LG is missing or doesn't have a number, we skip it.
        if (!lg || !lg["@_nr"]) return;
        const lgNr = String(lg["@_nr"]); // Get the LG number.
        const lgId = `lg-${lgNr}`; // Create a unique ID for the LG.
        const lgProps = lg["lg-eigenschaften"] || {}; // Get the properties of the LG.
        let lgChildren = []; // This will hold all items directly under this LG (like its own "Vorbemerkung" and ULGs).

        // Check if this LG has its own "Vorbemerkung" (preliminary remark).
        if (lgProps.vorbemerkung) {
            const vbItem = {
                id: `${lgId}-vb`, // Unique ID for this Vorbemerkung.
                parentId: lgId, // Its parent is the current LG.
                level: 1, // It's one level deeper than the LG.
                type: "vorbemerkung", // Type "vorbemerkung".
                nr: "", // No specific number for this.
                data: {
                    text: lgProps.vorbemerkung, // The text of the Vorbemerkung.
                    title: `Vorbemerkung LG ${lgNr}`, // A descriptive title.
                },
            };
            vbItem.searchableText = getSearchableTextForItem(vbItem); // Generate searchable text.
            lgChildren.push(vbItem); // Add to the LG's children list.
        }

        // Now, we process the "Unterleistungsgruppen" (ULG - sub-service groups) within this LG.
        // Again, ensure `ulg` is an array.
        const ulgs = lg["ulg-liste"]?.ulg
            ? Array.isArray(lg["ulg-liste"].ulg)
                ? lg["ulg-liste"].ulg
                : [lg["ulg-liste"].ulg]
            : [];
        // Go through each ULG.
        ulgs.forEach((ulg) => {
            // Skip if ULG is missing or has no number.
            if (!ulg || !ulg["@_nr"]) return;
            const ulgNrSuffix = String(ulg["@_nr"]); // Get the ULG's suffix number.
            const ulgFullNr = `${lgNr}.${ulgNrSuffix}`; // Create the full ULG number (e.g., "01.01").
            const ulgId = `ulg-${ulgFullNr}`; // Unique ID for the ULG.
            const ulgProps = ulg["ulg-eigenschaften"] || {}; // Get ULG properties.
            let ulgChildren = []; // This will hold items directly under this ULG (its Vorbemerkung and positions).

            // Check for ULG's own "Vorbemerkung".
            if (ulgProps.vorbemerkung) {
                const vbItem = {
                    id: `${ulgId}-vb`, // Unique ID.
                    parentId: ulgId, // Parent is the current ULG.
                    level: 2, // Two levels deeper than the main structure.
                    type: "vorbemerkung", // Type "vorbemerkung".
                    nr: "", // No specific number.
                    data: {
                        text: ulgProps.vorbemerkung, // Text of the Vorbemerkung.
                        title: `Vorbemerkung ULG ${ulgFullNr}`, // Descriptive title.
                    },
                };
                vbItem.searchableText = getSearchableTextForItem(vbItem); // Generate searchable text.
                ulgChildren.push(vbItem); // Add to ULG's children.
            }

            // Now, we process the "Grundtextnummern" (grundtextnr - base text numbers) within this ULG.
            // These are like main tasks or descriptions that can have sub-tasks (Folgepositionen) or be standalone.
            const grundtexte = ulg.positionen?.grundtextnr
                ? Array.isArray(ulg.positionen.grundtextnr)
                    ? ulg.positionen.grundtextnr
                    : [ulg.positionen.grundtextnr]
                : [];
            // Go through each grundtextnr item.
            grundtexte.forEach((gtNrItem, gtIndex) => {
                // console.log("flattenOnlvData - Processing grundtextnr:", gtNrItem); // For debugging: shows which grundtextnr is being processed.

                // Skip if grundtextnr is missing or has no number.
                if (!gtNrItem || !gtNrItem["@_nr"]) return;
                const grundtextNummer = String(gtNrItem["@_nr"]); // Get the grundtext number.
                const grundtextLangNode = gtNrItem.grundtext?.langtext; // Get the long text for the grundtext.
                const hasFolge = !!gtNrItem.folgeposition; // Check if it has "Folgepositionen" (sub-positions).
                const hasUngeteilt = !!gtNrItem.ungeteilteposition; // Check if it has "Ungeteilte Position" (undivided position).
                const hasSubPositions = hasFolge || hasUngeteilt; // True if it has any kind of sub-position.
                let gtChildren = []; // This will hold the actual positions (Folgeposition or Ungeteilteposition) under this grundtext.

                // If there are "Folgepositionen" (sub-positions).
                if (hasFolge) {
                    // Ensure `folgeposition` is an array.
                    const folgePosArray = Array.isArray(gtNrItem.folgeposition)
                        ? gtNrItem.folgeposition
                        : [gtNrItem.folgeposition];
                    // Go through each Folgeposition.
                    folgePosArray.forEach((fPos, fIndex) => {
                        // console.log("flattenOnlvData - Processing folgeposition:", fPos); // For debugging.
                        // Skip if missing properties.
                        if (!fPos || !fPos["pos-eigenschaften"]) return;
                        // Get the suffix for the Folgeposition number (e.g., "A", "B").
                        const folgeNrSuffix =
                            fPos["@_ftnr"] || String.fromCharCode(65 + fIndex);
                        // Create the full position number (e.g., "01.01.001A").
                        const fullPosNr = `${ulgFullNr}.${grundtextNummer}${folgeNrSuffix}`;
                        // Unique ID for the position.
                        const posId = `pos-ulg-${ulgFullNr}-${grundtextNummer}-${folgeNrSuffix.replace(
                            ".",
                            "_"
                        )}`;
                        const posProps = fPos["pos-eigenschaften"]; // Get position properties.
                        const grafikLinks = posProps.grafiklinks?.grafiklink; // Get links to graphics.
                        // Extract graphic link IDs, ensuring it's an array.
                        const grafikLinkIds = grafikLinks
                            ? Array.isArray(grafikLinks)
                                ? grafikLinks
                                      .map((l) => l && l["@_linkid"])
                                      .filter(Boolean)
                                : [grafikLinks["@_linkid"]].filter(Boolean)
                            : [];

                        // Create the standardized position item.
                        const posItem = {
                            id: posId,
                            parentId: null, // Parent will be set later based on context.
                            level: null, // Level will be set later.
                            type: "position", // Type "position".
                            nr: fullPosNr, // Full position number.
                            data: posProps, // Raw position properties.
                            stichwort: getValue(posProps.stichwort), // Keyword.
                            langtextRaw: posProps.langtext, // Raw long text.
                            lvmenge: getValue(posProps.lvmenge, "-"), // Quantity.
                            einheit: getValue(posProps.einheit, "-"), // Unit.
                            herkunft: getValue(posProps.herkunftskennzeichen), // Origin.
                            pzzv: posProps.pzzv, // Special flag.
                            grafikLinkIds: grafikLinkIds, // Linked graphic IDs.
                            grafikTabelle: grafikTabelle, // Reference to the graphics table.
                        };
                        posItem.searchableText =
                            getSearchableTextForItem(posItem); // Generate searchable text.
                        gtChildren.push(posItem); // Add to the list of children for this grundtext.
                    });
                }
                // If there is an "Ungeteilte Position" (undivided position).
                if (hasUngeteilt) {
                    const uPos = gtNrItem.ungeteilteposition; // Get the undivided position data.
                    // console.log("flattenOnlvData - Processing ungeteilteposition:", uPos); // For debugging.
                    if (uPos && uPos["pos-eigenschaften"]) {
                        const fullPosNr = `${ulgFullNr}.${grundtextNummer}`; // Full position number.
                        const posId = `pos-ulg-${ulgFullNr}-${grundtextNummer}-U`; // Unique ID.
                        const posProps = uPos["pos-eigenschaften"]; // Position properties.
                        const grafikLinks = posProps.grafiklinks?.grafiklink; // Graphic links.
                        const grafikLinkIds = grafikLinks
                            ? Array.isArray(grafikLinks)
                                ? grafikLinks
                                      .map((l) => l && l["@_linkid"])
                                      .filter(Boolean)
                                : [grafikLinks["@_linkid"]].filter(Boolean)
                            : [];

                        // Create the standardized position item.
                        const posItem = {
                            id: posId,
                            parentId: null,
                            level: null,
                            type: "position",
                            nr: fullPosNr,
                            data: posProps,
                            stichwort: getValue(posProps.stichwort),
                            langtextRaw: posProps.langtext,
                            lvmenge: getValue(posProps.lvmenge, "-"),
                            einheit: getValue(posProps.einheit, "-"),
                            herkunft: getValue(posProps.herkunftskennzeichen),
                            pzzv: posProps.pzzv,
                            grafikLinkIds: grafikLinkIds,
                            grafikTabelle: grafikTabelle,
                        };
                        posItem.searchableText =
                            getSearchableTextForItem(posItem);
                        gtChildren.push(posItem); // Add to the list of children for this grundtext.
                    }
                }

                // Decide how to add the grundtext description and its children to the ULG's children.
                if (grundtextLangNode && hasSubPositions) {
                    // If there's a long text for the grundtext AND it has sub-positions (Folgeposition/Ungeteilteposition).
                    const grundtextDescId = `ulg-${ulgFullNr}-gt-${grundtextNummer}-desc-${gtIndex}`; // Unique ID for the description.
                    const gtDescItem = {
                        id: grundtextDescId,
                        parentId: ulgId, // Parent is the ULG.
                        level: 2, // Level 2.
                        type: "grundtext_desc", // Type "grundtext_desc".
                        nr: grundtextNummer, // Grundtext number.
                        data: { text: grundtextLangNode }, // The long text.
                        langtext: grundtextLangNode, // Also add langtext directly for easier access.
                        childrenCount: gtChildren.length, // How many sub-positions it has.
                        originalData: gtNrItem, // Reference to the original data.
                    };
                    gtDescItem.searchableText =
                        getSearchableTextForItem(gtDescItem);
                    ulgChildren.push(gtDescItem); // Add the description item to ULG's children.
                    // Now, for each sub-position, set its parent to this description and level to 3, then add to ULG's children.
                    gtChildren.forEach((pos) => {
                        pos.parentId = grundtextDescId;
                        pos.level = 3;
                        ulgChildren.push(pos);
                    });
                } else if (grundtextLangNode && !hasSubPositions) {
                    // If there's a long text for the grundtext BUT NO sub-positions.
                    const gtStaticDescItem = {
                        id: `ulg-${ulgFullNr}-gt-${grundtextNummer}-staticdesc`, // Unique ID.
                        parentId: ulgId, // Parent is the ULG.
                        level: 2, // Level 2.
                        type: "grundtext_static_desc", // Type "grundtext_static_desc".
                        nr: grundtextNummer, // Grundtext number.
                        data: { text: grundtextLangNode }, // The long text.
                        langtext: grundtextLangNode, // Add langtext directly.
                        childrenCount: 0, // No children.
                        originalData: gtNrItem, // Reference to original data.
                    };
                    gtStaticDescItem.searchableText =
                        getSearchableTextForItem(gtStaticDescItem);
                    ulgChildren.push(gtStaticDescItem); // Add this static description to ULG's children.
                } else if (!grundtextLangNode && hasSubPositions) {
                    // If there's NO long text for the grundtext BUT it HAS sub-positions.
                    // In this case, the sub-positions become direct children of the ULG at level 2.
                    gtChildren.forEach((pos) => {
                        pos.parentId = ulgId;
                        pos.level = 2;
                        ulgChildren.push(pos);
                    });
                }
            });

            // Create the standardized ULG item.
            const ulgItem = {
                id: ulgId,
                parentId: lgId, // Parent is the LG.
                level: 1, // Level 1.
                type: "ulg", // Type "ulg".
                nr: ulgFullNr, // Full ULG number.
                data: ulgProps, // ULG properties.
                childrenCount: ulgChildren.length, // How many children (Vorbemerkung, grundtext_desc, positions) it has.
            };
            ulgItem.searchableText = getSearchableTextForItem(ulgItem); // Generate searchable text.
            lgChildren.push(ulgItem); // Add the ULG item to the LG's children.
            lgChildren.push(...ulgChildren); // Add all the ULG's children (Vorbemerkung, grundtext_desc, positions) to the LG's children list.
        });

        // Create the standardized LG item.
        const lgItem = {
            id: lgId,
            parentId: null, // Top-level.
            level: 0, // Level 0.
            type: "lg", // Type "lg".
            nr: lgNr, // LG number.
            data: lgProps, // LG properties.
            childrenCount: lgChildren.length, // How many children (Vorbemerkung, ULGs) it has.
        };
        lgItem.searchableText = getSearchableTextForItem(lgItem); // Generate searchable text.
        flatItems.push(lgItem); // Add the LG item to the main flat list.
        flatItems.push(...lgChildren); // Add all the LG's children (Vorbemerkung, ULGs, and their nested items) to the main flat list.
    });

    // Stop the timer and log how long it took.
    console.timeEnd("flattenData");
    // Return the final flat list of all ONLV items.
    return flatItems;
};
