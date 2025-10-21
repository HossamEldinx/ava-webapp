import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";

const CategoryFilters = ({
    onFiltersChange,
    currentUser = null,
    showUserFilter = true,
    showSortOptions = true,
    initialFilters = {},
}) => {
    const { t } = useLocalization();
    const [filters, setFilters] = useState({
        userId: "",
        sortBy: "created_at",
        sortOrder: "desc",
        ...initialFilters,
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    // Notify parent when filters change
    useEffect(() => {
        onFiltersChange(filters);
    }, [filters, onFiltersChange]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            userId: "",
            sortBy: "created_at",
            sortOrder: "desc",
        });
    };

    const setMyCategoriesFilter = () => {
        if (currentUser) {
            handleFilterChange("userId", currentUser.id);
        }
    };

    const hasActiveFilters =
        filters.userId ||
        filters.sortBy !== "created_at" ||
        filters.sortOrder !== "desc";

    const sortOptions = [
        {
            value: "created_at",
            label: t("categories.categoryFilters.dateCreated"),
        },
        {
            value: "updated_at",
            label: t("categories.categoryFilters.dateUpdated"),
        },
        { value: "name", label: t("categories.categoryFilters.name") },
    ];

    return (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
            <div className="px-4 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-100 flex items-center">
                        <svg
                            className="h-4 w-4 mr-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
                            />
                        </svg>
                        {t("categories.categoryFilters.title")}
                        {hasActiveFilters && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {t("categories.categoryFilters.active")}
                            </span>
                        )}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs text-gray-300 hover:text-gray-200"
                        >
                            {showAdvanced
                                ? t("categories.categoryFilters.simple")
                                : t("categories.categoryFilters.advanced")}
                        </button>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                                {t("categories.categoryFilters.clearAll")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2">
                    {currentUser && showUserFilter && (
                        <button
                            onClick={setMyCategoriesFilter}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                filters.userId === currentUser.id
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                            }`}
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
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                            {t("categories.categoryFilters.myCategories")}
                        </button>
                    )}

                    {/* Quick Sort Filters */}
                    {showSortOptions && (
                        <>
                            <button
                                onClick={() =>
                                    handleFilterChange("sortBy", "name")
                                }
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    filters.sortBy === "name"
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                                }`}
                            >
                                {t("categories.categoryFilters.sortByName")}
                            </button>
                            <button
                                onClick={() =>
                                    handleFilterChange("sortBy", "created_at")
                                }
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    filters.sortBy === "created_at"
                                        ? "bg-green-100 text-green-800 border border-green-200"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                                }`}
                            >
                                {t("categories.categoryFilters.recentFirst")}
                            </button>
                        </>
                    )}
                </div>

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-600">
                        {/* User Filter */}
                        {showUserFilter && (
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    {t("categories.categoryFilters.createdBy")}
                                </label>
                                <select
                                    value={filters.userId}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "userId",
                                            e.target.value
                                        )
                                    }
                                    className="block w-full px-3 py-1.5 text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-gray-300"
                                >
                                    <option value="">
                                        {t(
                                            "categories.categoryFilters.allUsers"
                                        )}
                                    </option>
                                    {currentUser && (
                                        <option value={currentUser.id}>
                                            {currentUser.name ||
                                                t(
                                                    "categories.categoryFilters.me"
                                                )}
                                        </option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Sort By */}
                        {showSortOptions && (
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    {t("categories.categoryFilters.sortBy")}
                                </label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "sortBy",
                                            e.target.value
                                        )
                                    }
                                    className="block w-full px-3 py-1.5 text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-gray-300"
                                >
                                    {sortOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Sort Order */}
                        {showSortOptions && (
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    {t("categories.categoryFilters.order")}
                                </label>
                                <select
                                    value={filters.sortOrder}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "sortOrder",
                                            e.target.value
                                        )
                                    }
                                    className="block w-full px-3 py-1.5 text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-gray-300"
                                >
                                    <option value="desc">
                                        {t(
                                            "categories.categoryFilters.newestFirst"
                                        )}
                                    </option>
                                    <option value="asc">
                                        {t(
                                            "categories.categoryFilters.oldestFirst"
                                        )}
                                    </option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                    <div className="pt-3 border-t border-gray-600">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-gray-300">
                                {t("categories.categoryFilters.activeFilters")}:
                            </span>

                            {filters.userId &&
                                currentUser &&
                                filters.userId === currentUser.id && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {t(
                                            "categories.categoryFilters.myCategories"
                                        )}
                                        <button
                                            onClick={() =>
                                                handleFilterChange("userId", "")
                                            }
                                            className="ml-1 text-indigo-500 hover:text-indigo-700"
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
                                    </span>
                                )}

                            {(filters.sortBy !== "created_at" ||
                                filters.sortOrder !== "desc") && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                                    {t("categories.categoryFilters.sort")}:{" "}
                                    {
                                        sortOptions.find(
                                            (opt) =>
                                                opt.value === filters.sortBy
                                        )?.label
                                    }{" "}
                                    (
                                    {filters.sortOrder === "desc"
                                        ? t("categories.categoryFilters.newest")
                                        : t(
                                              "categories.categoryFilters.oldest"
                                          )}{" "}
                                    {t("categories.categoryFilters.first")})
                                    <button
                                        onClick={() => {
                                            handleFilterChange(
                                                "sortBy",
                                                "created_at"
                                            );
                                            handleFilterChange(
                                                "sortOrder",
                                                "desc"
                                            );
                                        }}
                                        className="ml-1 text-gray-400 hover:text-gray-200"
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
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryFilters;
