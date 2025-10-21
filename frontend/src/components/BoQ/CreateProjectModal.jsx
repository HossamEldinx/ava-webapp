import React from "react";
import CreateProjectComponent from "./CreateProjectComponent";
import { useLocalization } from "../../contexts/LocalizationContext";

const CreateProjectModal = ({
    isOpen,
    onClose,
    onProjectCreated,
    currentUser,
}) => {
    const { t } = useLocalization();
    if (!isOpen) return null;

    const handleProjectCreated = (newProject) => {
        onProjectCreated(newProject);
        onClose(); // Close modal after successful creation
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">
                        {t("boq.createNewProject")}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
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
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    <CreateProjectComponent
                        onProjectCreated={handleProjectCreated}
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateProjectModal;
