import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";

const BoqFilesManager = ({ selectedBoq, onFileDeleted }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletingFileId, setDeletingFileId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch files when selectedBoq changes
    useEffect(() => {
        if (selectedBoq?.boqId) {
            fetchFiles();
        } else {
            setFiles([]);
        }
    }, [selectedBoq?.boqId]);

    const fetchFiles = async () => {
        if (!selectedBoq?.boqId) return;

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                API_ENDPOINTS.BOQS.GET_FILES(selectedBoq.boqId, false, 100, 0)
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("BOQ Files API Response:", data);

            if (data.success) {
                setFiles(data.data || []);
            } else {
                setError(data.error || "Failed to load files");
            }
        } catch (err) {
            console.error("Error fetching BOQ files:", err);
            setError("Failed to load files");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }

        setDeletingFileId(fileId);
        try {
            const response = await fetch(API_ENDPOINTS.FILES.DELETE(fileId), {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Remove the file from the local state
                setFiles((prevFiles) =>
                    prevFiles.filter((file) => file.id !== fileId)
                );

                // Notify parent component if callback provided
                if (onFileDeleted) {
                    onFileDeleted(fileId, fileName);
                }
            } else {
                throw new Error(data.error || "Failed to delete file");
            }
        } catch (err) {
            console.error("Error deleting file:", err);
            alert(`Failed to delete file: ${err.message}`);
        } finally {
            setDeletingFileId(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

    if (!selectedBoq) {
        return null;
    }

    return (
        <div className="bg-gray-800  border-gray-700 p-4">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center flex-1 min-w-0">
                    <button className="flex items-center mr-2">
                        <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                    <svg
                        className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <div className="flex items-center space-x-2 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-100 truncate">
                            {selectedBoq.boqName}
                        </h4>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400 truncate">
                            Project: {selectedBoq.projectName}
                        </span>
                        <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full flex-shrink-0">
                            {files.length} files
                        </span>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        fetchFiles();
                    }}
                    disabled={loading}
                    className="ml-2 p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Refresh files"
                >
                    <svg
                        className={`w-4 h-4 text-gray-300 ${
                            loading ? "animate-spin" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {isExpanded && (
                <div className="mt-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-2"></div>
                            <span className="text-sm text-gray-400">
                                Loading files...
                            </span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
                            <div className="flex items-center">
                                <svg
                                    className="w-4 h-4 text-red-400 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                                <span className="text-sm text-red-300">
                                    {error}
                                </span>
                            </div>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-4">
                            <svg
                                className="w-8 h-8 mx-auto mb-2 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="text-sm text-gray-400">
                                No files found for this BOQ
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3 border border-gray-600/50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            <svg
                                                className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-100 truncate">
                                                    {file.original_filename ||
                                                        file.filename ||
                                                        `File ${file.id}`}
                                                </p>
                                                <div className="flex items-center text-xs text-gray-400 mt-1">
                                                    <span>
                                                        {formatFileSize(
                                                            file.file_size || 0
                                                        )}
                                                    </span>
                                                    <span className="mx-2">
                                                        •
                                                    </span>
                                                    <span>
                                                        {formatDate(
                                                            file.created_at
                                                        )}
                                                    </span>
                                                    {file.file_type && (
                                                        <>
                                                            <span className="mx-2">
                                                                •
                                                            </span>
                                                            <span className="uppercase">
                                                                {file.file_type}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() =>
                                            handleDeleteFile(
                                                file.id,
                                                file.original_filename ||
                                                    file.filename
                                            )
                                        }
                                        disabled={deletingFileId === file.id}
                                        className="ml-3 p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete file"
                                    >
                                        {deletingFileId === file.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                        ) : (
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
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BoqFilesManager;
