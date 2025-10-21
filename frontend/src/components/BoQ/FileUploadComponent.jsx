import React, { useState, useRef } from "react";
import { API_ENDPOINTS } from "../../config/api";

const FileUploadComponent = ({ boqId, onFilesUploaded }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        setError("");
        setSuccess("");
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        setSelectedFiles(files);
        setError("");
        setSuccess("");
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

    const uploadSingleFile = async (file) => {
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
                };
            } else {
                return {
                    success: false,
                    error: result.error || "Upload failed",
                    fileName: file.name,
                };
            }
        } catch (err) {
            return { success: false, error: err.message, fileName: file.name };
        }
    };

    const handleUpload = async () => {
        if (!boqId) {
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

        const uploadResults = [];
        const totalFiles = selectedFiles.length;

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

                // Update progress
                setUploadProgress((prev) => ({
                    ...prev,
                    [file.name]: {
                        status: result.success ? "completed" : "failed",
                        progress: 100,
                        error: result.error,
                    },
                }));
            }

            const successfulUploads = uploadResults.filter((r) => r.success);
            const failedUploads = uploadResults.filter((r) => !r.success);

            if (successfulUploads.length > 0) {
                setSuccess(
                    `Successfully uploaded ${successfulUploads.length} of ${totalFiles} files`
                );

                // Call callback if provided
                if (onFilesUploaded) {
                    onFilesUploaded(successfulUploads.map((r) => r.data));
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

    const clearAll = () => {
        setSelectedFiles([]);
        setUploadProgress({});
        setError("");
        setSuccess("");
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
                        Add files to your project for processing
                    </p>
                </div>
            </div>

            {!boqId && (
                <div className="mb-4 p-4 bg-yellow-600/50 border border-yellow-600 rounded-lg">
                    <p className="text-sm text-yellow-100">
                        Please create or select a BOQ first before uploading
                        files.
                    </p>
                </div>
            )}

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
                            className="sr-only"
                            onChange={handleFileSelect}
                            disabled={!boqId}
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        Support for multiple files
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
                        {selectedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                        {formatFileSize(file.size)}
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
                                                                      file.name
                                                                  ].status ===
                                                                  "failed"
                                                                ? "bg-red-500"
                                                                : "bg-indigo-500"
                                                        }`}
                                                        style={{
                                                            width: `${
                                                                uploadProgress[
                                                                    file.name
                                                                ].progress
                                                            }%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-300">
                                                    {uploadProgress[file.name]
                                                        .status ===
                                                        "completed" && "✓"}
                                                    {uploadProgress[file.name]
                                                        .status === "failed" &&
                                                        "✗"}
                                                    {uploadProgress[file.name]
                                                        .status ===
                                                        "uploading" && "..."}
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
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && (
                <div className="mt-4">
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || !boqId}
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
        </div>
    );
};

export default FileUploadComponent;
