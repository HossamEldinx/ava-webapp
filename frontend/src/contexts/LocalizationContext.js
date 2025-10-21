import React, { createContext, useContext, useState, useEffect } from "react";
import enTranslations from "../locales/en";
import deTranslations from "../locales/de";

const LocalizationContext = createContext();

const translations = {
    en: enTranslations,
    de: deTranslations,
};

const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

export const LocalizationProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        // Get language from localStorage or default to 'en'
        return localStorage.getItem("language") || "en";
    });

    useEffect(() => {
        // Save language preference to localStorage
        localStorage.setItem("language", currentLanguage);
    }, [currentLanguage]);

    const changeLanguage = (languageCode) => {
        if (translations[languageCode]) {
            setCurrentLanguage(languageCode);
        }
    };

    const t = (key, params = {}) => {
        // Debug logging for antiClaim translations only
        if (key.startsWith("antiClaim")) {
            console.log(
                "Translation request:",
                key,
                params,
                "Current language:",
                currentLanguage
            );
            console.log(
                "Available antiClaim translations:",
                translations[currentLanguage]?.antiClaim
            );
        }

        const keys = key.split(".");
        let value = translations[currentLanguage];

        // Try to get the value from current language
        for (const k of keys) {
            if (value && typeof value === "object" && value.hasOwnProperty(k)) {
                value = value[k];
            } else {
                value = null;
                break;
            }
        }

        // If not found in current language, try English fallback
        if (value === null || value === undefined) {
            value = translations["en"];
            for (const k of keys) {
                if (
                    value &&
                    typeof value === "object" &&
                    value.hasOwnProperty(k)
                ) {
                    value = value[k];
                } else {
                    return key; // Return key if not found in fallback
                }
            }
        }

        // Handle parameter interpolation
        if (typeof value === "string" && Object.keys(params).length > 0) {
            const result = value.replace(/\{(\w+)\}/g, (match, paramName) => {
                return params[paramName] !== undefined
                    ? params[paramName]
                    : match;
            });
            return result;
        }

        return value || key;
    };

    const getCurrentLanguage = () => {
        return (
            SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLanguage) ||
            SUPPORTED_LANGUAGES[0]
        );
    };

    const value = {
        currentLanguage,
        changeLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        getCurrentLanguage,
    };

    return (
        <LocalizationContext.Provider value={value}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = () => {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error(
            "useLocalization must be used within a LocalizationProvider"
        );
    }
    return context;
};

export default LocalizationContext;
