import React, { useState } from "react";
import { useLocalization } from "../contexts/LocalizationContext";
import LanguageSwitcher from "./common/LanguageSwitcher";

function NavigationHeader({
    currentPage,
    onNavigateToHome,
    onNavigateToTable,
    onNavigateToBoQ,
    onNavigateToCategories,
    user,
    onLogout,
    onNavigateToAuth,
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { t } = useLocalization();
    return (
        <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <h1 className="sr-only">ONLV Application</h1>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="flex space-x-1">
                        <button
                            onClick={onNavigateToHome}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center ${
                                currentPage === "home" ||
                                currentPage === "" ||
                                currentPage === "/"
                                    ? "border-b-2 border-indigo-600 text-white"
                                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                            }`}
                        >
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
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2 2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                            </svg>
                            {t("navigation.home")}
                        </button>
                        <button
                            onClick={onNavigateToCategories}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center ${
                                currentPage === "categories" ||
                                currentPage === "/categories"
                                    ? "border-b-2 border-indigo-600 text-white"
                                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                            }`}
                        >
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
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                            </svg>
                            {t("navigation.myElements")}
                        </button>
                        <button
                            onClick={onNavigateToBoQ}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center ${
                                currentPage === "boq" || currentPage === "/boq"
                                    ? "border-b-2 border-indigo-600 text-white"
                                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                            }`}
                        >
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
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            {t("navigation.projects")}
                        </button>
                    </nav>

                    {/* Language Switcher and User Info */}
                    <div className="flex items-center space-x-4">
                        <LanguageSwitcher />
                        {user ? (
                            <>
                                {/* Clickable User Avatar */}
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsDropdownOpen(!isDropdownOpen)
                                        }
                                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "U"}
                                            </span>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${
                                                isDropdownOpen
                                                    ? "rotate-180"
                                                    : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() =>
                                                    setIsDropdownOpen(false)
                                                }
                                            ></div>

                                            {/* Dropdown Content */}
                                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                                <div className="p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-medium">
                                                                {user.name
                                                                    ?.charAt(0)
                                                                    ?.toUpperCase() ||
                                                                    "U"}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {user.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setIsDropdownOpen(
                                                                false
                                                            );
                                                            onNavigateToTable();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                                                    >
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
                                                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                            />
                                                        </svg>
                                                        {t(
                                                            "navigation.dataTable"
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsDropdownOpen(
                                                                false
                                                            );
                                                            onLogout();
                                                        }}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 mt-2"
                                                    >
                                                        {t("navigation.logout")}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={onNavigateToAuth}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                                {t("navigation.signIn")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default NavigationHeader;
