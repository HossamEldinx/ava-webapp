import React from "react";
import FileUploadComponent from "./FileUploadComponent";

const FileUploadModal = ({ isOpen, onClose, boq, onFilesUploaded }) => {
    // Changed 'project' to 'boq'
    if (!isOpen || !boq) return null; // Changed 'project' to 'boq'

    const handleFilesUploaded = (uploadedFiles) => {
        onFilesUploaded(uploadedFiles);
        // Don't auto-close modal to allow multiple uploads
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            Upload Files to BOQ
                        </h2>
                        <p className="text-sm text-gray-300 mt-1">
                            <strong>{boq.name}</strong>{" "}
                            {/* Changed project.name to boq.name */}
                            {boq.description && ` - ${boq.description}`}{" "}
                            {/* Changed project.description to boq.description */}
                        </p>
                    </div>
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
                    <FileUploadComponent
                        boqId={boq.id} // Changed projectId to boqId, and project.id to boq.id
                        onFilesUploaded={handleFilesUploaded}
                    />
                </div>
            </div>
        </div>
    );
};

export default FileUploadModal;
