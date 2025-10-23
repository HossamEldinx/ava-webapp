/**
 * BoQPage Component - Performance Optimized
 *
 * Performance Optimizations Applied:
 * 1. Lazy Loading: All component imports use React.lazy() for code splitting
 * 2. Suspense Wrappers: Components load only when needed with loading fallbacks
 * 3. Memory Management: State cleanup on unmount and view switches
 * 4. Memoized Handlers: useCallback prevents unnecessary re-renders
 * 5. Memoized Computations: useMemo for expensive calculations
 * 6. Conditional API Calls: Data fetched only when view requires it
 * 7. Component Splitting: Large components separated into smaller chunks
 */

import React, {
    useState,
    useEffect,
    Suspense,
    useCallback,
    useMemo,
} from "react";
import { FaRegFolderOpen, FaPlus } from "react-icons/fa";
import { API_ENDPOINTS } from "./config/api";
import { useLocalization } from "./contexts/LocalizationContext";

// Lazy load all components for better code splitting and performance
const CreateProjectModal = React.lazy(() =>
    import("./components/BoQ/CreateProjectModal")
);
const UnifiedFileUploader = React.lazy(() =>
    import("./components/BoQ/UnifiedFileUploader")
);
const BoQListComponent = React.lazy(() =>
    import("./components/BoQ/BoQListComponent")
);
const BoQLvPage = React.lazy(() => import("./components/BoQ/BoQLvPage"));
const CreateOnlvModal = React.lazy(() =>
    import("./components/BoQ/CreateOnlvModal")
);
const CreateBoQModal = React.lazy(() =>
    import("./components/BoQ/CreateBoQModal")
);

// Loading spinner component for Suspense fallbacks
const ComponentLoader = ({ size = "small" }) => (
    <div
        className={`flex items-center justify-center ${
            size === "small" ? "p-4" : "min-h-screen"
        }`}
    >
        <div
            className={`animate-spin rounded-full border-b-2 border-indigo-500 ${
                size === "small" ? "h-8 w-8" : "h-16 w-16"
            }`}
        ></div>
    </div>
);

function BoQPage({ onFileSelect, onNavigateToOnlvPage, currentUser }) {
    const { t } = useLocalization();
    const [projects, setProjects] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isCreateOnlvModalOpen, setIsCreateOnlvModalOpen] = useState(false);
    const [isCreateBoQModalOpen, setIsCreateBoQModalOpen] = useState(false); // New state for CreateBoQModal
    const [selectedProjectForBoQ, setSelectedProjectForBoQ] = useState(null); // New state for selected project for BOQ creation
    const [selectedBoQForUpload, setSelectedBoQForUpload] = useState(null); // New state for selected BOQ for upload
    const [currentView, setCurrentView] = useState("projects"); // "projects", "boqs", or "analysis"
    const [selectedProjectForBoQList, setSelectedProjectForBoQList] =
        useState(null); // Project for which to show BOQs
    const [selectedBoQForAnalysis, setSelectedBoQForAnalysis] = useState(null); // BOQ for analysis page
    const [analysisOnlvData, setAnalysisOnlvData] = useState(null); // ONLV data for analysis page

    // Optimized API call with useCallback to prevent unnecessary re-renders
    const fetchProjects = useCallback(async () => {
        try {
            setIsLoading(true);
            setError("");

            const response = await fetch(API_ENDPOINTS.PROJECTS.GET_ALL());
            const result = await response.json();

            if (response.ok && result.success) {
                setProjects(result.data || []);
            } else {
                setError(result.error || "Failed to fetch projects");
            }
        } catch (err) {
            setError("Network error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch projects only when component mounts or when explicitly needed
    useEffect(() => {
        if (currentView === "projects") {
            fetchProjects();
        }
    }, [currentView, fetchProjects]);

    // Memory optimization: Clean up state when component unmounts
    useEffect(() => {
        return () => {
            // Clean up any ongoing API calls or timeouts
            setProjects([]);
            setSelectedProject(null);
            setSelectedProjectForBoQList(null);
            setSelectedBoQForAnalysis(null);
            setAnalysisOnlvData(null);
        };
    }, []);

    // Memory optimization: Reset state when switching views to free up memory
    useEffect(() => {
        if (currentView === "projects") {
            // Clear analysis data when not in analysis view
            setSelectedBoQForAnalysis(null);
            setAnalysisOnlvData(null);
        }
        if (currentView !== "boqs" && currentView !== "analysis") {
            // Clear BOQ list data when not in BOQ-related views
            setSelectedProjectForBoQList(null);
        }
    }, [currentView]);

    // Memoized handlers to prevent unnecessary re-renders
    const handleProjectCreated = useCallback((newProject) => {
        setProjects((prev) => [newProject, ...prev]);
    }, []);

    const handleFilesUploaded = useCallback((uploadedFiles) => {
        console.log("Files uploaded:", uploadedFiles);
        // You can add additional logic here to handle uploaded files
    }, []);

    // Memoized modal handlers
    const openUploadModal = useCallback((boq) => {
        setSelectedBoQForUpload(boq);
        setIsUploadModalOpen(true);
    }, []);

    const closeUploadModal = useCallback(() => {
        setIsUploadModalOpen(false);
        setSelectedBoQForUpload(null);
    }, []);

    // Memoized navigation handlers
    const handleViewBoQs = useCallback((project) => {
        console.log("handleViewBoQs called with project:", project);
        setSelectedProjectForBoQList(project);
        setCurrentView("boqs");
        console.log(
            "currentView set to:",
            "boqs",
            "selectedProjectForBoQList set to:",
            project
        );
    }, []);

    const handleBackToProjects = useCallback(() => {
        setCurrentView("projects");
        setSelectedProjectForBoQList(null);
        setSelectedBoQForAnalysis(null);
        setAnalysisOnlvData(null);
    }, []);

    const handleBackToBoQList = useCallback(() => {
        setCurrentView("boqs");
        setSelectedBoQForAnalysis(null);
        setAnalysisOnlvData(null);
    }, []);

    const handleOpenBoQAnalysis = useCallback((boq, onlvData = null) => {
        setSelectedBoQForAnalysis(boq);
        setAnalysisOnlvData(onlvData);
        setCurrentView("analysis");
    }, []);

    // Memoized delete handlers
    const openDeleteModal = useCallback((project) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
    }, []);

    const handleProjectDelete = useCallback(async () => {
        if (!projectToDelete) return;

        try {
            const response = await fetch(
                API_ENDPOINTS.PROJECTS.DELETE(projectToDelete.id),
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                // Remove the project from the local state
                setProjects((prev) =>
                    prev.filter((p) => p.id !== projectToDelete.id)
                );
                closeDeleteModal();
                setError(""); // Clear any previous errors
            } else {
                setError(result.error || "Failed to delete project");
                closeDeleteModal();
            }
        } catch (err) {
            setError("Network error: " + err.message);
            closeDeleteModal();
        }
    }, [projectToDelete, closeDeleteModal]);

    // Memoized ONLV modal handlers
    const closeCreateOnlvModal = useCallback(() => {
        setIsCreateOnlvModalOpen(false);
        setSelectedProject(null);
    }, []);

    const handleOnlvCreated = useCallback(
        (onlvJson) => {
            console.log("ONLV JSON created:", onlvJson);
            // Navigate to ONLV page with the created JSON data
            if (onFileSelect && onlvJson) {
                onFileSelect(onlvJson, { name: "Generated ONLV JSON" });
            }
        },
        [onFileSelect]
    );

    // Memoized BOQ creation handlers
    const openCreateBoQModal = useCallback((project) => {
        setSelectedProjectForBoQ(project);
        setIsCreateBoQModalOpen(true);
    }, []);

    const closeCreateBoQModal = useCallback(() => {
        setIsCreateBoQModalOpen(false);
        setSelectedProjectForBoQ(null);
    }, []);

    const handleBoQCreated = useCallback(
        (newBoQ) => {
            console.log("BOQ created:", newBoQ);
            // Optionally refresh projects or BOQs list here
            fetchProjects(); // Refresh projects to show updated BOQ counts if implemented
        },
        [fetchProjects]
    );

    // Memoized computed values for better performance
    const hasProjects = useMemo(() => projects.length > 0, [projects.length]);

    const currentViewComponent = useMemo(() => {
        switch (currentView) {
            case "boqs":
                return (
                    <Suspense fallback={<ComponentLoader size="large" />}>
                        <BoQListComponent
                            project={selectedProjectForBoQList}
                            onBackToProjects={handleBackToProjects}
                            onOpenOnlvUploader={openUploadModal}
                            onFileSelect={onFileSelect}
                            onNavigateToOnlvPage={onNavigateToOnlvPage}
                            currentUser={currentUser}
                            onCreateBoQ={openCreateBoQModal}
                            onOpenBoQAnalysis={handleOpenBoQAnalysis}
                        />
                    </Suspense>
                );
            case "analysis":
                return (
                    <Suspense fallback={<ComponentLoader size="large" />}>
                        <BoQLvPage
                            boq={selectedBoQForAnalysis}
                            onlvData={analysisOnlvData}
                            onBackToBoQList={handleBackToBoQList}
                            currentUser={currentUser}
                            onNavigateToFiles={onNavigateToOnlvPage}
                        />
                    </Suspense>
                );
            default:
                return null;
        }
    }, [
        currentView,
        selectedProjectForBoQList,
        selectedBoQForAnalysis,
        analysisOnlvData,
        handleBackToProjects,
        handleBackToBoQList,
        openUploadModal,
        openCreateBoQModal,
        handleOpenBoQAnalysis,
        onFileSelect,
        onNavigateToOnlvPage,
        currentUser,
    ]);

    return (
        <div className="min-h-screen bg-gray-900 p-0">
            {console.log(
                "Rendering BoQPage. Current view:",
                currentView,
                "Selected project for BoQ list:",
                selectedProjectForBoQList
            )}
            <div className="w-full">
                {/* Only show header when in projects view */}
                {currentView === "projects" && (
                    <div className="flex items-center justify-between mb-6 m-4">
                        <h1 className="text-lg font-bold text-gray-100">
                            {t("boq.projects")}
                        </h1>
                        <div className="flex space-x-2">
                            {" "}
                            {/* Wrap buttons in a div for spacing */}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                <span>{t("boq.createNewProject")}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                        <p className="text-sm text-red-100">{error}</p>
                        <button
                            onClick={fetchProjects}
                            className="mt-2 text-sm text-red-200 hover:text-white underline"
                        >
                            {t("boq.tryAgain")}
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 text-center">
                        <div className="flex items-center justify-center space-x-2">
                            <svg
                                className="animate-spin h-6 w-6 text-indigo-500"
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
                            <span className="text-white">
                                {t("boq.loadingProjects")}
                            </span>
                        </div>
                    </div>
                ) : currentView === "projects" ? (
                    hasProjects ? (
                        <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700 m-4">
                            <h2 className="text-base font-semibold text-white mb-3">
                                {t("boq.yourProjects", {
                                    count: projects.length,
                                })}
                            </h2>
                            <div className="grid gap-4">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="bg-gray-700 p-2 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white">
                                                    <button
                                                        onClick={() =>
                                                            handleViewBoQs(
                                                                project
                                                            )
                                                        }
                                                        className="text-lg font-semibold text-white text-left hover:text-indigo-400 transition-colors duration-200 focus:outline-none"
                                                    >
                                                        {project.name}
                                                    </button>
                                                </h3>
                                                {project.description && (
                                                    <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-1 ml-2">
                                                {/* New "Create BOQ" button */}
                                                <button
                                                    onClick={() =>
                                                        openCreateBoQModal(
                                                            project
                                                        )
                                                    }
                                                    className="border-2 border-gray-500 text-gray-300 hover:border-green-600 hover:bg-green-600 hover:text-white p-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center hover:shadow-md transform hover:scale-105"
                                                    title={t(
                                                        "boq.createNewBoQ"
                                                    )}
                                                >
                                                    <FaPlus className="w-4 h-4" />
                                                </button>
                                                {/* Changed Upload button to open ProjectFilesModal for BOQ selection */}
                                                <button
                                                    onClick={() =>
                                                        handleViewBoQs(project)
                                                    }
                                                    className="border-2 border-gray-500 text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-white p-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center hover:shadow-md transform hover:scale-105"
                                                    title={t(
                                                        "boq.viewBoQsAndFiles"
                                                    )}
                                                >
                                                    <FaRegFolderOpen className="w-4 h-4" />
                                                </button>
                                                <div className="flex-1"></div>
                                                <button
                                                    onClick={() =>
                                                        openDeleteModal(project)
                                                    }
                                                    className="border-2 border-gray-500 text-gray-300 hover:border-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center hover:shadow-md transform hover:scale-105"
                                                    title={t(
                                                        "boq.deleteProject"
                                                    )}
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5"
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
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 text-center">
                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">
                                {t("boq.noProjectsYet")}
                            </h3>
                            <p className="text-gray-300 mb-6">
                                {t("boq.createFirstProjectDescription")}
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 inline-flex items-center space-x-2"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                <span>{t("boq.createYourFirstProject")}</span>
                            </button>
                        </div>
                    )
                ) : (
                    currentViewComponent
                )}

                {/* Help Section - Only show if not in analysis view */}
                {/*               {currentView !== "analysis" && (
                    <div className="m-4 bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-sm font-medium text-white">
                                {t("boq.howToUseBoQManagement")}
                            </h3>
                            <button
                                onClick={() =>
                                    setIsHelpSectionOpen(!isHelpSectionOpen)
                                }
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {isHelpSectionOpen ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 15l7-7 7 7"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    )}
                                </svg>
                            </button>
                        </div>
                        {isHelpSectionOpen && (
                            <div className="space-y-2 text-sm text-gray-300">
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.step1")}
                                    </strong>{" "}
                                    {t("boq.step1Description")}
                                </p>
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.step2")}
                                    </strong>{" "}
                                    {t("boq.step2Description")}
                                </p>
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.step3")}
                                    </strong>{" "}
                                    {t("boq.step3Description")}
                                </p>
                                <ul className="list-disc list-inside ml-4 text-gray-300">
                                    <li>
                                        <strong>{t("boq.pdfFiles")}</strong>{" "}
                                        {t("boq.pdfFilesDescription")}
                                    </li>
                                    <li>
                                        <strong>{t("boq.onlvFiles")}</strong>{" "}
                                        {t("boq.onlvFilesDescription")}
                                    </li>
                                </ul>
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.step4")}
                                    </strong>{" "}
                                    {t("boq.step4Description")}
                                </p>
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.step5")}
                                    </strong>{" "}
                                    {t("boq.step5Description")}
                                </p>
                                <p>
                                    <strong className="text-indigo-400">
                                        {t("boq.note")}
                                    </strong>{" "}
                                    {t("boq.noteDescription")}
                                </p>
                            </div>
                        )}
                    </div>
                )} */}

                {/* Modals with Suspense */}
                {isCreateModalOpen && (
                    <Suspense fallback={<ComponentLoader />}>
                        <CreateProjectModal
                            isOpen={isCreateModalOpen}
                            onClose={() => setIsCreateModalOpen(false)}
                            onProjectCreated={handleProjectCreated}
                            currentUser={currentUser}
                        />
                    </Suspense>
                )}

                {/* Unified File Upload Modal */}
                {isUploadModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
                        <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        {t("boq.uploadFilesToBoQ")}
                                    </h2>
                                    <p className="text-sm text-gray-300 mt-1">
                                        {t("boq.boqLabel")}{" "}
                                        <strong>
                                            {selectedBoQForUpload?.name}
                                        </strong>
                                    </p>
                                </div>
                                <button
                                    onClick={closeUploadModal}
                                    className="text-gray-400 hover:text-white transition-colors"
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
                            <div className="p-6">
                                <Suspense fallback={<ComponentLoader />}>
                                    <UnifiedFileUploader
                                        boqId={selectedBoQForUpload?.id} // Pass boqId
                                        onFilesUploaded={handleFilesUploaded}
                                        onFileListUpdate={() => {
                                            // This callback is no longer directly refreshing ProjectFilesComponent
                                            // as it's replaced by BoQListComponent.
                                            // If a refresh is needed for the BoQListComponent, it should be handled
                                            // by passing a refresh function down to it.
                                            // For now, we'll leave it empty as the BoQListComponent handles its own state.
                                        }}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                )}

                {/* ProjectFilesModal is replaced by BoQListComponent */}

                {/* Delete Confirmation Modal */}
                {isDeleteModalOpen && projectToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
                        <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-6">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
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
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white text-center mb-2">
                                    {t("boq.deleteProject")}
                                </h3>
                                <p className="text-gray-300 text-center mb-6">
                                    {t("boq.deleteProjectConfirm", {
                                        projectName: projectToDelete.name,
                                    })}
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={closeDeleteModal}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        {t("boq.cancel")}
                                    </button>
                                    <button
                                        onClick={handleProjectDelete}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        {t("boq.delete")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create ONLV Modal */}
                {isCreateOnlvModalOpen && (
                    <Suspense fallback={<ComponentLoader />}>
                        <CreateOnlvModal
                            isOpen={isCreateOnlvModalOpen}
                            onClose={closeCreateOnlvModal}
                            project={selectedProject}
                            onOnlvCreated={handleOnlvCreated}
                            onNavigateToOnlvPage={onNavigateToOnlvPage}
                        />
                    </Suspense>
                )}

                {/* Create BOQ Modal */}
                {isCreateBoQModalOpen && (
                    <Suspense fallback={<ComponentLoader />}>
                        <CreateBoQModal
                            isOpen={isCreateBoQModalOpen}
                            onClose={closeCreateBoQModal}
                            projectId={selectedProjectForBoQ?.id}
                            onBoQCreated={handleBoQCreated}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}

export default BoQPage;
