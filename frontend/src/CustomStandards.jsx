import React, { useState, useEffect, lazy, Suspense } from "react";
import { useLocalization } from "./contexts/LocalizationContext";

// Lazy load the OnlvTable component
const OnlvTable = lazy(() => import("./onlv_js_web/OnlvTable"));

// Loading spinner component
const LoadingSpinner = ({ t }) => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
            <p className="text-white text-xl font-semibold">
                {t("ai_training.customStandards.loading.title")}
            </p>
            <p className="text-gray-400 text-sm mt-2">
                {t("ai_training.customStandards.loading.description")}
            </p>
        </div>
    </div>
);

// Error boundary component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error loading Custom Standards:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const t = this.props.t || ((key) => key); // Fallback if t is not provided
            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-2xl">
                        <h2 className="text-2xl font-bold text-red-400 mb-4">
                            {t(
                                "ai_training.customStandards.error.loadingTitle"
                            )}
                        </h2>
                        <p className="text-gray-300 mb-4">
                            {this.state.error?.message ||
                                t(
                                    "ai_training.customStandards.error.defaultMessage"
                                )}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors duration-200"
                        >
                            {t(
                                "ai_training.customStandards.error.reloadButton"
                            )}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function CustomStandards() {
    const { t } = useLocalization();
    const [wallsData, setWallsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Lazy load the JSON data
    useEffect(() => {
        const loadWallsData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Simulate network delay for better UX (optional)
                await new Promise((resolve) => setTimeout(resolve, 300));

                // Dynamically import the JSON data
                const data = await import("../src/CommonData/LG00_ULG39.json");

                // The imported module has a default export
                setWallsData(data.default);
                setIsLoading(false);
            } catch (err) {
                console.error("Error loading walls data:", err);
                setError(err.message || "Failed to load data");
                setIsLoading(false);
            }
        };

        loadWallsData();
    }, []);

    // Handle position selection (callback for OnlvTable)
    const handlePositionSelect = (positionData) => {
        console.log("Position selected:", positionData);
        // You can add custom logic here when a position is selected
    };

    return (
        <ErrorBoundary t={t}>
            <div className="min-h-screen bg-gray-900 text-white">
                {/* Header Section */}
                <div className=" py-8 px-4 sm:px-6 lg:px-8 shadow-lg">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-4xl font-extrabold text-white mb-2">
                            {t("ai_training.customStandards.title")}
                        </h1>
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-7xl mx-auto p-2 py-4">
                    {isLoading ? (
                        <LoadingSpinner t={t} />
                    ) : error ? (
                        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8">
                            <h2 className="text-2xl font-bold text-red-400 mb-4">
                                {t(
                                    "ai_training.customStandards.error.dataTitle"
                                )}
                            </h2>
                            <p className="text-gray-300 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors duration-200"
                            >
                                {t(
                                    "ai_training.customStandards.error.retryButton"
                                )}
                            </button>
                        </div>
                    ) : wallsData ? (
                        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                            <Suspense fallback={<LoadingSpinner t={t} />}>
                                <OnlvTable
                                    jsonData={wallsData}
                                    onPositionSelect={handlePositionSelect}
                                    showHeaderSection={false}
                                />
                            </Suspense>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-lg">
                                {t("ai_training.customStandards.empty")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default CustomStandards;
