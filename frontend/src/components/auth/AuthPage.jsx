import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

const AuthPage = ({ onAuthSuccess }) => {
    const [activeTab, setActiveTab] = useState("login");
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleSuccess = (data) => {
        const isLogin = activeTab === "login";
        const successMessage = isLogin
            ? `Welcome back, ${data.user?.name || "User"}!`
            : `Account created successfully! Welcome, ${
                  data.user?.name || "User"
              }!`;

        setMessage({ type: "success", text: successMessage });

        // Call parent success handler if provided
        if (onAuthSuccess) {
            onAuthSuccess(data, activeTab);
        }

        // Auto-switch to login after successful registration
        if (!isLogin) {
            setTimeout(() => {
                setActiveTab("login");
                setMessage({ type: "", text: "" });
            }, 2000);
        }
    };

    const handleError = (error) => {
        setMessage({ type: "error", text: error });
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setMessage({ type: "", text: "" }); // Clear messages when switching tabs
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <svg
                            className="h-8 w-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                        {activeTab === "login"
                            ? "Sign in to your account"
                            : "Create your account"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {activeTab === "login"
                            ? "Welcome back! Please sign in to continue."
                            : "Join us today and get started with your account."}
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => switchTab("login")}
                        className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeTab === "login"
                                ? "bg-indigo-600 text-white"
                                : "text-gray-300 hover:text-white hover:bg-gray-700"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => switchTab("register")}
                        className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeTab === "register"
                                ? "bg-indigo-600 text-white"
                                : "text-gray-300 hover:text-white hover:bg-gray-700"
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Success/Error Messages */}
                {message.text && (
                    <div
                        className={`rounded-lg px-4 py-3 ${
                            message.type === "success"
                                ? "bg-green-900/50 border border-green-500 text-green-200"
                                : "bg-red-900/50 border border-red-500 text-red-200"
                        }`}
                    >
                        <div className="flex items-center">
                            {message.type === "success" ? (
                                <svg
                                    className="w-5 h-5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-5 h-5 mr-2"
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
                            )}
                            {message.text}
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                    {activeTab === "login" ? (
                        <Login
                            onSuccess={handleSuccess}
                            onError={handleError}
                        />
                    ) : (
                        <Register
                            onSuccess={handleSuccess}
                            onError={handleError}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        By{" "}
                        {activeTab === "login"
                            ? "signing in"
                            : "creating an account"}
                        , you agree to our{" "}
                        <button className="text-indigo-400 hover:text-indigo-300">
                            Terms of Service
                        </button>{" "}
                        and{" "}
                        <button className="text-indigo-400 hover:text-indigo-300">
                            Privacy Policy
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
