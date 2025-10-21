import { API_ENDPOINTS } from "../config/api";

/**
 * Element Regulation Service - API functions for element-regulation relationship operations
 */

// CREATE Operations
export const createElementRegulationLink = async (elementId, regulationId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.CREATE_LINK,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    element_id: elementId,
                    regulation_id: regulationId,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to create element-regulation link"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating element-regulation link:", error);
        throw error;
    }
};

export const createMultipleElementRegulationLinks = async (
    elementId,
    regulationIds
) => {
    try {
        console.log("🔍 Creating multiple element-regulation links:");
        console.log("  - Element ID:", elementId);
        console.log("  - Regulation IDs:", regulationIds);
        console.log(
            "  - API Endpoint:",
            API_ENDPOINTS.ELEMENT_REGULATIONS.CREATE_MULTIPLE_LINKS
        );

        const requestBody = {
            element_id: elementId,
            regulation_ids: regulationIds,
        };

        console.log("  - Request body:", requestBody);

        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.CREATE_MULTIPLE_LINKS,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            }
        );

        console.log("  - Response status:", response.status);
        console.log("  - Response ok:", response.ok);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("  - Error response:", errorData);
            throw new Error(
                errorData.detail || "Failed to create element-regulation links"
            );
        }

        const result = await response.json();
        console.log("  - Success response:", result);
        return result;
    } catch (error) {
        console.error(
            "Error creating multiple element-regulation links:",
            error
        );
        throw error;
    }
};

// READ Operations
export const getElementRegulationLinkById = async (linkId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.GET_BY_ID(linkId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch element-regulation link"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element-regulation link:", error);
        throw error;
    }
};

export const getRegulationsByElement = async (elementId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.GET_REGULATIONS_BY_ELEMENT(
                elementId
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch regulations for element"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching regulations by element:", error);
        throw error;
    }
};

export const getElementsByRegulation = async (regulationId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.GET_ELEMENTS_BY_REGULATION(
                regulationId
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch elements for regulation"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements by regulation:", error);
        throw error;
    }
};

export const getElementRegulationLinksByUser = async (
    userId,
    limit = 100,
    offset = 0
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.GET_BY_USER(userId, limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail ||
                    "Failed to fetch element-regulation links by user"
            );
        }

        return await response.json();
    } catch (error) {
        console.error(
            "Error fetching element-regulation links by user:",
            error
        );
        throw error;
    }
};

export const getAllElementRegulationLinks = async (limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.GET_ALL(limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail ||
                    "Failed to fetch all element-regulation links"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching all element-regulation links:", error);
        throw error;
    }
};

// DELETE Operations
export const deleteElementRegulationLink = async (linkId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.DELETE_LINK(linkId),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to delete element-regulation link"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting element-regulation link:", error);
        throw error;
    }
};

export const deleteElementRegulationLinkByIds = async (
    elementId,
    regulationId
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.DELETE_BY_IDS(
                elementId,
                regulationId
            ),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to delete element-regulation link"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting element-regulation link by IDs:", error);
        throw error;
    }
};

export const deleteAllLinksForElement = async (elementId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.DELETE_ALL_FOR_ELEMENT(elementId),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to delete all links for element"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting all links for element:", error);
        throw error;
    }
};

export const deleteAllLinksForRegulation = async (regulationId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.DELETE_ALL_FOR_REGULATION(
                regulationId
            ),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to delete all links for regulation"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting all links for regulation:", error);
        throw error;
    }
};

export const deleteMultipleElementRegulationLinks = async (
    elementId,
    regulationIds
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.DELETE_MULTIPLE(elementId),
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(regulationIds),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail ||
                    "Failed to delete multiple element-regulation links"
            );
        }

        return await response.json();
    } catch (error) {
        console.error(
            "Error deleting multiple element-regulation links:",
            error
        );
        throw error;
    }
};

// STATS Operations
export const getTotalElementRegulationLinkCount = async () => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.STATS.TOTAL_COUNT
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch total link count"
            );
        }

        return await response.json();
    } catch (error) {
        console.error(
            "Error fetching total element-regulation link count:",
            error
        );
        throw error;
    }
};

export const getRegulationCountForElement = async (elementId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.STATS.COUNT_BY_ELEMENT(elementId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail ||
                    "Failed to fetch regulation count for element"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching regulation count for element:", error);
        throw error;
    }
};

export const getElementCountForRegulation = async (regulationId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.STATS.COUNT_BY_REGULATION(
                regulationId
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail ||
                    "Failed to fetch element count for regulation"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element count for regulation:", error);
        throw error;
    }
};

export const getMostLinkedRegulations = async (limit = 10) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.STATS.MOST_LINKED_REGULATIONS(
                limit
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch most linked regulations"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching most linked regulations:", error);
        throw error;
    }
};

export const getMostLinkedElements = async (limit = 10) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.STATS.MOST_LINKED_ELEMENTS(limit)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch most linked elements"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching most linked elements:", error);
        throw error;
    }
};

// UTILITY Operations
export const checkElementRegulationLinkExists = async (
    elementId,
    regulationId
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.ELEMENT_REGULATIONS.CHECK_LINK_EXISTS(
                elementId,
                regulationId
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to check link existence"
            );
        }

        return await response.json();
    } catch (error) {
        console.error(
            "Error checking element-regulation link existence:",
            error
        );
        throw error;
    }
};
