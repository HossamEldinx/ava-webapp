import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";

const ChatHistoryPanel = ({ isOpen, onClose, onSelectBoq }) => {
    const [boqs, setBoqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Fetch BOQs when panel opens
    useEffect(() => {
        if (isOpen) {
            fetchBoqs();
        }
    }, [isOpen]);

    const fetchBoqs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                API_ENDPOINTS.BOQS.GET_WITH_FILE_COUNTS()
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("BOQ API Response:", data); // Debug log
            const boqList = data.data || [];
            setBoqs(boqList);
        } catch (err) {
            console.error("Error fetching BOQs:", err);
            setError("Failed to load BOQs");
        } finally {
            setLoading(false);
        }
    };

    const handleBoqSelect = (boq) => {
        if (onSelectBoq) {
            onSelectBoq({
                boqId: boq.id,
                projectId: boq.project_id,
                boqName: boq.name,
                projectName: boq.project_name || `Project ${boq.project_id}`,
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="h-full bg-gray-900 border-r border-gray-700 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100">
                    Select BOQ
                </h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
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
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* BOQ List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center text-gray-400 mt-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-sm">Loading BOQs...</p>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400 mt-8">
                        <svg
                            className="w-12 h-12 mx-auto mb-4 opacity-50"
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
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={fetchBoqs}
                            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : boqs.length === 0 ? (
                    <div className="text-center text-gray-400 mt-8">
                        <svg
                            className="w-12 h-12 mx-auto mb-4 opacity-50"
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
                        <p className="text-sm">No BOQs found</p>
                        <p className="text-xs mt-1">
                            Create a BOQ to get started
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {boqs.map((boq) => (
                            <div
                                key={boq.id}
                                onClick={() => handleBoqSelect(boq)}
                                className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors border border-gray-700 hover:border-gray-600"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-100 truncate">
                                            {boq.name || `BOQ ${boq.id}`}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1 truncate">
                                            Project:{" "}
                                            {boq.project_name ||
                                                `Project ${boq.project_id}`}
                                        </p>
                                        {boq.description && (
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {boq.description}
                                            </p>
                                        )}
                                        <div className="flex items-center mt-2 text-xs text-gray-500">
                                            <svg
                                                className="w-3 h-3 mr-1"
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
                                            <span>
                                                {boq.file_count || 0} files
                                            </span>
                                            <span className="mx-2">•</span>
                                            <span>
                                                {new Date(
                                                    boq.created_at
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-2 flex-shrink-0">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
                <button
                    onClick={fetchBoqs}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-4 h-4 mr-2"
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
                            Refresh BOQs
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChatHistoryPanel;
