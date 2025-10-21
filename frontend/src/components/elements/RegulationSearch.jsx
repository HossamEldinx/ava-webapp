import React, { useState, useEffect, useRef } from "react";
import {
    searchRegulations,
    searchRegulationsUnified,
    formatRegulationDisplay,
    getEntityTypeDisplayName,
} from "../../services/regulationService";

const RegulationSearch = ({
    selectedRegulations = [],
    onRegulationSelect,
    onRegulationRemove,
    isDisabled = false,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState("");
    const searchTimeoutRef = useRef(null);
    const resultsRef = useRef(null);

    // Handle search with debouncing
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchTerm.trim().length >= 6) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchTerm.trim());
            }, 500);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm]);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                resultsRef.current &&
                !resultsRef.current.contains(event.target)
            ) {
                setShowResults(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const performSearch = async (query) => {
        setIsSearching(true);
        setError("");

        try {
            const response = await searchRegulationsUnified(query);
            // Handle the unified search response format
            const results = response.results || [];
            setSearchResults(results);
            setShowResults(true);
        } catch (error) {
            console.error("Error searching regulations:", error);
            setError("Failed to search regulations. Please try again.");
            setSearchResults([]);
            setShowResults(false);
        } finally {
            setIsSearching(false);
        }
    };

    const handleRegulationClick = (regulation) => {
        // Check if regulation is already selected
        const isAlreadySelected = selectedRegulations.some(
            (selected) => selected.id === regulation.id
        );

        if (!isAlreadySelected) {
            onRegulationSelect(regulation);
        }

        // Clear search and hide results
        setSearchTerm("");
        setSearchResults([]);
        setShowResults(false);
    };

    const handleRemoveRegulation = (regulationId) => {
        onRegulationRemove(regulationId);
    };

    const getRegulationBadgeColor = (entityType) => {
        const colors = {
            LG: "bg-blue-100 text-blue-800",
            ULG: "bg-green-100 text-green-800",
            Grundtext: "bg-yellow-100 text-yellow-800",
            UngeteiltePosition: "bg-purple-100 text-purple-800",
            Folgeposition: "bg-pink-100 text-pink-800",
        };
        return colors[entityType] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative" ref={resultsRef}>
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 border-gray-600 focus:border-indigo-500"
                        placeholder="Search for regulations (e.g., '003901C', 'LG 00', 'wall construction', etc.)"
                        disabled={isDisabled}
                    />
                    {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <svg
                                className="animate-spin h-4 w-4 text-gray-300"
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
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map((regulation) => {
                            const { identifier, displayText } =
                                formatRegulationDisplay(regulation);
                            const isSelected = selectedRegulations.some(
                                (selected) => selected.id === regulation.id
                            );

                            return (
                                <div
                                    key={regulation.id}
                                    onClick={() =>
                                        handleRegulationClick(regulation)
                                    }
                                    className={`px-3 py-2 cursor-pointer hover:bg-gray-700 border-b border-gray-600 last:border-b-0 ${
                                        isSelected
                                            ? "bg-gray-700 opacity-50"
                                            : ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="text-sm font-medium text-gray-200">
                                                    {regulation.full_nr}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 truncate">
                                                {regulation.short_text ||
                                                    regulation.searchable_text}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="ml-2 text-green-400 text-sm">
                                                ✓ Selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* No Results Message */}
                {showResults && searchResults.length === 0 && !isSearching && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-300">
                            No regulations found for "{searchTerm}"
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-red-50 p-4">
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

            {/* Selected Regulations */}
            {selectedRegulations.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Selected Regulations ({selectedRegulations.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRegulations.map((regulation) => {
                            return (
                                <div
                                    key={regulation.id}
                                    className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-200">
                                            {regulation.full_nr}
                                        </p>
                                        <p className="text-xs text-gray-300 truncate">
                                            {regulation.short_text}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleRemoveRegulation(
                                                regulation.id
                                            )
                                        }
                                        className="ml-3 text-red-300 hover:text-red-200 focus:outline-none"
                                        disabled={isDisabled}
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
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegulationSearch;
