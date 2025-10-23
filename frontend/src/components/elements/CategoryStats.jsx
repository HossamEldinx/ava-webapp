import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import {
    getTotalCategoryCount,
    getCategoryCountByUser,
    getAllCategories,
    getElementsCountByCategory,
} from "../../services/categoryService";

const CategoryStats = ({
    currentUser = null,
    refreshTrigger = 0,
    showUserStats = true,
    showOverviewStats = true,
    showDetailedStats = true,
}) => {
    const [stats, setStats] = useState({
        totalCategories: 0,
        userCategories: 0,
        recentCategories: 0,
        categoriesWithElements: 0,
        totalElementsInCategories: 0,
        averageElementsPerCategory: 0,
        topCategories: [],
        isLoading: true,
        error: null,
    });

    const [selectedView, setSelectedView] = useState("overview");

    useEffect(() => {
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger]);

    const loadStats = async () => {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const promises = [];

            // Load total categories count
            if (showOverviewStats) {
                promises.push(getTotalCategoryCount());
            }

            // Load user categories count
            if (showUserStats && currentUser) {
                promises.push(getCategoryCountByUser(currentUser.id));
            }

            const results = await Promise.allSettled(promises);

            let totalCategories = 0;
            let userCategories = 0;

            let resultIndex = 0;

            if (showOverviewStats) {
                if (results[resultIndex].status === "fulfilled") {
                    totalCategories =
                        results[resultIndex].value.total_categories ||
                        results[resultIndex].value.count ||
                        0;
                }
                resultIndex++;
            }

            if (showUserStats && currentUser) {
                if (results[resultIndex].status === "fulfilled") {
                    userCategories =
                        results[resultIndex].value.category_count ||
                        results[resultIndex].value.count ||
                        0;
                }
                resultIndex++;
            }

            // Load detailed stats
            let detailedStats = {
                recentCategories: 0,
                categoriesWithElements: 0,
                totalElementsInCategories: 0,
                averageElementsPerCategory: 0,
                topCategories: [],
            };

            if (showDetailedStats) {
                detailedStats = await loadDetailedStats();
            }

            setStats({
                totalCategories,
                userCategories,
                ...detailedStats,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            console.error("Error loading category stats:", error);
            setStats((prev) => ({
                ...prev,
                isLoading: false,
                error:
                    error.message ||
                    t("categories.categoryStats.failedToLoadStats"),
            }));
        }
    };

    const loadDetailedStats = async () => {
        try {
            // Get all categories for detailed analysis
            const response = currentUser
                ? await getAllCategories(1000, 0) // Get more categories for analysis
                : await getAllCategories(1000, 0);

            const categories = response.data || response.categories || [];

            // Calculate recent categories (created in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentCategories = categories.filter((cat) => {
                const createdAt = new Date(cat.created_at);
                return createdAt >= thirtyDaysAgo;
            }).length;

            // Load element counts for each category
            const categoryElementCounts = await Promise.all(
                categories.map(async (category) => {
                    try {
                        const countResponse = await getElementsCountByCategory(
                            category.id
                        );
                        return {
                            category,
                            elementCount: countResponse.element_count || 0,
                        };
                    } catch (error) {
                        return {
                            category,
                            elementCount: 0,
                        };
                    }
                })
            );

            // Calculate stats
            const categoriesWithElements = categoryElementCounts.filter(
                (item) => item.elementCount > 0
            ).length;

            const totalElementsInCategories = categoryElementCounts.reduce(
                (total, item) => total + item.elementCount,
                0
            );

            const averageElementsPerCategory =
                categories.length > 0
                    ? (totalElementsInCategories / categories.length).toFixed(1)
                    : 0;

            // Get top categories by element count
            const topCategories = categoryElementCounts
                .filter((item) => item.elementCount > 0)
                .sort((a, b) => b.elementCount - a.elementCount)
                .slice(0, 5)
                .map((item) => ({
                    id: item.category.id,
                    name: item.category.name,
                    elementCount: item.elementCount,
                    color: item.category.color,
                }));

            return {
                recentCategories,
                categoriesWithElements,
                totalElementsInCategories,
                averageElementsPerCategory: parseFloat(
                    averageElementsPerCategory
                ),
                topCategories,
            };
        } catch (error) {
            console.error("Error loading detailed stats:", error);
            return {
                recentCategories: 0,
                categoriesWithElements: 0,
                totalElementsInCategories: 0,
                averageElementsPerCategory: 0,
                topCategories: [],
            };
        }
    };

    const { t } = useLocalization();
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
                            {t("categories.categoryStats.errorLoadingStats")}
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                            {stats.error}
                        </p>
                        <button
                            onClick={loadStats}
                            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                        >
                            {t("categories.categoryStats.tryAgain")}
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
                    {t("categories.categoryStats.title")}
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
                        {t("categories.categoryStats.overview")}
                    </button>
                    {showDetailedStats && (
                        <button
                            onClick={() => setSelectedView("detailed")}
                            className={`px-3 py-1 text-sm rounded-md ${
                                selectedView === "detailed"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "text-gray-300 hover:text-gray-200"
                            }`}
                        >
                            {t("categories.categoryStats.detailed")}
                        </button>
                    )}
                    <button
                        onClick={loadStats}
                        className="p-1 text-gray-300 hover:text-gray-500"
                        disabled={stats.isLoading}
                        title={t("categories.categoryStats.refresh")}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {showOverviewStats && (
                        <StatCard
                            title={t(
                                "categories.categoryStats.totalCategories"
                            )}
                            value={stats.totalCategories.toLocaleString()}
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
                            title={t("categories.categoryStats.myCategories")}
                            value={stats.userCategories.toLocaleString()}
                            color="green"
                            subtitle={t(
                                "categories.categoryStats.percentageOfTotal",
                                {
                                    percentage: (
                                        (stats.userCategories /
                                            Math.max(
                                                stats.totalCategories,
                                                1
                                            )) *
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

                    <StatCard
                        title={t("categories.categoryStats.recentCategories")}
                        value={stats.recentCategories.toLocaleString()}
                        color="purple"
                        subtitle={t(
                            "categories.categoryStats.createdLast30Days"
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
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        }
                    />

                    <StatCard
                        title={t(
                            "categories.categoryStats.avgElementsPerCategory"
                        )}
                        value={stats.averageElementsPerCategory}
                        color="orange"
                        subtitle={t("categories.categoryStats.totalElements", {
                            count: stats.totalElementsInCategories,
                            elements: t("categories.categorySingularPlural", {
                                count: stats.totalElementsInCategories,
                            }),
                        })}
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
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* Detailed Stats */}
            {selectedView === "detailed" && showDetailedStats && (
                <div className="space-y-6">
                    {/* Top Categories */}
                    <div className="bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-100 mb-4">
                                {t(
                                    "categories.categoryStats.topCategoriesByElementCount"
                                )}
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
                            ) : stats.topCategories.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topCategories.map(
                                        (category, index) => (
                                            <div
                                                key={category.id}
                                                className="flex items-center"
                                            >
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <span className="text-sm font-medium text-gray-300 w-8">
                                                        #{index + 1}
                                                    </span>
                                                    <div
                                                        className="w-4 h-4 rounded border border-gray-300"
                                                        style={{
                                                            backgroundColor:
                                                                category.color ||
                                                                "#6B7280",
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-100 flex-1">
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <div className="flex-shrink-0 w-16 text-right">
                                                    <span className="text-sm font-medium text-gray-100">
                                                        {category.elementCount}
                                                    </span>
                                                    <span className="text-xs text-gray-300 ml-1">
                                                        {t(
                                                            "categories.categorySingularPlural",
                                                            {
                                                                count: category.elementCount,
                                                            }
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )}
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
                                            "categoryStats.noCategoriesWithElements"
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Additional Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title={t(
                                "categories.categoryStats.categoriesWithElements"
                            )}
                            value={`${stats.categoriesWithElements} / ${stats.totalCategories}`}
                            color="green"
                            subtitle={t(
                                "categories.categoryStats.percentageOfTotal",
                                {
                                    percentage:
                                        stats.totalCategories > 0
                                            ? (
                                                  (stats.categoriesWithElements /
                                                      stats.totalCategories) *
                                                  100
                                              ).toFixed(1)
                                            : 0,
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
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            }
                        />

                        <StatCard
                            title={t(
                                "categories.categoryStats.emptyCategories"
                            )}
                            value={(
                                stats.totalCategories -
                                stats.categoriesWithElements
                            ).toLocaleString()}
                            color="red"
                            subtitle={t(
                                "categories.categoryStats.noElementsAssigned"
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
                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                </svg>
                            }
                        />

                        <StatCard
                            title={t(
                                "categories.categoryStats.totalElementsInCategories"
                            )}
                            value={stats.totalElementsInCategories.toLocaleString()}
                            color="indigo"
                            subtitle={t(
                                "categories.categoryStats.acrossAllCategories"
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
                                        d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0v16a2 2 0 002 2h6a2 2 0 002-2V4m-9 0h10"
                                    />
                                </svg>
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryStats;
