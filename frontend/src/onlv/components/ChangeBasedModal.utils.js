// This file contains helper functions that are used to change (or "transform")
// the data from the modal's forms into the specific structure that the ONLV project
// expects. This is important because the forms might collect data in one way,
// but the main project data needs it organized in a different, very precise way.

// Think of these functions as translators: they take the information you typed
// into the pop-up and rearrange it perfectly so it can be saved correctly
// into the main ONLV project.

import { v4 as uuidv4 } from "uuid"; // This imports a function to create unique IDs, like a special serial number for each new item.

// This function helps change the data from a "Folgeposition" form into a new "Grundtext Position" format.
// A "Folgeposition" is like a variation or sub-task related to a main task ("Grundtext").
export const transformFolgepositionToNewPosition = (
    folgepositionData, // This is the data collected from the "Folgeposition" form.
    parentContext, // This tells us where in the project structure this new position should go (its parent).
    title // This is the title of the position, which often contains its number.
) => {
    // We take the `title` (e.g., "01A") and split it into two parts:
    const nr = title.slice(0, 2); // The first two digits (e.g., "01") become the main number.
    const ftnr = title.slice(2); // The letter part (e.g., "A") becomes the "Folgeposition" number.

    // Now, we create a new object that has the correct structure for a "Grundtext Position" in the ONLV project.
    const newPosition = {
        id: uuidv4(), // We give it a unique ID so we can easily find and manage it later.
        type: "grundtext_position", // We tell the system this is a "Grundtext Position" type.
        parentId: parentContext?.parentId || null, // We link it to its parent in the project structure.
        level: (parentContext?.level || 0) + 1, // We set its level in the hierarchy (how deep it is).
        nr: nr, // This is the main position number.
        lgNr: parentContext?.lgNr || "01", // The "Leistungsgruppe" (main group) number it belongs to.
        ulgNr: parentContext?.ulgNr || "01", // The "Unterleistungsgruppe" (sub-group) number it belongs to.

        // This is the "Grundtext" (base text) data, which comes from the form.
        grundtext: folgepositionData.grundtext,

        // This is the "Folgeposition" (variation) data, which is the new part we are adding.
        folgeposition: [
            {
                "@_ftnr": ftnr, // The "Folgeposition" number (the letter part).
                "@_mfv": folgepositionData.folgeposition["@_mfv"] || "", // An optional field, defaulting to empty.
                "pos-eigenschaften": {
                    // These are the properties of the "Folgeposition" itself.
                    stichwort:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .stichwort, // A short keyword or summary.
                    langtext:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .langtext, // A longer, detailed description.
                    herkunftskennzeichen:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .herkunftskennzeichen, // A code indicating the origin of the text.
                    einheit:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .einheit, // The unit of measurement (e.g., "hours", "meters").
                    pzzv: folgepositionData.folgeposition["pos-eigenschaften"]
                        .pzzv, // A special code for position type.
                    leistungsteil:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .leistungsteil, // A part of the service.
                    lvmenge: String(
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .lvmenge
                    ), // The quantity, converted to a string.
                    nichtangeboten:
                        folgepositionData.folgeposition["pos-eigenschaften"]
                            .nichtangeboten || "", // An optional field for "not offered".
                },
            },
        ],

        // These properties are for how the item will be displayed in the user interface.
        langtext: folgepositionData.grundtext.langtext, // We keep the "Grundtext" long text for the base position display.
        folgepositionLangtext:
            folgepositionData.folgeposition["pos-eigenschaften"].langtext, // We store the "Folgeposition" long text separately.
        childrenCount: 0, // This position doesn't have sub-items yet.
    };

    return newPosition; // We send back the newly structured position data.
};

// This function helps create a "Standalone Position" (a task that stands on its own)
// from the data collected in its form.
export const transformToStandalonePosition = (
    formData, // This is the data from the "Standalone Position" form.
    parentContext, // This tells us where in the project structure this new position should go.
    title // This is the title, which will be used as the position number.
) => {
    // We create a new object with the correct structure for a "Standalone Position".
    const newPosition = {
        id: uuidv4(), // Unique ID.
        type: "position", // This is a generic "position" type.
        parentId: parentContext?.parentId || null, // Link to its parent.
        level: (parentContext?.level || 0) + 1, // Its level in the hierarchy.
        nr: title, // The position number, taken from the title.
        lgNr: parentContext?.lgNr || "01", // The main group number.
        ulgNr: parentContext?.ulgNr || "01", // The sub-group number.
        stichwort: formData.stichwort || "", // Short keyword.
        lvmenge: String(formData.lvmenge || "0.00"), // Quantity, converted to string.
        einheit: formData.einheit || "", // Unit of measurement.
        pzzv: formData.pzzv || { normalposition: {} }, // Position type code.
        herkunftskennzeichen: formData.herkunftskennzeichen || "Z", // Origin code.
        leistungsteil: formData.leistungsteil || 1, // Part of the service.
        langtext: formData.langtext || { p: [] }, // Detailed description.
        childrenCount: 0, // No sub-items yet.
        // These are additional optional fields for a standalone position.
        mfv: formData.mfv || "",
        vorbemerkungskennzeichen: formData.vorbemerkungskennzeichen || "",
        wesentlicheposition: formData.wesentlicheposition || "",
        garantierteangebotssummegruppe:
            formData.garantierteangebotssummegruppe || "",
        teilangebotskennzeichen: formData.teilangebotskennzeichen || "",
        teilsummenkennzeichen: formData.teilsummenkennzeichen || "",
        grafiklinks: formData.grafiklinks || {},
    };

    return newPosition; // We send back the newly structured position data.
};

// This function helps change the data from an "Ungeteilte Position" form into the
// format expected by the `addPositionToOnlv` function.
// An "Ungeteilte Position" is a specific type of undivided task.
export const transformUngeteiltepositionToNewPosition = (
    ungeteiltepositionData, // This is the data from the "Ungeteilte Position" form.
    parentContext, // This tells us where in the project structure this new position should go.
    title // This is the title, which will be used as the position number.
) => {
    // We create a new object with the correct structure for an "Ungeteilte Position".
    const newPosition = {
        id: uuidv4(), // Unique ID.
        type: "ungeteilteposition", // This is an "ungeteilteposition" type.
        parentId: parentContext?.parentId || null, // Link to its parent.
        level: (parentContext?.level || 0) + 1, // Its level in the hierarchy.
        nr: title, // The position number, taken from the title.
        lgNr: parentContext?.lgNr || "01", // The main group number.
        ulgNr: parentContext?.ulgNr || "01", // The sub-group number.

        // This is the specific structure for an "Ungeteilte Position".
        ungeteilteposition: ungeteiltepositionData.ungeteilteposition,

        // These are properties extracted from the `ungeteilteposition` structure for display.
        stichwort:
            ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
                .stichwort || "", // Short keyword.
        lvmenge: String(
            ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
                .lvmenge || "0.00"
        ), // Quantity, converted to string.
        einheit:
            ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
                .einheit || "", // Unit of measurement.
        herkunftskennzeichen:
            ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
                .herkunftskennzeichen || "Z", // Origin code.
        leistungsteil: ungeteiltepositionData.ungeteilteposition[
            "pos-eigenschaften"
        ].leistungsteil || [1], // Part of the service.
        langtext: ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
            .langtext || { p: { br: ["", ""], "#text": "" } }, // Detailed description.

        // Additional properties for compatibility with other position types.
        pzzv: ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
            .pzzv || { normalposition: {} },
        mfv: ungeteiltepositionData.ungeteilteposition["@_mfv"] || "",
        nichtangeboten:
            ungeteiltepositionData.ungeteilteposition["pos-eigenschaften"]
                .nichtangeboten || "",
        vorbemerkungskennzeichen: "",
        wesentlicheposition: "",
        garantierteangebotssummegruppe: "",
        teilangebotskennzeichen: "",
        teilsummenkennzeichen: "",
        grafiklinks: {},

        childrenCount: 0, // No sub-items yet.
    };

    return newPosition; // We send back the newly structured position data.
};

// This function helps change the data from a "ULG" (Unterleistungsgruppe - sub-group) form
// into the format expected by the `addUlgToOnlv` function.
export const transformUlgToNewUlg = (ulgData, parentContext, title) => {
    console.log("transformUlgToNewUlg - parentContext:", parentContext);
    console.log("transformUlgToNewUlg - title:", title);

    // When creating a ULG, we need to make sure it's correctly linked to its parent LG.
    // The `lgNr` (main group number) should come from the `parentContext`.
    const lgNr = parentContext?.lgNr || "01";

    // We create a new object with the correct structure for a "ULG".
    const newUlg = {
        id: uuidv4(), // Unique ID.
        type: "ulg", // This is a "ULG" type.
        parentId: parentContext?.parentId || null, // This should be the ID of its parent LG.
        level: (parentContext?.level || 0) + 1, // Its level in the hierarchy.
        nr: title, // The ULG number, taken from the title.
        lgNr: lgNr, // The main group number it belongs to.
        ulgNr: title, // The ULG number is the title itself.

        // This is the specific structure for a "ULG".
        "@_nr": ulgData["@_nr"],
        "ulg-eigenschaften": ulgData["ulg-eigenschaften"],
        positionen: ulgData.positionen || { grundtextnr: [] }, // This will hold positions added later.

        // These are properties extracted from the `ulg-eigenschaften` for display.
        ueberschrift: ulgData["ulg-eigenschaften"].ueberschrift || "", // The title of the ULG.
        vorbemerkung: ulgData["ulg-eigenschaften"].vorbemerkung || { p: "" }, // An optional preliminary remark.
        herkunftskennzeichen:
            ulgData["ulg-eigenschaften"].herkunftskennzeichen || "Z", // Origin code.

        childrenCount: 0, // No sub-items (positions) yet.
    };

    console.log("transformUlgToNewUlg - created newUlg:", newUlg);
    console.log("transformUlgToNewUlg - newUlg.lgNr:", newUlg.lgNr);
    console.log("transformUlgToNewUlg - newUlg.parentId:", newUlg.parentId);
    return newUlg; // We send back the newly structured ULG data.
};

// This function helps change the data from an "LG" (Leistungsgruppe - main group) form
// into the format expected by the `addLgToOnlv` function.
export const transformLgToNewLg = (lgData, parentContext, title) => {
    // We create a new object with the correct structure for an "LG".
    const newLg = {
        id: uuidv4(), // Unique ID.
        type: "lg", // This is an "LG" type.
        parentId: null, // LGs are usually at the top level, so no parent.
        level: 0, // LGs are at the root level of the hierarchy.
        nr: title, // The LG number, taken from the title.
        lgNr: title, // The LG number is the title itself.

        // This is the specific structure for an "LG".
        "@_nr": lgData["@_nr"],
        "lg-eigenschaften": lgData["lg-eigenschaften"],
        "ulg-liste": lgData["ulg-liste"], // This will hold ULGs added later.

        // These are properties extracted from the `lg-eigenschaften` for display.
        ueberschrift: lgData["lg-eigenschaften"].ueberschrift || "", // The title of the LG.
        herkunftskennzeichen:
            lgData["lg-eigenschaften"].herkunftskennzeichen || "Z", // Origin code.

        childrenCount: 0, // No sub-items (ULGs) yet.
    };

    return newLg; // We send back the newly structured LG data.
};
