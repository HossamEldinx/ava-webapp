import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import {
    getRegulationsByElement,
    deleteElementRegulationLinkByIds,
} from "../../services/elementRegulationService";

const ElementCard = ({
    element,
    onEdit,
    onDelete,
    onViewRegulations,
    showUserInfo = false,
    isSelected = false,
    onSelect = null,
    onRegulationDeleted = null, // New callback for when a regulation is deleted
}) => {
    const { t } = useLocalization();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [linkedPositions, setLinkedPositions] = useState([]);
    const [isLoadingPositions, setIsLoadingPositions] = useState(false);
    const [deletingRegulationId, setDeletingRegulationId] = useState(null);

    // Fetch linked positions when element has regulations (for badge display)
    useEffect(() => {
        const fetchLinkedPositions = async () => {
            if (element.regulation_count > 0 && linkedPositions.length === 0) {
                setIsLoadingPositions(true);
                try {
                    const response = await getRegulationsByElement(element.id);
                    if (response && response.regulations) {
                        setLinkedPositions(response.regulations);
                    }
                } catch (error) {
                    console.error("Error fetching linked positions:", error);
                } finally {
                    setIsLoadingPositions(false);
                }
            }
        };

        fetchLinkedPositions();
    }, [element.id, element.regulation_count, linkedPositions.length]);

    // Format position number for display (e.g., "001101G")
    const formatPositionNumber = (regulation) => {
        const parts = [];

        if (regulation.regulations?.lg_nr) {
            parts.push(String(regulation.regulations.lg_nr).padStart(2, "0"));
        }
        if (regulation.regulations?.ulg_nr) {
            parts.push(String(regulation.regulations.ulg_nr).padStart(2, "0"));
        }
        if (regulation.regulations?.grundtext_nr) {
            parts.push(
                String(regulation.regulations.grundtext_nr).padStart(2, "0")
            );
        }
        if (regulation.regulations?.position_nr) {
            parts.push(regulation.regulations.position_nr);
        }

        return parts.join("");
    };

    // Get compact position list for badge display
    const getCompactPositionList = () => {
        if (linkedPositions.length === 0) return "";

        const formattedPositions = linkedPositions
            .map((pos) => formatPositionNumber(pos))
            .filter((nr) => nr); // Remove any empty strings

        // Limit to first 3 positions for badge, add "..." if more
        if (formattedPositions.length > 3) {
            return formattedPositions.slice(0, 3).join(", ") + "...";
        }

        return formattedPositions.join(", ");
    };

    const handleDelete = async () => {
        if (
            window.confirm(
                t("categories.elementCard.deleteConfirm", {
                    elementName: element.name,
                })
            )
        ) {
            setIsDeleting(true);
            try {
                await onDelete(element.id);
            } catch (error) {
                console.error("Error deleting element:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Handler for deleting individual regulation links
    const handleDeleteRegulationLink = async (regulation) => {
        const positionNumber = formatPositionNumber(regulation);
        if (
            window.confirm(
                t("categories.elementCard.deleteRegulationConfirm", {
                    elementName: element.name,
                    positionNumber: positionNumber,
                }) || `Remove position ${positionNumber} from ${element.name}?`
            )
        ) {
            setDeletingRegulationId(regulation.regulation_id);
            try {
                await deleteElementRegulationLinkByIds(
                    element.id,
                    regulation.regulation_id
                );

                // Update local state by removing the deleted regulation
                setLinkedPositions((prev) =>
                    prev.filter(
                        (pos) => pos.regulation_id !== regulation.regulation_id
                    )
                );

                // Notify parent component to refresh element data
                if (onRegulationDeleted) {
                    onRegulationDeleted(element.id, regulation.regulation_id);
                }
            } catch (error) {
                console.error("Error deleting regulation link:", error);
                alert(
                    t("categories.elementCard.deleteRegulationError") ||
                        "Failed to delete regulation link. Please try again."
                );
            } finally {
                setDeletingRegulationId(null);
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTypeColor = (type) => {
        const colors = {
            material: "text-blue-400",
            equipment: "text-green-400",
            service: "text-purple-400",
            component: "text-orange-400",
            system: "text-red-400",
            default: "text-gray-400",
        };
        return colors[type.toLowerCase()] || colors.default;
    };

    return (
        <div className="w-full border-b-2 border-gray-600 last:border-b-0">
            {/* Main Row */}
            <div
                className={`group w-full bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 ${
                    isSelected
                        ? "bg-indigo-900/20 ring-1 ring-indigo-500/30"
                        : ""
                }`}
            >
                <div className="px-6 py-4 w-full">
                    <div className="flex items-center justify-between w-full">
                        {/* Left side - Name with collapse, Type, Date */}
                        <div className="flex items-center space-x-6 flex-1 min-w-0">
                            {/* Selection checkbox if applicable */}
                            {onSelect && (
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) =>
                                        onSelect(element.id, e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-gray-800"
                                />
                            )}

                            {/* Element Name with Collapsible button */}
                            <div className="flex items-center flex-1 min-w-0 space-x-3">
                                <div className="flex items-center min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate">
                                        {element.name}
                                    </h3>
                                    {/* Collapsible button for details - right next to name */}
                                    <button
                                        onClick={() =>
                                            setIsExpanded(!isExpanded)
                                        }
                                        className="ml-1 p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-all duration-200 flex-shrink-0"
                                        title={t(
                                            "categories.elementCard.showDetails"
                                        )}
                                    >
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${
                                                isExpanded ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* Compact position numbers badge */}
                                {element.regulation_count > 0 && (
                                    <div className="flex-shrink-0">
                                        {isLoadingPositions ? (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-mono text-gray-400 bg-gray-800/50 rounded">
                                                <svg
                                                    className="animate-spin h-3 w-3 mr-1"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Loading...
                                            </span>
                                        ) : linkedPositions.length > 0 ? (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-mono text-indigo-300 bg-indigo-900/30 rounded">
                                                {getCompactPositionList()}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-300 bg-indigo-900/30 rounded-full">
                                                <svg
                                                    className="w-3 h-3 mr-1"
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
                                                {element.regulation_count}{" "}
                                                {element.regulation_count === 1
                                                    ? "position"
                                                    : "positions"}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Element Type */}
                            <div className="flex-shrink-0">
                                <span
                                    className={`text-sm font-medium ${getTypeColor(
                                        element.type
                                    )}`}
                                >
                                    {element.type.charAt(0).toUpperCase() +
                                        element.type.slice(1)}
                                </span>
                            </div>

                            {/* Created Date */}
                            <div className="flex-shrink-0 text-sm text-gray-400">
                                {formatDate(element.created_at)}
                            </div>
                        </div>

                        {/* Right side - Actions (Edit & Delete only) */}
                        <div className="flex items-center space-x-3">
                            {/* Edit button */}
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(element)}
                                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 rounded-lg transition-all duration-200"
                                    title={t(
                                        "categories.elementCard.editElement"
                                    )}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                </button>
                            )}

                            {/* Delete button */}
                            {onDelete && (
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                                    title={t(
                                        "categories.elementCard.deleteElement"
                                    )}
                                >
                                    {isDeleting ? (
                                        <svg
                                            className="animate-spin w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Details Section */}
            {isExpanded && (
                <div className="bg-gray-800/30 border-t border-gray-700/50 w-full">
                    <div className="px-6 py-4 w-full">
                        <div className="flex items-center justify-between mb-4 w-full">
                            <h4 className="text-sm font-semibold text-gray-300">
                                {element.regulation_count > 0
                                    ? t(
                                          "categories.elementCard.associatedRegulations",
                                          {
                                              count: element.regulation_count,
                                          }
                                      )
                                    : t(
                                          "categories.elementCard.elementDetails"
                                      )}
                            </h4>
                            {onViewRegulations &&
                                element.regulation_count > 0 && (
                                    <button
                                        onClick={() =>
                                            onViewRegulations(element)
                                        }
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-300 bg-indigo-900/20 hover:bg-indigo-800/30 rounded-lg transition-all duration-200"
                                    >
                                        <svg
                                            className="w-4 h-4 mr-2"
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
                                        {t(
                                            "categories.elementCard.viewAllRegulations"
                                        )}
                                    </button>
                                )}
                        </div>

                        {/* Linked Positions Display */}
                        {element.regulation_count > 0 && (
                            <div className="mb-4">
                                {isLoadingPositions ? (
                                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        <span>Loading positions...</span>
                                    </div>
                                ) : linkedPositions.length > 0 ? (
                                    <div>
                                        <p className="text-sm text-gray-400 mb-3">
                                            <span className="font-semibold text-gray-300">
                                                {element.name}
                                            </span>{" "}
                                            -{" "}
                                            {t(
                                                "categories.elementCard.linkedPositions"
                                            )}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {linkedPositions.map(
                                                (regulation) => {
                                                    const positionNumber =
                                                        formatPositionNumber(
                                                            regulation
                                                        );
                                                    const isDeleting =
                                                        deletingRegulationId ===
                                                        regulation.regulation_id;

                                                    return (
                                                        <div
                                                            key={
                                                                regulation.regulation_id
                                                            }
                                                            className="group inline-flex items-center space-x-1 bg-indigo-900/20 hover:bg-indigo-900/30 rounded transition-all duration-200"
                                                        >
                                                            <span className="text-sm font-mono text-indigo-400 px-2 py-1">
                                                                {positionNumber}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteRegulationLink(
                                                                        regulation
                                                                    )
                                                                }
                                                                disabled={
                                                                    isDeleting
                                                                }
                                                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-r transition-all duration-200 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                                title={t(
                                                                    "categories.elementCard.removePosition",
                                                                    {
                                                                        positionNumber,
                                                                    }
                                                                )}
                                                            >
                                                                {isDeleting ? (
                                                                    <svg
                                                                        className="animate-spin w-3 h-3"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                        />
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                        />
                                                                    </svg>
                                                                ) : (
                                                                    <svg
                                                                        className="w-3 h-3"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            d="M6 18L18 6M6 6l12 12"
                                                                        />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">
                                        {t(
                                            "categories.elementCard.hasAssociatedRegulations",
                                            {
                                                count: element.regulation_count,
                                            }
                                        )}
                                        {onViewRegulations &&
                                            ` ${t(
                                                "categories.elementCard.clickToViewRegulations"
                                            )}`}
                                    </p>
                                )}
                            </div>
                        )}

                        {element.regulation_count === 0 && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-400">
                                    {t(
                                        "categories.elementCard.noRegulationsAssociated"
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Additional element details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm w-full">
                            {element.description && (
                                <div className="w-full">
                                    <span className="text-gray-400">
                                        {t(
                                            "categories.elementCard.description"
                                        )}
                                    </span>
                                    <p className="text-gray-300 mt-1">
                                        {element.description}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 w-full">
                                {element.updated_at &&
                                    element.updated_at !==
                                        element.created_at && (
                                        <div>
                                            <span className="text-gray-400">
                                                {t(
                                                    "categories.elementCard.lastUpdated"
                                                )}
                                            </span>
                                            <span className="text-gray-300 ml-2">
                                                {formatDate(element.updated_at)}
                                            </span>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* User Info if enabled */}
                        {showUserInfo && element.users && (
                            <div className="mt-4 pt-4 border-t border-gray-700/50 w-full">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                            {element.users.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {element.users.name ||
                                                t(
                                                    "categories.elementCard.unknownUser"
                                                )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {element.users.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElementCard;
