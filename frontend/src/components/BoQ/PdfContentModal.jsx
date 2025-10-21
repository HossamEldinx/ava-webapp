import React from "react";

const PdfContentModal = ({ pdfContent, onClose }) => {
    if (!pdfContent) {
        return null;
    }

    const { summary, file_info, cost_info } = pdfContent;
    const walls = pdfContent?.enriched_walls || [];
    const totalElementsFound = summary?.total_elements_found || 0;
    const totalRegulationsFound = summary?.total_regulations_found || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">
                        PDF Content Details
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
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
                <div className="p-6 overflow-y-auto flex-1">
                    <h4 className="text-md font-semibold text-white mb-3">
                        Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300 mb-6">
                        <p>
                            <strong>File Name:</strong>{" "}
                            {file_info?.name || "N/A"}
                        </p>
                        <p>
                            <strong>File Size:</strong>{" "}
                            {file_info?.size
                                ? `${(file_info.size / 1024).toFixed(2)} KB`
                                : "N/A"}
                        </p>
                        <p>
                            <strong>Method Used:</strong>{" "}
                            {summary?.source || "N/A"}
                        </p>
                        <p>
                            <strong>Walls Found:</strong> {walls.length || 0}
                        </p>
                        <p>
                            <strong>Elements Found:</strong>{" "}
                            {totalElementsFound}
                        </p>
                        <p>
                            <strong>Regulations Found:</strong>{" "}
                            {totalRegulationsFound}
                        </p>
                        <p>
                            <strong>AI Model:</strong>{" "}
                            {summary?.ai_model || "N/A"}
                        </p>
                    </div>

                    {walls && walls.length > 0 && (
                        <>
                            <h4 className="text-md font-semibold text-white mb-3">
                                Extracted Walls
                            </h4>
                            <div className="space-y-4">
                                {walls.map((wall, index) => (
                                    <div
                                        key={index}
                                        className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                                    >
                                        <p className="text-sm font-medium text-white mb-2">
                                            Wall ID: {wall.id}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                                            <p>
                                                <strong>Length:</strong>{" "}
                                                {wall.total_length?.raw_text ||
                                                    "N/A"}
                                            </p>
                                            <p>
                                                <strong>Gross Area:</strong>{" "}
                                                {wall.total_gross_area
                                                    ?.raw_text || "N/A"}
                                            </p>
                                            <p>
                                                <strong>Net Area:</strong>{" "}
                                                {wall.total_net_area
                                                    ?.raw_text || "N/A"}
                                            </p>
                                        </div>
                                        {wall.regulations &&
                                            wall.regulations.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium text-white mb-1">
                                                        Regulations:
                                                    </p>
                                                    <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                                                        {wall.regulations.map(
                                                            (reg, regIndex) => (
                                                                <li
                                                                    key={
                                                                        regIndex
                                                                    }
                                                                >
                                                                    <strong>
                                                                        {reg
                                                                            .regulations
                                                                            ?.full_nr ||
                                                                            "N/A"}
                                                                        :
                                                                    </strong>{" "}
                                                                    {reg
                                                                        .regulations
                                                                        ?.short_text ||
                                                                        "N/A"}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {(!walls || walls.length === 0) && (
                        <p className="text-gray-400 text-center py-4">
                            No wall data extracted for this PDF.
                        </p>
                    )}

                    {cost_info && Object.keys(cost_info).length > 0 && (
                        <>
                            <h4 className="text-md font-semibold text-white mt-6 mb-3">
                                Cost Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                                <p>
                                    <strong>Prompt Tokens:</strong>{" "}
                                    {cost_info.prompt_token_count || 0}
                                </p>
                                <p>
                                    <strong>Candidates Tokens:</strong>{" "}
                                    {cost_info.candidates_token_count || 0}
                                </p>
                                <p>
                                    <strong>Total Tokens:</strong>{" "}
                                    {cost_info.total_token_count || 0}
                                </p>
                                <p>
                                    <strong>Estimated Input Cost:</strong> $
                                    {cost_info.estimated_input_cost_usd?.toFixed(
                                        6
                                    ) || "0.000000"}
                                </p>
                                <p>
                                    <strong>Estimated Output Cost:</strong> $
                                    {cost_info.estimated_output_cost_usd?.toFixed(
                                        6
                                    ) || "0.000000"}
                                </p>
                                <p>
                                    <strong>Estimated Total Cost:</strong> $
                                    {cost_info.estimated_total_cost_usd?.toFixed(
                                        6
                                    ) || "0.000000"}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PdfContentModal;
