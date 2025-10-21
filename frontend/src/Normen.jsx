import React, { useState } from "react";
import { useLocalization } from "./contexts/LocalizationContext";

function Normen() {
    const { t } = useLocalization();
    const [uploadFile, setUploadFile] = useState(null);

    // Simplified list with only LG 00 and ULG 3900
    const fakeStandardsList = [
        {
            id: 1,
            name: t(
                "ai_training.promptTesting.normen.standardsList.standards.lg00"
            ),
            status: t(
                "ai_training.promptTesting.normen.standardsList.status.active"
            ),
        },
        {
            id: 2,
            name: t(
                "ai_training.promptTesting.normen.standardsList.standards.ulg3900"
            ),
            status: t(
                "ai_training.promptTesting.normen.standardsList.status.active"
            ),
        },
    ];

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        setUploadFile(file);
    };

    const handleUploadSubmit = () => {
        if (uploadFile) {
            // Simulate upload process
            alert(
                `${t(
                    "ai_training.promptTesting.normen.uploadSection.uploadingAlert"
                )} ${uploadFile.name}`
            );
        } else {
            alert(
                t(
                    "ai_training.promptTesting.normen.uploadSection.selectFileAlert"
                )
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">
                        {t("ai_training.promptTesting.normen.title")}
                    </h1>
                    <p className="text-xl text-gray-300">
                        {t("ai_training.promptTesting.normen.subtitle")}
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        {t(
                            "ai_training.promptTesting.normen.uploadSection.title"
                        )}
                    </h2>
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-full max-w-md">
                            <label
                                htmlFor="upload"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                {t(
                                    "ai_training.promptTesting.normen.uploadSection.fileLabel"
                                )}
                            </label>
                            <input
                                id="upload"
                                name="upload"
                                type="file"
                                onChange={handleFileUpload}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                accept=".pdf,.doc,.docx,.txt"
                            />
                        </div>
                        {uploadFile && (
                            <div className="text-green-400 text-sm">
                                {t(
                                    "ai_training.promptTesting.normen.uploadSection.selectedPrefix"
                                )}{" "}
                                {uploadFile.name}
                            </div>
                        )}
                        <button
                            onClick={handleUploadSubmit}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            {t(
                                "ai_training.promptTesting.normen.uploadSection.uploadButton"
                            )}
                        </button>
                    </div>
                </div>

                {/* Fake Standards List */}
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {t(
                            "ai_training.promptTesting.normen.standardsList.title"
                        )}
                    </h2>
                    <div className="space-y-4">
                        {fakeStandardsList.map((standard) => (
                            <div
                                key={standard.id}
                                className="flex items-center justify-between bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        {standard.name}
                                    </h3>
                                </div>
                                <div className="ml-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            standard.status === "Active"
                                                ? "bg-green-600 text-green-100"
                                                : standard.status === "Draft"
                                                ? "bg-yellow-600 text-yellow-100"
                                                : "bg-blue-600 text-blue-100"
                                        }`}
                                    >
                                        {standard.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Normen;
