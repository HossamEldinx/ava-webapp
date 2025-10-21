import React, { useState } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";

const CategoryCard = ({
    category,
    onEdit,
    onDelete,
    onViewElements,
    showUserInfo = false,
    isSelected = false,
    onSelect = null,
}) => {
    const { t } = useLocalization();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (
            window.confirm(
                t("categories.categoryCard.deleteConfirm", {
                    categoryName: category.name,
                })
            )
        ) {
            setIsDeleting(true);
            try {
                await onDelete(category.id);
            } catch (error) {
                console.error("Error deleting category:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getColorPreview = (color) => {
        if (!color) return null;
        return (
            <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color }}
                title={color}
            />
        );
    };

    return (
        <div className="w-full border-b-2 border-gray-600 last:border-b-0">
            {/* Main Row */}
            <div
                className={`group w-full bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 ${
                    isSelected
                        ? "bg-indigo-900/20 ring-1 ring-indigo-500/30"
                        : ""
                }`}
            >
                <div className="px-6 py-4 w-full">
                    <div className="flex items-center justify-between w-full">
                        {/* Left side - Name, Color, Description, Date */}
                        <div className="flex items-center space-x-6 flex-1 min-w-0">
                            {/* Selection checkbox if applicable */}
                            {onSelect && (
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) =>
                                        onSelect(category.id, e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-gray-800"
                                />
                            )}

                            {/* Category Info */}
                            <div className="flex items-center flex-1 min-w-0">
                                {/* Color Preview */}
                                {getColorPreview(category.color)}

                                {/* Category Name and Description */}
                                <div className="ml-3 flex-1 min-w-0">
                                    <button
                                        onClick={() =>
                                            onViewElements &&
                                            onViewElements(category)
                                        }
                                        className="text-lg font-semibold text-white truncate hover:text-blue-400 transition-colors duration-200 text-left cursor-pointer"
                                        title={t(
                                            "categories.categoryCard.viewElementsTitle"
                                        )}
                                    >
                                        {category.name}
                                    </button>
                                    {category.description && (
                                        <p className="text-sm text-gray-400 truncate mt-1">
                                            {category.description}
                                        </p>
                                    )}
                                </div>

                                {/* Created Date */}
                                <div className="flex-shrink-0 text-sm text-gray-400 ml-4">
                                    {formatDate(category.created_at)}
                                </div>
                            </div>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-3">
                            {/* View Elements button */}
                            {onViewElements && (
                                <button
                                    onClick={() => onViewElements(category)}
                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                                    title={t(
                                        "categories.categoryCard.viewElementsTitle"
                                    )}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                        />
                                    </svg>
                                </button>
                            )}

                            {/* Edit button */}
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(category)}
                                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 rounded-lg transition-all duration-200"
                                    title={t(
                                        "categories.categoryCard.editCategory"
                                    )}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                </button>
                            )}

                            {/* Delete button */}
                            {onDelete && (
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                                    title={t(
                                        "categories.categoryCard.deleteCategory"
                                    )}
                                >
                                    {isDeleting ? (
                                        <svg
                                            className="animate-spin w-5 h-5"
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
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Details Section - Show element count if available */}
            {category.element_count !== undefined && (
                <div className="bg-gray-800/30 border-t border-gray-700/50 w-full">
                    <div className="px-6 py-3 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-400">
                                    {t(
                                        "categories.categoryCard.elementsCount",
                                        {
                                            count: category.element_count,
                                            elements: t(
                                                "categories.categorySingularPlural",
                                                {
                                                    count: category.element_count,
                                                }
                                            ),
                                        }
                                    )}
                                </span>
                                {category.updated_at &&
                                    category.updated_at !==
                                        category.created_at && (
                                        <span className="text-xs text-gray-500">
                                            {t(
                                                "categories.categoryCard.lastUpdated"
                                            )}
                                            : {formatDate(category.updated_at)}
                                        </span>
                                    )}
                            </div>

                            {/* User Info if enabled */}
                            {showUserInfo && category.users && (
                                <div className="flex items-center space-x-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                            {category.users.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-white">
                                            {category.users.name ||
                                                t(
                                                    "categories.categoryCard.unknownUser"
                                                )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {category.users.email}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryCard;
