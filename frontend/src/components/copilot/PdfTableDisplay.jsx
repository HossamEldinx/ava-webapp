import React, { useState } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { useLocalization } from "../../contexts/LocalizationContext";

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(37, 99, 235, 0.8));
    border-radius: 4px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 1));
    border-color: rgba(59, 130, 246, 0.5);
  }
  
  .custom-scrollbar-yellow::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .custom-scrollbar-yellow::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.3);
    border-radius: 3px;
  }
  
  .custom-scrollbar-yellow::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.7), rgba(217, 119, 6, 0.8));
    border-radius: 3px;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  .custom-scrollbar-yellow::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 1));
    border-color: rgba(245, 158, 11, 0.5);
  }
`;

// Inject styles
if (typeof document !== "undefined") {
    const styleElement = document.createElement("style");
    styleElement.textContent = scrollbarStyles;
    if (!document.head.querySelector("style[data-pdf-scrollbar-styles]")) {
        styleElement.setAttribute("data-pdf-scrollbar-styles", "true");
        document.head.appendChild(styleElement);
    }
}

// PDF Table Display Component
const PdfTableDisplay = ({
    pdfData,
    fileName,
    onSendDataToOnlv,
    selectedBoq,
    currentUser,
}) => {
    const { t } = useLocalization();
    const walls = pdfData?.enriched_walls || [];
    const fileInfo = pdfData?.file_info || {};
    const summary = pdfData?.summary || {};

    // State for selected regulations
    const [selectedRegulations, setSelectedRegulations] = useState([]);
    const [isConfirming, setIsConfirming] = useState(false);

    // Debug logging to see the actual data structure
    console.log("PDF Data received:", pdfData);
    console.log("Walls data:", walls);
    console.log("Selected regulations state:", selectedRegulations);
    if (walls.length > 0) {
        console.log("First wall structure:", walls[0]);
        console.log("First wall elements:", walls[0]?.elements);
        console.log("First wall regulations:", walls[0]?.regulations);
    }

    // Handle regulation click with unique identifier
    const handleRegulationClick = (wallIndex, regIndex, regulation) => {
        // Allow selection even if regulationNr is "N/A" - only prevent if regulation is completely invalid
        if (!regulation) return;

        const uniqueId = `${wallIndex}-${regIndex}`;

        setSelectedRegulations((prev) => {
            let newSelected;
            if (prev.some((item) => item.uniqueId === uniqueId)) {
                // Remove if already selected
                newSelected = prev.filter((item) => item.uniqueId !== uniqueId);
            } else {
                // Add if not selected - use uniqueId to avoid conflicts with existing id property
                newSelected = [...prev, { uniqueId, ...regulation }];
            }
            console.log("Selected regulations:", newSelected);
            return newSelected;
        });
    };

    // Check if regulation is selected
    const isRegulationSelected = (wallIndex, regIndex) => {
        const uniqueId = `${wallIndex}-${regIndex}`;
        const isSelected = selectedRegulations.some(
            (item) => item.uniqueId === uniqueId
        );
        console.log(
            `Checking regulation ${uniqueId}: ${isSelected}`,
            selectedRegulations
        );
        return isSelected;
    };

    // Get all available regulations
    const getAllRegulations = () => {
        return walls.flatMap((wall, wallIndex) =>
            (wall.regulations || []).map((reg, regIndex) => ({
                uniqueId: `${wallIndex}-${regIndex}`,
                ...reg,
            }))
        );
    };

    // Check if all regulations are selected
    const areAllRegulationsSelected = () => {
        const allRegulations = getAllRegulations();
        return (
            allRegulations.length > 0 &&
            selectedRegulations.length === allRegulations.length
        );
    };

    // Handle toggle select/deselect all regulations
    const handleToggleSelectAll = () => {
        if (areAllRegulationsSelected()) {
            // Deselect all
            setSelectedRegulations([]);
            console.log("Deselected all regulations");
        } else {
            // Select all
            const allRegulations = getAllRegulations();
            setSelectedRegulations(allRegulations);
            console.log("Selected all regulations:", allRegulations);
        }
    };

    // Handle confirm button click
    const handleConfirmSelection = async () => {
        if (selectedRegulations.length === 0) return;

        setIsConfirming(true);

        try {
            const response = await fetch(API_ENDPOINTS.STEPS.STEP_FIVE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(pdfData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Step 4 API response:", result);
            console.log("Step 4 API response data:", result.data);
            console.log("Step 4 API response data type:", typeof result.data);

            // Send the combined data to the parent component
            if (onSendDataToOnlv && result.success) {
                console.log("Calling onSendDataToOnlv with:", result.data);
                onSendDataToOnlv(result.data);
            } else {
                console.log(
                    "Not calling onSendDataToOnlv - success:",
                    result.success,
                    "onSendDataToOnlv:",
                    !!onSendDataToOnlv
                );
            }
        } catch (error) {
            console.error("Error during step 4:", error);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-3 mt-2 w-full overflow-hidden shadow-md border border-gray-600">
            {/* Header Section */}
            <div className="mb-3">
                <div className="flex items-center space-x-1 mb-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <h4 className="text-sm font-semibold text-green-400">
                        📄 {t("boq.pdfTable.fileProcessed", { fileName })}
                    </h4>
                </div>

                {/* Summary Statistics Cards - Made smaller */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    {summary.total_walls !== undefined && (
                        <div className="bg-blue-900/30 border border-blue-600/50 rounded p-1.5 text-center">
                            <div className="text-blue-400 text-base font-bold">
                                {summary.total_walls}
                            </div>
                            <div className="text-gray-300 text-xs">
                                {t("boq.pdfTable.summary.totalWalls")}
                            </div>
                        </div>
                    )}
                    {summary.total_elements_found !== undefined && (
                        <div className="bg-green-900/30 border border-green-600/50 rounded p-1.5 text-center">
                            <div className="text-green-400 text-base font-bold">
                                {summary.total_elements_found}
                            </div>
                            <div className="text-gray-300 text-xs">
                                {t("boq.pdfTable.summary.elementsFound")}
                            </div>
                        </div>
                    )}
                    {summary.total_regulations_found !== undefined && (
                        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-1.5 text-center">
                            <div className="text-yellow-400 text-base font-bold">
                                {summary.total_regulations_found}
                            </div>
                            <div className="text-gray-300 text-xs">
                                {t("boq.pdfTable.summary.regulationsFound")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Button - Show when regulations are selected */}
                {/* Action Buttons */}
                <div className="mt-3 flex items-center justify-between bg-gray-900/30 border border-gray-600/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleToggleSelectAll}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                areAllRegulationsSelected()
                                    ? "bg-red-600 hover:bg-red-500 text-white"
                                    : "bg-green-600 hover:bg-green-500 text-white"
                            }`}
                        >
                            {areAllRegulationsSelected()
                                ? t("boq.pdfTable.actions.deselectAll")
                                : t("boq.pdfTable.actions.selectAll")}
                        </button>
                    </div>
                    {selectedRegulations.length > 0 && (
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-blue-300 text-sm font-medium">
                                    {t(
                                        "boq.pdfTable.actions.regulationsSelected",
                                        {
                                            count: selectedRegulations.length,
                                        }
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={handleConfirmSelection}
                                disabled={isConfirming}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isConfirming
                                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl"
                                }`}
                            >
                                {isConfirming ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span>
                                            {t(
                                                "boq.pdfTable.actions.processing"
                                            )}
                                        </span>
                                    </div>
                                ) : (
                                    t("boq.pdfTable.actions.confirmSelection")
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Walls Table Display - Made wider */}
            {walls.length > 0 ? (
                <div className="space-y-2 w-full">
                    <div className="flex items-center space-x-1 mb-2">
                        <div className="w-0.5 h-4 bg-blue-500 rounded-full"></div>
                        <h5 className="text-sm font-semibold text-gray-200">
                            {t("boq.pdfTable.wallDetails.title")}
                        </h5>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-transparent"></div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-600/50 overflow-hidden w-full">
                        {/* Table Header - Single header for all walls */}
                        <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-600/50">
                            <div className="grid grid-cols-4 gap-4 text-xs">
                                <div className="font-semibold text-gray-300 flex items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1"></div>
                                    {t("boq.pdfTable.wallDetails.wallId")}
                                </div>
                                <div className="font-semibold text-gray-300 text-center">
                                    {t("boq.pdfTable.wallDetails.length")}
                                </div>
                                <div className="font-semibold text-gray-300 text-center">
                                    {t("boq.pdfTable.wallDetails.grossArea")}
                                </div>
                                <div className="font-semibold text-gray-300 text-center">
                                    {t("boq.pdfTable.wallDetails.netArea")}
                                </div>
                            </div>
                        </div>

                        {/* Table Body - Scrollable content */}
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {walls.map((wall, index) => (
                                <div
                                    key={index}
                                    className="border-b border-gray-600/30 last:border-b-0"
                                >
                                    {/* Wall Data Row */}
                                    <div className="px-4 py-2 hover:bg-gray-800/30 transition-colors duration-200">
                                        <div className="grid grid-cols-4 gap-4 text-xs mb-2">
                                            <div className="text-blue-400 font-semibold">
                                                {wall.id || `Wall ${index + 1}`}
                                            </div>
                                            <div className="text-gray-200 text-center bg-gray-800/50 rounded py-1.5 px-3">
                                                {wall.total_length
                                                    ? wall.total_length
                                                          .raw_text ||
                                                      `${wall.total_length.value} ${wall.total_length.unit}`
                                                    : "N/A"}
                                            </div>
                                            <div className="text-gray-200 text-center bg-gray-800/50 rounded py-1.5 px-3">
                                                {wall.total_gross_area
                                                    ? wall.total_gross_area
                                                          .raw_text ||
                                                      `${wall.total_gross_area.value} ${wall.total_gross_area.unit}`
                                                    : "N/A"}
                                            </div>
                                            <div className="text-gray-200 text-center bg-gray-800/50 rounded py-1.5 px-3">
                                                {wall.total_net_area
                                                    ? wall.total_net_area
                                                          .raw_text ||
                                                      `${wall.total_net_area.value} ${wall.total_net_area.unit}`
                                                    : "N/A"}
                                            </div>
                                        </div>

                                        {/* Regulations Section */}
                                        {wall.regulations &&
                                        wall.regulations.length > 0 ? (
                                            <div className="mt-2 pt-2 border-t border-gray-600/50">
                                                <div className="flex items-center space-x-1 mb-2">
                                                    <div className="w-0.5 h-3 bg-yellow-500 rounded-full"></div>
                                                    <span className="text-xs font-medium text-gray-300">
                                                        {t(
                                                            "boq.pdfTable.wallDetails.regulations",
                                                            {
                                                                count: wall
                                                                    .regulations
                                                                    .length,
                                                            }
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="grid gap-1 max-h-20 overflow-y-auto pr-1 custom-scrollbar-yellow">
                                                    {wall.regulations.map(
                                                        (reg, regIndex) => {
                                                            const regulationNr =
                                                                reg.regulations
                                                                    ?.full_nr ||
                                                                "N/A";
                                                            const isSelected =
                                                                isRegulationSelected(
                                                                    index,
                                                                    regIndex
                                                                );

                                                            console.log(
                                                                `Rendering regulation ${index}-${regIndex}, isSelected: ${isSelected}`
                                                            );

                                                            return (
                                                                <div
                                                                    key={`${index}-${regIndex}`}
                                                                    onClick={() =>
                                                                        handleRegulationClick(
                                                                            index,
                                                                            regIndex,
                                                                            reg
                                                                        )
                                                                    }
                                                                    className={`bg-gradient-to-r rounded p-2 border transition-all duration-200 cursor-pointer ${
                                                                        isSelected
                                                                            ? "from-blue-900/40 to-blue-800/60 border-blue-500/70 hover:border-blue-400/80 shadow-lg"
                                                                            : "from-yellow-900/20 to-gray-800/50 border-yellow-600/30 hover:border-yellow-500/50"
                                                                    }`}
                                                                    style={{
                                                                        boxShadow:
                                                                            isSelected
                                                                                ? "0 0 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(59, 130, 246, 0.2)"
                                                                                : "none",
                                                                    }}
                                                                >
                                                                    <div className="flex items-start space-x-2">
                                                                        <div
                                                                            className={`font-medium text-xs px-1.5 py-0.5 rounded min-w-fit ${
                                                                                isSelected
                                                                                    ? "bg-blue-500/30 text-blue-300 border border-blue-400/50"
                                                                                    : "bg-yellow-500/20 text-yellow-400"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                regulationNr
                                                                            }
                                                                        </div>
                                                                        <div
                                                                            className={`text-xs leading-relaxed flex-1 ${
                                                                                isSelected
                                                                                    ? "text-blue-200"
                                                                                    : "text-gray-200"
                                                                            }`}
                                                                        >
                                                                            {reg
                                                                                .regulations
                                                                                ?.short_text ||
                                                                                t(
                                                                                    "boq.pdfTable.wallDetails.noDescription"
                                                                                )}
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div className="text-blue-400 text-sm font-bold">
                                                                                ✓
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            wall.element_count === 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-600/50">
                                                    <div className="text-center text-gray-400 text-xs italic bg-gray-800/30 rounded py-2">
                                                        {t(
                                                            "boq.pdfTable.wallDetails.noElements"
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-6">
                    <div className="text-gray-400 text-base mb-1">📋</div>
                    <div className="text-gray-400 text-sm font-medium">
                        {t("boq.pdfTable.noWalls.title")}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                        {t("boq.pdfTable.noWalls.description")}
                    </div>
                </div>
            )}

            {/* Warning Section */}
            {pdfData.warning && (
                <div className="mt-3 p-3 bg-gradient-to-r from-yellow-900/50 to-orange-900/30 border border-yellow-600/50 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <div className="text-yellow-400 text-sm">
                            {t("boq.pdfTable.warning.prefix")}
                        </div>
                        <div>
                            <div className="text-yellow-300 font-medium text-xs mb-0.5">
                                {t("boq.pdfTable.warning.title")}
                            </div>
                            <div className="text-yellow-200 text-xs leading-relaxed">
                                {pdfData.warning}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfTableDisplay;
