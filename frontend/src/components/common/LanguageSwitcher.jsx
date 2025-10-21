import React, { useState } from "react";
import { useLocalization } from "../../contexts/LocalizationContext";

function LanguageSwitcher() {
    const {
        currentLanguage,
        changeLanguage,
        supportedLanguages,
        getCurrentLanguage,
    } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);

    const currentLang = getCurrentLanguage();

    const handleLanguageChange = (languageCode) => {
        changeLanguage(languageCode);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <span className="text-lg">{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.name}</span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
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

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="py-1">
                            {supportedLanguages.map((language) => (
                                <button
                                    key={language.code}
                                    onClick={() =>
                                        handleLanguageChange(language.code)
                                    }
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 hover:bg-gray-100 transition-colors duration-200 ${
                                        currentLanguage === language.code
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-700"
                                    }`}
                                >
                                    <span className="text-lg">
                                        {language.flag}
                                    </span>
                                    <span>{language.name}</span>
                                    {currentLanguage === language.code && (
                                        <svg
                                            className="w-4 h-4 ml-auto text-indigo-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default LanguageSwitcher;
