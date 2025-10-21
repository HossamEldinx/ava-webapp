import React, { useState, useRef } from "react";
import { API_ENDPOINTS } from "../../config/api";

const UnifiedFileUploader = ({
    boqId, // Changed from projectId to boqId
    onFilesUploaded,
    onFileListUpdate,
}) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [jsonData, setJsonData] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");
    const fileInputRef = useRef(null);

    // Detect file type based on extension
    const getFileType = (fileName) => {
        const extension = fileName.split(".").pop().toLowerCase();
        if (extension === "pdf") return "pdf";
        if (extension === "onlv") return "onlv";
        return "unknown";
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        const errors = [];

        files.forEach((file) => {
            const fileType = getFileType(file.name);
            if (fileType === "unknown") {
                errors.push(
                    `${file.name}: Unsupported file type. Only .pdf and .onlv files are supported.`
                );
            } else {
                validFiles.push(file);
            }
        });

        setSelectedFiles(validFiles);
        setError(errors.length > 0 ? errors.join("\n") : "");
        setSuccess("");
        setJsonData(null);
        setUploadMessage("");
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        const validFiles = [];
        const errors = [];

        files.forEach((file) => {
            const fileType = getFileType(file.name);
            if (fileType === "unknown") {
                errors.push(
                    `${file.name}: Unsupported file type. Only .pdf and .onlv files are supported.`
                );
            } else {
                validFiles.push(file);
            }
        });

        setSelectedFiles(validFiles);
        setError(errors.length > 0 ? errors.join("\n") : "");
        setSuccess("");
        setJsonData(null);
        setUploadMessage("");
    };

    const removeFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // PDF Upload Logic
    const uploadPDFFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("boq_id", boqId); // Changed from project_id to boq_id

        try {
            const response = await fetch(API_ENDPOINTS.PDF.EXTRACT_WALLS, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                return {
                    success: true,
                    data: result.data,
                    fileName: file.name,
                    fileType: "pdf",
                };
            } else {
                return {
                    success: false,
                    error: result.error || "PDF upload failed",
                    fileName: file.name,
                    fileType: "pdf",
                };
            }
        } catch (err) {
            return {
                success: false,
                error: err.message,
                fileName: file.name,
                fileType: "pdf",
            };
        }
    };

    // ONLV Upload Logic
    const uploadONLVFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("boq_id", boqId); // Changed from project_id to boq_id

        try {
            const response = await fetch(
                API_ENDPOINTS.FILES.UPLOAD_ONLV_PROCESSED(boqId), // Pass boqId to the API endpoint
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.detail || `HTTP error! status: ${response.status}`
                );
            }

            if (result.parsed_content) {
                return {
                    success: true,
                    data: result.parsed_content,
                    fileName: file.name,
                    fileType: "onlv",
                    jsonData: result.parsed_content,
                };
            } else {
                throw new Error("No data received from server");
            }
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : String(err),
                fileName: file.name,
                fileType: "onlv",
            };
        }
    };

    const uploadSingleFile = async (file) => {
        const fileType = getFileType(file.name);

        if (fileType === "pdf") {
            return await uploadPDFFile(file);
        } else if (fileType === "onlv") {
            return await uploadONLVFile(file);
        } else {
            return {
                success: false,
                error: "Unsupported file type",
                fileName: file.name,
                fileType: "unknown",
            };
        }
    };

    const handleUpload = async () => {
        if (!boqId) {
            // Changed from projectId to boqId
            setError("Please select a BOQ first"); // Updated error message
            return;
        }

        if (selectedFiles.length === 0) {
            setError("Please select files to upload");
            return;
        }

        setIsUploading(true);
        setError("");
        setSuccess("");
        setUploadProgress({});
        setJsonData(null);
        setUploadMessage("");

        const uploadResults = [];
        const totalFiles = selectedFiles.length;
        let lastJsonData = null;

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];

                // Update progress
                setUploadProgress((prev) => ({
                    ...prev,
                    [file.name]: { status: "uploading", progress: 0 },
                }));

                const result = await uploadSingleFile(file);
                uploadResults.push(result);

                // Store JSON data for ONLV files
                if (
                    result.success &&
                    result.fileType === "onlv" &&
                    result.jsonData
                ) {
                    lastJsonData = result.jsonData;
                }

                // Update progress
                setUploadProgress((prev) => ({
                    ...prev,
                    [file.name]: {
                        status: result.success ? "completed" : "failed",
                        progress: 100,
                        error: result.error,
                        fileType: result.fileType,
                    },
                }));
            }

            const successfulUploads = uploadResults.filter((r) => r.success);
            const failedUploads = uploadResults.filter((r) => !r.success);

            if (successfulUploads.length > 0) {
                const pdfUploads = successfulUploads.filter(
                    (r) => r.fileType === "pdf"
                );
                const onlvUploads = successfulUploads.filter(
                    (r) => r.fileType === "onlv"
                );

                let message = `Successfully uploaded ${successfulUploads.length} of ${totalFiles} files`;
                if (pdfUploads.length > 0)
                    message += ` (${pdfUploads.length} PDF${
                        pdfUploads.length > 1 ? "s" : ""
                    })`;
                if (onlvUploads.length > 0)
                    message += ` (${onlvUploads.length} ONLV${
                        onlvUploads.length > 1 ? "s" : ""
                    })`;

                setSuccess(message);

                // Call callback if provided
                if (onFilesUploaded) {
                    onFilesUploaded(successfulUploads.map((r) => r.data));
                }

                // Set JSON data for display if we have ONLV files
                if (lastJsonData) {
                    setJsonData(lastJsonData);
                    setUploadMessage(
                        `ONLV file(s) uploaded and processed successfully!`
                    );
                }

                // Notify parent to refresh file list
                if (onFileListUpdate) {
                    onFileListUpdate();
                }
            }

            if (failedUploads.length > 0) {
                const errorMessages = failedUploads
                    .map((r) => `${r.fileName}: ${r.error}`)
                    .join(", ");
                setError(`Failed uploads: ${errorMessages}`);
            }

            // Clear selected files if all uploads were successful
            if (failedUploads.length === 0) {
                setSelectedFiles([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        } catch (err) {
            setError("Upload error: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadJson = () => {
        if (!jsonData) return;

        const dataStr = JSON.stringify(jsonData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `converted_onlv_files.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopyJson = async () => {
        if (!jsonData) return;

        try {
            await navigator.clipboard.writeText(
                JSON.stringify(jsonData, null, 2)
            );
            setUploadMessage("JSON data copied to clipboard!");
            setTimeout(() => setUploadMessage(""), 3000);
        } catch (err) {
            setError("Failed to copy to clipboard");
        }
    };

    const clearAll = () => {
        setSelectedFiles([]);
        setUploadProgress({});
        setError("");
        setSuccess("");
        setJsonData(null);
        setUploadMessage("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
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
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">
                        Upload Files to Project
                    </h2>
                    <p className="text-sm text-gray-300">
                        Upload PDF files for wall extraction or ONLV files for
                        XML to JSON conversion
                    </p>
                </div>
            </div>

            {!boqId && ( // Changed from projectId to boqId
                <div className="mb-4 p-4 bg-yellow-600/50 border border-yellow-600 rounded-lg">
                    <p className="text-sm text-yellow-100">
                        Please create or select a BOQ first before uploading
                        files.
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                    <p className="text-sm text-red-100 whitespace-pre-line">
                        {error}
                    </p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-600/50 border border-green-600 rounded-lg">
                    <p className="text-sm text-green-100">{success}</p>
                </div>
            )}

            {/* File Drop Zone */}
            <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors bg-gray-700/30"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="space-y-2">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div className="text-gray-300">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="text-indigo-400 hover:text-indigo-300">
                                Click to upload
                            </span>
                            <span> or drag and drop</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.onlv"
                            className="sr-only"
                            onChange={handleFileSelect}
                            disabled={!boqId} // Changed from projectId to boqId
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        Support for PDF files (wall extraction) and ONLV files
                        (XML to JSON conversion)
                    </p>
                </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-white">
                            Selected Files ({selectedFiles.length})
                        </h3>
                        <button
                            onClick={clearAll}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
                            disabled={isUploading}
                        >
                            Clear All
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedFiles.map((file, index) => {
                            const fileType = getFileType(file.name);
                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-sm text-gray-300 flex items-center space-x-2">
                                            <span>
                                                {formatFileSize(file.size)}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                    fileType === "pdf"
                                                        ? "bg-blue-600 text-blue-100"
                                                        : fileType === "onlv"
                                                        ? "bg-purple-600 text-purple-100"
                                                        : "bg-gray-600 text-gray-100"
                                                }`}
                                            >
                                                {fileType.toUpperCase()}
                                            </span>
                                        </p>

                                        {/* Upload Progress */}
                                        {uploadProgress[file.name] && (
                                            <div className="mt-1">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-1 bg-gray-600 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                uploadProgress[
                                                                    file.name
                                                                ].status ===
                                                                "completed"
                                                                    ? "bg-green-500"
                                                                    : uploadProgress[
                                                                          file
                                                                              .name
                                                                      ]
                                                                          .status ===
                                                                      "failed"
                                                                    ? "bg-red-500"
                                                                    : "bg-indigo-500"
                                                            }`}
                                                            style={{
                                                                width: `${
                                                                    uploadProgress[
                                                                        file
                                                                            .name
                                                                    ].progress
                                                                }%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-300">
                                                        {uploadProgress[
                                                            file.name
                                                        ].status ===
                                                            "completed" && "✓"}
                                                        {uploadProgress[
                                                            file.name
                                                        ].status === "failed" &&
                                                            "✗"}
                                                        {uploadProgress[
                                                            file.name
                                                        ].status ===
                                                            "uploading" &&
                                                            "..."}
                                                    </span>
                                                </div>
                                                {uploadProgress[file.name]
                                                    .error && (
                                                    <p className="text-xs text-red-400 mt-1">
                                                        {
                                                            uploadProgress[
                                                                file.name
                                                            ].error
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {!isUploading && (
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="ml-2 text-red-400 hover:text-red-300 transition-colors duration-200"
                                        >
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && (
                <div className="mt-4">
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || !boqId} // Changed from projectId to boqId
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                    >
                        {isUploading ? (
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
                                Uploading...
                            </>
                        ) : (
                            `Upload ${selectedFiles.length} File${
                                selectedFiles.length > 1 ? "s" : ""
                            }`
                        )}
                    </button>
                </div>
            )}

            {/* ONLV Conversion Result */}
            {jsonData && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-100">
                            ONLV Conversion Complete
                        </h3>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleCopyJson}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center"
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
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                Copy
                            </button>
                            <button
                                onClick={handleDownloadJson}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center"
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
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Download
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-md p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(jsonData, null, 2).substring(
                                0,
                                500
                            )}
                            {JSON.stringify(jsonData, null, 2).length > 500 &&
                                "..."}
                        </pre>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Array elements (leistungsteil, position, teilposition,
                        zuschlag, abschlag, kennwert) are automatically
                        converted to arrays.
                    </p>
                </div>
            )}

            {/* Upload Message */}
            {uploadMessage && (
                <div className="mt-3 p-3 bg-green-900/50 border border-green-700 rounded-lg">
                    <p className="text-sm text-green-300">{uploadMessage}</p>
                </div>
            )}
        </div>
    );
};

export default UnifiedFileUploader;
