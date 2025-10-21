import React, { useState, useEffect, useCallback } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import ElementCard from "./ElementCard";
import ElementForm from "./ElementForm";
import ElementSearch from "./ElementSearch";
import ElementFilters from "./ElementFilters";
import ElementStats from "./ElementStats";
import ElementRegulationLinks from "./ElementRegulationLinks";
import {
    getAllElements,
    getElementsByUser,
    getElementsByType,
    getElementsByUserAndType,
    createElement,
    updateElement,
    deleteElement,
} from "../../services/elementService";
import { getElementsByCategory } from "../../services/categoryService";

const ElementList = ({
    currentUser = null,
    categoryId = null,
    categoryName = null,
    onBackToCategories = null,
}) => {
    const { t } = useLocalization();
    console.log("Elemnts list", t("categories.elements.errorLoading"));
    const [elements, setElements] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState("");
    const [selectedElements, setSelectedElements] = useState([]);
    const [currentView, setCurrentView] = useState("list"); // list, stats
    const [showForm, setShowForm] = useState(false);
    const [editingElement, setEditingElement] = useState(null);
    const [showRegulationLinks, setShowRegulationLinks] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [filters, setFilters] = useState({
        type: "",
        userId: "",
        categoryId: categoryId || "",
        sortBy: "created_at",
        sortOrder: "desc",
    });
    const [pagination, setPagination] = useState({
        limit: 20,
        currentPage: 1,
        totalPages: 0,
        totalElements: 0,
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Load elements based on current filters and pagination
    const loadElements = useCallback(
        async (page = 1, limit = 20) => {
            // Prevent multiple simultaneous calls
            if (isLoading) return;

            setIsLoading(true);
            setError("");

            try {
                const offset = (page - 1) * limit;
                let response;

                // Determine which API call to make based on filters
                if (filters.categoryId) {
                    response = await getElementsByCategory(
                        filters.categoryId,
                        limit,
                        offset
                    );
                } else if (filters.userId && filters.type) {
                    response = await getElementsByUserAndType(
                        filters.userId,
                        filters.type,
                        limit,
                        offset
                    );
                } else if (filters.userId) {
                    response = await getElementsByUser(
                        filters.userId,
                        limit,
                        offset
                    );
                } else if (filters.type) {
                    response = await getElementsByType(
                        filters.type,
                        limit,
                        offset
                    );
                } else {
                    response = await getAllElements(limit, offset);
                }

                const newElements = response.elements || [];
                // Get total count based on the API endpoint used
                let totalCount = 0;
                if (response.total_elements !== undefined) {
                    totalCount = response.total_elements; // from get_all_elements
                } else if (response.total_elements_for_user !== undefined) {
                    totalCount = response.total_elements_for_user; // from get_elements_by_user
                } else if (response.total_elements_of_type !== undefined) {
                    totalCount = response.total_elements_of_type; // from get_elements_by_type
                } else {
                    totalCount = response.count || 0; // fallback for search, user+type, and category
                }

                // Sort elements based on filters
                const sortedElements = sortElements(
                    newElements,
                    filters.sortBy,
                    filters.sortOrder
                );

                setElements(sortedElements);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalElements: totalCount,
                }));
            } catch (error) {
                console.error(t("categories.elements.errorLoading"), error);
                setError(
                    error.message || t("categories.elements.failedToLoad")
                );
                setElements([]);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: 1,
                    totalPages: 0,
                    totalElements: 0,
                }));
            } finally {
                setIsLoading(false);
                setIsInitialLoad(false);
            }
        },
        [
            filters.userId,
            filters.type,
            filters.categoryId,
            filters.sortBy,
            filters.sortOrder,
        ]
    );

    // Sort elements utility function
    const sortElements = useCallback((elements, sortBy, sortOrder) => {
        return [...elements].sort((a, b) => {
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
    }, []); // No dependencies as it's a pure sorting function

    // Initial load - only trigger when filters change or refresh is triggered
    useEffect(() => {
        loadElements(1, pagination.limit);
    }, [loadElements, refreshTrigger]);

    // Show loading skeleton only on initial load or when we have no elements
    const shouldShowLoadingSkeleton =
        isInitialLoad || (isLoading && elements.length === 0);

    // Handle search results
    const handleSearchResults = useCallback(
        (results) => {
            setSearchResults(results);
            if (results && results.elements) {
                const sortedElements = sortElements(
                    results.elements,
                    filters.sortBy,
                    filters.sortOrder
                );
                setElements(sortedElements);
            } else if (results === null) {
                // Clear search, reload normal results
                loadElements(1, pagination.limit);
            }
        },
        [
            setSearchResults,
            sortElements,
            filters.sortBy,
            filters.sortOrder,
            setElements,
            loadElements,
            pagination.limit,
        ]
    );

    // Handle filter changes
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters((prevFilters) => {
            // Perform a shallow comparison to avoid unnecessary re-renders
            if (
                prevFilters.type === newFilters.type &&
                prevFilters.userId === newFilters.userId &&
                prevFilters.categoryId === newFilters.categoryId &&
                prevFilters.sortBy === newFilters.sortBy &&
                prevFilters.sortOrder === newFilters.sortOrder
            ) {
                return prevFilters; // No change in filter values, return previous state
            }
            return newFilters; // Filter values have changed, update state
        });
        setSearchResults(null); // Clear search when filters change
    }, []);

    // CRUD Operations
    const handleCreateElement = async (elementData) => {
        try {
            // Check if element was already created by the form component
            if (elementData._alreadyCreated) {
                // Element was already created, just close modal and refresh
                console.log(t("categories.elements.duplicateCreation"));
            } else {
                // Create element normally
                await createElement(elementData);
            }
            setShowForm(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (error) {
            throw error; // Let the form handle the error
        }
    };

    const handleEditElement = (element) => {
        setEditingElement(element);
        setShowForm(true);
    };

    const handleUpdateElement = async (elementData) => {
        try {
            await updateElement(editingElement.id, elementData);
            setShowForm(false);
            setEditingElement(null);
            setRefreshTrigger((prev) => prev + 1);
        } catch (error) {
            throw error; // Let the form handle the error
        }
    };

    const handleDeleteElement = async (elementId) => {
        try {
            await deleteElement(elementId);
            setRefreshTrigger((prev) => prev + 1);
            // Remove from selected elements if it was selected
            setSelectedElements((prev) =>
                prev.filter((id) => id !== elementId)
            );
        } catch (error) {
            setError(error.message || t("categories.elements.failedToDelete"));
        }
    };

    const handleViewRegulations = (element) => {
        setShowRegulationLinks(element);
    };

    const handleRegulationLinksUpdated = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    // Handler for when a regulation link is deleted from ElementCard
    const handleRegulationDeleted = (elementId, regulationId) => {
        // Update the element's regulation_count in the local state
        setElements((prevElements) =>
            prevElements.map((el) =>
                el.id === elementId
                    ? {
                          ...el,
                          regulation_count: Math.max(
                              0,
                              (el.regulation_count || 0) - 1
                          ),
                      }
                    : el
            )
        );
    };

    // Selection handling
    const handleElementSelect = (elementId, isSelected) => {
        if (isSelected) {
            setSelectedElements((prev) => [...prev, elementId]);
        } else {
            setSelectedElements((prev) =>
                prev.filter((id) => id !== elementId)
            );
        }
    };

    const handleSelectAll = () => {
        if (selectedElements.length === elements.length) {
            setSelectedElements([]);
        } else {
            setSelectedElements(elements.map((el) => el.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedElements.length === 0) return;

        if (
            window.confirm(
                t("categories.elements.confirmDeleteBulk", {
                    count: selectedElements.length,
                })
            )
        ) {
            try {
                await Promise.all(
                    selectedElements.map((id) => deleteElement(id))
                );
                setSelectedElements([]);
                setRefreshTrigger((prev) => prev + 1);
            } catch (error) {
                setError(t("categories.elements.failedToDeleteSome"));
            }
        }
    };

    // Handle page changes
    const handlePageChange = (newPage) => {
        if (!isLoading && newPage >= 1 && newPage <= pagination.totalPages) {
            loadElements(newPage, pagination.limit);
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

    const displayedElements = searchResults ? elements : elements;
    const isSearchActive = searchResults !== null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {/* Back Button and Title */}
                    <div className="flex items-center space-x-4">
                        {onBackToCategories && (
                            <button
                                onClick={onBackToCategories}
                                className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                                {t("categories.elements.backToCategories")}
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-100">
                                {categoryName
                                    ? t("categories.elements.titleInCategory", {
                                          categoryName,
                                      })
                                    : t("categories.elements.title")}
                            </h1>
                        </div>
                    </div>

                    {/* View Toggle and Create Button */}
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
                                {t("categories.elements.viewList")}
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
                                {t("categories.elements.viewStats")}
                            </button>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={() => {
                                setEditingElement(null);
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
                            {t("categories.elements.createElement")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats View */}
            {currentView === "stats" && (
                <ElementStats
                    currentUser={currentUser}
                    refreshTrigger={refreshTrigger}
                />
            )}

            {/* List View */}
            {currentView === "list" && (
                <>
                    {/* Search and Filters */}
                    <div className="mb-6 space-y-4">
                        <ElementSearch
                            onSearchResults={handleSearchResults}
                            currentUser={currentUser}
                        />
                        <ElementFilters
                            onFiltersChange={handleFiltersChange}
                            currentUser={currentUser}
                            initialFilters={filters}
                        />
                    </div>

                    {/* Bulk Actions */}
                    {selectedElements.length > 0 && (
                        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-md p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-indigo-900">
                                        {t(
                                            "categories.elements.selectedCount",
                                            {
                                                count: selectedElements.length,
                                            }
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {selectedElements.length ===
                                        elements.length
                                            ? t(
                                                  "categories.elements.deselectAll"
                                              )
                                            : t(
                                                  "categories.elements.selectAll"
                                              )}
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        {t(
                                            "categories.elements.deleteSelected"
                                        )}
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
                                    ? t("categories.elements.foundCount", {
                                          count: searchResults.count,
                                      })
                                    : t("categories.elements.noElementsFound")
                                : pagination.totalElements > 0
                                ? t("categories.elements.showingCount", {
                                      current: displayedElements.length,
                                      total: pagination.totalElements,
                                  })
                                : t("categories.elements.noElementsFound")}
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
                                    {t("categories.elements.previousPage")}
                                </button>
                                <span className="text-sm text-gray-300">
                                    {t("categories.elements.pageOfTotal", {
                                        current: pagination.currentPage,
                                        total: pagination.totalPages,
                                    })}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={
                                        pagination.currentPage ===
                                            pagination.totalPages || isLoading
                                    }
                                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    {t("categories.elements.nextPage")}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Elements List - Full Width Rows */}
                    {shouldShowLoadingSkeleton ? (
                        <div className="space-y-0">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-800/50 h-16 rounded-lg"></div>
                                </div>
                            ))}
                        </div>
                    ) : displayedElements.length > 0 ? (
                        <div className="space-y-0">
                            {displayedElements.map((element) => (
                                <ElementCard
                                    key={element.id}
                                    element={element}
                                    onEdit={handleEditElement}
                                    onDelete={handleDeleteElement}
                                    onViewRegulations={handleViewRegulations}
                                    onRegulationDeleted={
                                        handleRegulationDeleted
                                    }
                                    isSelected={selectedElements.includes(
                                        element.id
                                    )}
                                    onSelect={handleElementSelect}
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
                                {t("categories.elements.noElements")}
                            </h3>
                            <p className="mt-1 text-sm text-gray-300">
                                {isSearchActive
                                    ? t(
                                          "categories.elements.noElementsSearchAdjust"
                                      )
                                    : t(
                                          "categories.elements.noElementsCreatePrompt"
                                      )}
                            </p>
                            {!isSearchActive && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => {
                                            setEditingElement(null);
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
                                        {t("categories.elements.createElement")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Element Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-gray-900">
                        <ElementForm
                            element={editingElement}
                            onSubmit={
                                editingElement
                                    ? handleUpdateElement
                                    : handleCreateElement
                            }
                            onCancel={() => {
                                setShowForm(false);
                                setEditingElement(null);
                            }}
                            currentUser={currentUser}
                        />
                    </div>
                </div>
            )}

            {/* Regulation Links Modal */}
            {showRegulationLinks && (
                <ElementRegulationLinks
                    element={showRegulationLinks}
                    onClose={() => setShowRegulationLinks(null)}
                    onLinksUpdated={handleRegulationLinksUpdated}
                />
            )}
        </div>
    );
};

export default ElementList;
