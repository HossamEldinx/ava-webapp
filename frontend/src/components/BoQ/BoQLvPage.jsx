import React, { useState, useEffect } from "react";
import OnlvDataDisplay from "../copilot/OnlvDataDisplay";
import { FaSpinner } from "react-icons/fa";
import { API_ENDPOINTS } from "../../config/api";
import { useLocalization } from "../../contexts/LocalizationContext";

const BoQLvPage = ({
    boq,
    onlvData,
    onBackToBoQList,
    currentUser,
    onNavigateToFiles,
}) => {
    const { t } = useLocalization();
    const [currentOnlvData, setCurrentOnlvData] = useState(onlvData);
    const [isLoadingOnlvData, setIsLoadingOnlvData] = useState(false);
    const [onlvDataError, setOnlvDataError] = useState(null);

    // Fetch ONLV empty JSON if no onlvData is provided and we have a BoQ
    useEffect(() => {
        const fetchOnlvEmptyJson = async () => {
            if (boq?.id) {
                setIsLoadingOnlvData(true);
                setOnlvDataError(null);
                try {
                    const response = await fetch(
                        API_ENDPOINTS.UTILS.GET_ONLV_EMPTY_JSON(
                            boq.project_id,
                            boq.id
                        )
                    );
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch ONLV empty JSON: ${response.status} ${response.statusText}`
                        );
                    }
                    const onlvEmptyJson = await response.json();
                    setCurrentOnlvData(onlvEmptyJson);
                } catch (error) {
                    console.error(
                        `❌ ${t("boq.boqLvPage.errorPrefix")} ${t(
                            "boqLvPage.fetchingBoQData"
                        )}:`,
                        error
                    );
                    setOnlvDataError(error.message);
                } finally {
                    setIsLoadingOnlvData(false);
                }
            }
        };

        if (!onlvData) {
            fetchOnlvEmptyJson();
        }
    }, [boq?.id, boq?.project_id, boq?.name, onlvData, t]);

    // Retry fetching ONLV data
    const retryFetchOnlvData = () => {
        setOnlvDataError(null);
        // Trigger useEffect by temporarily clearing currentOnlvData
        setCurrentOnlvData(null);
    };

    return (
        <div className="bg-gray-900 text-gray-100 flex flex-col relative h-screen">
            {/* Header */}
            <div className=" border-b border-gray-700 p-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center">
                    <button
                        onClick={onBackToBoQList}
                        className="px-2 py-1 border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105 flex items-center space-x-1 text-xs mr-3"
                    >
                        <svg
                            className="w-3 h-3"
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
                        <span>{t("boq.boqLvPage.backToBoQ")}</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-100">
                        {t("boq.boqLvPage.boqAnalysis")}:{" "}
                        {boq?.name || t("boq.boqLvPage.unknownBoQ")}
                    </h1>
                </div>

                {/* BOQ Info (description only) */}
                {boq?.description && (
                    <div className="text-xs text-gray-400 ml-4 truncate max-w-xs">
                        {boq.description}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {/* Table Only Mode */}
                <div className="h-full">
                    {isLoadingOnlvData ? (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-gray-100">
                            <FaSpinner className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {t("boq.boqLvPage.loadingBoQData")}
                            </h3>
                            <p className="text-gray-400 text-center max-w-md">
                                {t("boq.boqLvPage.fetchingBoQData")}
                            </p>
                        </div>
                    ) : onlvDataError ? (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-gray-100">
                            <div className="text-red-500 mb-4">
                                <svg
                                    className="w-12 h-12"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-red-400">
                                {t("boq.boqLvPage.errorLoadingBoQData")}
                            </h3>
                            <p className="text-gray-400 text-center max-w-md mb-4">
                                {onlvDataError}
                            </p>
                            <button
                                onClick={retryFetchOnlvData}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                {t("boq.boqLvPage.retry")}
                            </button>
                        </div>
                    ) : (
                        <OnlvDataDisplay
                            key={JSON.stringify(currentOnlvData)}
                            onlvData={currentOnlvData}
                            onNavigateToFiles={onNavigateToFiles}
                            title={
                                currentOnlvData
                                    ? t("boq.boqLvPage.onlvDataAnalysis")
                                    : t("boq.boqLvPage.boqDataViewer")
                            }
                            description={
                                currentOnlvData
                                    ? t("boq.boqLvPage.analyzingBoQDataUseChat")
                                    : t("boq.boqLvPage.loadOnlvDataOrUseAIChat")
                            }
                        />
                    )}
                </div>
            </div>

            {/* Mobile Chat Overlay - REMOVED */}
        </div>
    );
};

export default BoQLvPage;
