// API Configuration
const getApiBaseUrl = () => {
    // In production, use the same domain as the frontend
    if (process.env.NODE_ENV === "production") {
        return `${window.location.origin}/api`;
    }
    // In development, use localhost
    return process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
};

const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
    USERS: {
        CREATE: `${API_BASE_URL}/users/`,
        AUTHENTICATE: `${API_BASE_URL}/users/authenticate`,
        GET_BY_ID: (id) => `${API_BASE_URL}/users/${id}`,
        GET_BY_EMAIL: (email) => `${API_BASE_URL}/users/email/${email}`,
        GET_ALL: `${API_BASE_URL}/users/`,
        UPDATE: (id) => `${API_BASE_URL}/users/${id}`,
        DELETE: (id) => `${API_BASE_URL}/users/${id}`,
        SOFT_DELETE: (id) => `${API_BASE_URL}/users/${id}/soft`,
        CHECK_EMAIL: (email) => `${API_BASE_URL}/users/check-email/${email}`,
        COUNT: `${API_BASE_URL}/users/stats/count`,
    },
    ELEMENTS: {
        CREATE: `${API_BASE_URL}/elements/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/elements/${id}`,
        GET_BY_USER: (userId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/elements/user/${userId}?limit=${limit}&offset=${offset}`,
        GET_BY_TYPE: (type, limit = 100, offset = 0) =>
            `${API_BASE_URL}/elements/type/${type}?limit=${limit}&offset=${offset}`,
        GET_BY_USER_AND_TYPE: (userId, type, limit = 100, offset = 0) =>
            `${API_BASE_URL}/elements/user/${userId}/type/${type}?limit=${limit}&offset=${offset}`,
        SEARCH: (searchTerm, userId = null, limit = 100, offset = 0) => {
            const userParam = userId ? `&user_id=${userId}` : "";
            return `${API_BASE_URL}/elements/search/${searchTerm}?limit=${limit}&offset=${offset}${userParam}`;
        },
        GET_ALL: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/elements/?limit=${limit}&offset=${offset}`,
        GET_WITH_USER_INFO: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/elements/with-user-info/?limit=${limit}&offset=${offset}`,
        UPDATE: (id) => `${API_BASE_URL}/elements/${id}`,
        DELETE: (id) => `${API_BASE_URL}/elements/${id}`,
        DELETE_BY_USER: (userId) => `${API_BASE_URL}/elements/user/${userId}`,
        STATS: {
            TOTAL_COUNT: `${API_BASE_URL}/elements/stats/count`,
            COUNT_BY_USER: (userId) =>
                `${API_BASE_URL}/elements/stats/count/user/${userId}`,
            COUNT_BY_TYPE: (type) =>
                `${API_BASE_URL}/elements/stats/count/type/${type}`,
            UNIQUE_TYPES: `${API_BASE_URL}/elements/stats/types`,
        },
        CHECK_EXISTS: (id) => `${API_BASE_URL}/elements/check-exists/${id}`,
    },
    ELEMENT_REGULATIONS: {
        CREATE_LINK: `${API_BASE_URL}/element-regulations/`,
        CREATE_MULTIPLE_LINKS: `${API_BASE_URL}/element-regulations/multiple`,
        GET_BY_ID: (id) => `${API_BASE_URL}/element-regulations/${id}`,
        GET_REGULATIONS_BY_ELEMENT: (elementId) =>
            `${API_BASE_URL}/element-regulations/element/${elementId}/regulations`,
        GET_ELEMENTS_BY_REGULATION: (regulationId) =>
            `${API_BASE_URL}/element-regulations/regulation/${regulationId}/elements`,
        GET_BY_USER: (userId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/element-regulations/user/${userId}?limit=${limit}&offset=${offset}`,
        GET_ALL: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/element-regulations/?limit=${limit}&offset=${offset}`,
        DELETE_LINK: (id) => `${API_BASE_URL}/element-regulations/${id}`,
        DELETE_BY_IDS: (elementId, regulationId) =>
            `${API_BASE_URL}/element-regulations/element/${elementId}/regulation/${regulationId}`,
        DELETE_ALL_FOR_ELEMENT: (elementId) =>
            `${API_BASE_URL}/element-regulations/element/${elementId}`,
        DELETE_ALL_FOR_REGULATION: (regulationId) =>
            `${API_BASE_URL}/element-regulations/regulation/${regulationId}`,
        DELETE_MULTIPLE: (elementId) =>
            `${API_BASE_URL}/element-regulations/element/${elementId}/multiple`,
        STATS: {
            TOTAL_COUNT: `${API_BASE_URL}/element-regulations/stats/count`,
            COUNT_BY_ELEMENT: (elementId) =>
                `${API_BASE_URL}/element-regulations/stats/count/element/${elementId}`,
            COUNT_BY_REGULATION: (regulationId) =>
                `${API_BASE_URL}/element-regulations/stats/count/regulation/${regulationId}`,
            MOST_LINKED_REGULATIONS: (limit = 10) =>
                `${API_BASE_URL}/element-regulations/stats/most-linked-regulations?limit=${limit}`,
            MOST_LINKED_ELEMENTS: (limit = 10) =>
                `${API_BASE_URL}/element-regulations/stats/most-linked-elements?limit=${limit}`,
        },
        CHECK_LINK_EXISTS: (elementId, regulationId) =>
            `${API_BASE_URL}/element-regulations/check-exists/${elementId}/${regulationId}`,
    },
    REGULATIONS: {
        SEARCH: `${API_BASE_URL}/regulations/search`,
        SEARCH_UNIFIED: (query) =>
            `${API_BASE_URL}/regulations/search-unified/${encodeURIComponent(
                query
            )}`,
        GET_BY_ID: (id) => `${API_BASE_URL}/regulations/${id}`,
        GET_BY_TYPE: (type, limit = 50) =>
            `${API_BASE_URL}/regulations/by-type/${type}?limit=${limit}`,
        GET_ALL: (limit = 100) => `${API_BASE_URL}/regulations/?limit=${limit}`,
        ADD_CUSTOM_CONTENT: `${API_BASE_URL}/regulations/add-custom-content`,
    },

    CATEGORIES: {
        CREATE: `${API_BASE_URL}/categories/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/categories/${id}`,
        GET_BY_USER: (userId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/categories/user/${userId}?limit=${limit}&offset=${offset}`,
        GET_BY_NAME: (name) => `${API_BASE_URL}/categories/name/${name}`,
        GET_ALL: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/categories/?limit=${limit}&offset=${offset}`,
        UPDATE: (id) => `${API_BASE_URL}/categories/${id}`,
        DELETE: (id) => `${API_BASE_URL}/categories/${id}`,
        CHECK_NAME_EXISTS: (name) =>
            `${API_BASE_URL}/categories/check-name/${name}`,
        GET_ELEMENTS_BY_CATEGORY: (categoryId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/categories/${categoryId}/elements?limit=${limit}&offset=${offset}`,
        STATS: {
            TOTAL_COUNT: `${API_BASE_URL}/categories/stats/count`,
            COUNT_BY_USER: (userId) =>
                `${API_BASE_URL}/categories/stats/user/${userId}/count`,
            ELEMENTS_COUNT_BY_CATEGORY: (categoryId) =>
                `${API_BASE_URL}/categories/${categoryId}/elements/count`,
        },
    },

    PROJECTS: {
        CREATE: `${API_BASE_URL}/projects/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/projects/${id}`,
        GET_BY_USER: (userId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/projects/user/${userId}?limit=${limit}&offset=${offset}`,
        GET_BY_STATUS: (status, limit = 100, offset = 0) =>
            `${API_BASE_URL}/projects/status/${status}?limit=${limit}&offset=${offset}`,
        GET_BY_USER_AND_STATUS: (userId, status, limit = 100, offset = 0) =>
            `${API_BASE_URL}/projects/user/${userId}/status/${status}?limit=${limit}&offset=${offset}`,
        SEARCH: (searchTerm, userId = null, limit = 100, offset = 0) => {
            const userParam = userId ? `&user_id=${userId}` : "";
            return `${API_BASE_URL}/projects/search/${searchTerm}?limit=${limit}&offset=${offset}${userParam}`;
        },
        GET_ALL: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/projects/?limit=${limit}&offset=${offset}`,
        GET_WITH_FILE_COUNTS: (userId = null, limit = 100, offset = 0) => {
            const userParam = userId ? `&user_id=${userId}` : "";
            return `${API_BASE_URL}/projects/with-file-counts/?limit=${limit}&offset=${offset}${userParam}`;
        },
        UPDATE: (id) => `${API_BASE_URL}/projects/${id}`,
        DELETE: (id) => `${API_BASE_URL}/projects/${id}`,
        DELETE_BY_USER: (userId) => `${API_BASE_URL}/projects/user/${userId}`,
        STATS: {
            TOTAL_COUNT: `${API_BASE_URL}/projects/stats/count`,
            COUNT_BY_USER: (userId) =>
                `${API_BASE_URL}/projects/stats/count/user/${userId}`,
            COUNT_BY_STATUS: (status) =>
                `${API_BASE_URL}/projects/stats/count/status/${status}`,
            STATISTICS: (userId = null) => {
                const userParam = userId ? `?user_id=${userId}` : "";
                return `${API_BASE_URL}/projects/stats/statistics${userParam}`;
            },
        },
        CHECK_EXISTS: (id) => `${API_BASE_URL}/projects/check-exists/${id}`,
    },

    FILES: {
        CREATE: `${API_BASE_URL}/files/`,
        UPLOAD: (boqId = null) => {
            const boqParam = boqId ? `&boq_id=${boqId}` : "";
            return `${API_BASE_URL}/files/upload?${boqParam}`;
        },
        UPLOAD_ONLV_PROCESSED: (boqId = null) => {
            const boqParam = boqId ? `&boq_id=${boqId}` : "";
            return `${API_BASE_URL}/files/upload-onlv-processed?${boqParam}`;
        },
        BULK_UPLOAD: `${API_BASE_URL}/files/bulk-upload`,
        GET_BY_ID: (id) => `${API_BASE_URL}/files/${id}`,
        GET_BY_PROJECT: (
            projectId,
            includeInactive = false,
            limit = 100,
            offset = 0
        ) =>
            `${API_BASE_URL}/files/project/${projectId}?include_inactive=${includeInactive}&limit=${limit}&offset=${offset}`,
        GET_BY_TYPE: (fileType, limit = 100, offset = 0) =>
            `${API_BASE_URL}/files/type/${fileType}?limit=${limit}&offset=${offset}`,
        GET_BY_MIME_TYPE: (mimeType, limit = 100, offset = 0) =>
            `${API_BASE_URL}/files/mime-type/${encodeURIComponent(
                mimeType
            )}?limit=${limit}&offset=${offset}`,
        SEARCH: (searchTerm, projectId = null, limit = 100, offset = 0) => {
            const projectParam = projectId ? `&project_id=${projectId}` : "";
            return `${API_BASE_URL}/files/search/${searchTerm}?limit=${limit}&offset=${offset}${projectParam}`;
        },
        GET_BY_SIZE_RANGE: (
            minSize = null,
            maxSize = null,
            limit = 100,
            offset = 0
        ) => {
            const minParam = minSize !== null ? `&min_size=${minSize}` : "";
            const maxParam = maxSize !== null ? `&max_size=${maxSize}` : "";
            return `${API_BASE_URL}/files/size-range/?limit=${limit}&offset=${offset}${minParam}${maxParam}`;
        },
        GET_ALL: (includeInactive = false, limit = 100, offset = 0) =>
            `${API_BASE_URL}/files/?include_inactive=${includeInactive}&limit=${limit}&offset=${offset}`,
        GET_WITH_PROJECT_INFO: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/files/with-project-info/?limit=${limit}&offset=${offset}`,
        UPDATE: (id) => `${API_BASE_URL}/files/${id}`,
        DEACTIVATE: (id) => `${API_BASE_URL}/files/${id}/deactivate`,
        REACTIVATE: (id) => `${API_BASE_URL}/files/${id}/reactivate`,
        DELETE: (id) => `${API_BASE_URL}/files/${id}`,
        DELETE_BY_PROJECT: (projectId) =>
            `${API_BASE_URL}/files/project/${projectId}`,
        BULK_DEACTIVATE: `${API_BASE_URL}/files/bulk-deactivate`,
        DOWNLOAD: (id) => `${API_BASE_URL}/files/${id}/download`,
        DELETE_FROM_STORAGE: (id) => `${API_BASE_URL}/files/${id}/storage`,
        GET_PUBLIC_URL: (id, expiresIn = null) => {
            const expiresParam = expiresIn ? `?expires_in=${expiresIn}` : "";
            return `${API_BASE_URL}/files/${id}/public-url${expiresParam}`;
        },
        STATS: {
            TOTAL_COUNT: (includeInactive = false) =>
                `${API_BASE_URL}/files/stats/count?include_inactive=${includeInactive}`,
            COUNT_BY_PROJECT: (projectId, includeInactive = false) =>
                `${API_BASE_URL}/files/stats/count/project/${projectId}?include_inactive=${includeInactive}`,
            COUNT_BY_TYPE: (fileType) =>
                `${API_BASE_URL}/files/stats/count/type/${fileType}`,
            UNIQUE_TYPES: `${API_BASE_URL}/files/stats/types`,
            UNIQUE_MIME_TYPES: `${API_BASE_URL}/files/stats/mime-types`,
            STATISTICS: (projectId = null) => {
                const projectParam = projectId
                    ? `?project_id=${projectId}`
                    : "";
                return `${API_BASE_URL}/files/stats/statistics${projectParam}`;
            },
        },
        CHECK_EXISTS: (id) => `${API_BASE_URL}/files/check-exists/${id}`,
        STORAGE: {
            LIST: (projectId = null, limit = 100, offset = 0) => {
                const projectParam = projectId
                    ? `&project_id=${projectId}`
                    : "";
                return `${API_BASE_URL}/files/storage/list/?limit=${limit}&offset=${offset}${projectParam}`;
            },
            CREATE_BUCKET: `${API_BASE_URL}/files/storage/bucket`,
            GET_BUCKET_INFO: (bucketName) =>
                `${API_BASE_URL}/files/storage/bucket/${bucketName}`,
        },
    },

    BOQS: {
        CREATE: `${API_BASE_URL}/boqs/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/boqs/${id}`,
        GET_BY_PROJECT: (projectId, limit = 100, offset = 0) =>
            `${API_BASE_URL}/boqs/project/${projectId}?limit=${limit}&offset=${offset}`,
        SEARCH: (searchTerm, projectId = null, limit = 100, offset = 0) => {
            const projectParam = projectId ? `&project_id=${projectId}` : "";
            return `${API_BASE_URL}/boqs/search/name?search_term=${encodeURIComponent(
                searchTerm
            )}&limit=${limit}&offset=${offset}${projectParam}`;
        },
        GET_ALL: (limit = 100, offset = 0) =>
            `${API_BASE_URL}/boqs/?limit=${limit}&offset=${offset}`,
        GET_WITH_FILE_COUNTS: (projectId = null, limit = 100, offset = 0) => {
            const projectParam = projectId ? `&project_id=${projectId}` : "";
            return `${API_BASE_URL}/boqs/with-file-counts/all?limit=${limit}&offset=${offset}${projectParam}`;
        },
        UPDATE: (id) => `${API_BASE_URL}/boqs/${id}`,
        DELETE: (id) => `${API_BASE_URL}/boqs/${id}`,
        DELETE_BY_PROJECT: (projectId) =>
            `${API_BASE_URL}/boqs/project/${projectId}`,
        GET_FILES: (boqId, includeInactive = false, limit = 100, offset = 0) =>
            `${API_BASE_URL}/boqs/${boqId}/files?include_inactive=${includeInactive}&limit=${limit}&offset=${offset}`,
        DELETE_BOQ: (id) => `${API_BASE_URL}/boqs/${id}`,
        STATS: {
            TOTAL_COUNT: `${API_BASE_URL}/boqs/statistics/total`,
            COUNT_BY_PROJECT: (projectId) =>
                `${API_BASE_URL}/boqs/project/${projectId}/count`,
        },
        CHECK_EXISTS: (id) => `${API_BASE_URL}/boqs/${id}/exists`,
    },

    CHAT: {
        GET_ONLV_EMPTY_JSON: (projectId = null, boqId = null) => {
            const params = new URLSearchParams();
            if (projectId) params.append("project_id", projectId);
            if (boqId) params.append("boq_id", boqId);
            const queryString = params.toString();
            return `${API_BASE_URL}/utils/onlv-empty-json${
                queryString ? `?${queryString}` : ""
            }`;
        },
        GEMINI_QUERY: `${API_BASE_URL}/utils/unified-search`, // Updated to use unified search
        SMART_CHAT: `${API_BASE_URL}/smart-chat/`, // New intelligent chat endpoint
    },

    UTILS: {
        GET_ONLV_EMPTY_JSON: (projectId = null, boqId = null) => {
            const params = new URLSearchParams();
            if (projectId) params.append("project_id", projectId);
            if (boqId) params.append("boq_id", boqId);
            const queryString = params.toString();
            return `${API_BASE_URL}/utils/onlv-empty-json${
                queryString ? `?${queryString}` : ""
            }`;
        },
        FILTER_ENTITY: `${API_BASE_URL}/utils/filter-entity`,
        FETCH_AND_FILTER_LG_BY_POSITION_NUMBERS: `${API_BASE_URL}/utils/fetch-lg-positions`,
        FETCH_AND_FILTER_ULG_BY_POSITION_NUMBERS: `${API_BASE_URL}/utils/fetch-ulg-positions`,
        UNIFIED_SEARCH: `${API_BASE_URL}/utils/unified-search`, // New endpoint for unified search
        HEALTH_CHECK: `${API_BASE_URL}/utils/health`,
    },

    PDF: {
        PARSE: `${API_BASE_URL}/pdf/parse`,
        EXTRACT_WALLS: `${API_BASE_URL}/pdf/extract/walls`,
        PARSE_SIMPLE: `${API_BASE_URL}/pdf/parse/simple`,
        PARSE_COMPREHENSIVE: `${API_BASE_URL}/pdf/parse/comprehensive`,
        EXTRACT_TEXT_ONLY: `${API_BASE_URL}/pdf/extract/text-only`,
        UPLOAD_AND_ENRICH: `${API_BASE_URL}/pdf/upload-and-enrich`,
        ENRICH_WALLS: (pdfId, userId) =>
            `${API_BASE_URL}/pdf/enrich-walls/${pdfId}?user_id=${userId}`,
        ENRICH_WALLS_BATCH: `${API_BASE_URL}/pdf/enrich-walls-batch`,
        HEALTH: `${API_BASE_URL}/pdf/health`,
        INFO: `${API_BASE_URL}/pdf/info`,
    },

    STEPS: {
        STEP_ONE: (boqId) => `${API_BASE_URL}/steps/step-one/${boqId}`,
        STEP_TWO: (boqId) => `${API_BASE_URL}/steps/step-two/${boqId}`,
        STEP_THREE: (userId) => `${API_BASE_URL}/steps/step-three/${userId}`,
        STEP_FOUR: `${API_BASE_URL}/steps/step-four/`,
        STEP_FIVE: `${API_BASE_URL}/steps/step-five/`,
    },

    CUSTOM_POSITIONS: {
        CHECK_NR_EXISTS: (nr) =>
            `${API_BASE_URL}/custom_positions/check_nr_existence/${nr}`,
        CREATE: `${API_BASE_URL}/custom_positions/create`,
        LIST: (
            entityType = null,
            lgNr = null,
            ulgNr = null,
            grundtextNr = null
        ) => {
            const params = new URLSearchParams();
            if (entityType) params.append("entity_type", entityType);
            if (lgNr) params.append("lg_nr", lgNr);
            if (ulgNr) params.append("ulg_nr", ulgNr);
            if (grundtextNr) params.append("grundtext_nr", grundtextNr);
            const queryString = params.toString();
            return `${API_BASE_URL}/custom_positions/list${
                queryString ? `?${queryString}` : ""
            }`;
        },
        DELETE: (id) => `${API_BASE_URL}/custom_positions/${id}`,
    },

    PROMPT_TESTS: {
        CREATE: `${API_BASE_URL}/prompt-tests/`,
        GET_ALL: `${API_BASE_URL}/prompt-tests/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/prompt-tests/${id}`,
        UPDATE: (id) => `${API_BASE_URL}/prompt-tests/${id}`,
        DELETE: (id) => `${API_BASE_URL}/prompt-tests/${id}`,
    },

    COST_CLAIMS: {
        CREATE: `${API_BASE_URL}/cost-claims/`,
        GET_ALL: `${API_BASE_URL}/cost-claims/`,
        GET_BY_ID: (id) => `${API_BASE_URL}/cost-claims/${id}`,
        UPDATE: (id) => `${API_BASE_URL}/cost-claims/${id}`,
        DELETE: (id) => `${API_BASE_URL}/cost-claims/${id}`,
    },
};

export default API_BASE_URL;
