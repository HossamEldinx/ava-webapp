import { API_ENDPOINTS } from "../config/api";

/**
 * Category Service - API functions for category operations
 */

// CREATE Operations
export const createCategory = async (categoryData) => {
    try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES.CREATE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(categoryData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to create category");
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating category:", error);
        throw error;
    }
};

// READ Operations
export const getCategoryById = async (categoryId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.GET_BY_ID(categoryId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch category");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching category:", error);
        throw error;
    }
};

export const getCategoriesByUser = async (userId, limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.GET_BY_USER(userId, limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch categories");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching categories by user:", error);
        throw error;
    }
};

export const getCategoryByName = async (name) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.GET_BY_NAME(name)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch category by name"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching category by name:", error);
        throw error;
    }
};

export const getAllCategories = async (limit = 100, offset = 0) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.GET_ALL(limit, offset)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch all categories"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching all categories:", error);
        throw error;
    }
};

export const getElementsByCategory = async (
    categoryId,
    limit = 100,
    offset = 0
) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.GET_ELEMENTS_BY_CATEGORY(
                categoryId,
                limit,
                offset
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch elements by category"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching elements by category:", error);
        throw error;
    }
};

// UPDATE Operations
export const updateCategory = async (categoryId, updateData) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.UPDATE(categoryId),
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to update category");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
};

// DELETE Operations
export const deleteCategory = async (categoryId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.DELETE(categoryId),
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete category");
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};

// STATS Operations
export const getTotalCategoryCount = async () => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.STATS.TOTAL_COUNT
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch category count"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching total category count:", error);
        throw error;
    }
};

export const getCategoryCountByUser = async (userId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.STATS.COUNT_BY_USER(userId)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch category count by user"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching category count by user:", error);
        throw error;
    }
};

export const getElementsCountByCategory = async (categoryId) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.STATS.ELEMENTS_COUNT_BY_CATEGORY(
                categoryId
            )
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to fetch element count by category"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching element count by category:", error);
        throw error;
    }
};

// UTILITY Operations
export const checkCategoryNameExists = async (name) => {
    try {
        const response = await fetch(
            API_ENDPOINTS.CATEGORIES.CHECK_NAME_EXISTS(name)
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || "Failed to check category name existence"
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error checking category name existence:", error);
        throw error;
    }
};

// SEARCH Operations (if needed in the future)
export const searchCategories = async (
    searchTerm,
    userId = null,
    limit = 100,
    offset = 0
) => {
    try {
        // Since there's no specific search endpoint for categories in the API config,
        // we'll implement a basic search by filtering categories on the client side
        // or you could add a search endpoint to the backend

        // For now, get all categories and filter them
        const response = userId
            ? await getCategoriesByUser(userId, 1000, 0) // Get more categories for filtering
            : await getAllCategories(1000, 0);

        const categories = response.data || response.categories || [];

        const filteredCategories = categories.filter(
            (category) =>
                category.name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (category.description &&
                    category.description
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()))
        );

        // Apply pagination to filtered results
        const startIndex = offset;
        const endIndex = startIndex + limit;
        const paginatedCategories = filteredCategories.slice(
            startIndex,
            endIndex
        );

        return {
            categories: paginatedCategories,
            count: filteredCategories.length,
            total: filteredCategories.length,
            limit,
            offset,
        };
    } catch (error) {
        console.error("Error searching categories:", error);
        throw error;
    }
};
