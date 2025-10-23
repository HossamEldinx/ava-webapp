import React, { useState, useEffect, useCallback } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import CategoryCard from "./CategoryCard";
import CategoryForm from "./CategoryForm";
import CategorySearch from "./CategorySearch";
import CategoryFilters from "./CategoryFilters";
import CategoryStats from "./CategoryStats";
import ElementList from "./ElementList";
import {
    getAllCategories,
    getCategoriesByUser,
    createCategory,
    updateCategory,
    deleteCategory,
    getElementsCountByCategory,
} from "../../services/categoryService";

const CategoryList = ({ currentUser = null }) => {
    const { t } = useLocalization();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [currentView, setCurrentView] = useState("list"); // list, stats, elements
    const [showForm, setShowForm] = useState(false);
    const [selectedCategoryForElements, setSelectedCategoryForElements] =
        useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [filters, setFilters] = useState({
        userId: "",
        sortBy: "created_at",
        sortOrder: "desc",
    });
    const [pagination, setPagination] = useState({
        limit: 20,
        currentPage: 1,
        totalPages: 0,
        totalCategories: 0,
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Load categories based on current filters and pagination
    const loadCategories = useCallback(
        async (page = 1, limit = 20) => {
            // Prevent multiple simultaneous calls
            if (isLoading) return;

            setIsLoading(true);
            setError("");

            try {
                const offset = (page - 1) * limit;
                let response;

                // Determine which API call to make based on filters
                if (filters.userId) {
                    response = await getCategoriesByUser(
                        filters.userId,
                        limit,
                        offset
                    );
                } else {
                    response = await getAllCategories(limit, offset);
                }

                const newCategories =
                    response.data || response.categories || [];

                // Load element counts for each category
                const categoriesWithCounts = await Promise.all(
                    newCategories.map(async (category) => {
                        try {
                            const countResponse =
                                await getElementsCountByCategory(category.id);
                            return {
                                ...category,
                                element_count:
                                    countResponse.total_elements || 0,
                            };
                        } catch (error) {
                            console.warn(
                                `Failed to load element count for category ${category.id}:`,
                                error
                            );
                            return {
                                ...category,
                                element_count: 0,
                            };
                        }
                    })
                );

                // Sort categories based on filters
                const sortedCategories = sortCategories(
                    categoriesWithCounts,
                    filters.sortBy,
                    filters.sortOrder
                );

                setCategories(sortedCategories);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: page,
                    totalPages: Math.ceil(
                        (response.count || response.total || 0) / limit
                    ),
                    totalCategories: response.count || response.total || 0,
                }));
            } catch (error) {
                console.error("Error loading categories:", error);
                setError(error.message || "Failed to load categories");
                setCategories([]);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: 1,
                    totalPages: 0,
                    totalCategories: 0,
                }));
            } finally {
                setIsLoading(false);
                setIsInitialLoad(false);
            }
        },
        [filters.userId, filters.sortBy, filters.sortOrder]
    );

    // Sort categories utility function
    const sortCategories = useCallback((categories, sortBy, sortOrder) => {
        return [...categories].sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            // Handle date sorting
            if (sortBy === "created_at" || sortBy === "updated_at") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            // Handle string sorting
            if (typeof aValue === "string") {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortOrder === "desc") {
                return bValue > aValue ? 1 : -1;
            } else {
                return aValue > bValue ? 1 : -1;
            }
        });
    }, []);

    // Initial load - only trigger when filters change or refresh is triggered
    useEffect(() => {
        loadCategories(1, pagination.limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadCategories, refreshTrigger]);

    // Show loading skeleton only on initial load or when we have no categories
    const shouldShowLoadingSkeleton =
        isInitialLoad || (isLoading && categories.length === 0);

    // Handle search results
    const handleSearchResults = useCallback(
        async (results) => {
            setSearchResults(results);
            if (results && results.categories) {
                // Load element counts for search results
                const categoriesWithCounts = await Promise.all(
                    results.categories.map(async (category) => {
                        try {
                            const countResponse =
                                await getElementsCountByCategory(category.id);
                            return {
                                ...category,
                                element_count:
                                    countResponse.total_elements || 0,
                            };
                        } catch (error) {
                            return {
                                ...category,
                                element_count: 0,
                            };
                        }
                    })
                );

                const sortedCategories = sortCategories(
                    categoriesWithCounts,
                    filters.sortBy,
                    filters.sortOrder
                );
                setCategories(sortedCategories);
            } else if (results === null) {
                // Clear search, reload normal results
                loadCategories(1, pagination.limit);
            }
        },
        [
            setSearchResults,
            sortCategories,
            filters.sortBy,
            filters.sortOrder,
            setCategories,
            loadCategories,
            pagination.limit,
        ]
    );

    // Handle filter changes
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters((prevFilters) => {
            if (
                prevFilters.userId === newFilters.userId &&
                prevFilters.sortBy === newFilters.sortBy &&
                prevFilters.sortOrder === newFilters.sortOrder
            ) {
                return prevFilters;
            }
            return newFilters;
        });
        setSearchResults(null); // Clear search when filters change
    }, []);

    // CRUD Operations
    const handleCreateCategory = async (categoryData) => {
        try {
            await createCategory(categoryData);
            setShowForm(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (error) {
            throw error; // Let the form handle the error
        }
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleUpdateCategory = async (categoryData) => {
        try {
            await updateCategory(editingCategory.id, categoryData);
            setShowForm(false);
            setEditingCategory(null);
            setRefreshTrigger((prev) => prev + 1);
        } catch (error) {
            throw error; // Let the form handle the error
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        try {
            await deleteCategory(categoryId);
            setRefreshTrigger((prev) => prev + 1);
            // Remove from selected categories if it was selected
            setSelectedCategories((prev) =>
                prev.filter((id) => id !== categoryId)
            );
        } catch (error) {
            setError(error.message || "Failed to delete category");
        }
    };

    const handleViewElements = (category) => {
        setSelectedCategoryForElements(category);
        setCurrentView("elements");
    };

    const handleBackToCategories = () => {
        setSelectedCategoryForElements(null);
        setCurrentView("list");
    };

    // Selection handling
    const handleCategorySelect = (categoryId, isSelected) => {
        if (isSelected) {
            setSelectedCategories((prev) => [...prev, categoryId]);
        } else {
            setSelectedCategories((prev) =>
                prev.filter((id) => id !== categoryId)
            );
        }
    };

    const handleSelectAll = () => {
        if (selectedCategories.length === categories.length) {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(categories.map((cat) => cat.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCategories.length === 0) return;

        if (
            window.confirm(
                t("categories.deleteConfirm", {
                    count: selectedCategories.length,
                })
            )
        ) {
            try {
                await Promise.all(
                    selectedCategories.map((id) => deleteCategory(id))
                );
                setSelectedCategories([]);
                setRefreshTrigger((prev) => prev + 1);
            } catch (error) {
                setError("Failed to delete some categories");
            }
        }
    };

    // Handle page changes
    const handlePageChange = (newPage) => {
        if (!isLoading && newPage >= 1 && newPage <= pagination.totalPages) {
            loadCategories(newPage, pagination.limit);
        }
    };

    const handlePreviousPage = () => {
        if (pagination.currentPage > 1) {
            handlePageChange(pagination.currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (pagination.currentPage < pagination.totalPages) {
            handlePageChange(pagination.currentPage + 1);
        }
    };

    const displayedCategories = searchResults ? categories : categories;
    const isSearchActive = searchResults !== null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-5 py-5">
            {/* Header - Only show when not in elements view */}
            {currentView !== "elements" && (
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-100">
                                {t("categories.title")}
                            </h1>
                            <p className="mt-1 text-sm text-gray-300">
                                {t("categories.subtitle")}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* View Toggle */}
                            <div className="flex rounded-md shadow-sm">
                                <button
                                    onClick={() => setCurrentView("list")}
                                    className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                                        currentView === "list"
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                                    }`}
                                >
                                    <svg
                                        className="h-4 w-4 mr-2 inline"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                        />
                                    </svg>
                                    {t("categories.list")}
                                </button>
                                <button
                                    onClick={() => setCurrentView("stats")}
                                    className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                                        currentView === "stats"
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                                    }`}
                                >
                                    <svg
                                        className="h-4 w-4 mr-2 inline"
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
                                    {t("categories.stats")}
                                </button>
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={() => {
                                    setEditingCategory(null);
                                    setShowForm(true);
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg
                                    className="h-4 w-4 mr-2"
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
                                {t("categories.createCategory")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Elements View */}
            {currentView === "elements" && selectedCategoryForElements && (
                <ElementList
                    currentUser={currentUser}
                    categoryId={selectedCategoryForElements.id}
                    categoryName={selectedCategoryForElements.name}
                    onBackToCategories={handleBackToCategories}
                />
            )}

            {/* Stats View */}
            {currentView === "stats" && (
                <CategoryStats
                    currentUser={currentUser}
                    refreshTrigger={refreshTrigger}
                />
            )}

            {/* List View */}
            {currentView === "list" && (
                <>
                    {/* Search and Filters */}
                    <div className="mb-6 space-y-4">
                        <CategorySearch
                            onSearchResults={handleSearchResults}
                            currentUser={currentUser}
                        />
                        <CategoryFilters
                            onFiltersChange={handleFiltersChange}
                            currentUser={currentUser}
                            initialFilters={filters}
                        />
                    </div>

                    {/* Bulk Actions */}
                    {selectedCategories.length > 0 && (
                        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-md p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-indigo-900">
                                        {t("categories.selected", {
                                            count: selectedCategories.length,
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {selectedCategories.length ===
                                        categories.length
                                            ? t("categories.deselectAll")
                                            : t("categories.selectAll")}
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        {t("categories.deleteSelected")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
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
                                    <p className="text-sm text-red-800">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Info */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            {isSearchActive
                                ? searchResults?.count > 0
                                    ? t("categories.found", {
                                          count: searchResults.count,
                                          category: t(
                                              "categories.categorySingularPlural",
                                              { count: searchResults.count }
                                          ),
                                      })
                                    : t("categories.noCategories")
                                : pagination.totalCategories > 0
                                ? t("categories.showing", {
                                      current: displayedCategories.length,
                                      total: pagination.totalCategories,
                                      category: t(
                                          "categories.categorySingularPlural",
                                          { count: pagination.totalCategories }
                                      ),
                                  })
                                : t("categories.noCategories")}
                        </div>
                        {!isSearchActive && pagination.totalPages > 1 && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={
                                        pagination.currentPage === 1 ||
                                        isLoading
                                    }
                                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    {t("categories.previous")}
                                </button>
                                <span className="text-sm text-gray-300">
                                    {t("categories.page")}{" "}
                                    {pagination.currentPage}{" "}
                                    {t("categories.of")} {pagination.totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={
                                        pagination.currentPage ===
                                            pagination.totalPages || isLoading
                                    }
                                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    {t("categories.next")}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Categories List */}
                    {shouldShowLoadingSkeleton ? (
                        <div className="space-y-0">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-800/50 h-16 rounded-lg"></div>
                                </div>
                            ))}
                        </div>
                    ) : displayedCategories.length > 0 ? (
                        <div className="space-y-0">
                            {displayedCategories.map((category) => (
                                <CategoryCard
                                    key={category.id}
                                    category={category}
                                    onEdit={handleEditCategory}
                                    onDelete={handleDeleteCategory}
                                    onViewElements={handleViewElements}
                                    isSelected={selectedCategories.includes(
                                        category.id
                                    )}
                                    onSelect={handleCategorySelect}
                                    showUserInfo={!filters.userId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
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
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-100">
                                {t("categories.noCategories")}
                            </h3>
                            <p className="mt-1 text-sm text-gray-300">
                                {isSearchActive
                                    ? t("categories.noSearchResults")
                                    : t("categories.noCategoriesDescription")}
                            </p>
                            {!isSearchActive && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setShowForm(true);
                                        }}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <svg
                                            className="h-4 w-4 mr-2"
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
                                        {t("categories.createCategory")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Category Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-gray-900">
                        <CategoryForm
                            category={editingCategory}
                            onSubmit={
                                editingCategory
                                    ? handleUpdateCategory
                                    : handleCreateCategory
                            }
                            onCancel={() => {
                                setShowForm(false);
                                setEditingCategory(null);
                            }}
                            currentUser={currentUser}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryList;
