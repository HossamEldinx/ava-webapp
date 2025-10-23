import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import {
    getUniqueElementTypes,
    createElement,
} from "../../services/elementService";
import {
    createMultipleElementRegulationLinks,
    getRegulationsByElement,
    deleteElementRegulationLinkByIds,
} from "../../services/elementRegulationService";
import { getCategoriesByUser } from "../../services/categoryService";
import RegulationSearch from "./RegulationSearch";

const ElementForm = ({
    element = null,
    onSubmit,
    onCancel,
    onSuccess, // Optional callback for successful operations
    isLoading = false,
    currentUser = null,
}) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({
        name: "",
        type: "",
        description: "",
        user_id: currentUser?.id || "",
        category_id: "",
    });
    const [errors, setErrors] = useState({});
    const [availableTypes, setAvailableTypes] = useState([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    const [showCustomType, setShowCustomType] = useState(false);
    const [customType, setCustomType] = useState("");
    const [selectedRegulations, setSelectedRegulations] = useState([]);
    const [regulationSearches, setRegulationSearches] = useState([
        { id: 1, regulations: [] },
    ]);
    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [existingRegulations, setExistingRegulations] = useState([]);
    const [isLoadingExistingRegulations, setIsLoadingExistingRegulations] =
        useState(false);
    const [deletingRegulationId, setDeletingRegulationId] = useState(null);

    const isEditMode = !!element;

    // Load form data when element changes
    useEffect(() => {
        if (element) {
            setFormData({
                name: element.name || "",
                type: element.type || "",
                description: element.description || "",
                user_id: element.user_id || currentUser?.id || "",
                category_id: element.category_id || "",
            });
        } else {
            setFormData({
                name: "",
                type: "",
                description: "",
                user_id: currentUser?.id || "",
                category_id: "",
            });
        }
        setErrors({});
        // Clear selected regulations when form is reset
        setSelectedRegulations([]);
        // Reset regulation searches to single empty search
        setRegulationSearches([{ id: 1, regulations: [] }]);
    }, [element, currentUser]);

    // Load available types
    useEffect(() => {
        const loadTypes = async () => {
            setIsLoadingTypes(true);
            try {
                const response = await getUniqueElementTypes();
                setAvailableTypes(response.element_types || []);
            } catch (error) {
                console.error("Error loading element types:", error);
                setAvailableTypes([]);
            } finally {
                setIsLoadingTypes(false);
            }
        };

        loadTypes();
    }, []);

    // Load categories for current user
    useEffect(() => {
        const loadCategories = async () => {
            if (!currentUser?.id) return;

            setIsLoadingCategories(true);
            try {
                const response = await getCategoriesByUser(currentUser.id);
                setCategories(response.data || response.categories || []);
            } catch (error) {
                console.error("Error loading categories:", error);
                setCategories([]);
            } finally {
                setIsLoadingCategories(false);
            }
        };

        loadCategories();
    }, [currentUser?.id]);

    // Load existing regulations when in edit mode
    useEffect(() => {
        const loadExistingRegulations = async () => {
            if (!isEditMode || !element?.id) {
                setExistingRegulations([]);
                return;
            }

            setIsLoadingExistingRegulations(true);
            try {
                const response = await getRegulationsByElement(element.id);
                if (response && response.regulations) {
                    setExistingRegulations(response.regulations);
                }
            } catch (error) {
                console.error("Error loading existing regulations:", error);
                setExistingRegulations([]);
            } finally {
                setIsLoadingExistingRegulations(false);
            }
        };

        loadExistingRegulations();
    }, [isEditMode, element?.id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const handleTypeChange = (e) => {
        const value = e.target.value;
        if (value === "custom") {
            setShowCustomType(true);
            setFormData((prev) => ({ ...prev, type: "" }));
        } else {
            setShowCustomType(false);
            setCustomType("");
            setFormData((prev) => ({ ...prev, type: value }));
        }

        if (errors.type) {
            setErrors((prev) => ({ ...prev, type: "" }));
        }
    };

    const handleCustomTypeChange = (e) => {
        const value = e.target.value;
        setCustomType(value);
        setFormData((prev) => ({ ...prev, type: value }));

        if (errors.type) {
            setErrors((prev) => ({ ...prev, type: "" }));
        }
    };

    // Format position number for display (e.g., "001101G")
    const formatPositionNumber = (regulation) => {
        const parts = [];

        if (regulation.regulations?.lg_nr) {
            parts.push(String(regulation.regulations.lg_nr).padStart(2, "0"));
        }
        if (regulation.regulations?.ulg_nr) {
            parts.push(String(regulation.regulations.ulg_nr).padStart(2, "0"));
        }
        if (regulation.regulations?.grundtext_nr) {
            parts.push(
                String(regulation.regulations.grundtext_nr).padStart(2, "0")
            );
        }
        if (regulation.regulations?.position_nr) {
            parts.push(regulation.regulations.position_nr);
        }

        return parts.join("");
    };

    // Handler for deleting existing regulation links in edit mode
    const handleDeleteExistingRegulation = async (regulation) => {
        const positionNumber = formatPositionNumber(regulation);
        if (
            window.confirm(
                `Remove position ${positionNumber} from ${element.name}?`
            )
        ) {
            setDeletingRegulationId(regulation.regulation_id);
            try {
                await deleteElementRegulationLinkByIds(
                    element.id,
                    regulation.regulation_id
                );

                // Update local state by removing the deleted regulation
                setExistingRegulations((prev) =>
                    prev.filter(
                        (pos) => pos.regulation_id !== regulation.regulation_id
                    )
                );

                console.log("Regulation link deleted successfully");
            } catch (error) {
                console.error("Error deleting regulation link:", error);
                alert("Failed to delete regulation link. Please try again.");
            } finally {
                setDeletingRegulationId(null);
            }
        }
    };

    // Functions for handling multiple regulation searches
    const addRegulationSearch = () => {
        const newId =
            Math.max(...regulationSearches.map((search) => search.id)) + 1;
        setRegulationSearches((prev) => [
            ...prev,
            { id: newId, regulations: [] },
        ]);
    };

    const removeRegulationSearch = (searchId) => {
        if (regulationSearches.length > 1) {
            setRegulationSearches((prev) => {
                const updated = prev.filter((search) => search.id !== searchId);
                // Update selectedRegulations to remove regulations from deleted search
                const remainingRegulations = updated.flatMap(
                    (search) => search.regulations
                );
                setSelectedRegulations(remainingRegulations);
                return updated;
            });
        }
    };

    const handleRegulationSelectForSearch = (searchId, regulation) => {
        setRegulationSearches((prev) =>
            prev.map((search) => {
                if (search.id === searchId) {
                    // Check if regulation is already selected in this search
                    const isAlreadySelected = search.regulations.some(
                        (selected) => selected.id === regulation.id
                    );
                    if (!isAlreadySelected) {
                        const updatedRegulations = [
                            ...search.regulations,
                            regulation,
                        ];
                        return { ...search, regulations: updatedRegulations };
                    }
                }
                return search;
            })
        );
    };

    const handleRegulationRemoveForSearch = (searchId, regulationId) => {
        setRegulationSearches((prev) =>
            prev.map((search) => {
                if (search.id === searchId) {
                    const updatedRegulations = search.regulations.filter(
                        (regulation) => regulation.id !== regulationId
                    );
                    return { ...search, regulations: updatedRegulations };
                }
                return search;
            })
        );
    };

    // Update selectedRegulations whenever regulationSearches changes
    useEffect(() => {
        // Combine all regulations from all searches, avoiding duplicates
        const allRegulations = regulationSearches.flatMap(
            (search) => search.regulations
        );
        const uniqueRegulations = allRegulations.filter(
            (regulation, index, self) =>
                index === self.findIndex((r) => r.id === regulation.id)
        );
        setSelectedRegulations(uniqueRegulations);
    }, [regulationSearches]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = t("categories.elementForm.errors.nameRequired");
        } else if (formData.name.trim().length < 2) {
            newErrors.name = t("categories.elementForm.errors.nameMinLength");
        }

        if (!formData.type.trim()) {
            newErrors.type = t("categories.elementForm.errors.typeRequired");
        } else if (formData.type.trim().length < 2) {
            newErrors.type = t("categories.elementForm.errors.typeMinLength");
        }

        if (!formData.user_id) {
            newErrors.user_id = t(
                "categories.elementForm.errors.userIdRequired"
            );
        }

        if (formData.description && formData.description.length > 1000) {
            newErrors.description = t(
                "categories.elementForm.errors.descriptionMaxLength"
            );
        }

        // Validate regulations if any are selected
        if (selectedRegulations.length > 0) {
            // Check for duplicate regulations
            const regulationIds = selectedRegulations.map((reg) => reg.id);
            const uniqueIds = [...new Set(regulationIds)];
            if (regulationIds.length !== uniqueIds.length) {
                newErrors.regulations = t(
                    "categories.elementForm.errors.duplicateRegulations"
                );
            }

            // Check if regulations are valid
            const invalidRegulations = selectedRegulations.filter(
                (reg) => !reg.id || !reg.entity_type
            );
            if (invalidRegulations.length > 0) {
                newErrors.regulations = t(
                    "categories.elementForm.errors.invalidRegulations"
                );
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const submitData = {
            name: formData.name.trim(),
            type: formData.type.trim(),
            description: formData.description.trim() || null,
            user_id: formData.user_id,
            category_id: formData.category_id || null,
        };

        try {
            let elementId = null;

            if (isEditMode) {
                // For edit mode, use the existing onSubmit handler
                await onSubmit(submitData);
                elementId = element.id; // Use the existing element ID
                console.log(
                    "🔍 Edit mode - using existing element ID:",
                    elementId
                );
            } else {
                // For create mode, create the element directly to get the ID
                console.log("🔍 Create mode - creating element directly");
                const elementResult = await createElement(submitData);
                console.log("🔍 Element creation result:", elementResult);

                // The backend returns: { message: "...", element: { id: "...", ... } }
                if (elementResult?.element?.id) {
                    elementId = elementResult.element.id;
                } else if (elementResult?.data?.id) {
                    elementId = elementResult.data.id;
                } else if (elementResult?.id) {
                    elementId = elementResult.id;
                }

                console.log("🔍 Extracted element ID:", elementId);

                // For create mode, we handle everything here including UI updates
                // No need to call parent's onSubmit as it would create a duplicate element
                // The parent will be notified through the successful completion of this function
            }

            // If we have selected regulations and an element ID, create the links
            if (selectedRegulations.length > 0 && elementId) {
                try {
                    const regulationIds = selectedRegulations.map(
                        (reg) => reg.id
                    );

                    console.log("🔍 Regulation IDs to link:", regulationIds);

                    const linkResult =
                        await createMultipleElementRegulationLinks(
                            elementId,
                            regulationIds
                        );

                    console.log("🔍 Link creation result:", linkResult);

                    console.log(
                        `✅ Successfully linked ${selectedRegulations.length} regulations to element ${elementId}`
                    );
                } catch (linkError) {
                    console.error(
                        "Error creating element-regulation links:",
                        linkError
                    );
                    // Don't fail the entire operation if links fail, just log the error
                    setErrors((prev) => ({
                        ...prev,
                        general: t(
                            "categories.elementForm.errors.failedToLinkRegulations",
                            {
                                status: isEditMode ? "updated" : "created",
                                errorMessage: linkError.message,
                            }
                        ),
                    }));
                }
            } else if (selectedRegulations.length > 0 && !elementId) {
                console.warn(
                    "⚠️ Regulations selected but no element ID available"
                );
                setErrors((prev) => ({
                    ...prev,
                    general: t(
                        "categories.elementForm.errors.noElementIdForRegulations",
                        {
                            status: isEditMode ? "updated" : "created",
                        }
                    ),
                }));
            } else {
                console.log(
                    "ℹ️ No regulations selected, skipping link creation"
                );
            }

            // For create mode, we don't call parent's onSubmit as it would create a duplicate
            // The parent component should handle UI updates (like closing modal) through other means
            // or we can add a separate callback for completion notification

            console.log(
                "✅ Element creation completed successfully. Element ID:",
                elementId
            );

            // For create mode, notify parent that element was created successfully
            // Pass a flag to prevent duplicate creation in parent component
            if (onSubmit && !isEditMode) {
                try {
                    // Pass the created element data with a flag indicating it's already created
                    await onSubmit({
                        ...submitData,
                        id: elementId,
                        regulations: selectedRegulations,
                        _alreadyCreated: true, // Flag to indicate element is already created
                    });
                } catch (parentError) {
                    console.warn(
                        "Parent onSubmit notification failed, but element was created successfully:",
                        parentError
                    );
                }
            }

            console.log(
                "✅ Element creation and regulation linking completed successfully"
            );
        } catch (error) {
            console.error("Error submitting form:", error);
            // Handle server-side validation errors
            if (error.message.includes("name")) {
                setErrors((prev) => ({ ...prev, name: error.message }));
            } else if (error.message.includes("type")) {
                setErrors((prev) => ({ ...prev, type: error.message }));
            } else {
                setErrors((prev) => ({ ...prev, general: error.message }));
            }
        }
    };

    const commonTypes = [
        "wall",
        "ceiling",
        "floor",
        "foundation",
        "beam",
        "column",
        "door",
        "window",
        "roof",
        "concrete",
        "steel",
        "wood",
        "brick",
        "drywall",
        "insulation",
        "paint",
        "electrical",
        "plumbing",
        "hvac",
    ];

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-gray-100">
                    {isEditMode
                        ? t("categories.elementForm.editTitle")
                        : t("categories.elementForm.createTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-300">
                    {isEditMode
                        ? t("categories.elementForm.editSubtitle")
                        : t("categories.elementForm.createSubtitle")}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
                {/* General Error */}
                {errors.general && (
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
                                <p className="text-sm text-red-800">
                                    {errors.general}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Element Name */}
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.elementForm.elementNameLabel")}
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                            errors.name
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-600 focus:border-indigo-500"
                        }`}
                        placeholder={t(
                            "categories.elementForm.elementNamePlaceholder"
                        )}
                        disabled={isLoading}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* Element Type */}
                <div>
                    <label
                        htmlFor="type"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.elementForm.elementTypeLabel")}
                    </label>
                    <select
                        id="type"
                        value={showCustomType ? "custom" : formData.type}
                        onChange={handleTypeChange}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                            errors.type
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-600 focus:border-indigo-500"
                        }`}
                        disabled={isLoading || isLoadingTypes}
                    >
                        <option value="">
                            {t("categories.elementForm.selectElementType")}
                        </option>

                        {/* Common Types */}
                        <optgroup
                            label={t("categories.elementForm.commonTypes")}
                        >
                            {commonTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() +
                                        type.slice(1)}
                                </option>
                            ))}
                        </optgroup>

                        {/* Existing Types from Database */}
                        {availableTypes.length > 0 && (
                            <optgroup
                                label={t(
                                    "categories.elementForm.existingTypes"
                                )}
                            >
                                {availableTypes
                                    .filter(
                                        (type) =>
                                            !commonTypes.includes(
                                                type.toLowerCase()
                                            )
                                    )
                                    .map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                            </optgroup>
                        )}

                        <option value="custom">
                            {t("categories.elementForm.customType")}
                        </option>
                    </select>

                    {/* Custom Type Input */}
                    {showCustomType && (
                        <input
                            type="text"
                            value={customType}
                            onChange={handleCustomTypeChange}
                            className={`mt-2 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                                errors.type
                                    ? "border-red-300 focus:border-red-500"
                                    : "border-gray-600 focus:border-indigo-500"
                            }`}
                            placeholder={t(
                                "categories.elementForm.enterCustomType"
                            )}
                            disabled={isLoading}
                        />
                    )}

                    {errors.type && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.type}
                        </p>
                    )}
                </div>

                {/* Category */}
                <div>
                    <label
                        htmlFor="category"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.elementForm.categoryLabel")}
                    </label>
                    <select
                        id="category"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                            errors.category_id
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-600 focus:border-indigo-500"
                        }`}
                        disabled={isLoading || isLoadingCategories}
                    >
                        <option value="">
                            {t("categories.elementForm.selectCategory")}
                        </option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    {isLoadingCategories && (
                        <p className="mt-1 text-sm text-gray-400">
                            {t("categories.elementForm.loadingCategories")}
                        </p>
                    )}
                    {errors.category_id && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.category_id}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.elementForm.descriptionLabel")}
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={2}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                            errors.description
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-600 focus:border-indigo-500"
                        }`}
                        placeholder={t(
                            "categories.elementForm.descriptionPlaceholder"
                        )}
                        disabled={isLoading}
                    />
                    <p className="mt-1 text-sm text-gray-300">
                        {t("categories.elementForm.characterCount", {
                            current: formData.description.length,
                            max: 1000,
                        })}
                    </p>
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.description}
                        </p>
                    )}
                </div>

                {/* Existing Linked Positions (Edit Mode Only) */}
                {isEditMode && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t(
                                "categories.elementForm.currentlyLinkedPositions"
                            )}
                        </label>
                        {isLoadingExistingRegulations ? (
                            <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-700 rounded-lg p-4">
                                <svg
                                    className="animate-spin h-4 w-4"
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
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>
                                    {t(
                                        "categories.elementForm.loadingExistingPositions"
                                    )}
                                </span>
                            </div>
                        ) : existingRegulations.length > 0 ? (
                            <div className="bg-gray-700 rounded-lg p-4">
                                <div className="flex flex-wrap gap-2">
                                    {existingRegulations.map((regulation) => {
                                        const positionNumber =
                                            formatPositionNumber(regulation);
                                        const isDeleting =
                                            deletingRegulationId ===
                                            regulation.regulation_id;

                                        return (
                                            <div
                                                key={regulation.regulation_id}
                                                className="group inline-flex items-center space-x-1 bg-indigo-900/30 hover:bg-indigo-900/40 rounded transition-all duration-200"
                                            >
                                                <span className="text-sm font-mono text-indigo-300 px-2 py-1">
                                                    {positionNumber}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteExistingRegulation(
                                                            regulation
                                                        )
                                                    }
                                                    disabled={
                                                        isDeleting || isLoading
                                                    }
                                                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-r transition-all duration-200 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                    title={t(
                                                        "categories.elementForm.removePosition",
                                                        { positionNumber }
                                                    )}
                                                >
                                                    {isDeleting ? (
                                                        <svg
                                                            className="animate-spin w-3 h-3"
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
                                                            />
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            />
                                                        </svg>
                                                    ) : (
                                                        <svg
                                                            className="w-3 h-3"
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
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-700 rounded-lg p-4 text-sm text-gray-400">
                                {t("categories.elementForm.noPositionsLinked")}
                            </div>
                        )}
                    </div>
                )}

                {/* Multiple Regulation Searches */}
                <div className="space-y-4">
                    {/* Help Text */}
                    <div className="text-xs text-gray-300">
                        <p>{t("categories.elementForm.searchTipsTitle")}</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>{t("categories.elementForm.searchTip1")}</li>
                            <li>{t("categories.elementForm.searchTip2")}</li>
                            <li>{t("categories.elementForm.searchTip3")}</li>
                            <li>{t("categories.elementForm.searchTip4")}</li>
                        </ul>
                    </div>

                    {regulationSearches.map((search, index) => (
                        <div key={search.id} className="space-y-3">
                            {/* Header with title and remove button outside the box */}
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-300">
                                    {t(
                                        "categories.elementForm.regulationSearchTitle",
                                        {
                                            index: index + 1,
                                        }
                                    )}
                                </h4>
                                {regulationSearches.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeRegulationSearch(search.id)
                                        }
                                        className="text-red-300 hover:text-red-200 focus:outline-none"
                                        disabled={isLoading}
                                    >
                                        <svg
                                            className="w-4 h-4"
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
                                )}
                            </div>

                            {/* Regulation Search Component - no border/background box */}
                            <RegulationSearch
                                selectedRegulations={search.regulations}
                                onRegulationSelect={(regulation) =>
                                    handleRegulationSelectForSearch(
                                        search.id,
                                        regulation
                                    )
                                }
                                onRegulationRemove={(regulationId) =>
                                    handleRegulationRemoveForSearch(
                                        search.id,
                                        regulationId
                                    )
                                }
                                isDisabled={isLoading}
                            />
                        </div>
                    ))}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={addRegulationSearch}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-300 bg-indigo-600 bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        >
                            <svg
                                className="w-4 h-4 mr-1"
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
                            {t("categories.elementForm.addAnotherRegulation")}
                        </button>
                    </div>
                    {/* Summary of All Selected Regulations */}
                    {selectedRegulations.length > 0 && (
                        <div className="bg-gray-700 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">
                                {t(
                                    "categories.elementForm.allSelectedRegulations",
                                    {
                                        count: selectedRegulations.length,
                                    }
                                )}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedRegulations.map((regulation) => (
                                    <span
                                        key={regulation.id}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                    >
                                        {regulation.full_nr}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regulation Validation Error */}
                    {errors.regulations && (
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
                                    <p className="text-sm text-red-800">
                                        {errors.regulations}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-600">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    >
                        {t("categories.elementForm.cancelButton")}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? (
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
                                {isEditMode
                                    ? t("categories.elementForm.updating")
                                    : t("categories.elementForm.creating")}
                            </>
                        ) : isEditMode ? (
                            t("categories.elementForm.updateButton")
                        ) : (
                            t("categories.elementForm.createButton")
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ElementForm;
