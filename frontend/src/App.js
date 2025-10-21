import React, { useState, useEffect, Suspense } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import NavigationHeader from "./components/NavigationHeader";
import { AuthPage } from "./components/auth";
import { LocalizationProvider } from "./contexts/LocalizationContext";

// Lazy load all page components to reduce initial bundle size and RAM usage
const HomePage = React.lazy(() => import("./HomePage"));
const OnlvTablePage = React.lazy(() => import("./OnlvPage"));
const BoQPage = React.lazy(() => import("./BoQPage"));
const CategoriesPage = React.lazy(() => import("./CategoriesPage"));
const PromptTestingPage = React.lazy(() => import("./PromptTestingPage"));
const Normen = React.lazy(() => import("./Normen"));
const CustomStandards = React.lazy(() => import("./CustomStandards"));
const CustomPositions = React.lazy(() => import("./CustomPositions"));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>
);

// Main App Router Component
function AppRouter() {
    // State to manage authentication
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // State to hold the parsed ONLV data, lazy loaded when needed
    const [onlvData, setOnlvData] = useState(null);

    // State to hold selected prompt data for editing
    const [selectedPrompt, setSelectedPrompt] = useState(null);

    // Removed automatic example data loading

    // Check for existing user on component mount
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Error parsing stored user data:", error);
                localStorage.removeItem("user");
            }
        }
    }, []);

    // Removed automatic example data loading on authentication

    // Authentication functions
    const handleAuthSuccess = (data, authType) => {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(data.user));
    };

    const handleLogout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("user");
    };

    // Handle data from ChatApp and navigate to ONLV table
    const handleChatDataToOnlv = (jsonData) => {
        setOnlvData(jsonData);
    };

    const handlePromptTesting = (promptData = null) => {
        setSelectedPrompt(promptData);
    };

    // Show auth page if not authenticated
    if (!isAuthenticated) {
        return (
            <LocalizationProvider>
                <AuthPage onAuthSuccess={handleAuthSuccess} />
            </LocalizationProvider>
        );
    }

    // Render the main app with routing
    return (
        <LocalizationProvider>
            <Router>
                <div className="min-h-screen bg-gray-900">
                    <AppContent
                        user={user}
                        onlvData={onlvData}
                        selectedPrompt={selectedPrompt}
                        onLogout={handleLogout}
                        onChatDataToOnlv={handleChatDataToOnlv}
                        onPromptTesting={handlePromptTesting}
                    />
                </div>
            </Router>
        </LocalizationProvider>
    );
}

// Separate component to handle routing and navigation
function AppContent({
    user,
    onlvData,
    selectedPrompt,
    onLogout,
    onChatDataToOnlv,
    onPromptTesting,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
            <NavigationHeader
                currentPage={location.pathname}
                onNavigateToHome={() => navigate("/")}
                onNavigateToTable={() => navigate("/table")}
                onNavigateToBoQ={() => navigate("/boq")}
                onNavigateToCategories={() => navigate("/categories")}
                onNavigateToPromptTesting={(promptData = null) => {
                    onPromptTesting(promptData);
                    navigate("/prompt-testing");
                }}
                user={user}
                onLogout={onLogout}
                onNavigateToAuth={() => navigate("/auth")}
            />

            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <HomePage
                                onNavigateToBoQ={() => navigate("/boq")}
                                onNavigateToCategories={() =>
                                    navigate("/categories")
                                }
                                onNavigateToCustomPositions={() =>
                                    navigate("/custom-positions")
                                }
                            />
                        }
                    />
                    <Route
                        path="/table"
                        element={
                            <OnlvTablePage
                                onlvData={onlvData}
                                onNavigateToFiles={() => navigate("/boq")}
                            />
                        }
                    />
                    <Route
                        path="/boq"
                        element={
                            <BoQPage
                                onFileSelect={(data, file) => {
                                    onChatDataToOnlv(data);
                                    navigate("/table");
                                }}
                                onNavigateToOnlvPage={() => navigate("/table")}
                                currentUser={user}
                            />
                        }
                    />
                    <Route
                        path="/categories"
                        element={<CategoriesPage currentUser={user} />}
                    />
                    <Route
                        path="/prompt-testing"
                        element={
                            <PromptTestingPage
                                selectedPrompt={selectedPrompt}
                            />
                        }
                    />
                    <Route path="/normen" element={<Normen />} />
                    <Route
                        path="/custom-standards"
                        element={<CustomStandards />}
                    />
                    <Route
                        path="/custom-positions"
                        element={<CustomPositions />}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </>
    );
}

// Main App component wrapper
function App() {
    return <AppRouter />;
}

export default App;
