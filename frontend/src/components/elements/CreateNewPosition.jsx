import React, { useState } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import { API_ENDPOINTS } from "../../config/api";

const CreateNewPosition = () => {
    const { t } = useLocalization();
    // Configuration input state
    const [configInput, setConfigInput] = useState("");
    const [parsedConfig, setParsedConfig] = useState(null);
    const [formType, setFormType] = useState(null); // "default" or "grundtextnr"
    const [nrExists, setNrExists] = useState(false);
    const [grundtextExists, setGrundtextExists] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [grundtextData, setGrundtextData] = useState(null);
    const [isCheckingNr, setIsCheckingNr] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState("");

    const initialPositionState = {
        folgeposition: [
            {
                "pos-eigenschaften": {
                    stichwort: "",
                    langtext: {
                        p: [
                            {
                                "#text": "",
                            },
                        ],
                    },
                    herkunftskennzeichen: "Z", // Default to "Z"
                },
                "@_ftnr": "",
                "@_mfv": "",
            },
        ],
        "@_nr": "", // Added top-level @_nr
    };

    // Initial state for grundtextnr structure
    const initialGrundtextnrState = {
        grundtextnr: [
            {
                grundtext: {
                    langtext: {
                        p: [""],
                    },
                },
                folgeposition: [
                    {
                        "pos-eigenschaften": {
                            stichwort: "",
                            langtext: {
                                p: ["."],
                            },
                        },
                        "@_ftnr": "A",
                        "@_mfv": "",
                    },
                ],
                "@_nr": "01",
            },
        ],
        "@_nr": "10",
    };

    const [positionData, setPositionData] = useState(initialPositionState);
    const [grundtextnrData, setGrundtextnrData] = useState(
        initialGrundtextnrState
    );

    // Parse configuration input (e.g., "001101C")
    const parseConfigInput = (input) => {
        if (!input || input.length < 6) return null;

        // Extract numbers: 00 11 01 C
        const nr1 = input.substring(0, 2); // "00"
        const nr2 = input.substring(2, 4); // "11"
        const nr3 = input.substring(4, 6); // "01"
        const letter = input.substring(6); // "C"

        return {
            nr1,
            nr2,
            nr3,
            letter,
            fullCode: input,
        };
    };

    // Handle configuration input change
    const handleConfigChange = async (e) => {
        const value = e.target.value.toUpperCase();
        setConfigInput(value);

        const parsed = parseConfigInput(value);
        setParsedConfig(parsed);

        if (parsed && value.length >= 6) {
            setFormType("grundtextnr");
            await checkNrExists(value); // Check if nr exists

            // Update grundtextnr data with parsed config
            setGrundtextnrData((prev) => ({
                ...prev,
                "@_nr": parsed.nr2,
                grundtextnr: [
                    {
                        ...prev.grundtextnr[0],
                        "@_nr": parsed.nr3,
                        folgeposition: [
                            {
                                ...prev.grundtextnr[0].folgeposition[0],
                                "@_ftnr": parsed.letter,
                            },
                        ],
                    },
                ],
            }));
        } else {
            setFormType("default");
            setNrExists(false);
            setGrundtextExists(false);
            setGrundtextData(null);
            setIsCheckingNr(false);
        }
    };

    // Parse entity_json to extract grundtext langtext
    const parseGrundtextData = (entityJson) => {
        try {
            const parsed = JSON.parse(entityJson);
            if (
                parsed.grundtext &&
                parsed.grundtext.langtext &&
                parsed.grundtext.langtext.p
            ) {
                // Extract the first paragraph from grundtext langtext
                return parsed.grundtext.langtext.p[0] || "";
            }
        } catch (error) {
            console.error("Error parsing entity_json:", error);
        }
        return "";
    };

    // Check if nr exists in the database
    const checkNrExists = async (nr) => {
        if (nr.length < 6) {
            setNrExists(false);
            setGrundtextExists(false);
            setGrundtextData(null);
            setIsCheckingNr(false);
            return;
        }

        setIsCheckingNr(true);
        try {
            const response = await fetch(
                API_ENDPOINTS.CUSTOM_POSITIONS.CHECK_NR_EXISTS(nr)
            );
            const data = await response.json();

            // Handle the new response structure
            if (data.exists && data.exists.exists) {
                setNrExists(true);
                setGrundtextExists(false);
                setGrundtextData(null);
            } else if (
                data.exists &&
                data.exists.grundtext_exists &&
                data.exists.grundtext_data
            ) {
                // Position doesn't exist but grundtext data is available
                setNrExists(false);
                setGrundtextExists(true);
                setGrundtextData(data.exists.grundtext_data[0]); // Take the first grundtext data

                // Parse and populate the grundtext langtext
                const grundtextLangtext = parseGrundtextData(
                    data.exists.grundtext_data[0].entity_json
                );

                // Auto-populate the grundtext langtext field
                if (grundtextLangtext) {
                    setGrundtextnrData((prev) => ({
                        ...prev,
                        grundtextnr: [
                            {
                                ...prev.grundtextnr[0],
                                grundtext: {
                                    langtext: {
                                        p: [grundtextLangtext],
                                    },
                                },
                            },
                        ],
                    }));
                }
            } else {
                // Neither position nor grundtext exists
                setNrExists(false);
                setGrundtextExists(false);
                setGrundtextData(null);
            }
        } catch (error) {
            console.error("Error checking nr existence:", error);
            setNrExists(false);
            setGrundtextExists(false);
            setGrundtextData(null);
        } finally {
            setIsCheckingNr(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setPositionData((prevState) => {
            // Create deep copies to ensure immutability
            const newFolgepositionArray = [...prevState.folgeposition];
            const newFolgepositionItem = { ...newFolgepositionArray[0] };
            const newPosEigenschaften = {
                ...newFolgepositionItem["pos-eigenschaften"],
            };
            const newLangtext = { ...newPosEigenschaften.langtext };
            const newLangtextP = newLangtext.p
                ? [...newLangtext.p]
                : [{ al: "", "#text": "" }];
            const newLangtextPItem = { ...newLangtextP[0] };

            switch (name) {
                case "stichwort":
                    newPosEigenschaften.stichwort = value;
                    break;
                case "langtext_text":
                    newLangtextPItem["#text"] = value;
                    break;
                case "_ftnr":
                    newFolgepositionItem["@_ftnr"] = value;
                    break;
                case "_mfv":
                    newFolgepositionItem["@_mfv"] = value;
                    break;
                case "_nr":
                    return { ...prevState, "@_nr": value }; // Update top-level @_nr directly
                default:
                    break;
            }

            // Reconstruct the nested objects
            newLangtextP[0] = newLangtextPItem;
            newLangtext.p = newLangtextP; // Ensure p is updated
            newPosEigenschaften.langtext = newLangtext;
            newFolgepositionItem["pos-eigenschaften"] = newPosEigenschaften;
            newFolgepositionArray[0] = newFolgepositionItem;

            return {
                ...prevState,
                folgeposition: newFolgepositionArray,
            };
        });
    };

    // Handle changes for grundtextnr form
    const handleGrundtextnrChange = (e) => {
        const { name, value } = e.target;

        setGrundtextnrData((prevState) => {
            const newState = { ...prevState };

            switch (name) {
                case "main_nr":
                    newState["@_nr"] = value;
                    break;
                case "grundtext_langtext":
                    newState.grundtextnr[0].grundtext.langtext.p[0] = value;
                    break;
                case "grundtextnr_nr":
                    newState.grundtextnr[0]["@_nr"] = value;
                    break;
                case "folgeposition_stichwort":
                    newState.grundtextnr[0].folgeposition[0][
                        "pos-eigenschaften"
                    ].stichwort = value;
                    break;
                case "folgeposition_langtext":
                    newState.grundtextnr[0].folgeposition[0][
                        "pos-eigenschaften"
                    ].langtext.p[0] = value;
                    break;
                case "folgeposition_ftnr":
                    newState.grundtextnr[0].folgeposition[0]["@_ftnr"] = value;
                    break;
                case "folgeposition_mfv":
                    newState.grundtextnr[0].folgeposition[0]["@_mfv"] = value;
                    break;
                default:
                    break;
            }

            return newState;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent submission if nr already exists
        if (nrExists) {
            setSubmitMessage(t("categories.createNewPosition.nrAlreadyExists"));
            return;
        }

        setIsSubmitting(true);
        setSubmitMessage(
            t("categories.createNewPosition.creatingCustomPosition")
        );

        const dataToSubmit =
            formType === "grundtextnr" ? grundtextnrData : positionData;

        // Use the configuration input as the nr (position number)
        const nr = configInput;

        console.log("Form Submitted:", dataToSubmit);
        console.log("Form Type:", formType);
        console.log("Parsed Config:", parsedConfig);
        console.log("Position Nr:", nr);

        try {
            // Call the custom position creation API
            const response = await fetch(
                API_ENDPOINTS.CUSTOM_POSITIONS.CREATE,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nr: nr,
                        json_body: dataToSubmit,
                    }),
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                setSubmitMessage(
                    t(
                        "categories.createNewPosition.customPositionCreatedSuccess",
                        { nr }
                    )
                );
                console.log("Created position:", result.data);

                // Reset form after successful creation
                setTimeout(() => {
                    setConfigInput("");
                    setParsedConfig(null);
                    setFormType(null);
                    setNrExists(false);
                    setGrundtextExists(false);
                    setGrundtextData(null);
                    setIsCheckingNr(false);
                    setPositionData(initialPositionState);
                    setGrundtextnrData(initialGrundtextnrState);
                    setSubmitMessage("");
                }, 2000);
            } else {
                const errorMessage =
                    result.detail || result.error || "Unknown error occurred";
                setSubmitMessage(
                    t("categories.createNewPosition.errorCreatingPosition", {
                        errorMessage,
                    })
                );
                console.error("API Error:", result);
            }
        } catch (error) {
            console.error("Network Error:", error);
            setSubmitMessage(
                t("categories.createNewPosition.networkError", {
                    errorMessage: error.message,
                })
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-900 min-h-screen text-gray-100">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
                {t("categories.createNewPosition.title")}
            </h2>
            <form
                onSubmit={handleSubmit}
                className="max-w-4xl mx-auto bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl border border-gray-700"
            >
                {/* Configuration Input - Determines Form Structure */}
                <div className="mb-4 p-3 border border-yellow-500 rounded-md bg-gray-700">
                    <label
                        htmlFor="configInput"
                        className="block text-sm font-medium text-yellow-400 mb-2"
                    >
                        {t("categories.createNewPosition.formConfigCode")}
                        <span className="block text-xs text-gray-300 mt-1">
                            {t(
                                "categories.createNewPosition.formConfigCodeDescription"
                            )}
                        </span>
                    </label>
                    <input
                        type="text"
                        id="configInput"
                        value={configInput}
                        onChange={handleConfigChange}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 ease-in-out bg-gray-700 text-white text-sm"
                        placeholder={t(
                            "categories.createNewPosition.formConfigCodePlaceholder"
                        )}
                    />
                    {parsedConfig && (
                        <div className="mt-2 text-xs text-gray-300">
                            <span className="text-yellow-400">
                                {t("categories.createNewPosition.parsed")}
                            </span>{" "}
                            nr1={parsedConfig.nr1}, nr2={parsedConfig.nr2}, nr3=
                            {parsedConfig.nr3}, letter={parsedConfig.letter}
                            {isCheckingNr && (
                                <span className="text-blue-400 ml-2">
                                    {t("categories.createNewPosition.checking")}
                                </span>
                            )}
                            {!isCheckingNr && nrExists && (
                                <span className="text-red-400 ml-2">
                                    {t("categories.createNewPosition.nrExists")}
                                </span>
                            )}
                            {!isCheckingNr && grundtextExists && (
                                <span className="text-green-400 ml-2">
                                    {t(
                                        "categories.createNewPosition.grundtextFound"
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {configInput.length >= 6 &&
                    !isCheckingNr &&
                    !nrExists &&
                    (formType === "grundtextnr" ? (
                        // Grundtextnr Form Structure - Reorganized
                        <>
                            {/* Combined Content Section */}
                            <fieldset className="mb-4 p-3 border border-blue-600 rounded-md bg-gray-700">
                                <legend className="text-lg font-semibold text-blue-400 mb-3 px-2">
                                    {t(
                                        "categories.createNewPosition.positionContent"
                                    )}
                                </legend>

                                {/* 1. Stichwort - First */}
                                <div className="mb-4">
                                    <label
                                        htmlFor="folgeposition_stichwort"
                                        className="block text-sm font-medium text-gray-100 mb-1"
                                    >
                                        {t(
                                            "categories.createNewPosition.stichwort"
                                        )}
                                        <span className="block text-xs text-gray-400">
                                            {t(
                                                "categories.createNewPosition.stichwortKeyword"
                                            )}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        id="folgeposition_stichwort"
                                        name="folgeposition_stichwort"
                                        value={
                                            grundtextnrData.grundtextnr[0]
                                                .folgeposition[0][
                                                "pos-eigenschaften"
                                            ].stichwort
                                        }
                                        onChange={handleGrundtextnrChange}
                                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-gray-700 text-white text-sm"
                                        placeholder={t(
                                            "categories.createNewPosition.stichwortPlaceholder"
                                        )}
                                    />
                                </div>

                                {/* 2. Grundtext Langtext - Second */}
                                <div className="mb-4">
                                    <label
                                        htmlFor="grundtext_langtext"
                                        className="block text-sm font-medium text-gray-100 mb-1"
                                    >
                                        {t(
                                            "categories.createNewPosition.grundtextLangtextMainBody"
                                        )}
                                        <span className="block text-xs text-gray-400">
                                            {t(
                                                "categories.createNewPosition.grundtextLangtextDescription"
                                            )}
                                        </span>
                                    </label>
                                    <textarea
                                        id="grundtext_langtext"
                                        name="grundtext_langtext"
                                        value={
                                            grundtextnrData.grundtextnr[0]
                                                .grundtext.langtext.p[0]
                                        }
                                        onChange={handleGrundtextnrChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-gray-700 text-white text-sm"
                                        placeholder={t(
                                            "categories.createNewPosition.grundtextLangtextPlaceholder"
                                        )}
                                    />
                                </div>

                                {/* 3. Langtext (Folgeposition) - Last */}
                                <div>
                                    <label
                                        htmlFor="folgeposition_langtext"
                                        className="block text-sm font-medium text-gray-100 mb-1"
                                    >
                                        {t(
                                            "categories.createNewPosition.langtext"
                                        )}
                                        <span className="block text-xs text-gray-400">
                                            {t(
                                                "categories.createNewPosition.langtextDescription"
                                            )}
                                        </span>
                                    </label>
                                    <textarea
                                        id="folgeposition_langtext"
                                        name="folgeposition_langtext"
                                        value={
                                            grundtextnrData.grundtextnr[0]
                                                .folgeposition[0][
                                                "pos-eigenschaften"
                                            ].langtext.p[0]
                                        }
                                        onChange={handleGrundtextnrChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-gray-700 text-white text-sm"
                                        placeholder={t(
                                            "categories.createNewPosition.langtextPlaceholder"
                                        )}
                                    />
                                </div>
                            </fieldset>
                        </>
                    ) : (
                        // Default Form Structure - Reorganized
                        <>
                            {/* Combined Position Content Section */}
                            <fieldset className="mb-4 p-3 border border-indigo-600 rounded-md bg-gray-700">
                                <legend className="text-xl font-semibold text-indigo-400 mb-4 px-2">
                                    {t(
                                        "categories.createNewPosition.positionContent"
                                    )}
                                </legend>

                                {/* 1. Stichwort - First */}
                                <div className="mb-4">
                                    <label
                                        htmlFor="stichwort"
                                        className="block text-sm font-medium text-gray-100 mb-1"
                                    >
                                        {t(
                                            "categories.createNewPosition.stichwort"
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id="stichwort"
                                        name="stichwort"
                                        value={
                                            positionData.folgeposition[0][
                                                "pos-eigenschaften"
                                            ].stichwort
                                        }
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out bg-gray-700 text-white"
                                        placeholder={t(
                                            "categories.createNewPosition.stichwortDefaultPlaceholder"
                                        )}
                                        required
                                    />
                                </div>

                                {/* 2. Langtext - Last */}
                                <div>
                                    <label
                                        htmlFor="langtext_text"
                                        className="block text-sm font-medium text-gray-100 mb-1"
                                    >
                                        {t(
                                            "categories.createNewPosition.langtext"
                                        )}
                                        <span className="block text-xs text-gray-400">
                                            {t(
                                                "categories.createNewPosition.langtextDescription"
                                            )}
                                        </span>
                                    </label>
                                    <textarea
                                        id="langtext_text"
                                        name="langtext_text"
                                        value={
                                            positionData.folgeposition[0][
                                                "pos-eigenschaften"
                                            ].langtext.p[0]["#text"]
                                        }
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out resize-y bg-gray-700 text-white"
                                        placeholder={t(
                                            "categories.createNewPosition.langtextDefaultPlaceholder"
                                        )}
                                        required
                                    />
                                </div>
                            </fieldset>
                        </>
                    ))}

                {/* Submit Message Display */}
                {submitMessage && (
                    <div className="mb-4 p-3 rounded-md text-center">
                        <span
                            className={`text-sm font-medium ${
                                submitMessage.includes("✅")
                                    ? "text-green-400"
                                    : submitMessage.includes("🔄")
                                    ? "text-blue-400"
                                    : "text-red-400"
                            }`}
                        >
                            {submitMessage}
                        </span>
                    </div>
                )}

                {configInput.length >= 6 && !isCheckingNr && !nrExists && (
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-8 py-3 font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out text-lg ${
                                isSubmitting
                                    ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                    {t(
                                        "categories.createNewPosition.creatingButton"
                                    )}
                                </>
                            ) : (
                                <>
                                    {t(
                                        "categories.createNewPosition.createPositionButton"
                                    )}{" "}
                                    (
                                    {formType === "grundtextnr"
                                        ? t(
                                              "categories.createNewPosition.grundtextnrFormType"
                                          )
                                        : t(
                                              "categories.createNewPosition.defaultFormType"
                                          )}
                                    )
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreateNewPosition;
