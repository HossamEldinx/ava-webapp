const ungeteilteposition = {
    // Represents <grundtextnr nr="01">
    "@_nr": "01", // Unique 2-digit number (00-99) for this grundtextnr within the ULG
    ungeteilteposition: [
        // Array if multiple ungeteilteposition can exist, or direct object if always one.
        // Schema allows multiple <ungeteilteposition> under one <grundtextnr> differentiated by mfv.
        {
            // Represents <ungeteilteposition mfv="A"> (MFV is optional, can be empty string if only one or primary)
            "@_mfv": "A", // Optional: Mehrfachverwendungskennzeichen (1-9, A-Z), unique if multiple.
            "pos-eigenschaften": {
                // Represents <pos-eigenschaften>
                stichwort: "Außenwanddämmung EPS, 160mm", // Short description, max 60 chars
                langtext: {
                    // Optional: Detailed description
                    // Represents <langtext>
                    p: [
                        // Can be an array of <p>, or single <p> object, or mixed text and elements
                        {
                            "#text":
                                "Liefern und Anbringen eines Wärmedämmverbundsystems (WDVS) an Außenwänden. Dämmstoff: Expandiertes Polystyrol (EPS) gemäß ÖNORM B 6000, Wärmeleitfähigkeit λ ≤ 0,035 W/(mK). Dämmstoffdicke: ",
                        },
                        {
                            al: {
                                // Represents <al kennung="thickness_detail">...</al> (Ausschreiberlücke)
                                "@_kennung": "thickness_detail", // Parameter name for this gap
                                // "@_parameterlistenkennung": "MY_PROJECT_PARAMS", // Optional: if not default LB
                                "#text": "160 mm", // Default/placeholder text for the gap
                            },
                        },
                        {
                            "#text": ". Oberputz: Silikonharzputz, Körnung ",
                        },
                        {
                            bl: {
                                // Represents <bl kennung="plaster_grain">...</bl> (Bieterlücke)
                                "@_kennung": "plaster_grain",
                                "#text": "2 mm", // Bidder to confirm/fill
                            },
                        },
                        {
                            "#text":
                                ", Farbton nach Wahl des AG aus Standardfarbkarte.",
                        },
                    ],
                },
                herkunftskennzeichen: "Z", // Optional: "+" (from Ergänzungs-LB) or "Z" (Freely formulated)
                vorbemerkungskennzeichen: "", // Optional: "V" if this position is affected by a freely formulated parent group remark
                grafiklinks: {
                    // Optional
                    // "grafiklink": [ { "@_linkid": "uuid-graphic-1" } ]
                },
                notiz: {
                    // Optional (Only in Entwurfs-LV, Kostenschätzungs-LV)
                    // "p": "Check local building codes for fire regulations."
                },
                "kw-kennwerte": {
                    // Optional: Key values
                    // "kennwert": [
                    //     {
                    //         "@_parameterlistenkennung": "BAEK_THERMAL",
                    //         "@_parameterkennung": "U_VALUE",
                    //         "zahlenwert": { "@_listenwert": "false", "#text": "0.20" },
                    //         "anmerkung": "Calculated U-value"
                    //     }
                    // ]
                },
                einheit: "m²", // Unit of Measurement from ÖNORM list
                pzzv: {
                    // Position Type / Variant / Association
                    normalposition: {
                        // This is a normal position
                        // "zz": "AB" // Optional: Zuordnungskennzeichen if part of a ZZ group
                    },
                    // Other choices: normalposition_einer_variante, wahlposition, eventualposition
                },
                wesentlicheposition: "", // Optional: "W" if it's a 'Wesentliche Position'
                garantierteangebotssummegruppe: "", // Optional: ID (A-Z0-9) for guaranteed sum group
                teilangebotskennzeichen: "", // Optional: Number (1-99) if part of a partial tender
                leistungsteil: 1, // Number (1-99) referencing an entry in <leistungsteiltabelle>
                teilsummenkennzeichen: "", // Optional (usually for flat LVs)
                lvmenge: 250.5, // Tendered quantity (decimal)
                berechnetemengen: {
                    // Optional (only in specific LV types like Draft/Estimate)
                    // "gesamt": {
                    //     "berechnetemenge": 250.50,
                    //     "mengenermittlung": { /* ... mebe calculation lines ... */ }
                    // }
                },
                // --- Price Information (Only if LV type is NOT Entwurfs-LV or Ausschreibungs-LV) ---
                // "nichtangeboten": "", // Use this if the position is not offered
                preis: {
                    // Or provide price details
                    preisanteil1: 55.0, // Corresponds to Preisanteil1Bezeichnung in <preisanteilmodell> (e.g., Lohn)
                    preisanteil2: 30.0, // Corresponds to Preisanteil2Bezeichnung (e.g., Sonstiges)
                    gesamt: 85.0, // Unit Price (Gesamt)
                },
                pospreis: 21292.5, // Total Price for this position (lvmenge * preis.gesamt)
                ustkennzeichen: "", // Optional: (0-9) if multiple UST rates apply
            },
        },
        // Potentially more <ungeteilteposition> objects here with different "@_mfv"
    ],
};

const grundtext = {
    // Represents <grundtextnr nr="02">
    "@_nr": "02", // Unique 2-digit number (00-99) for this grundtextnr within the ULG
    grundtext: {
        // Represents <grundtext>
        langtext: {
            // Text shared by all following <folgeposition>s
            // Represents <langtext> (NO GAPS like al, bl, rw here)
            p: "Liefern und Montieren von Innentüren, einflügelig, inklusive Zarge, Drückergarnitur und Standardbeschlägen. Oberfläche und Ausführung gemäß nachfolgender Spezifikation:",
        },
        herkunftskennzeichen: "", // Optional: "+" or "Z" if the grundtext itself is from Erg.-LB or free
    },
    folgeposition: [
        // Array of one or more <folgeposition> elements
        {
            // Represents <folgeposition ftnr="A" mfv="">
            "@_ftnr": "A", // Folgetextnummer (A-Z), unique for this grundtext
            "@_mfv": "", // Optional: Mehrfachverwendungskennzeichen
            "pos-eigenschaften": {
                // Represents <pos-eigenschaften>
                stichwort: "Innentür CPL Weißlack, Röhrenspan", // Stichwort for this specific variation
                langtext: {
                    // Optional: Additional text specific to this Folgeposition
                    // Represents <langtext> (CAN have gaps al, bl, rw here)
                    p: [
                        {
                            "#text":
                                "Oberfläche: CPL Weißlack ähnlich RAL 9010. Türblatt mit Röhrenspanmittellage. Zargenbreite für Wandstärke ",
                        },
                        {
                            al: {
                                "@_kennung": "wall_thickness_A",
                                "#text": "10-12 cm", // Ausschreiberlücke for specific detail
                            },
                        },
                        { "#text": ". Abmessungen (lichte Zargenmaße) BxH: " },
                        {
                            blo: {
                                // Represents <blo kennung="door_dims_A"> (Optional Bieterlücke)
                                "@_kennung": "door_dims_A",
                                "#text": "85 x 200 cm",
                            },
                        },
                        { "#text": "." },
                    ],
                },
                herkunftskennzeichen: "Z", // Optional, if this Folgeposition's specific text is free/erg.
                vorbemerkungskennzeichen: "",
                // ... other optional elements like grafiklinks, notiz, kw-kennwerte as in ungeteilteposition ...
                einheit: "Stk",
                pzzv: {
                    normalposition: {},
                },
                leistungsteil: 2,
                lvmenge: 12.0,
                // ... berechnetemengen, and Price Information (preis, pospreis, etc.) as in ungeteilteposition ...
                preis: {
                    preisanteil1: 120.0,
                    preisanteil2: 80.0,
                    gesamt: 200.0,
                },
                pospreis: 2400.0,
            },
        },
        {
            // Represents <folgeposition ftnr="B" mfv="">
            "@_ftnr": "B",
            "@_mfv": "",
            "pos-eigenschaften": {
                stichwort: "Innentür Echtholzfurnier Eiche",
                langtext: {
                    p: [
                        {
                            "#text":
                                "Oberfläche: Echtholzfurnier Eiche, natur lackiert. Türblatt mit Vollspanmittellage. Zargenbreite für Wandstärke ",
                        },
                        {
                            al: {
                                "@_kennung": "wall_thickness_B",
                                "#text": "12-14 cm",
                            },
                        },
                        {
                            "#text":
                                ". Abmessungen (lichte Zargenmaße) BxH: ca. ",
                        },
                        {
                            rw: {
                                // Represents <rw kennung="door_dims_B_calc"> (Rechenwert)
                                "@_kennung": "door_dims_B_calc",
                                "#text": "90 x 210 cm", // Value might be calculated or a placeholder
                            },
                        },
                        { "#text": "." },
                    ],
                },
                // ... other properties like einheit, pzzv, leistungsteil, lvmenge, preis etc. ...
                einheit: "Stk",
                pzzv: {
                    normalposition: {},
                },
                leistungsteil: 2,
                lvmenge: 5.0,
                preis: {
                    preisanteil1: 180.0,
                    preisanteil2: 120.0,
                    gesamt: 300.0,
                },
                pospreis: 1500.0,
            },
        },
        // Potentially more <folgeposition> objects here
    ],
};

const folgeposition = {
    // Represents <folgeposition ftnr="A" mfv="">
    "@_ftnr": "A", // Folgetextnummer (A-Z), unique for this grundtext
    "@_mfv": "", // Optional: Mehrfachverwendungskennzeichen
    "pos-eigenschaften": {
        // Represents <pos-eigenschaften>
        stichwort: "Innentür CPL Weißlack, Röhrenspan", // Stichwort for this specific variation
        langtext: {
            // Optional: Additional text specific to this Folgeposition
            // Represents <langtext> (CAN have gaps al, bl, rw here)
            p: [
                {
                    "#text":
                        "Oberfläche: CPL Weißlack ähnlich RAL 9010. Türblatt mit Röhrenspanmittellage. Zargenbreite für Wandstärke ",
                },
                {
                    al: {
                        "@_kennung": "wall_thickness_A",
                        "#text": "10-12 cm", // Ausschreiberlücke for specific detail
                    },
                },
                { "#text": ". Abmessungen (lichte Zargenmaße) BxH: " },
                {
                    blo: {
                        // Represents <blo kennung="door_dims_A"> (Optional Bieterlücke)
                        "@_kennung": "door_dims_A",
                        "#text": "85 x 200 cm",
                    },
                },
                { "#text": "." },
            ],
        },
        herkunftskennzeichen: "Z", // Optional, if this Folgeposition's specific text is free/erg.
        vorbemerkungskennzeichen: "",
        // ... other optional elements like grafiklinks, notiz, kw-kennwerte as in ungeteilteposition ...
        einheit: "Stk",
        pzzv: {
            normalposition: {},
        },
        leistungsteil: 2,
        lvmenge: 12.0,
        // ... berechnetemengen, and Price Information (preis, pospreis, etc.) as in ungeteilteposition ...
        preis: {
            preisanteil1: 120.0,
            preisanteil2: 80.0,
            gesamt: 200.0,
        },
        pospreis: 2400.0,
    },
};

export { ungeteilteposition, grundtext, folgeposition };
