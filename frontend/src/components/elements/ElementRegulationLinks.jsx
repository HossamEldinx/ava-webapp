import React, { useState, useEffect, useCallback } from "react";
import {
    getRegulationsByElement,
    deleteElementRegulationLinkByIds,
} from "../../services/elementRegulationService";

const ElementRegulationLinks = ({
    element,
    onClose,
    onLinksUpdated = null,
}) => {
    const [linkedRegulations, setLinkedRegulations] = useState([]);
    const [isLoadingLinked, setIsLoadingLinked] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState("");

    const loadLinkedRegulations = useCallback(async () => {
        setIsLoadingLinked(true);
        try {
            console.log("Loading linked regulations for element:", element.id);
            const response = await getRegulationsByElement(element.id);
            console.log("Regulations response:", response);

            // Handle the API response structure - backend now includes nested regulation data
            const regulationsData = response.regulations || response.data || [];

            // Filter out invalid entries and ensure they have regulation data
            const validRegulations = regulationsData.filter((link) => {
                if (!link || typeof link !== "object") {
                    console.warn("Invalid regulation link found:", link);
                    return false;
                }
                // Check if the regulation data is nested under 'regulations' property
                if (!link.regulations) {
                    console.warn(
                        "Regulation link missing nested regulations property:",
                        link
                    );
                    return false;
                }
                return true;
            });

            setLinkedRegulations(validRegulations);
            console.log("Set linked regulations:", validRegulations);
        } catch (error) {
            console.error("Error loading linked regulations:", error);
            setError("Failed to load linked regulations");
            setLinkedRegulations([]); // Ensure we don't show stale data
        } finally {
            setIsLoadingLinked(false);
        }
    }, [element.id]);

    useEffect(() => {
        if (element) {
            loadLinkedRegulations();
        }
    }, [element, loadLinkedRegulations]);

    const handleUnlinkRegulation = async (regulationId) => {
        if (
            window.confirm("Are you sure you want to unlink this regulation?")
        ) {
            setIsLinking(true);
            try {
                // Find the link ID for this regulation
                const linkToDelete = linkedRegulations.find(
                    (link) =>
                        link.regulations && link.regulations.id === regulationId
                );

                if (linkToDelete) {
                    // Use the regulation_id from the link, not the nested regulation ID
                    await deleteElementRegulationLinkByIds(
                        element.id,
                        linkToDelete.regulation_id
                    );
                } else {
                    console.error(
                        "Could not find link to delete for regulation:",
                        regulationId
                    );
                    setError("Could not find regulation link to delete");
                    setIsLinking(false);
                    return;
                }

                await loadLinkedRegulations();
                if (onLinksUpdated) onLinksUpdated();
                setError("");
            } catch (error) {
                console.error("Error unlinking regulation:", error);
                setError(error.message || "Failed to unlink regulation");
            } finally {
                setIsLinking(false);
            }
        }
    };

    const RegulationCard = ({
        regulation,
        isLinked = false,
        onLink,
        onUnlink,
    }) => {
        // Safety check for regulation object
        if (!regulation || typeof regulation !== "object") {
            console.error(
                "RegulationCard received invalid regulation:",
                regulation
            );
            return null;
        }

        return (
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs text-gray-300">
                                {regulation.full_nr || "N/A"}
                            </span>
                        </div>
                        <p className="text-sm text-gray-100 mb-2">
                            {regulation.short_text ||
                                "No description available"}
                        </p>
                    </div>
                    <div className="ml-4">
                        {isLinked ? (
                            <button
                                onClick={() =>
                                    regulation.id && onUnlink(regulation.id)
                                }
                                disabled={!regulation.id}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                <svg
                                    className="h-3 w-3"
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
                        ) : (
                            <button
                                onClick={() =>
                                    regulation.id && onLink(regulation.id)
                                }
                                disabled={isLinking || !regulation.id}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                <svg
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                Link
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                    <div>
                        <h3 className="text-lg font-medium text-gray-100">
                            Verknüpfte Positionen ({linkedRegulations.length})
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-300 hover:text-gray-500 focus:outline-none"
                    >
                        <svg
                            className="h-6 w-6"
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

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <svg
                                className="h-5 w-5 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6">
                    {/* Linked Regulations */}
                    <div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {isLoadingLinked ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="animate-pulse bg-gray-200 h-20 rounded-lg"
                                        ></div>
                                    ))}
                                </div>
                            ) : linkedRegulations.length > 0 ? (
                                linkedRegulations.map((link) => (
                                    <RegulationCard
                                        key={link.id}
                                        regulation={link.regulations}
                                        isLinked={true}
                                        onUnlink={handleUnlinkRegulation}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-300">
                                        No regulations linked yet
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElementRegulationLinks;
