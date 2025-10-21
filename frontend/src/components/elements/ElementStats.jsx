import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import {
    getTotalElementCount,
    getElementCountByUser,
    getUniqueElementTypes,
    getElementCountByType,
} from "../../services/elementService";

const ElementStats = ({
    currentUser = null,
    refreshTrigger = 0,
    showUserStats = true,
    showTypeStats = true,
    showOverallStats = true,
}) => {
    const { t } = useLocalization();
    const [stats, setStats] = useState({
        totalElements: 0,
        userElements: 0,
        uniqueTypes: [],
        typeStats: [],
        isLoading: true,
        error: null,
    });

    const [selectedView, setSelectedView] = useState("overview");

    useEffect(() => {
        loadStats();
    }, [currentUser, refreshTrigger]);

    const loadStats = async () => {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const promises = [];

            // Load total elements count
            if (showOverallStats) {
                promises.push(getTotalElementCount());
            }

            // Load user elements count
            if (showUserStats && currentUser) {
                promises.push(getElementCountByUser(currentUser.id));
            }

            // Load unique types
            if (showTypeStats) {
                promises.push(getUniqueElementTypes());
            }

            const results = await Promise.allSettled(promises);

            let totalElements = 0;
            let userElements = 0;
            let uniqueTypes = [];

            let resultIndex = 0;

            if (showOverallStats) {
                if (results[resultIndex].status === "fulfilled") {
                    totalElements =
                        results[resultIndex].value.total_elements || 0;
                }
                resultIndex++;
            }

            if (showUserStats && currentUser) {
                if (results[resultIndex].status === "fulfilled") {
                    userElements =
                        results[resultIndex].value.element_count || 0;
                }
                resultIndex++;
            }

            if (showTypeStats) {
                if (results[resultIndex].status === "fulfilled") {
                    uniqueTypes =
                        results[resultIndex].value.element_types || [];
                }
            }

            // Load type statistics
            let typeStats = [];
            if (showTypeStats && uniqueTypes.length > 0) {
                const typePromises = uniqueTypes.map((type) =>
                    getElementCountByType(type)
                );
                const typeResults = await Promise.allSettled(typePromises);

                typeStats = uniqueTypes
                    .map((type, index) => ({
                        type,
                        count:
                            typeResults[index].status === "fulfilled"
                                ? typeResults[index].value.element_count || 0
                                : 0,
                    }))
                    .sort((a, b) => b.count - a.count);
            }

            setStats({
                totalElements,
                userElements,
                uniqueTypes,
                typeStats,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            console.error("Error loading stats:", error);
            setStats((prev) => ({
                ...prev,
                isLoading: false,
                error:
                    error.message ||
                    t("categories.elementStats.failedToLoadStats"),
            }));
        }
    };

    const getTypeColor = (type, index) => {
        const colors = [
            "bg-blue-100 text-blue-800",
            "bg-green-100 text-green-800",
            "bg-purple-100 text-purple-800",
            "bg-orange-100 text-orange-800",
            "bg-red-100 text-red-800",
            "bg-indigo-100 text-indigo-800",
            "bg-pink-100 text-pink-800",
            "bg-yellow-100 text-yellow-800",
        ];
        return colors[index % colors.length];
    };

    const StatCard = ({
        title,
        value,
        icon,
        color = "indigo",
        subtitle = null,
    }) => (
        <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <div
                            className={`w-8 h-8 bg-${color}-500 rounded-md flex items-center justify-center`}
                        >
                            {icon}
                        </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-gray-300 truncate">
                                {title}
                            </dt>
                            <dd className="text-lg font-medium text-gray-100">
                                {stats.isLoading ? (
                                    <div className="animate-pulse bg-gray-700 h-6 w-16 rounded"></div>
                                ) : (
                                    value
                                )}
                            </dd>
                            {subtitle && (
                                <dd className="text-xs text-gray-300 mt-1">
                                    {subtitle}
                                </dd>
                            )}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );

    if (stats.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                        <h3 className="text-sm font-medium text-red-800">
                            {t("categories.elementStats.errorLoadingStats")}
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                            {stats.error}
                        </p>
                        <button
                            onClick={loadStats}
                            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                        >
                            {t("categories.elementStats.tryAgain")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-100">
                    {t("categories.elementStats.title")}
                </h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setSelectedView("overview")}
                        className={`px-3 py-1 text-sm rounded-md ${
                            selectedView === "overview"
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-300 hover:text-gray-200"
                        }`}
                    >
                        {t("categories.elementStats.overview")}
                    </button>
                    {showTypeStats && (
                        <button
                            onClick={() => setSelectedView("types")}
                            className={`px-3 py-1 text-sm rounded-md ${
                                selectedView === "types"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "text-gray-300 hover:text-gray-200"
                            }`}
                        >
                            {t("categories.elementStats.byType")}
                        </button>
                    )}
                    <button
                        onClick={loadStats}
                        className="p-1 text-gray-300 hover:text-gray-500"
                        disabled={stats.isLoading}
                    >
                        <svg
                            className={`h-4 w-4 ${
                                stats.isLoading ? "animate-spin" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            {selectedView === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showOverallStats && (
                        <StatCard
                            title={t("categories.elementStats.totalElements")}
                            value={stats.totalElements.toLocaleString()}
                            color="blue"
                            icon={
                                <svg
                                    className="h-5 w-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            }
                        />
                    )}

                    {showUserStats && currentUser && (
                        <StatCard
                            title={t("categories.elementStats.myElements")}
                            value={stats.userElements.toLocaleString()}
                            color="green"
                            subtitle={t(
                                "categories.elementStats.percentageOfTotal",
                                {
                                    percentage: (
                                        (stats.userElements /
                                            Math.max(stats.totalElements, 1)) *
                                        100
                                    ).toFixed(1),
                                }
                            )}
                            icon={
                                <svg
                                    className="h-5 w-5 text-white"
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
                            }
                        />
                    )}
                </div>
            )}

            {/* Type Statistics */}
            {selectedView === "types" && showTypeStats && (
                <div className="bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-100 mb-4">
                            {t("categories.elementStats.elementsByType")}
                        </h3>

                        {stats.isLoading ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="animate-pulse flex items-center space-x-3"
                                    >
                                        <div className="bg-gray-700 h-4 w-20 rounded"></div>
                                        <div className="bg-gray-700 h-4 flex-1 rounded"></div>
                                        <div className="bg-gray-700 h-4 w-12 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : stats.typeStats.length > 0 ? (
                            <div className="space-y-3">
                                {stats.typeStats.map((typeStat, index) => {
                                    const percentage =
                                        (typeStat.count /
                                            Math.max(stats.totalElements, 1)) *
                                        100;
                                    return (
                                        <div
                                            key={typeStat.type}
                                            className="flex items-center"
                                        >
                                            <div className="flex-shrink-0 w-20">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                                                        typeStat.type,
                                                        index
                                                    )}`}
                                                >
                                                    {typeStat.type}
                                                </span>
                                            </div>
                                            <div className="flex-1 mx-3">
                                                <div className="bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${Math.max(
                                                                percentage,
                                                                2
                                                            )}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 w-16 text-right">
                                                <span className="text-sm font-medium text-gray-100">
                                                    {typeStat.count}
                                                </span>
                                                <span className="text-xs text-gray-300 ml-1">
                                                    ({percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6">
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
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                                <p className="mt-2 text-sm text-gray-300">
                                    {t(
                                        "categories.elementStats.noElementTypesFound"
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElementStats;
