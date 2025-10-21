import { API_ENDPOINTS } from "../config/api";

/**
 * Element Service - API functions for element operations
 */

// CREATE Operations
export const createElement = async (elementData) => {
    try {
        const response = await fetch(API_ENDPOINTS.ELEMENTS.CREATE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(elementData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to create element");
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating element:", error);
        throw error;
    }
};

// READ Operations
export const getElementById = async (elementId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_BY_ID(elementId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch element");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element:", error);
        throw error;
    }
};

export const getElementsByUser = async (userId, limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_BY_USER(userId, limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch elements");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements by user:", error);
        throw error;
    }
};

export const getElementsByType = async (type, limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_BY_TYPE(type, limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch elements by type"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements by type:", error);
        throw error;
    }
};

export const getElementsByUserAndType = async (
    userId,
    type,
    limit = 100,
    offset = 0
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_BY_USER_AND_TYPE(
                userId,
                type,
                limit,
                offset
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch elements");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements by user and type:", error);
        throw error;
    }
};

export const searchElements = async (
    searchTerm,
    userId = null,
    limit = 100,
    offset = 0
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.SEARCH(searchTerm, userId, limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to search elements");
        }

        return await response.json();
    } catch (error) {
        console.error("Error searching elements:", error);
        throw error;
    }
};

export const getAllElements = async (limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_ALL(limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch all elements");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching all elements:", error);
        throw error;
    }
};

export const getElementsWithUserInfo = async (limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.GET_WITH_USER_INFO(limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch elements with user info"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements with user info:", error);
        throw error;
    }
};

// UPDATE Operations
export const updateElement = async (elementId, updateData) => {
    try {
        const response = await fetch(API_ENDPOINTS.ELEMENTS.UPDATE(elementId), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to update element");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating element:", error);
        throw error;
    }
};

// DELETE Operations
export const deleteElement = async (elementId) => {
    try {
        const response = await fetch(API_ENDPOINTS.ELEMENTS.DELETE(elementId), {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete element");
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting element:", error);
        throw error;
    }
};

export const deleteElementsByUser = async (userId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.DELETE_BY_USER(userId),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete elements");
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting elements by user:", error);
        throw error;
    }
};

// STATS Operations
export const getTotalElementCount = async () => {
    try {
        const response = await fetch(API_ENDPOINTS.ELEMENTS.STATS.TOTAL_COUNT);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch element count"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching total element count:", error);
        throw error;
    }
};

export const getElementCountByUser = async (userId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.STATS.COUNT_BY_USER(userId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch element count by user"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element count by user:", error);
        throw error;
    }
};

export const getElementCountByType = async (type) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.STATS.COUNT_BY_TYPE(type)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch element count by type"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element count by type:", error);
        throw error;
    }
};

export const getUniqueElementTypes = async () => {
    try {
        const response = await fetch(API_ENDPOINTS.ELEMENTS.STATS.UNIQUE_TYPES);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch unique element types"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching unique element types:", error);
        throw error;
    }
};

// UTILITY Operations
export const checkElementExists = async (elementId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENTS.CHECK_EXISTS(elementId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to check element existence"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error checking element existence:", error);
        throw error;
    }
};
