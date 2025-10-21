import { API_ENDPOINTS } from "../config/api";

/**
 * Regulation Service - API functions for regulation operations
 */

// SEARCH Operations
export const searchRegulations = async (
    query,
    matchThreshold = 0.7,
    matchCount = 20
) => {
    try {
        const response = await fetch(API_ENDPOINTS.REGULATIONS.SEARCH, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: query,
                match_threshold: matchThreshold,
                match_count: matchCount,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to search regulations");
        }

        return await response.json();
    } catch (error) {
        console.error("Error searching regulations:", error);
        throw error;
    }
};

export const searchRegulationsUnified = async (query) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.REGULATIONS.SEARCH_UNIFIED(query),
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to perform unified search"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error performing unified search:", error);
        throw error;
    }
};

// READ Operations
export const getRegulationById = async (regulationId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.REGULATIONS.GET_BY_ID(regulationId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch regulation");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching regulation:", error);
        throw error;
    }
};

export const getRegulationsByType = async (type, limit = 50) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.REGULATIONS.GET_BY_TYPE(type, limit)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch regulations by type"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching regulations by type:", error);
        throw error;
    }
};

export const getAllRegulations = async (limit = 100) => {
    try {
        const response = await fetch(API_ENDPOINTS.REGULATIONS.GET_ALL(limit));

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch all regulations"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching all regulations:", error);
        throw error;
    }
};

// UTILITY Functions
export const formatRegulationDisplay = (regulation) => {
    const {
        entity_type,
        lg_nr,
        ulg_nr,
        grundtext_nr,
        position_nr,
        searchable_text,
    } = regulation;

    let displayText = "";
    let identifier = "";

    // Build identifier based on entity type
    switch (entity_type) {
        case "LG":
            identifier = `LG ${lg_nr}`;
            break;
        case "ULG":
            identifier = `ULG ${lg_nr}.${ulg_nr}`;
            break;
        case "Grundtext":
            identifier = `GT ${lg_nr}.${ulg_nr}.${grundtext_nr}`;
            break;
        case "UngeteiltePosition":
            identifier = `UP ${lg_nr}.${ulg_nr}.${grundtext_nr}.${position_nr}`;
            break;
        case "Folgeposition":
            identifier = `FP ${lg_nr}.${ulg_nr}.${grundtext_nr}.${position_nr}`;
            break;
        default:
            identifier = `${entity_type}`;
    }

    // Truncate searchable text for display
    const maxTextLength = 100;
    const truncatedText =
        searchable_text.length > maxTextLength
            ? searchable_text.substring(0, maxTextLength) + "..."
            : searchable_text;

    displayText = `${identifier}: ${truncatedText}`;

    return {
        identifier,
        displayText,
        fullText: searchable_text,
    };
};

export const getEntityTypeDisplayName = (entityType) => {
    const entityTypeMap = {
        LG: "Hauptgruppe",
        ULG: "Untergruppe",
        Grundtext: "Grundlegende Regel",
        UngeteiltePosition: "Einzelne Position",
        Folgeposition: "Folgeposition",
    };

    return entityTypeMap[entityType] || entityType;
};
