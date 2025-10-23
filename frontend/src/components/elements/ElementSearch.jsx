import React, { useState, useEffect, useCallback } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import { searchElements } from "../../services/elementService";

const ElementSearch = ({
    onSearchResults,
    currentUser = null,
    placeholder = "Search elements by name...",
    autoSearch = true,
    searchDelay = 300,
}) => {
    const { t } = useLocalization();
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState("");

    // Debounced search function
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (term) => {
            if (!term.trim()) {
                onSearchResults(null);
                return;
            }

            setIsSearching(true);
            setError("");

            try {
                const results = await searchElements(term.trim(), null);
                onSearchResults(results);

                // Add to search history
                if (term.trim() && !searchHistory.includes(term.trim())) {
                    setSearchHistory((prev) => [
                        term.trim(),
                        ...prev.slice(0, 4),
                    ]);
                }
            } catch (error) {
                console.error("Search error:", error);
                setError(
                    error.message || t("categories.elementSearch.searchFailed")
                );
                onSearchResults({
                    elements: [],
                    count: 0,
                    error: error.message,
                });
            } finally {
                setIsSearching(false);
            }
        }, searchDelay),
        [onSearchResults, searchHistory, searchDelay]
    );

    // Auto search when term changes
    useEffect(() => {
        if (autoSearch) {
            debouncedSearch(searchTerm);
        }
    }, [searchTerm, debouncedSearch, autoSearch]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setError("");
    };

    const handleManualSearch = () => {
        if (searchTerm.trim()) {
            debouncedSearch(searchTerm);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleManualSearch();
            setShowHistory(false);
        }
    };

    const handleHistorySelect = (term) => {
        setSearchTerm(term);
        setShowHistory(false);
        if (autoSearch) {
            debouncedSearch(term);
        }
    };

    const clearSearch = () => {
        setSearchTerm("");
        setError("");
        onSearchResults(null);
    };

    const clearHistory = () => {
        setSearchHistory([]);
        setShowHistory(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center space-x-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                                className="h-5 w-5 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyPress={handleKeyPress}
                            onFocus={() =>
                                setShowHistory(searchHistory.length > 0)
                            }
                            onBlur={() =>
                                setTimeout(() => setShowHistory(false), 200)
                            }
                            className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 placeholder-gray-300 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                            placeholder={t(
                                "categories.elementSearch.searchPlaceholder"
                            )}
                        />
                        {searchTerm && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <button
                                    onClick={clearSearch}
                                    className="text-gray-300 hover:text-gray-500 focus:outline-none"
                                >
                                    <svg
                                        className="h-4 w-4"
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
                        )}
                    </div>

                    {/* Search History Dropdown */}
                    {showHistory && searchHistory.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                                <span className="text-xs font-medium text-gray-300">
                                    {t(
                                        "categories.elementSearch.recentSearches"
                                    )}
                                </span>
                                <button
                                    onClick={clearHistory}
                                    className="text-xs text-gray-400 hover:text-gray-200"
                                >
                                    {t("categories.elementSearch.clearHistory")}
                                </button>
                            </div>
                            {searchHistory.map((term, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleHistorySelect(term)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 flex items-center"
                                >
                                    <svg
                                        className="h-4 w-4 text-gray-300 mr-2"
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
                                    {term}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Manual Search Button (if auto search is disabled) */}
                {!autoSearch && (
                    <button
                        onClick={handleManualSearch}
                        disabled={isSearching || !searchTerm.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSearching ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                {t("categories.elementSearch.searching")}
                            </>
                        ) : (
                            <>
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
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                {t("categories.elementSearch.searchButton")}
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Search Status */}
            <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {isSearching && (
                        <div className="flex items-center text-sm text-gray-300">
                            <svg
                                className="animate-spin h-4 w-4 mr-1"
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
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            {t("categories.elementSearch.searching")}
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center text-sm text-red-600">
                            <svg
                                className="h-4 w-4 mr-1"
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
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default ElementSearch;
