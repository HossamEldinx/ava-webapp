import React from "react";
import OnlvTableWrapper from "./onlv_js_web/OnlvTable"; // Import the wrapped table component
function OnlvTablePage({ onlvData, onNavigateToFiles }) {
    return (
        <div className="py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Page Header */}
                <div className="text-center mb-8"></div>

                {/* Conditionally render the table */}
                {onlvData ? (
                    <div className="mt-8">
                        <OnlvTableWrapper jsonData={onlvData} />
                    </div>
                ) : (
                    // Show a message if there's no data
                    <div className="mt-8 text-center text-gray-500 p-8 bg-gray-800 rounded-lg shadow-md border border-gray-700">
                        <svg
                            className="w-16 h-16 text-gray-500 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-300 mb-2">
                            No ONLV data loaded
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Upload a file or select one from the file manager to
                            view the table.
                        </p>
                        <button
                            onClick={onNavigateToFiles}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200"
                        >
                            Go to File Management
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OnlvTablePage;
