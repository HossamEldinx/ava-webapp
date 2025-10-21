import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "./config/api";
import { useLocalization } from "./contexts/LocalizationContext";

function CustomPositions() {
    const { t } = useLocalization();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        entity_type: "",
        lg_nr: "",
        ulg_nr: "",
        grundtext_nr: "",
    });
    const [deleteLoading, setDeleteLoading] = useState({});
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    // Fetch custom positions
    const fetchCustomPositions = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = API_ENDPOINTS.CUSTOM_POSITIONS.LIST(
                filters.entity_type || null,
                filters.lg_nr || null,
                filters.ulg_nr || null,
                filters.grundtext_nr || null
            );
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setPositions(data.data);
            } else {
                setError("Failed to fetch custom positions");
            }
        } catch (err) {
            setError("Error fetching custom positions: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchCustomPositions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value,
        });
    };

    // Apply filters
    const applyFilters = () => {
        fetchCustomPositions();
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            entity_type: "",
            lg_nr: "",
            ulg_nr: "",
            grundtext_nr: "",
        });
        // Refetch after clearing
        setTimeout(() => fetchCustomPositions(), 100);
    };

    // Delete position
    const handleDelete = async (positionId, fullNr) => {
        if (
            !window.confirm(
                `${t("customPositions.messages.deleteConfirm")} "${fullNr}"?`
            )
        ) {
            return;
        }

        setDeleteLoading({ ...deleteLoading, [positionId]: true });

        try {
            const response = await fetch(
                API_ENDPOINTS.CUSTOM_POSITIONS.DELETE(positionId),
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                // Remove from local state
                setPositions(positions.filter((pos) => pos.id !== positionId));
                alert(
                    `${t(
                        "customPositions.messages.deleteSuccess"
                    )}: "${fullNr}"`
                );
            } else {
                alert(
                    data.detail || t("customPositions.messages.deleteFailed")
                );
            }
        } catch (err) {
            alert(
                `${t("customPositions.messages.deleteError")}: ${err.message}`
            );
        } finally {
            setDeleteLoading({ ...deleteLoading, [positionId]: false });
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Get badge color for entity type
    const getEntityTypeBadge = (entityType) => {
        const colors = {
            Grundtext: "bg-blue-100 text-blue-800",
            Folgeposition: "bg-green-100 text-green-800",
            LG: "bg-purple-100 text-purple-800",
            ULG: "bg-yellow-100 text-yellow-800",
            UngeteiltePosition: "bg-pink-100 text-pink-800",
        };
        return colors[entityType] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t("customPositions.title")}
                    </h1>
                    <p className="text-gray-400">
                        {t("customPositions.subtitle")}
                    </p>
                </div>

                {/* Filters Section */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">
                            {t("customPositions.filters.title")}
                        </h2>
                        <button
                            onClick={() =>
                                setIsFilterExpanded(!isFilterExpanded)
                            }
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg
                                className={`w-6 h-6 transform transition-transform duration-200 ${
                                    isFilterExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>
                    </div>

                    {isFilterExpanded && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {t(
                                            "customPositions.filters.entityType"
                                        )}
                                    </label>
                                    <select
                                        name="entity_type"
                                        value={filters.entity_type}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">
                                            {t(
                                                "customPositions.filters.allTypes"
                                            )}
                                        </option>
                                        <option value="Grundtext">
                                            {t(
                                                "customPositions.entityTypes.Grundtext"
                                            )}
                                        </option>
                                        <option value="Folgeposition">
                                            {t(
                                                "customPositions.entityTypes.Folgeposition"
                                            )}
                                        </option>
                                        <option value="LG">
                                            {t(
                                                "customPositions.entityTypes.LG"
                                            )}
                                        </option>
                                        <option value="ULG">
                                            {t(
                                                "customPositions.entityTypes.ULG"
                                            )}
                                        </option>
                                        <option value="UngeteiltePosition">
                                            {t(
                                                "customPositions.entityTypes.UngeteiltePosition"
                                            )}
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {t("customPositions.filters.lgNumber")}
                                    </label>
                                    <input
                                        type="text"
                                        name="lg_nr"
                                        value={filters.lg_nr}
                                        onChange={handleFilterChange}
                                        placeholder={t(
                                            "customPositions.filters.placeholderLg"
                                        )}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {t("customPositions.filters.ulgNumber")}
                                    </label>
                                    <input
                                        type="text"
                                        name="ulg_nr"
                                        value={filters.ulg_nr}
                                        onChange={handleFilterChange}
                                        placeholder={t(
                                            "customPositions.filters.placeholderUlg"
                                        )}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {t(
                                            "customPositions.filters.grundtextNumber"
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        name="grundtext_nr"
                                        value={filters.grundtext_nr}
                                        onChange={handleFilterChange}
                                        placeholder={t(
                                            "customPositions.filters.placeholderGrundtext"
                                        )}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={applyFilters}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    {t("customPositions.buttons.applyFilters")}
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                                >
                                    {t("customPositions.buttons.clearFilters")}
                                </button>
                                <button
                                    onClick={fetchCustomPositions}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                                >
                                    {t("customPositions.buttons.refresh")}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Stats */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-300">
                            <span className="font-semibold text-white">
                                {positions.length}
                            </span>{" "}
                            {t("customPositions.messages.positionsFound")}
                        </p>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="mt-4 text-gray-400">
                            {t("customPositions.messages.loading")}
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Positions Table */}
                {!loading && !error && positions.length > 0 && (
                    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            {t("customPositions.table.fullNr")}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            {t(
                                                "customPositions.table.shortText"
                                            )}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            {t(
                                                "customPositions.table.entityType"
                                            )}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            {t(
                                                "customPositions.table.createdAt"
                                            )}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            {t("customPositions.table.actions")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {positions.map((position) => (
                                        <tr
                                            key={position.id}
                                            className="hover:bg-gray-750 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">
                                                    {position.full_nr}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-300 max-w-xs truncate">
                                                    {position.short_text}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEntityTypeBadge(
                                                        position.entity_type
                                                    )}`}
                                                >
                                                    {position.entity_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-400">
                                                    {formatDate(
                                                        position.created_at
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            position.id,
                                                            position.full_nr
                                                        )
                                                    }
                                                    disabled={
                                                        deleteLoading[
                                                            position.id
                                                        ]
                                                    }
                                                    className="text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {deleteLoading[
                                                        position.id
                                                    ] ? (
                                                        <span>
                                                            {t(
                                                                "customPositions.messages.deleting"
                                                            )}
                                                        </span>
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
                                                                strokeWidth="2"
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && positions.length === 0 && (
                    <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-300">
                            {t("customPositions.messages.noPositions")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {t(
                                "customPositions.messages.noPositionsDescription"
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomPositions;
