import React, { useState, useEffect } from "react";
import { FaExternalLinkAlt, FaTrashAlt } from "react-icons/fa";
import { API_ENDPOINTS } from "../../config/api";
import PdfContentModal from "./PdfContentModal";
import { useLocalization } from "../../contexts/LocalizationContext";

const BoQListComponent = ({
    project,
    onBackToProjects,
    onOpenOnlvUploader, // To pass to the upload button for each BOQ
    onFileSelect, // To pass to the file viewer if we decide to keep it here
    onNavigateToOnlvPage, // To pass to the file viewer
    currentUser,
    onCreateBoQ, // New prop for creating BOQs
    onOpenBoQAnalysis, // New prop for opening BOQ analysis page
}) => {
    const { t } = useLocalization();
    const [boqs, setBoQs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedBoQ, setSelectedBoQ] = useState(null); // State to view files for a specific BOQ
    const [files, setFiles] = useState([]); // State for files of a selected BOQ
    const [pdfContent, setPdfContent] = useState(null); // State for PDF content modal
    const [showPdfContentModal, setShowPdfContentModal] = useState(false); // State for PDF content modal visibility
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false); // State for delete confirmation modal
    const [boqToDelete, setBoqToDelete] = useState(null); // State to hold the BOQ to be deleted

    useEffect(() => {
        if (project) {
            fetchBoQs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project]);

    useEffect(() => {
        if (selectedBoQ) {
            fetchFiles(selectedBoQ.id);
        } else {
            setFiles([]); // Clear files if no BOQ is selected
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBoQ]);

    const fetchBoQs = async () => {
        if (!project?.id) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                API_ENDPOINTS.BOQS.GET_BY_PROJECT(project.id, 1000, 0)
            );
            const result = await response.json();

            if (response.ok && result.success) {
                setBoQs(result.data || []);
            } else {
                setError(result.error || t("boq.failedToFetchBoQs"));
            }
        } catch (err) {
            setError(t("boq.networkError", { message: err.message }));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFiles = async (boqId) => {
        if (!boqId) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                API_ENDPOINTS.BOQS.GET_FILES(boqId, false, 1000, 0)
            );
            const result = await response.json();

            if (response.ok && result.success) {
                setFiles(result.data || []);
            } else {
                setError(result.error || t("boq.failedToFetchFilesForBoQ"));
            }
        } catch (err) {
            setError(t("boq.networkError", { message: err.message }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBoQ = async (boqId) => {
        setIsLoading(true);
        setError("");
        setSuccess("");
        try {
            const response = await fetch(API_ENDPOINTS.BOQS.DELETE_BOQ(boqId), {
                method: "DELETE",
            });
            const result = await response.json();

            if (response.ok && result.success) {
                setSuccess(t("boq.boqDeletedSuccessfully"));
                fetchBoQs(); // Refresh the list of BOQs
            } else {
                setError(result.error || t("boq.failedToDeleteBoQ"));
            }
        } catch (err) {
            setError(t("boq.networkError", { message: err.message }));
        } finally {
            setIsLoading(false);
            setShowDeleteConfirmModal(false);
            setBoqToDelete(null);
        }
    };

    const handleLoadFile = async (file) => {
        try {
            if (file.file_type === "onlv") {
                const response = await fetch(
                    API_ENDPOINTS.FILES.GET_BY_ID(file.id)
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch ONLV file record: ${response.status}`
                    );
                }

                const result = await response.json();

                if (result.success && result.data && result.data.content) {
                    const onlvData = JSON.parse(result.data.content);
                    if (onFileSelect) {
                        onFileSelect(onlvData, file);
                    }
                    if (onNavigateToOnlvPage) {
                        onNavigateToOnlvPage();
                    }
                } else {
                    throw new Error(
                        result.error ||
                            "ONLV file content not found or failed to parse."
                    );
                }
            } else if (file.mime_type === "application/pdf") {
                if (!currentUser || !currentUser.id) {
                    throw new Error(
                        "User not authenticated. Cannot enrich PDF data."
                    );
                }

                setIsLoading(true);
                const response = await fetch(
                    API_ENDPOINTS.PDF.ENRICH_WALLS(file.id, currentUser.id)
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to enrich PDF wall data: ${response.status}`
                    );
                }

                const result = await response.json();

                if (result.success) {
                    setPdfContent(result);
                    setShowPdfContentModal(true);
                } else {
                    throw new Error(
                        result.error || t("boq.pdfWallDataEnrichmentFailed")
                    );
                }
                setIsLoading(false);
            } else {
                const response = await fetch(
                    API_ENDPOINTS.FILES.DOWNLOAD(file.id)
                );

                if (!response.ok) {
                    throw new Error(
                        t("boq.failedToLoadFile", { status: response.status })
                    );
                }

                if (
                    file.mime_type === "application/json" ||
                    file.name.endsWith(".json")
                ) {
                    const jsonData = await response.json();
                    if (onFileSelect) {
                        onFileSelect(jsonData, file);
                    }
                } else {
                    if (onFileSelect) {
                        onFileSelect(null, file);
                    }
                }
            }
        } catch (err) {
            console.error("Load file error:", err);
            setError(
                t("boq.failedToLoadFileWithMessage", { message: err.message })
            );
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return t("boq.zeroBytes");
        const k = 1024;
        const sizes = [t("boq.bytes"), t("boq.kb"), t("boq.mb"), t("boq.gb")];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return t("boq.notAvailable");
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getFileIcon = (fileType, mimeType) => {
        if (mimeType?.startsWith("image/")) {
            return (
                <svg
                    className="w-6 h-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            );
        } else if (mimeType?.includes("pdf")) {
            return (
                <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                </svg>
            );
        } else if (mimeType?.includes("text") || fileType === "txt") {
            return (
                <svg
                    className="w-6 h-6 text-blue-400"
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
            );
        } else {
            return (
                <svg
                    className="w-6 h-6 text-gray-400"
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
            );
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 m-4">
            <div className="flex items-center mb-6">
                <button
                    onClick={onBackToProjects}
                    className="px-3 py-1.5 border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105 flex items-center space-x-1 text-sm mr-4"
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
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    <span>{t("boq.backToProjects")}</span>
                </button>
                <h2 className="text-xl font-semibold text-white flex-grow">
                    {selectedBoQ
                        ? `Files for BOQ: ${selectedBoQ.name}`
                        : `BOQs for Project: ${project?.name}`}
                </h2>
                <div className="flex items-center space-x-2">
                    {selectedBoQ ? (
                        <button
                            onClick={() => setSelectedBoQ(null)}
                            className="px-3 py-1.5 border-2 border-gray-500 text-gray-300 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105 text-sm"
                        >
                            {t("boq.backToBoQs")}
                        </button>
                    ) : (
                        <button
                            onClick={() => onCreateBoQ(project)}
                            className="px-3 py-1.5 bg-transparent border border-gray-500 text-gray-300 hover:bg-green-600 hover:text-white rounded-md transition-colors duration-200 flex items-center space-x-1 hover:shadow-md transform hover:scale-105 text-sm"
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
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                            <span>{t("boq.createNewBoQ")}</span>
                        </button>
                    )}
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

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <svg
                        className="animate-spin h-8 w-8 text-indigo-500"
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
                    <span className="ml-2 text-gray-300">
                        {selectedBoQ
                            ? t("boq.loadingFiles")
                            : t("boq.loadingBoQs")}
                    </span>
                </div>
            ) : !selectedBoQ ? (
                boqs.length === 0 ? (
                    <div className="text-center py-8">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-300">
                            {t("boq.noBoQsFound")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                            {t("boq.noBoQsFoundDescription")}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            {boqs.map((boq) => (
                                <div
                                    key={boq.id}
                                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                                    onClick={() => setSelectedBoQ(boq)}
                                >
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="flex-shrink-0 mr-3">
                                            <svg
                                                className="w-6 h-6 text-yellow-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                                />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onOpenBoQAnalysis) {
                                                        onOpenBoQAnalysis(boq);
                                                    }
                                                }}
                                                className="text-sm font-medium text-white truncate text-left hover:text-blue-400 transition-colors duration-200 focus:outline-none"
                                                title={t("boq.openBoQAnalysis")}
                                            >
                                                {boq.name}
                                            </button>
                                            <div className="flex items-center space-x-4 mt-1">
                                                {boq.description && (
                                                    <p className="text-xs text-gray-300 truncate">
                                                        {boq.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400">
                                                    {t("boq.filesCount", {
                                                        count:
                                                            boq.file_count || 0,
                                                    })}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDate(boq.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onOpenBoQAnalysis) {
                                                    onOpenBoQAnalysis(boq);
                                                }
                                            }}
                                            className="p-2 border-2 border-gray-500 text-gray-300 hover:border-green-600 hover:bg-green-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                            title="Open BOQ"
                                        >
                                            <FaExternalLinkAlt className="w-4 h-4" />
                                        </button>
                                        {/* <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedBoQ(boq);
                                            }}
                                            className="p-2 border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                            title="View BOQ Files"
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
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                        </button> */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBoqToDelete(boq);
                                                setShowDeleteConfirmModal(true);
                                            }}
                                            className="p-2 border-2 border-gray-500 text-gray-300 hover:border-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                            title={t("boq.deleteBoQ")}
                                        >
                                            <FaTrashAlt className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ) : files.length === 0 ? (
                <div className="text-center py-8">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-300">
                        {t("boq.noFilesFoundForBoQ")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                        {t("boq.uploadFilesToBoQDescription")}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                            >
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="flex-shrink-0 mr-3">
                                        {getFileIcon(
                                            file.file_type,
                                            file.mime_type
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {file.name}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <p className="text-xs text-gray-300">
                                                {formatFileSize(file.file_size)}
                                            </p>
                                            {file.file_type && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-200">
                                                    {file.file_type.toUpperCase()}
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-400">
                                                {formatDate(file.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    {(file.mime_type === "application/json" ||
                                        file.name.endsWith(".json") ||
                                        onFileSelect) && (
                                        <button
                                            onClick={() => handleLoadFile(file)}
                                            className="p-2 border-2 border-gray-500 text-gray-300 hover:border-green-600 hover:bg-green-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                            title="Open file in application viewer"
                                        >
                                            <FaExternalLinkAlt className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PDF Content Modal */}
            {showPdfContentModal && pdfContent && (
                <PdfContentModal
                    pdfContent={pdfContent}
                    onClose={() => {
                        setShowPdfContentModal(false);
                        setPdfContent(null);
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && boqToDelete && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {t("boq.confirmDeleteBoQ")}
                        </h3>
                        <p className="text-gray-300 mb-6">
                            {t("boq.deleteBoQConfirmation", {
                                boqName: boqToDelete.name,
                            })}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirmModal(false);
                                    setBoqToDelete(null);
                                }}
                                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={() => handleDeleteBoQ(boqToDelete.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                {t("common.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

BoQListComponent.displayName = "BoQListComponent";

export default BoQListComponent;
