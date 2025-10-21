import React, { useState, useEffect } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";
import { API_ENDPOINTS } from "../../config/api";
import { FaSpinner } from "react-icons/fa";

// Custom scrollbar styles (copied from PdfTableDisplay.jsx for consistency)
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

const BoQStepOneDisplay = ({
    boqId,
    initialData,
    onSendDataToOnlv,
    onStepSuccess,
}) => {
    const { t } = useLocalization();
    const [selectedRegulations, setSelectedRegulations] = useState([]);
    const [isConfirming, setIsConfirming] = useState(false);

    const data = initialData; // Data is now passed directly as a prop

    // Handle regulation click
    const handleRegulationClick = (regulation) => {
        setSelectedRegulations((prev) => {
            const isSelected = prev.some((item) => item.id === regulation.id);
            if (isSelected) {
                return prev.filter((item) => item.id !== regulation.id);
            } else {
                return [...prev, regulation];
            }
        });
    };

    // Check if regulation is selected
    const isRegulationSelected = (regulation) => {
        return selectedRegulations.some((item) => item.id === regulation.id);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (data && data.data) {
            if (selectedRegulations.length === data.data.length) {
                setSelectedRegulations([]); // Deselect all
            } else {
                setSelectedRegulations(data.data); // Select all
            }
        }
    };

    // Handle confirm selection
    const handleConfirmSelection = async () => {
        if (selectedRegulations.length === 0) return;

        setIsConfirming(true);

        try {
            // Extract the full_nr values from selected regulations
            const positionNumbers = selectedRegulations.map(
                (reg) => reg.full_nr
            );

            console.log("Sending position numbers to API:", positionNumbers);

            // Step 1: Make API call to FETCH_AND_FILTER_LG_BY_POSITION_NUMBERS
            const filterResponse = await fetch(
                API_ENDPOINTS.UTILS.FETCH_AND_FILTER_LG_BY_POSITION_NUMBERS,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        position_numbers: positionNumbers,
                    }),
                }
            );

            if (!filterResponse.ok) {
                throw new Error(`HTTP error! status: ${filterResponse.status}`);
            }

            const filterResult = await filterResponse.json();
            console.log("Filter API response:", filterResult);

            // Step 2: Get empty ONLV JSON with BOQ ID
            // Using boqId parameter which the API can handle to derive project_id internally
            const emptyJsonResponse = await fetch(
                API_ENDPOINTS.UTILS.GET_ONLV_EMPTY_JSON(null, boqId) // Pass null for projectId, boqId for boqId
            );

            if (!emptyJsonResponse.ok) {
                throw new Error(
                    `HTTP error! status: ${emptyJsonResponse.status}`
                );
            }

            const emptyJsonData = await emptyJsonResponse.json();
            console.log("Empty ONLV JSON response:", emptyJsonData);

            // Step 3: Insert filtered_data into the lg-liste.lg array
            if (
                filterResult.filtered_data &&
                emptyJsonData.onlv &&
                emptyJsonData.onlv["ausschreibungs-lv"] &&
                emptyJsonData.onlv["ausschreibungs-lv"]["gliederung-lg"] &&
                emptyJsonData.onlv["ausschreibungs-lv"]["gliederung-lg"][
                    "lg-liste"
                ]
            ) {
                // Insert the filtered LG data into the empty JSON structure
                emptyJsonData.onlv["ausschreibungs-lv"]["gliederung-lg"][
                    "lg-liste"
                ]["lg"] = filterResult.filtered_data;

                console.log(
                    "Final ONLV JSON with inserted LG data:",
                    emptyJsonData
                );

                // Send the combined data to the parent component
                if (onSendDataToOnlv) {
                    onSendDataToOnlv(emptyJsonData);
                    if (onStepSuccess) {
                        onStepSuccess(); // Notify parent component of success
                    }
                }
            } else {
                console.error(
                    "Invalid data structure in filtered_data or empty JSON"
                );
            }
        } catch (error) {
            console.error("Error confirming selection:", error);
            // You can add error handling UI here
        } finally {
            setIsConfirming(false);
        }
    };

    // Reset selections when new data comes in
    useEffect(() => {
        setSelectedRegulations([]);
    }, [initialData]);

    // Show loading state if no data provided
    if (!data) {
        return (
            <div className="flex items-center justify-center py-8">
                <FaSpinner className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="ml-2 text-gray-300">
                    {t("boq.boqStepOneDisplay.loadingStepOneData")}
                </span>
            </div>
        );
    }

    if (!data.data || data.data.length === 0) {
        return (
            <div className="text-center py-8">
                <h3 className="mt-2 text-sm font-medium text-gray-300">
                    {t("boq.boqStepOneDisplay.noRegulationsFound")}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    {t("boq.boqStepOneDisplay.checkBoqId")}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-3 mt-2 w-full overflow-hidden shadow-md border border-gray-600">
            {/* Header Section */}
            <div className="mb-3">
                {/* Select All and Confirm Buttons */}
                {data.data.length > 0 && (
                    <div className="mt-3 flex items-center justify-between bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-blue-300 text-sm font-medium">
                                {t(
                                    "boq.boqStepOneDisplay.regulationsSelected",
                                    {
                                        count: selectedRegulations.length,
                                    }
                                )}
                            </span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleSelectAll}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    selectedRegulations.length ===
                                    data.data.length
                                        ? "bg-gray-600 hover:bg-gray-500 text-white"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                }`}
                            >
                                {selectedRegulations.length === data.data.length
                                    ? t("boq.boqStepOneDisplay.deselectAll")
                                    : t("boq.boqStepOneDisplay.selectAll")}
                            </button>
                            <button
                                onClick={handleConfirmSelection}
                                disabled={
                                    isConfirming ||
                                    selectedRegulations.length === 0
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isConfirming ||
                                    selectedRegulations.length === 0
                                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl"
                                }`}
                            >
                                {isConfirming ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span>
                                            {t(
                                                "boq.boqStepOneDisplay.processing"
                                            )}
                                        </span>
                                    </div>
                                ) : (
                                    t("boq.boqStepOneDisplay.confirmSelection")
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Regulations Table Display */}
            <div className="space-y-2 w-full">
                <div className="flex items-center space-x-1 mb-2">
                    <div className="w-0.5 h-4 bg-blue-500 rounded-full"></div>
                    <h5 className="text-sm font-semibold text-gray-200">
                        {t("boq.boqStepOneDisplay.regulationsDetails")}
                    </h5>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-transparent"></div>
                </div>

                {/* Table Container */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-600/50 overflow-hidden w-full">
                    {/* Table Header */}
                    <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-600/50">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="font-semibold text-gray-300 flex items-center">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1"></div>
                                {t("boq.boqStepOneDisplay.fullNr")}
                            </div>
                            <div className="font-semibold text-gray-300">
                                {t("boq.boqStepOneDisplay.shortText")}
                            </div>
                        </div>
                    </div>

                    {/* Table Body - Scrollable content */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {data.data.map((regulation) => {
                            const isSelected = isRegulationSelected(regulation);
                            return (
                                <div
                                    key={regulation.id}
                                    onClick={() =>
                                        handleRegulationClick(regulation)
                                    }
                                    className={`bg-gradient-to-r rounded p-2 border transition-all duration-200 cursor-pointer ${
                                        isSelected
                                            ? "from-blue-900/40 to-blue-800/60 border-blue-500/70 hover:border-blue-400/80"
                                            : "from-gray-900/20 to-gray-800/50 border-gray-600/30 hover:border-gray-500/50"
                                    }`}
                                >
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="text-blue-400 font-semibold flex items-center">
                                            {regulation.full_nr || "N/A"}
                                            {isSelected && (
                                                <span className="ml-2 text-blue-400 text-xs">
                                                    ✓
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-gray-200">
                                            {regulation.short_text ||
                                                t(
                                                    "boq.boqStepOneDisplay.noShortText"
                                                )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoQStepOneDisplay;
