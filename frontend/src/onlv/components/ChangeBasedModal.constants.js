// This file holds all the starting (or "initial") data structures for the different forms
// used in the `ChangeBasedModal.jsx` pop-up window.
// Think of these as empty templates or blueprints for each type of item (like LG, ULG, Position).
// When you open the modal to create something new, these functions provide the basic
// shape of the data, with default values where needed, so the form knows what information to collect.

import {} from "../OnlvEdit.jsx"; // We import a list of measurement units (like "meters" or "hours") from another file.

// This function creates the starting data for a "Folgeposition" form.
// A "Folgeposition" is like a sub-task or a variation of a main task (called "Grundtext").
export const createFolgepositionFormData = (title) => {
    // The `title` often contains a number like "01A". We split it to get parts for our data.
    const nr = title.slice(0, 2); // The first two digits (e.g., "01") become the main number.
    const ftnr = title.slice(2); // The letter part (e.g., "A") becomes the "Folgeposition" number.

    return {
        // This section is for the "Grundtext" (base text) part of the form.
        grundtext: {
            langtext: {
                p: "", // This is where the user will type the long description for the base text. It starts empty.
            },
            herkunftskennzeichen: "Z", // This is a default code indicating the origin of the text.
        },

        // This is the main "Folgeposition" data structure.
        folgeposition: {
            "pos-eigenschaften": {
                // These are the properties (details) of the "Folgeposition".
                stichwort: "", // A short keyword for the "Folgeposition". It's required and has a max length.
                langtext: {
                    p: "", // A longer, detailed description for the "Folgeposition".
                },
                herkunftskennzeichen: "Z", // Default origin code for the "Folgeposition".
                einheit: "h", // The default unit of measurement (e.g., "hours").
                pzzv: {
                    eventualposition: "", // A special code for a specific type of position.
                },
                leistungsteil: [1], // This usually means it's the first part of a service.
                lvmenge: 0, // The quantity for this "Folgeposition". It starts at 0 and can have decimals.
                nichtangeboten: "", // This field is left empty if the item is not offered.
            },
            "@_ftnr": ftnr, // The "Folgeposition" number (the letter part we extracted earlier).
            "@_mfv": "", // Another optional field, left empty.
        },

        "@_nr": nr, // The main position number (the two digits we extracted earlier).
    };
};

// This function creates the starting data for a "Standalone Position" form.
// A "Standalone Position" is a task that stands on its own, not part of a "Grundtext" or "Folgeposition".
export const createStandalonePositionFormData = (title) => {
    return {
        "@_nr": title, // The position number, taken from the title.
        stichwort: "", // Short keyword for the position.
        langtext: { p: "" }, // Detailed description.
        herkunftskennzeichen: "Z", // Default origin code.
        einheit: "Stk", // Default unit of measurement (e.g., "pieces").
        pzzv: { normalposition: {} }, // Position type code.
        leistungsteil: 1, // Part of the service.
        lvmenge: "1.00", // Quantity, defaulted to 1.00.
        mfv: "", // Optional field.
        vorbemerkungskennzeichen: "", // Optional field.
        wesentlicheposition: "", // Optional field.
        garantierteangebotssummegruppe: "", // Optional field.
        teilangebotskennzeichen: "", // Optional field.
        teilsummenkennzeichen: "", // Optional field.
        grafiklinks: {}, // Optional field for links to graphics.
    };
};

// This function creates the starting data for an "Ungeteilte Position" form.
// An "Ungeteilte Position" is a specific type of undivided task.
export const createUngeteiltepositionFormData = (title) => {
    return {
        ungeteilteposition: {
            "pos-eigenschaften": {
                // Properties of the "Ungeteilte Position".
                stichwort: "", // Short keyword.
                langtext: {
                    p: {
                        br: ["", ""], // Line breaks for formatting.
                        "#text": "", // Detailed description.
                    },
                },
                herkunftskennzeichen: "Z", // Default origin code.
                einheit: "km", // Default unit of measurement (e.g., "kilometers").
                pzzv: {
                    normalposition: "", // Position type code.
                },
                leistungsteil: [1], // Part of the service.
                lvmenge: 0, // Quantity.
                nichtangeboten: "", // Not offered field.
            },
            "@_mfv": "", // Optional field.
        },
        "@_nr": title, // Position number, taken from the title.
    };
};

// This function creates the starting data for a "ULG" (Unterleistungsgruppe - sub-group) form.
export const createUlgFormData = (title) => {
    return {
        "@_nr": title, // The ULG number, taken from the title.
        "ulg-eigenschaften": {
            // Properties of the ULG.
            ueberschrift: "", // The title of the ULG.
            vorbemerkung: {
                p: "", // Optional preliminary remark.
            },
            herkunftskennzeichen: "Z", // Default origin code.
        },
        positionen: {
            // This section will be filled with positions (tasks) that belong to this ULG later.
        },
    };
};

// This function creates the starting data for an "LG" (Leistungsgruppe - main group) form.
export const createLgFormData = (title) => {
    return {
        "@_nr": title, // The LG number, taken from the title.
        "lg-eigenschaften": {
            // Properties of the LG.
            ueberschrift: "", // The title of the LG.
            herkunftskennzeichen: "Z", // Default origin code.
        },
        "ulg-liste": {
            ulg: [], // This section will be filled with ULGs (sub-groups) that belong to this LG later.
        },
    };
};
