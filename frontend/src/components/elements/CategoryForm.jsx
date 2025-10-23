import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";

const CategoryForm = ({
    category = null,
    onSubmit,
    onCancel,
    onSuccess,
    isLoading = false,
    currentUser = null,
}) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "",
        user_id: currentUser?.id || "",
    });
    const [errors, setErrors] = useState({});

    const isEditMode = !!category;

    // Load form data when category changes
    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || "",
                description: category.description || "",
                color: category.color || "",
                user_id: category.user_id || currentUser?.id || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                color: "",
                user_id: currentUser?.id || "",
            });
        }
        setErrors({});
    }, [category, currentUser]);

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

    const handleColorChange = (color) => {
        setFormData((prev) => ({ ...prev, color }));
        if (errors.color) {
            setErrors((prev) => ({ ...prev, color: "" }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = t("categories.categoryForm.errors.nameRequired");
        } else if (formData.name.trim().length < 2) {
            newErrors.name = t("categories.categoryForm.errors.nameMinLength");
        } else if (formData.name.trim().length > 100) {
            newErrors.name = t("categories.categoryForm.errors.nameMaxLength");
        }

        // Description validation
        if (formData.description && formData.description.length > 500) {
            newErrors.description = t(
                "categories.categoryForm.errors.descriptionMaxLength"
            );
        }

        // Color validation (optional, but if provided should be valid hex)
        if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
            newErrors.color = t("categories.categoryForm.errors.colorInvalid");
        }

        // User ID validation
        if (!formData.user_id) {
            newErrors.user_id = t(
                "categories.categoryForm.errors.userIdRequired"
            );
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
            description: formData.description.trim() || null,
            color: formData.color.trim() || null,
            user_id: formData.user_id,
        };

        try {
            await onSubmit(submitData);
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            // Handle server-side validation errors
            if (error.message && error.message.includes("name")) {
                setErrors((prev) => ({ ...prev, name: error.message }));
            } else if (error.message && error.message.includes("description")) {
                setErrors((prev) => ({ ...prev, description: error.message }));
            } else {
                setErrors((prev) => ({ ...prev, general: error.message }));
            }
        }
    };

    const presetColors = [
        "#EF4444", // Red
        "#F97316", // Orange
        "#EAB308", // Yellow
        "#22C55E", // Green
        "#06B6D4", // Cyan
        "#3B82F6", // Blue
        "#8B5CF6", // Purple
        "#EC4899", // Pink
        "#6B7280", // Gray
        "#000000", // Black
    ];

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-gray-100">
                    {isEditMode
                        ? t("categories.categoryForm.editTitle")
                        : t("categories.categoryForm.createTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-300">
                    {isEditMode
                        ? t("categories.categoryForm.editSubtitle")
                        : t("categories.categoryForm.createSubtitle")}
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

                {/* Category Name */}
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.categoryForm.nameLabel")} *
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
                            "categories.categoryForm.namePlaceholder"
                        )}
                        disabled={isLoading}
                        maxLength={100}
                    />
                    <div className="mt-1 flex justify-between">
                        <span className="text-xs text-gray-400">
                            {t("categories.categoryForm.characterCount", {
                                current: formData.name.length,
                                max: 100,
                            })}
                        </span>
                        {errors.name && (
                            <p className="text-sm text-red-600">
                                {errors.name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t("categories.categoryForm.descriptionLabel")}
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                            errors.description
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-600 focus:border-indigo-500"
                        }`}
                        placeholder={t(
                            "categories.categoryForm.descriptionPlaceholder"
                        )}
                        disabled={isLoading}
                        maxLength={500}
                    />
                    <div className="mt-1 flex justify-between">
                        <span className="text-xs text-gray-400">
                            {t("categories.categoryForm.characterCount", {
                                current: formData.description.length,
                                max: 500,
                            })}
                        </span>
                        {errors.description && (
                            <p className="text-sm text-red-600">
                                {errors.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Color Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                        {t("categories.categoryForm.colorLabel")}
                    </label>

                    {/* Preset Colors */}
                    <div className="grid grid-cols-10 gap-2 mb-3">
                        {presetColors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => handleColorChange(color)}
                                className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
                                    formData.color === color
                                        ? "border-white scale-110"
                                        : "border-gray-600 hover:border-gray-400"
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                                disabled={isLoading}
                            />
                        ))}
                    </div>

                    {/* Custom Color Input */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="color"
                            value={formData.color || "#000000"}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-12 h-8 border border-gray-600 rounded cursor-pointer bg-gray-700"
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100 ${
                                errors.color
                                    ? "border-red-300 focus:border-red-500"
                                    : "border-gray-600 focus:border-indigo-500"
                            }`}
                            placeholder="#FF5733"
                            disabled={isLoading}
                        />
                        {formData.color && (
                            <button
                                type="button"
                                onClick={() => handleColorChange("")}
                                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-200"
                                disabled={isLoading}
                            >
                                {t("categories.categoryForm.clearColor")}
                            </button>
                        )}
                    </div>

                    {/* Color Preview */}
                    {formData.color && (
                        <div className="mt-2 flex items-center space-x-2">
                            <div
                                className="w-6 h-6 rounded border border-gray-300"
                                style={{ backgroundColor: formData.color }}
                            />
                            <span className="text-sm text-gray-300">
                                {t("categories.categoryForm.selectedColor")}:{" "}
                                {formData.color}
                            </span>
                        </div>
                    )}

                    {errors.color && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.color}
                        </p>
                    )}
                </div>

                {/* User Info (if editing and showing user info) */}
                {currentUser && (
                    <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                    {currentUser.name
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-100">
                                    {currentUser.name ||
                                        t(
                                            "categories.categoryForm.currentUser"
                                        )}
                                </p>
                                <p className="text-xs text-gray-300">
                                    {t(
                                        "categories.categoryForm.categoryForUser"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-600">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    >
                        {t("categories.categoryForm.cancelButton")}
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
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                {isEditMode
                                    ? t("categories.categoryForm.updating")
                                    : t("categories.categoryForm.creating")}
                            </>
                        ) : isEditMode ? (
                            t("categories.categoryForm.updateButton")
                        ) : (
                            t("categories.categoryForm.createButton")
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;
