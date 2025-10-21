// This file creates a special pop-up window (a "modal") that helps users
// add or change different parts of an ONLV  project.

// The main idea of this file is to show different input forms inside the pop-up
// based on what the user wants to create or edit. For example, it can show forms for:
// - "LG" (Leistungsgruppe): A large group of services.
// - "ULG" (Unterleistungsgruppe): A sub-group of services within an LG.
// - "Grundtext" (Base Text): The main description for a task.
// - "Folgeposition" (Sub-position): A variation or sub-task related to a main task.
// - "Standalone Position": A task that stands on its own.
// - "Ungeteilte Position": A specific type of undivided task.

// It uses special functions (called "hooks") from another file (`ChangeBasedModal.hooks.js`)
// to manage all the data and what happens when the user types or clicks buttons.
// These hooks help keep the code clean and organized by separating the logic from the visual part.
// When the user fills out a form and clicks "Save & Proceed," this file works with the hooks
// to create new data or update existing data in the ONLV project structure.

import React from "react"; // We need React to build our user interface.
import { FaTimes } from "react-icons/fa"; // This gives us a simple "X" icon for closing the modal.
import { einheitOptions } from "./OnlvEdit.jsx"; // This imports a list of measurement units (like "meters" or "hours") from another file.
import { useChangeBasedModalHandlers } from "./components/ChangeBasedModal.hooks.js"; // This imports special functions (called "hooks") that manage how our modal works and handles user actions.

// This is our main pop-up window component. Think of it as a reusable building block for our app.
// It takes different pieces of information (called "props") to know what to show and do.
const ChangeBasedModal = ({
    title, // This is the title that will appear at the top of our pop-up window.
    type, // This tells us what kind of information we are adding or changing (e.g., an "LG," a "ULG," a "Folgeposition," etc.).
    onClose, // This is a special function that tells the app to close this pop-up window.
    onSaveInputs, // This is another special function that tells the app what to do when the user clicks "Save."
    initialPositionInfoData, // This holds any existing information about the item we are editing. It's used when we are modifying an existing entry.
    onlvData, // This is the main data structure of our ONLV project, where we will add or change things.
    parentContext, // This tells us where in the project structure we are adding something (e.g., inside which main section or sub-section).
    onDataUpdate, // This function helps us update the main project data after we make changes in the modal.
    onOpenPositionModal, // This is a function to open another pop-up window, usually after we've saved a main section (ULG).
    originalIdentifier, // This is a unique code for the original item, useful when we are making changes to an existing entry.
}) => {
    // Here, we use the special "hooks" we imported earlier (`useChangeBasedModalHandlers`).
    // These hooks are like a brain for our modal; they help us manage all the data and actions inside our modal.
    // They handle things like:
    // 1. Storing the information the user types into the forms (e.g., `currentInputValue`, `folgepositionData`).
    // 2. Providing functions to update that information as the user types (e.g., `setCurrentInputValue`, `handleFolgepositionInputChange`).
    // 3. Preparing the data in the correct format to be saved back to the main project.
    // 4. Deciding what happens when the "Save & Proceed" button is clicked, including saving the data and potentially opening another modal.
    const {
        currentInputValue, // This stores what the user is currently typing into a simple input field (used for generic types).
        setCurrentInputValue, // This function helps us update `currentInputValue` when the user types.
        grundtextLangtext, // This holds the long description of a "Grundtext" (base position), especially relevant for "Folgepositionen".
        folgepositionData, // This holds all the data for a "Folgeposition" (sub-position) form.
        standalonePositionData, // This holds all the data for a "Standalone Position" form.
        ungeteiltepositionData, // This holds all the data for an "Ungeteilte Position" form.
        ulgData, // This holds all the data for a "ULG" (sub-group) form.
        lgData, // This holds all the data for an "LG" (main group) form.
        handleFolgepositionInputChange, // This function updates specific fields when the user types in the "Folgeposition" form.
        handleStandalonePositionInputChange, // This function updates specific fields when the user types in the "Standalone Position" form.
        handleUngeteiltepositionInputChange, // This function updates specific fields when the user types in the "Ungeteilte Position" form.
        handleUlgInputChange, // This function updates specific fields when the user types in the "ULG" form.
        handleLgInputChange, // This function updates specific fields when the user types in the "LG" form.
        handleSaveAndProceed, // This function is called when the user clicks the "Save & Proceed" button. It processes the form data and saves it.
    } = useChangeBasedModalHandlers(
        type, // We pass the `type` to the hooks so they know which form's data to manage.
        title, // We pass the `title` too, as it might be used for context within the hooks.
        initialPositionInfoData, // And the initial data, so the hooks can pre-fill forms if editing.
        onlvData, // And the main project data, which the hooks might need to read or modify.
        parentContext, // And the parent context, to correctly place new items in the ONLV structure.
        onDataUpdate, // And the data update function, to tell the main app when data has changed.
        onOpenPositionModal, // And the function to open another modal, for chained actions (e.g., after creating a ULG, open a position modal).
        originalIdentifier, // And the original identifier, for tracking changes to existing items.
        onClose, // And the close function, which the hooks might call after saving.
        onSaveInputs // And the save inputs function, which the hooks will use to pass the final data back.
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
            {/* Ensure z-index is high enough and add padding */}
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] relative text-neutral-800 flex flex-col">
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center border-b border-neutral-300 pb-3 mb-6">
                        {/* The title is derived from sessionChangeValues */}
                        <h2 className="text-2xl font-semibold text-primary-600">
                            {title}
                        </h2>
                        <button
                            onClick={onClose} // This onClose is from the parent, to close/cancel this specific modal
                            className="text-neutral-600 hover:text-danger-500 transition-colors duration-150"
                            aria-label="Close modal"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>

                    {/* Display Langtext for Folgeposition OR full Initial Position Info */}
                    {type === "folgeposition" && grundtextLangtext ? (
                        <div className="mb-4 p-3 bg-neutral-100 rounded-md">
                            {/*              <h4 className="text-md font-semibold text-neutral-700 mb-1">
                                Langtext der Grundposition:
                            </h4>
                            <pre className="text-xs text-neutral-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {JSON.stringify(grundtextLangtext, null, 2)}
                            </pre> */}
                        </div>
                    ) : initialPositionInfoData && type !== "folgeposition" ? (
                        <div className="mb-4 p-3 bg-neutral-100 rounded-md">
                            <h4 className="text-md font-semibold text-neutral-700 mb-1">
                                Ursprüngliche Positionsdaten:
                            </h4>
                            <pre className="text-xs text-neutral-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {JSON.stringify(
                                    initialPositionInfoData,
                                    null,
                                    2
                                )}
                            </pre>
                        </div>
                    ) : null}

                    {/* Render Folgeposition Form */}
                    {type === "folgeposition" && folgepositionData ? (
                        <div className="space-y-4">
                            {/* Grundtext Section - Now Editable for New Positions */}
                            <div className="mb-4 p-3 bg-neutral-100 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-3">
                                    Grundtext (Basis-Position):
                                </h4>

                                {/* Grundtext Langtext Input */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Grundtext Langtext *:
                                    </label>
                                    <textarea
                                        value={
                                            folgepositionData.grundtext.langtext
                                                .p
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "grundtext_langtext",
                                                e.target.value
                                            )
                                        }
                                        placeholder="z.B. Regiestunden."
                                        rows={2}
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-200 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                        required
                                    />
                                </div>

                                {/* Grundtext Herkunftskennzeichen */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Grundtext Herkunftskennzeichen:
                                    </label>
                                    <select
                                        value={
                                            folgepositionData.grundtext
                                                .herkunftskennzeichen
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "grundtext_herkunftskennzeichen",
                                                e.target.value
                                            )
                                        }
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-200 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Keine</option>
                                        <option value="+">
                                            + (Aus Ergänzungs-LB)
                                        </option>
                                        <option value="Z">
                                            Z (Frei formuliert)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* Folgeposition Section */}
                            <div className="mb-4 p-3 bg-neutral-200 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-3">
                                    Folgeposition (Variation):
                                </h4>

                                {/* Stichwort */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Folgeposition Stichwort (max. 60
                                        Zeichen) *:
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].stichwort
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "stichwort",
                                                e.target.value
                                            )
                                        }
                                        maxLength={60}
                                        placeholder="Regiestunde Facharbeiter inkl. Material"
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                        required
                                    />
                                </div>

                                {/* Langtext */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Folgeposition Langtext:
                                    </label>
                                    <textarea
                                        value={
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].langtext.p
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "langtext",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Facharbeiter + Material."
                                        rows={3}
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>

                                {/* Herkunftskennzeichen */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Folgeposition Herkunftskennzeichen:
                                    </label>
                                    <select
                                        value={
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].herkunftskennzeichen
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "herkunftskennzeichen",
                                                e.target.value
                                            )
                                        }
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Keine</option>
                                        <option value="+">
                                            + (Aus Ergänzungs-LB)
                                        </option>
                                        <option value="Z">
                                            Z (Frei formuliert)
                                        </option>
                                    </select>
                                </div>

                                {/* Einheit */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Einheit *:
                                    </label>
                                    <select
                                        value={
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].einheit
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "einheit",
                                                e.target.value
                                            )
                                        }
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                        required
                                    >
                                        <option value="">
                                            Einheit wählen...
                                        </option>
                                        {einheitOptions.map((group) => (
                                            <optgroup
                                                key={group.label}
                                                label={group.label}
                                            >
                                                {group.options.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* LV Menge */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        LV Menge:
                                    </label>
                                    <input
                                        type="number"
                                        value={
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].lvmenge
                                        }
                                        onChange={(e) =>
                                            handleFolgepositionInputChange(
                                                "lvmenge",
                                                e.target.value
                                            )
                                        }
                                        step="0.01"
                                        min="0"
                                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Display read-only fields */}
                            <div className="mb-4 p-3 bg-neutral-300 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-2">
                                    Automatisch generierte Felder:
                                </h4>
                                <div className="text-sm text-neutral-600 space-y-1">
                                    <div>
                                        <strong>Nr:</strong>{" "}
                                        {folgepositionData["@_nr"]}
                                    </div>
                                    <div>
                                        <strong>FTNR:</strong>{" "}
                                        {
                                            folgepositionData.folgeposition[
                                                "@_ftnr"
                                            ]
                                        }
                                    </div>
                                    <div>
                                        <strong>Leistungsteil:</strong>{" "}
                                        {
                                            folgepositionData.folgeposition[
                                                "pos-eigenschaften"
                                            ].leistungsteil
                                        }
                                    </div>
                                    <div>
                                        <strong>PZZV:</strong> eventualposition
                                        (leer)
                                    </div>
                                    <div>
                                        <strong>Nichtangeboten:</strong> (leer)
                                    </div>
                                    <div>
                                        <strong>MFV:</strong> (leer)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : type === "position" && standalonePositionData ? (
                        /* Standalone Position Form */
                        <div className="space-y-4">
                            {/* Stichwort */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Stichwort (max. 60 Zeichen) *:
                                </label>
                                <input
                                    type="text"
                                    value={standalonePositionData.stichwort}
                                    onChange={(e) =>
                                        handleStandalonePositionInputChange(
                                            "stichwort",
                                            e.target.value
                                        )
                                    }
                                    maxLength={60}
                                    placeholder="Kurze Beschreibung der Position"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Langtext */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Langtext (Detaillierte Beschreibung):
                                </label>
                                <textarea
                                    value={standalonePositionData.langtext.p}
                                    onChange={(e) =>
                                        handleStandalonePositionInputChange(
                                            "langtext",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Detaillierte Beschreibung der Position"
                                    rows={3}
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Einheit */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Einheit *:
                                </label>
                                <select
                                    value={standalonePositionData.einheit}
                                    onChange={(e) =>
                                        handleStandalonePositionInputChange(
                                            "einheit",
                                            e.target.value
                                        )
                                    }
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                >
                                    <option value="">Einheit wählen...</option>
                                    {einheitOptions.map((group) => (
                                        <optgroup
                                            key={group.label}
                                            label={group.label}
                                        >
                                            {group.options.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {/* LV Menge */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    LV Menge *:
                                </label>
                                <input
                                    type="number"
                                    value={standalonePositionData.lvmenge}
                                    onChange={(e) =>
                                        handleStandalonePositionInputChange(
                                            "lvmenge",
                                            e.target.value
                                        )
                                    }
                                    step="0.01"
                                    min="0"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Display read-only fields */}
                            <div className="mb-4 p-3 bg-neutral-200 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-2">
                                    Automatisch generierte Felder:
                                </h4>
                                <div className="text-sm text-neutral-600 space-y-1">
                                    <div>
                                        <strong>Nr:</strong>{" "}
                                        {standalonePositionData["@_nr"]}
                                    </div>
                                    <div>
                                        <strong>PZZV:</strong> normalposition
                                    </div>
                                    <div>
                                        <strong>Herkunftskennzeichen:</strong>{" "}
                                        {
                                            standalonePositionData.herkunftskennzeichen
                                        }
                                    </div>
                                    <div>
                                        <strong>Leistungsteil:</strong>{" "}
                                        {standalonePositionData.leistungsteil}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : type === "ungeteilteposition" &&
                      ungeteiltepositionData ? (
                        /* Ungeteilteposition Form */
                        <div className="space-y-4">
                            {/* Stichwort */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Stichwort (max. 60 Zeichen) *:
                                </label>
                                <input
                                    type="text"
                                    value={
                                        ungeteiltepositionData
                                            .ungeteilteposition[
                                            "pos-eigenschaften"
                                        ].stichwort
                                    }
                                    onChange={(e) =>
                                        handleUngeteiltepositionInputChange(
                                            "stichwort",
                                            e.target.value
                                        )
                                    }
                                    maxLength={60}
                                    placeholder="Kurze Beschreibung der ungeteilten Position"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Langtext */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Langtext:
                                </label>
                                <textarea
                                    value={
                                        ungeteiltepositionData
                                            .ungeteilteposition[
                                            "pos-eigenschaften"
                                        ].langtext.p["#text"]
                                    }
                                    onChange={(e) =>
                                        handleUngeteiltepositionInputChange(
                                            "langtext",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Detaillierte Beschreibung der ungeteilten Position"
                                    rows={3}
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Herkunftskennzeichen */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Herkunftskennzeichen:
                                </label>
                                <select
                                    value={
                                        ungeteiltepositionData
                                            .ungeteilteposition[
                                            "pos-eigenschaften"
                                        ].herkunftskennzeichen
                                    }
                                    onChange={(e) =>
                                        handleUngeteiltepositionInputChange(
                                            "herkunftskennzeichen",
                                            e.target.value
                                        )
                                    }
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Keine</option>
                                    <option value="+">
                                        + (Aus Ergänzungs-LB)
                                    </option>
                                    <option value="Z">
                                        Z (Frei formuliert)
                                    </option>
                                </select>
                            </div>

                            {/* Einheit */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Einheit *:
                                </label>
                                <select
                                    value={
                                        ungeteiltepositionData
                                            .ungeteilteposition[
                                            "pos-eigenschaften"
                                        ].einheit
                                    }
                                    onChange={(e) =>
                                        handleUngeteiltepositionInputChange(
                                            "einheit",
                                            e.target.value
                                        )
                                    }
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                >
                                    <option value="">Einheit wählen...</option>
                                    {einheitOptions.map((group) => (
                                        <optgroup
                                            key={group.label}
                                            label={group.label}
                                        >
                                            {group.options.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {/* LV Menge */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    LV Menge:
                                </label>
                                <input
                                    type="number"
                                    value={
                                        ungeteiltepositionData
                                            .ungeteilteposition[
                                            "pos-eigenschaften"
                                        ].lvmenge
                                    }
                                    onChange={(e) =>
                                        handleUngeteiltepositionInputChange(
                                            "lvmenge",
                                            e.target.value
                                        )
                                    }
                                    step="0.01"
                                    min="0"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Display read-only fields */}
                            <div className="mb-4 p-3 bg-neutral-200 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-2">
                                    Automatisch generierte Felder:
                                </h4>
                                <div className="text-sm text-neutral-600 space-y-1">
                                    <div>
                                        <strong>Nr:</strong>{" "}
                                        {ungeteiltepositionData["@_nr"]}
                                    </div>
                                    <div>
                                        <strong>PZZV:</strong> normalposition
                                    </div>
                                    <div>
                                        <strong>Leistungsteil:</strong>{" "}
                                        {
                                            ungeteiltepositionData
                                                .ungeteilteposition[
                                                "pos-eigenschaften"
                                            ].leistungsteil
                                        }
                                    </div>
                                    <div>
                                        <strong>Nichtangeboten:</strong> (leer)
                                    </div>
                                    <div>
                                        <strong>MFV:</strong> (leer)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : type === "ulg" && ulgData ? (
                        /* ULG Form */
                        <div className="space-y-4">
                            {/* Ueberschrift */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Überschrift (ULG Titel) *:
                                </label>
                                <input
                                    type="text"
                                    value={
                                        ulgData["ulg-eigenschaften"]
                                            .ueberschrift
                                    }
                                    onChange={(e) =>
                                        handleUlgInputChange(
                                            "ueberschrift",
                                            e.target.value
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="z.B. Bodenmarkierungen"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Vorbemerkung */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Vorbemerkung (Optional):
                                </label>
                                <textarea
                                    value={
                                        ulgData["ulg-eigenschaften"]
                                            .vorbemerkung.p
                                    }
                                    onChange={(e) =>
                                        handleUlgInputChange(
                                            "vorbemerkung",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Optionale Vorbemerkung zur ULG"
                                    rows={3}
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Herkunftskennzeichen */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Herkunftskennzeichen:
                                </label>
                                <select
                                    value={
                                        ulgData["ulg-eigenschaften"]
                                            .herkunftskennzeichen
                                    }
                                    onChange={(e) =>
                                        handleUlgInputChange(
                                            "herkunftskennzeichen",
                                            e.target.value
                                        )
                                    }
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Keine</option>
                                    <option value="+">
                                        + (Aus Ergänzungs-LB)
                                    </option>
                                    <option value="Z">
                                        Z (Frei formuliert)
                                    </option>
                                </select>
                            </div>

                            {/* Display read-only fields */}
                            <div className="mb-4 p-3 bg-neutral-200 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-2">
                                    Automatisch generierte Felder:
                                </h4>
                                <div className="text-sm text-neutral-600 space-y-1">
                                    <div>
                                        <strong>Nr:</strong> {ulgData["@_nr"]}
                                    </div>
                                    <div>
                                        <strong>Positionen:</strong> Werden nach
                                        ULG-Erstellung hinzugefügt
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : type === "lg" && lgData ? (
                        /* LG Form */
                        <div className="space-y-4">
                            {/* Ueberschrift */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Überschrift (LG Titel) *:
                                </label>
                                <input
                                    type="text"
                                    value={
                                        lgData["lg-eigenschaften"].ueberschrift
                                    }
                                    onChange={(e) =>
                                        handleLgInputChange(
                                            "ueberschrift",
                                            e.target.value
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="z.B. Mitverhandelte Positionen"
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Herkunftskennzeichen */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Herkunftskennzeichen:
                                </label>
                                <select
                                    value={
                                        lgData["lg-eigenschaften"]
                                            .herkunftskennzeichen
                                    }
                                    onChange={(e) =>
                                        handleLgInputChange(
                                            "herkunftskennzeichen",
                                            e.target.value
                                        )
                                    }
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Keine</option>
                                    <option value="+">
                                        + (Aus Ergänzungs-LB)
                                    </option>
                                    <option value="Z">
                                        Z (Frei formuliert)
                                    </option>
                                </select>
                            </div>

                            {/* Display read-only fields */}
                            <div className="mb-4 p-3 bg-neutral-200 rounded-md">
                                <h4 className="text-md font-semibold text-neutral-700 mb-2">
                                    Automatisch generierte Felder:
                                </h4>
                                <div className="text-sm text-neutral-600 space-y-1">
                                    <div>
                                        <strong>Nr:</strong> {lgData["@_nr"]}
                                    </div>
                                    <div>
                                        <strong>ULG-Liste:</strong> Wird nach
                                        LG-Erstellung hinzugefügt
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : type !== "folgeposition" &&
                      type !== "position" &&
                      type !== "ungeteilteposition" &&
                      type !== "ulg" &&
                      type !== "lg" ? (
                        /* Default form for other types */
                        <div className="mb-6">
                            <label
                                htmlFor={`change-based-input-${type}-${title.replace(
                                    /\W/g,
                                    "_"
                                )}`}
                                className="block text-md font-medium text-neutral-700 mb-2"
                            >
                                Eingabe für {type} (Wert: {title}):
                            </label>
                            <input
                                id={`change-based-input-${type}-${title.replace(
                                    /\W/g,
                                    "_"
                                )}`}
                                type="text"
                                value={currentInputValue}
                                onChange={(e) =>
                                    setCurrentInputValue(e.target.value)
                                }
                                placeholder={`Daten für ${title} eingeben`}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 bg-neutral-100 text-neutral-900 border-neutral-400 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    ) : null}
                    {/* Fixed button section */}
                    <div className="sticky bottom-0 bg-neutral-0 pt-4 mt-6 border-t border-neutral-300">
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={onClose} // Allows user to cancel this specific modal
                                className="bg-neutral-400 text-neutral-900 px-5 py-2.5 rounded-md hover:bg-neutral-500 transition-colors duration-150 text-lg"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSaveAndProceed}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-primary-700 transition-colors duration-150 text-lg"
                            >
                                Speichern & Weiter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeBasedModal;
