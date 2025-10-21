import React, {
    useState,
    useEffect,
    forwardRef,
    useImperativeHandle,
} from "react";
import { FaFileExport, FaFolderOpen } from "react-icons/fa";
import { API_ENDPOINTS } from "../../config/api";
import PdfContentModal from "./PdfContentModal";

const ProjectFilesComponent = forwardRef(
    (
        {
            project, // Changed from projectId to project
            onFileDeleted,
            onFileSelect,
            onOpenOnlvUploader, // This prop might become obsolete or change purpose
            isOpen = false,
            onClose,
            onNavigateToOnlvPage,
            currentUser,
        },
        ref
    ) => {
        const [boqs, setBoQs] = useState([]); // New state for BOQs
        const [selectedBoQ, setSelectedBoQ] = useState(null); // New state for selected BOQ
        const [files, setFiles] = useState([]);
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState("");
        const [success, setSuccess] = useState("");
        const [deletingFileId, setDeletingFileId] = useState(null);
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
        const [showPdfContentModal, setShowPdfContentModal] = useState(false);
        const [pdfContent, setPdfContent] = useState(null);

        // Expose fetchBoQs and fetchFiles methods to parent component via ref
        useImperativeHandle(ref, () => ({
            fetchBoQs,
            fetchFiles,
        }));

        // Fetch BOQs when component mounts or project changes
        useEffect(() => {
            if (project && isOpen) {
                fetchBoQs();
            }
        }, [project, isOpen]);

        // Fetch files when selectedBoQ changes
        useEffect(() => {
            if (selectedBoQ) {
                fetchFiles(selectedBoQ.id);
            } else {
                setFiles([]); // Clear files if no BOQ is selected
            }
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
                    setError(result.error || "Failed to fetch BOQs");
                }
            } catch (err) {
                setError("Network error: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchFiles = async (boqId) => {
            // Now takes boqId as argument
            if (!boqId) return;

            setIsLoading(true);
            setError("");
            setSuccess("");

            try {
                const response = await fetch(
                    API_ENDPOINTS.BOQS.GET_FILES(
                        // Changed to BOQS.GET_FILES
                        boqId,
                        false,
                        1000,
                        0
                    )
                );
                const result = await response.json();

                if (response.ok && result.success) {
                    setFiles(result.data || []);
                } else {
                    setError(result.error || "Failed to fetch files for BOQ");
                }
            } catch (err) {
                setError("Network error: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        const handleDeleteFile = async (fileId) => {
            setDeletingFileId(fileId);
            setError("");
            setSuccess("");

            try {
                const response = await fetch(
                    API_ENDPOINTS.FILES.DELETE(fileId),
                    {
                        method: "DELETE",
                    }
                );

                const result = await response.json();

                if (response.ok && result.success) {
                    setSuccess("File deleted successfully!");
                    // Remove the deleted file from the list
                    setFiles((prevFiles) =>
                        prevFiles.filter((file) => file.id !== fileId)
                    );

                    // Call callback if provided
                    if (onFileDeleted) {
                        onFileDeleted(fileId);
                    }
                } else {
                    setError(result.error || "Failed to delete file");
                }
            } catch (err) {
                setError("Network error: " + err.message);
            } finally {
                setDeletingFileId(null);
                setShowDeleteConfirm(null);
            }
        };

        // Handle loading a file's content into the main application
        const handleLoadFile = async (file) => {
            try {
                if (file.file_type === "onlv") {
                    // For ONLV files, fetch the content from the database record
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

                    setIsLoading(true); // Start loading for PDF enrichment
                    // For PDF files, call the new API endpoint to enrich wall data
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
                        setPdfContent(result); // Set the entire result as pdfContent
                        setShowPdfContentModal(true);
                    } else {
                        throw new Error(
                            result.error || "PDF wall data enrichment failed."
                        );
                    }
                    setIsLoading(false); // End loading for PDF enrichment
                } else {
                    // For other file types, download the file directly
                    const response = await fetch(
                        API_ENDPOINTS.FILES.DOWNLOAD(file.id)
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Failed to load file: ${response.status}`
                        );
                    }

                    // Check if it's a JSON file that can be parsed
                    if (
                        file.mime_type === "application/json" ||
                        file.name.endsWith(".json")
                    ) {
                        const jsonData = await response.json();
                        if (onFileSelect) {
                            onFileSelect(jsonData, file);
                        }
                    } else {
                        // For non-JSON files, we could still pass the file info to parent
                        if (onFileSelect) {
                            onFileSelect(null, file);
                        }
                    }
                }
            } catch (err) {
                console.error("Load file error:", err);
                setError(`Failed to load file: ${err.message}`);
            }
        };

        const handleDownload = async (file) => {
            try {
                const response = await fetch(
                    API_ENDPOINTS.FILES.DOWNLOAD(file.id)
                );

                if (!response.ok) {
                    throw new Error(`Download failed: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Download error:", err);
                setError(`Download failed: ${err.message}`);
            }
        };

        const formatFileSize = (bytes) => {
            if (!bytes || bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (
                parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
            );
        };

        const formatDate = (dateString) => {
            if (!dateString) return "N/A";
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

        // Don't render anything if modal is not open
        if (!isOpen) {
            return null;
        }

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
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
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {selectedBoQ
                                        ? `Files for BOQ: ${selectedBoQ.name}`
                                        : `BOQs for Project: ${project?.name}`}
                                </h2>
                                <p className="text-sm text-gray-300">
                                    {selectedBoQ
                                        ? `Manage files (${files.length} files)`
                                        : `Manage BOQs (${boqs.length} BOQs)`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {selectedBoQ && (
                                <button
                                    onClick={() => setSelectedBoQ(null)}
                                    className="px-4 py-2 border-2 border-gray-500 text-gray-300 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105"
                                >
                                    Back to BOQs
                                </button>
                            )}
                            <button
                                onClick={
                                    selectedBoQ
                                        ? () => fetchFiles(selectedBoQ.id)
                                        : fetchBoQs
                                }
                                disabled={isLoading}
                                className="px-4 py-2 border-2 border-gray-500 text-gray-300 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105"
                            >
                                {isLoading ? "Refreshing..." : "Refresh"}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 border-2 border-gray-500 text-gray-300 hover:border-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
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
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        {error && (
                            <div className="mb-4 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                                <p className="text-sm text-red-100">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 p-4 bg-green-600/50 border border-green-600 rounded-lg">
                                <p className="text-sm text-green-100">
                                    {success}
                                </p>
                            </div>
                        )}

                        {!project?.id ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400">
                                    <p>
                                        Please select a project to view its
                                        BOQs.
                                    </p>
                                </div>
                            </div>
                        ) : isLoading ? (
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
                                        ? "Loading files..."
                                        : "Loading BOQs..."}
                                </span>
                            </div>
                        ) : !selectedBoQ ? ( // Display BOQs if no BOQ is selected
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
                                        No BOQs found
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-400">
                                        This project doesn't have any BOQs yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        {boqs.map((boq) => (
                                            <div
                                                key={boq.id}
                                                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                                                onClick={() =>
                                                    setSelectedBoQ(boq)
                                                }
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
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {boq.name}
                                                        </p>
                                                        <div className="flex items-center space-x-4 mt-1">
                                                            {boq.description && (
                                                                <p className="text-xs text-gray-300 truncate">
                                                                    {
                                                                        boq.description
                                                                    }
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-400">
                                                                Files:{" "}
                                                                {boq.file_count ||
                                                                    0}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {formatDate(
                                                                    boq.created_at
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2 ml-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenOnlvUploader(
                                                                boq
                                                            );
                                                        }} // Pass boq to uploader
                                                        className="p-2 border-2 border-gray-500 text-gray-300 hover:border-green-600 hover:bg-green-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                                        title="Upload Files to BOQ"
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
                                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBoQ(boq);
                                                        }}
                                                        className="p-2 border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                                        title="View BOQ Files"
                                                    >
                                                        <FaFolderOpen className="w-4 h-4" />
                                                    </button>
                                                    {/* Add delete BOQ button here later */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ) : // Display files if a BOQ is selected
                        files.length === 0 ? (
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
                                    No files found for this BOQ
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Upload files to this BOQ to get started.
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
                                                            {formatFileSize(
                                                                file.file_size
                                                            )}
                                                        </p>
                                                        {file.file_type && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-200">
                                                                {file.file_type.toUpperCase()}
                                                            </span>
                                                        )}
                                                        <p className="text-xs text-gray-400">
                                                            {formatDate(
                                                                file.created_at
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2 ml-4">
                                                {/* Export button - only for ONLV files (first) */}
                                                {file.file_type === "onlv" && (
                                                    <button
                                                        onClick={() => {
                                                            // Simple export - just trigger download for now
                                                            handleDownload(
                                                                file
                                                            );
                                                        }}
                                                        className="p-2 border-2 border-gray-500 text-gray-300 hover:border-purple-600 hover:bg-purple-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                                        title="Export ONLV file to JSON format"
                                                    >
                                                        <FaFileExport className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Open button - only show for JSON files or if onFileSelect is provided */}
                                                {(file.mime_type ===
                                                    "application/json" ||
                                                    file.name.endsWith(
                                                        ".json"
                                                    ) ||
                                                    onFileSelect) && (
                                                    <button
                                                        onClick={() =>
                                                            handleLoadFile(file)
                                                        }
                                                        className="p-2 border-2 border-gray-500 text-gray-300 hover:border-green-600 hover:bg-green-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                                        title="Open file in application viewer"
                                                    >
                                                        <FaFolderOpen className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Download button */}
                                                <button
                                                    onClick={() =>
                                                        handleDownload(file)
                                                    }
                                                    className="p-2 border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                                    title="Download file to local storage"
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
                                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                </button>

                                                {/* Delete button */}
                                                <button
                                                    onClick={() =>
                                                        setShowDeleteConfirm(
                                                            file.id
                                                        )
                                                    }
                                                    disabled={
                                                        deletingFileId ===
                                                        file.id
                                                    }
                                                    className="p-2 border-2 border-gray-500 text-gray-300 hover:border-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105"
                                                    title="Delete file permanently"
                                                >
                                                    {deletingFileId ===
                                                    file.id ? (
                                                        <svg
                                                            className="animate-spin w-4 h-4"
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
                            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                                <div className="p-6">
                                    <div className="flex items-center mb-4">
                                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-3">
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
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                Delete File
                                            </h3>
                                            <p className="text-sm text-gray-300">
                                                This action cannot be undone
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 mb-6">
                                        Are you sure you want to delete this
                                        file? This will permanently remove the
                                        file from the project and storage.
                                    </p>

                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() =>
                                                setShowDeleteConfirm(null)
                                            }
                                            className="px-4 py-2 border-2 border-gray-500 text-gray-300 hover:border-gray-600 hover:bg-gray-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDeleteFile(
                                                    showDeleteConfirm
                                                )
                                            }
                                            disabled={
                                                deletingFileId ===
                                                showDeleteConfirm
                                            }
                                            className="px-4 py-2 border-2 border-gray-500 text-gray-300 hover:border-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105"
                                        >
                                            {deletingFileId ===
                                            showDeleteConfirm
                                                ? "Deleting..."
                                                : "Delete"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF Content Modal */}
                    {showPdfContentModal && pdfContent && (
                        <PdfContentModal
                            pdfContent={pdfContent}
                            onClose={() => setShowPdfContentModal(false)}
                        />
                    )}
                </div>
            </div>
        );
    }
);

// Setting a displayName is good practice for debugging in React Developer Tools
ProjectFilesComponent.displayName = "ProjectFilesComponent";

export default ProjectFilesComponent;
