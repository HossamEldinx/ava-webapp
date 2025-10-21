import React, { useState } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { useLocalization } from "../../contexts/LocalizationContext";

const CreateProjectComponent = ({ onProjectCreated, currentUser }) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "active",
        lv_bezeichnung: "",
        auftraggeber: "",
        nr: "",
        dateiname: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            // Check if user is available
            if (!currentUser || !currentUser.id) {
                setError(t("boq.userAuthRequired"));
                return;
            }

            const user_id = currentUser.id;

            const response = await fetch(
                `${API_ENDPOINTS.PROJECTS.CREATE}?user_id=${user_id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        description: formData.description,
                        status: formData.status,
                        lv_bezeichnung: formData.lv_bezeichnung || null,
                        auftraggeber: formData.auftraggeber || null,
                        nr: formData.nr || null,
                        dateiname: formData.dateiname || null,
                    }),
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                setSuccess(t("boq.projectCreatedSuccessfully"));
                setFormData({
                    name: "",
                    description: "",
                    status: "active",
                    lv_bezeichnung: "",
                    auftraggeber: "",
                    nr: "",
                    dateiname: "",
                });

                // Call the callback function if provided
                if (onProjectCreated) {
                    onProjectCreated(result.data);
                }
            } else {
                setError(result.error || t("boq.failedToCreateProject"));
            }
        } catch (err) {
            setError(t("boq.networkError", { message: err.message }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                    <svg
                        className="w-6 h-6 text-white"
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
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">
                        {t("boq.createNewProject")}
                    </h2>
                    <p className="text-sm text-gray-300">
                        {t("boq.setupNewProjectDescription")}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                    <p className="text-sm text-red-100">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-600/50 border border-green-600 rounded-lg">
                    <p className="text-sm text-green-100">{success}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Required Fields Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
                        {t("boq.requiredInformation")}
                    </h3>

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-300 mb-1"
                        >
                            {t("boq.projectName")} *
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            maxLength={255}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder={t("boq.enterProjectNamePlaceholder")}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="status"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                {t("boq.status")}
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="active">
                                    {t("boq.active")}
                                </option>
                                <option value="inactive">
                                    {t("boq.inactive")}
                                </option>
                                <option value="archived">
                                    {t("boq.archived")}
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="nr"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                {t("boq.projectNumber")}{" "}
                                <span className="text-gray-500">
                                    {t("boq.optional")}
                                </span>
                            </label>
                            <input
                                type="text"
                                id="nr"
                                name="nr"
                                value={formData.nr}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={t("boq.projectNumberPlaceholder")}
                            />
                        </div>
                    </div>
                </div>

                {/* Optional Fields Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
                        {t("boq.additionalInformation")}{" "}
                        <span className="text-sm text-gray-400 font-normal">
                            {t("boq.allOptional")}
                        </span>
                    </h3>

                    <div>
                        <label
                            htmlFor="description"
                            className="block text-sm font-medium text-gray-300 mb-1"
                        >
                            {t("boq.description")}{" "}
                            <span className="text-gray-500">
                                {t("boq.optional")}
                            </span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder={t(
                                "boq.enterProjectDescriptionPlaceholder"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="lv_bezeichnung"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                {t("boq.lvDesignation")}{" "}
                                <span className="text-gray-500">
                                    {t("boq.optional")}
                                </span>
                            </label>
                            <input
                                type="text"
                                id="lv_bezeichnung"
                                name="lv_bezeichnung"
                                value={formData.lv_bezeichnung}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={t(
                                    "boq.enterLvDesignationPlaceholder"
                                )}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="auftraggeber"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                {t("boq.clientContractor")}{" "}
                                <span className="text-gray-500">
                                    {t("boq.optional")}
                                </span>
                            </label>
                            <input
                                type="text"
                                id="auftraggeber"
                                name="auftraggeber"
                                value={formData.auftraggeber}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={t(
                                    "boq.enterClientContractorNamePlaceholder"
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="dateiname"
                            className="block text-sm font-medium text-gray-300 mb-1"
                        >
                            {t("boq.filename")}{" "}
                            <span className="text-gray-500">
                                {t("boq.optional")}
                            </span>
                        </label>
                        <input
                            type="text"
                            id="dateiname"
                            name="dateiname"
                            value={formData.dateiname}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder={t(
                                "boq.enterAssociatedFilenamePlaceholder"
                            )}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !formData.name.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <svg
                                className="animate-spin h-4 w-4 mr-2"
                                xmlns="http://www.w3.org/2000/svg"
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
                            {t("boq.creating")}...
                        </>
                    ) : (
                        t("boq.createProject")
                    )}
                </button>
            </form>
        </div>
    );
};

export default CreateProjectComponent;
