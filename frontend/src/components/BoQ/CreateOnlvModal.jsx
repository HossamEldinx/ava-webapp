import React, { useState } from "react";
import { IoSend } from "react-icons/io5";
import { API_ENDPOINTS } from "../../config/api";

const CreateOnlvModal = ({
    isOpen,
    onClose,
    project,
    onOnlvCreated,
    onNavigateToOnlvPage,
}) => {
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [createdOnlvJson, setCreatedOnlvJson] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [showJson, setShowJson] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading || !project) return;

        setIsLoading(true);
        setError("");

        try {
            // First, fetch the empty ONLV JSON template
            const emptyJsonResponse = await fetch(
                API_ENDPOINTS.UTILS.GET_ONLV_EMPTY_JSON(project.id)
            );

            if (!emptyJsonResponse.ok) {
                throw new Error(
                    `HTTP error! status: ${emptyJsonResponse.status}`
                );
            }

            const emptyJsonResult = await emptyJsonResponse.json();
            console.log("API Response:", emptyJsonResult); // Debug log

            // Handle different response structures
            let emptyOnlvJson;
            if (
                emptyJsonResult &&
                emptyJsonResult.success &&
                emptyJsonResult.data
            ) {
                emptyOnlvJson = emptyJsonResult.data;
            } else if (
                emptyJsonResult &&
                typeof emptyJsonResult === "object" &&
                !emptyJsonResult.error
            ) {
                // Direct JSON response without wrapper
                emptyOnlvJson = emptyJsonResult;
            } else {
                throw new Error(
                    emptyJsonResult?.error || "Failed to fetch empty ONLV JSON"
                );
            }

            // Ensure we have a valid JSON structure
            if (!emptyOnlvJson || typeof emptyOnlvJson !== "object") {
                throw new Error("Invalid ONLV JSON structure received");
            }

            // Process the user input using the Gemini API (same as ChatInterface)
            const userInput = inputValue.trim();

            // Call the Unified Search API to process the user input
            const unifiedSearchResponse = await fetch(
                API_ENDPOINTS.UTILS.UNIFIED_SEARCH,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        query: userInput,
                    }),
                }
            );

            if (!unifiedSearchResponse.ok) {
                throw new Error(
                    `Unified Search API error! status: ${unifiedSearchResponse.status}`
                );
            }

            const unifiedSearchData = await unifiedSearchResponse.json();
            console.log("Unified Search API Response:", unifiedSearchData);

            // Extract json_response and results from the unified search data
            const jsonResponseFromSearch = unifiedSearchData.json_response;
            const searchResults = unifiedSearchData.results || [];

            // Check if we have a json_response from the Unified Search API
            if (jsonResponseFromSearch && emptyOnlvJson) {
                // Follow the same logic as ChatInterface.jsx
                if (
                    emptyOnlvJson.onlv &&
                    emptyOnlvJson.onlv["ausschreibungs-lv"] &&
                    emptyOnlvJson.onlv["ausschreibungs-lv"]["gliederung-lg"] &&
                    emptyOnlvJson.onlv["ausschreibungs-lv"]["gliederung-lg"][
                        "lg-liste"
                    ] &&
                    Array.isArray(
                        emptyOnlvJson.onlv["ausschreibungs-lv"][
                            "gliederung-lg"
                        ]["lg-liste"].lg
                    )
                ) {
                    // Insert the json_response from Unified Search API into the correct path
                    emptyOnlvJson.onlv["ausschreibungs-lv"]["gliederung-lg"][
                        "lg-liste"
                    ].lg.push(jsonResponseFromSearch);
                } else {
                    throw new Error(
                        "Could not find the correct path to lg array in ONLV JSON structure"
                    );
                }
            } else {
                throw new Error(
                    "No valid JSON response received from Unified Search API"
                );
            }

            setCreatedOnlvJson(emptyOnlvJson);

            // Set success message based on Unified Search API results
            const resultCount = searchResults.length || 0;
            if (resultCount > 0) {
                setSuccessMessage(
                    `✅ Successfully created ONLV JSON with ${resultCount} regulation${
                        resultCount > 1 ? "s" : ""
                    } found for "${userInput}"`
                );
            } else {
                setSuccessMessage(
                    `⚠️ ONLV JSON created but no specific regulations found for "${userInput}"`
                );
            }
        } catch (err) {
            setError(err.message || "Failed to create ONLV JSON");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyJson = async () => {
        if (!createdOnlvJson) return;

        try {
            await navigator.clipboard.writeText(
                JSON.stringify(createdOnlvJson, null, 2)
            );
            // You could add a toast notification here
        } catch (err) {
            console.error("Failed to copy JSON:", err);
        }
    };

    const handleReset = () => {
        setInputValue("");
        setCreatedOnlvJson(null);
        setError("");
        setSuccessMessage("");
        setShowJson(false); // Reset showJson when resetting
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            Create New ONLV JSON
                        </h2>
                        <p className="text-sm text-gray-300 mt-1">
                            Project: {project?.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                            <p className="text-sm text-red-100">{error}</p>
                        </div>
                    )}

                    {successMessage && createdOnlvJson && (
                        <div className="mb-4 p-4 bg-green-600/50 border border-green-600 rounded-lg">
                            <p className="text-sm text-green-100">
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {!createdOnlvJson ? (
                        /* Input Form */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Describe what you want to create:
                                </label>
                                <p className="text-xs text-gray-400 mb-3">
                                    Example: "Build LG 00", "Create wall
                                    section", "Add foundation work"
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) =>
                                            setInputValue(e.target.value)
                                        }
                                        disabled={isLoading}
                                        className={`w-full bg-gray-700 text-gray-100 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 ${
                                            isLoading
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""
                                        }`}
                                        placeholder={
                                            isLoading
                                                ? "Creating ONLV JSON..."
                                                : "Type your description..."
                                        }
                                    />
                                    <button
                                        type="submit"
                                        disabled={
                                            isLoading || !inputValue.trim()
                                        }
                                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full text-white font-medium transition-colors flex items-center justify-center ${
                                            isLoading || !inputValue.trim()
                                                ? "bg-gray-500 cursor-not-allowed"
                                                : "bg-indigo-600 hover:bg-indigo-700"
                                        }`}
                                    >
                                        {isLoading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <IoSend className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* JSON Result Display */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-white">
                                    Created ONLV JSON
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowJson(!showJson)}
                                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                                    >
                                        {showJson ? "Hide JSON" : "Show JSON"}
                                    </button>
                                    <button
                                        onClick={handleCopyJson}
                                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                                    >
                                        Copy JSON
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
                                    >
                                        Create Another
                                    </button>
                                </div>
                            </div>

                            {showJson && (
                                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(
                                            createdOnlvJson,
                                            null,
                                            2
                                        )}
                                    </pre>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onOnlvCreated && createdOnlvJson) {
                                            onOnlvCreated(createdOnlvJson);
                                        }
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                                >
                                    Save ONLV
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (
                                            onNavigateToOnlvPage &&
                                            createdOnlvJson
                                        ) {
                                            onNavigateToOnlvPage(
                                                createdOnlvJson
                                            );
                                        }
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200"
                                >
                                    Open ONLV Page
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateOnlvModal;
