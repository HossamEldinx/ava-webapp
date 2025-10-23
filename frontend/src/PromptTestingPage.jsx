import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocalization } from "./contexts/LocalizationContext";
import { API_ENDPOINTS } from "./config/api";

const PromptTestingPage = ({ selectedPrompt = null }) => {
    const { t } = useLocalization();
    // Form state management
    const [formData, setFormData] = useState({
        title: "",
        model_name: "",
        version: 1,
        status: "draft",
        prompt_text: "",
        execution_results: "",
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [userInput, setUserInput] = useState(""); // User input for chat
    const [chatHistory, setChatHistory] = useState([]); // Stores chat messages
    const [currentSessionId, setCurrentSessionId] = useState(null); // Current AI chat session
    const [enableCostData, setEnableCostData] = useState(false); // Enable cost claims database access
    const [enablePositionData, setEnablePositionData] = useState(false); // Enable regulations database access
    const [selectedFile, setSelectedFile] = useState(null); // Selected file for upload
    // eslint-disable-next-line no-unused-vars
    const [isUploading, setIsUploading] = useState(false); // File upload state

    // UI state management
    const [loading, setLoading] = useState(false); // For form submission
    const [chatLoading, setChatLoading] = useState(false); // For AI chat
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Refs for chat functionality
    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    };

    // Auto-scroll when chat history changes
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, chatLoading]);

    // File handling functions
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrorMessage(
                    t("ai_training.promptTesting.chat.file.sizeError")
                );
                return;
            }

            // Check file type (allow common document and image types)
            const allowedTypes = [
                "text/plain",
                "text/csv",
                "application/json",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
            ];

            if (!allowedTypes.includes(file.type)) {
                setErrorMessage(
                    t("ai_training.promptTesting.chat.file.typeError")
                );
                return;
            }

            setSelectedFile(file);
            setErrorMessage("");
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = t(
                "ai_training.promptTesting.configuration.fields.title.error"
            );
        }

        if (!formData.model_name.trim()) {
            newErrors.model_name = t(
                "ai_training.promptTesting.configuration.fields.modelName.error"
            );
        }

        if (!formData.prompt_text.trim()) {
            newErrors.prompt_text = t(
                "ai_training.promptTesting.configuration.fields.systemPrompt.error"
            );
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const url =
                selectedPrompt && selectedPrompt.id
                    ? API_ENDPOINTS.PROMPT_TESTS.UPDATE(selectedPrompt.id)
                    : API_ENDPOINTS.PROMPT_TESTS.CREATE;
            const method = selectedPrompt && selectedPrompt.id ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to create prompt test: ${response.statusText}`
                );
            }

            await response.json();

            setSuccessMessage(
                selectedPrompt && selectedPrompt.id
                    ? t("ai_training.promptTesting.messages.success.updated")
                    : t("ai_training.promptTesting.messages.success.created")
            );
            if (!selectedPrompt || !selectedPrompt.id) {
                handleReset();
            }
        } catch (error) {
            console.error(
                selectedPrompt && selectedPrompt.id
                    ? "Error updating prompt test:"
                    : "Error creating prompt test:",
                error
            );
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle form reset
    const handleReset = useCallback(() => {
        // Delete current chat session if it exists
        if (currentSessionId) {
            fetch(API_ENDPOINTS.AI_TRAINING.DELETE_SESSION(currentSessionId), {
                method: "DELETE",
            }).catch((error) => {
                console.warn("Failed to delete chat session:", error);
            });
            setCurrentSessionId(null);
        }

        setFormData({
            title: "",
            model_name: "",
            version: 1,
            status: "draft",
            prompt_text: "",
            execution_results: "",
        });
        setErrors({});
        setSuccessMessage("");
        setErrorMessage("");
        setChatHistory([]);
        setUserInput("");
        setEnableCostData(false);
        setEnablePositionData(false);
    }, [currentSessionId]);

    useEffect(() => {
        if (selectedPrompt && selectedPrompt.id) {
            setIsEditMode(true);
            setFormData({
                title: selectedPrompt.title || "",
                model_name: selectedPrompt.model_name || "",
                version: selectedPrompt.version || 1,
                status: selectedPrompt.status || "draft",
                prompt_text: selectedPrompt.prompt_text || "",
                execution_results: selectedPrompt.execution_results || "",
            });
        } else {
            setIsEditMode(false);
            handleReset();
        }
    }, [selectedPrompt, handleReset]);

    // Create a new AI chat session
    const createChatSession = async () => {
        if (!formData.title || !formData.model_name || !formData.prompt_text) {
            setErrorMessage(
                t("ai_training.promptTesting.messages.errors.createSession")
            );
            return null;
        }

        try {
            const response = await fetch(
                API_ENDPOINTS.AI_TRAINING.CREATE_SESSION,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        model_name: formData.model_name,
                        system_prompt: formData.prompt_text,
                        enable_cost_data: enableCostData,
                        enable_position_data: enablePositionData,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to create chat session: ${response.statusText}`
                );
            }

            const result = await response.json();
            if (result.success) {
                setCurrentSessionId(result.session_id);
                console.log("✅ Chat session created:", result.session_id);
                console.log("📊 Enabled features:", result.enabled_features);
                return result.session_id;
            } else {
                throw new Error(
                    result.error || "Failed to create chat session"
                );
            }
        } catch (error) {
            console.error("❌ Error creating chat session:", error);
            setErrorMessage(error.message);
            return null;
        }
    };

    // Handle prompt execution with real AI
    const handleExecute = async () => {
        // Check if we have either text input or a file
        if (!userInput.trim() && !selectedFile) {
            return; // Don't send empty messages without files
        }

        // Create session if it doesn't exist
        let sessionId = currentSessionId;
        if (!sessionId) {
            sessionId = await createChatSession();
            if (!sessionId) {
                return; // Failed to create session
            }
        }

        setChatLoading(true);
        setErrorMessage("");

        try {
            let result;

            // If we have a file, use the file upload endpoint
            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("session_id", sessionId);
                formData.append("message", userInput || ""); // Include text message with file

                const response = await fetch(
                    API_ENDPOINTS.AI_TRAINING.SEND_MESSAGE_WITH_FILE,
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to send message with file: ${response.statusText}`
                    );
                }

                result = await response.json();

                // Clear the selected file after successful upload
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                // Regular text message
                const newChatHistory = [
                    ...chatHistory,
                    { role: "user", content: userInput },
                ];
                setChatHistory(newChatHistory);

                const response = await fetch(
                    API_ENDPOINTS.AI_TRAINING.SEND_MESSAGE,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            session_id: sessionId,
                            message: userInput,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to send message: ${response.statusText}`
                    );
                }

                result = await response.json();
            }

            // Clear user input
            setUserInput("");

            if (result.success) {
                setChatHistory((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: result.response,
                        model: result.model_used,
                        timestamp: result.timestamp,
                        fileProcessed: selectedFile ? true : false,
                    },
                ]);
            } else {
                throw new Error(result.error || "Failed to get AI response");
            }
        } catch (error) {
            console.error("❌ Error sending message:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `Error: Could not get a response. ${error.message}`,
                    error: true,
                },
            ]);
            setErrorMessage(error.message);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isEditMode
                            ? t("ai_training.promptTesting.titles.edit")
                            : t("ai_training.promptTesting.titles.create")}
                    </h1>
                    <p className="text-gray-400">
                        {isEditMode
                            ? t("ai_training.promptTesting.subtitles.edit")
                            : t("ai_training.promptTesting.subtitles.create")}
                    </p>
                </div>

                {/* Error/Success Messages */}
                {errorMessage && (
                    <div className="bg-red-800 border border-red-600 p-4 rounded-lg mb-6">
                        <div className="text-red-200">
                            <strong>Error:</strong> {errorMessage}
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-800 border border-green-600 p-4 rounded-lg mb-6">
                        <div className="text-green-200">
                            <strong>Success:</strong> {successMessage}
                        </div>
                    </div>
                )}

                {/* Main Layout - 30/70 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side - All Form Inputs and Controls */}
                    <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-y-auto">
                        <form
                            onSubmit={handleSubmit}
                            className="h-full flex flex-col"
                        >
                            <h2 className="text-lg font-semibold text-white mb-6 pb-2 border-b border-gray-700">
                                {t(
                                    "ai_training.promptTesting.configuration.title"
                                )}
                            </h2>

                            <div className="flex-1 space-y-5">
                                {/* Title */}
                                <div>
                                    <label
                                        htmlFor="title"
                                        className="block text-xs font-medium text-gray-300 mb-1"
                                    >
                                        {t(
                                            "ai_training.promptTesting.configuration.fields.title.label"
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className={`w-full px-2 py-1.5 text-sm bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent ${
                                            errors.title
                                                ? "border-red-500"
                                                : "border-gray-600"
                                        }`}
                                        placeholder={t(
                                            "ai_training.promptTesting.configuration.fields.title.placeholder"
                                        )}
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>

                                {/* Model Name */}
                                <div>
                                    <label
                                        htmlFor="model_name"
                                        className="block text-xs font-medium text-gray-300 mb-1"
                                    >
                                        {t(
                                            "ai_training.promptTesting.configuration.fields.modelName.label"
                                        )}
                                    </label>
                                    <select
                                        id="model_name"
                                        name="model_name"
                                        value={formData.model_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-2 py-1.5 text-sm bg-gray-700 border rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent ${
                                            errors.model_name
                                                ? "border-red-500"
                                                : "border-gray-600"
                                        }`}
                                    >
                                        <option value="">
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.modelName.placeholder"
                                            )}
                                        </option>
                                        <option value="gemini-2.5-flash">
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.modelName.options.gemini25Flash"
                                            )}
                                        </option>
                                        <option value="gemini-2.5-pro">
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.modelName.options.gemini25Pro"
                                            )}
                                        </option>
                                    </select>
                                    {errors.model_name && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.model_name}
                                        </p>
                                    )}
                                </div>

                                {/* Version and Status Row */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label
                                            htmlFor="version"
                                            className="block text-xs font-medium text-gray-300 mb-1"
                                        >
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.version.label"
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            id="version"
                                            name="version"
                                            min="1"
                                            value={formData.version}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="status"
                                            className="block text-xs font-medium text-gray-300 mb-1"
                                        >
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.status.label"
                                            )}
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            <option value="draft">
                                                {t(
                                                    "ai_training.promptTesting.configuration.fields.status.options.draft"
                                                )}
                                            </option>
                                            <option value="testing">
                                                {t(
                                                    "ai_training.promptTesting.configuration.fields.status.options.testing"
                                                )}
                                            </option>
                                            <option value="approved">
                                                {t(
                                                    "ai_training.promptTesting.configuration.fields.status.options.approved"
                                                )}
                                            </option>
                                            <option value="archived">
                                                {t(
                                                    "ai_training.promptTesting.configuration.fields.status.options.archived"
                                                )}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {/* Prompt Text Area */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label
                                            htmlFor="prompt_text"
                                            className="block text-xs font-medium text-gray-300"
                                        >
                                            {t(
                                                "ai_training.promptTesting.configuration.fields.systemPrompt.label"
                                            )}
                                        </label>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEnableCostData(
                                                        !enableCostData
                                                    )
                                                }
                                                className={`px-2 py-0.5 text-white rounded text-xs transition-colors ${
                                                    enableCostData
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-gray-600 hover:bg-gray-700"
                                                }`}
                                            >
                                                {enableCostData ? "✓ " : ""}
                                                {t(
                                                    "ai_training.promptTesting.configuration.buttons.cost"
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEnablePositionData(
                                                        !enablePositionData
                                                    )
                                                }
                                                className={`px-2 py-0.5 text-white rounded text-xs transition-colors ${
                                                    enablePositionData
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-gray-600 hover:bg-gray-700"
                                                }`}
                                            >
                                                {enablePositionData ? "✓ " : ""}
                                                {t(
                                                    "ai_training.promptTesting.configuration.buttons.position"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        id="prompt_text"
                                        name="prompt_text"
                                        value={formData.prompt_text}
                                        onChange={handleInputChange}
                                        rows={6}
                                        className={`w-full px-2 py-1.5 text-sm bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent resize-none ${
                                            errors.prompt_text
                                                ? "border-red-500"
                                                : "border-gray-600"
                                        }`}
                                        placeholder={t(
                                            "ai_training.promptTesting.configuration.fields.systemPrompt.placeholder"
                                        )}
                                    />
                                    {errors.prompt_text && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.prompt_text}
                                        </p>
                                    )}
                                </div>

                                {/* This button is no longer needed here as sending is part of the chat interface */}
                            </div>

                            {/* Submit/Reset Buttons */}
                            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-700">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>
                                                {isEditMode
                                                    ? t(
                                                          "ai_training.promptTesting.buttons.saving"
                                                      )
                                                    : t(
                                                          "ai_training.promptTesting.buttons.creating"
                                                      )}
                                            </span>
                                        </>
                                    ) : (
                                        <span>
                                            {isEditMode
                                                ? t(
                                                      "ai_training.promptTesting.buttons.saveChanges"
                                                  )
                                                : t(
                                                      "ai_training.promptTesting.buttons.createPrompt"
                                                  )}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {t(
                                        "ai_training.promptTesting.buttons.resetForm"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Side - Chat Interface */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">
                                {t("ai_training.promptTesting.chat.title")}
                            </h2>
                            {currentSessionId && (
                                <div className="flex items-center text-sm text-green-400 bg-green-900/20 px-3 py-1 rounded-full">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                    {t(
                                        "ai_training.promptTesting.chat.status.connected"
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto mb-6 p-4 bg-gray-900 rounded-lg space-y-4 scroll-smooth"
                            style={{
                                scrollBehavior: "smooth",
                                minHeight: "300px",
                            }}
                        >
                            {chatHistory.length === 0 && (
                                <div className="text-center text-gray-400 py-12">
                                    <div className="mb-4">
                                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl">💬</span>
                                        </div>
                                    </div>
                                    <p className="text-lg font-medium mb-2">
                                        {t(
                                            "ai_training.promptTesting.chat.empty.title"
                                        )}
                                    </p>
                                    <p className="text-sm">
                                        {formData.title &&
                                        formData.model_name &&
                                        formData.prompt_text
                                            ? t(
                                                  "ai_training.promptTesting.chat.empty.ready"
                                              )
                                            : t(
                                                  "ai_training.promptTesting.chat.empty.configure"
                                              )}
                                    </p>
                                </div>
                            )}
                            {chatHistory.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${
                                        message.role === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-lg px-4 py-2 rounded-lg ${
                                            message.role === "user"
                                                ? message.isFile
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-indigo-600 text-white"
                                                : message.error
                                                ? "bg-red-700 text-red-200"
                                                : "bg-gray-700 text-gray-200"
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">
                                            {message.content}
                                        </div>
                                        {message.model && (
                                            <div className="text-xs opacity-70 mt-1">
                                                {message.model}
                                            </div>
                                        )}
                                        {message.isFile && (
                                            <div className="text-xs opacity-70 mt-1">
                                                {t(
                                                    "ai_training.promptTesting.chat.fileAttachment"
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-lg px-4 py-3 rounded-lg bg-gray-700 text-gray-200 border border-gray-600">
                                        <div className="flex items-center space-x-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400"></div>
                                            <span className="text-sm">
                                                {t(
                                                    "ai_training.promptTesting.chat.loading"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* File Upload Section */}
                        {selectedFile && (
                            <div className="mb-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <span className="text-blue-400 text-lg">
                                                📎
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-200 truncate">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {(
                                                    selectedFile.size / 1024
                                                ).toFixed(1)}{" "}
                                                KB •{" "}
                                                {t(
                                                    "ai_training.promptTesting.chat.input.ready"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={removeSelectedFile}
                                        className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Chat Input Section */}
                        <div className="space-y-3 flex-shrink-0">
                            <div className="flex items-end space-x-3">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) =>
                                            setUserInput(e.target.value)
                                        }
                                        onKeyPress={(e) =>
                                            e.key === "Enter" &&
                                            !chatLoading &&
                                            !isUploading &&
                                            handleExecute()
                                        }
                                        placeholder={
                                            selectedFile
                                                ? t(
                                                      "ai_training.promptTesting.chat.input.placeholderWithFile"
                                                  )
                                                : t(
                                                      "ai_training.promptTesting.chat.input.placeholder"
                                                  )
                                        }
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        disabled={chatLoading || isUploading}
                                    />
                                </div>
                                <button
                                    onClick={handleExecute}
                                    disabled={
                                        chatLoading ||
                                        isUploading ||
                                        (!userInput.trim() && !selectedFile)
                                    }
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 min-w-[100px] justify-center"
                                >
                                    {chatLoading ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>
                                                {t(
                                                    "ai_training.promptTesting.chat.buttons.sending"
                                                )}
                                            </span>
                                        </div>
                                    ) : (
                                        <span>
                                            {selectedFile
                                                ? t(
                                                      "ai_training.promptTesting.chat.buttons.sendWithFile"
                                                  )
                                                : t(
                                                      "ai_training.promptTesting.chat.buttons.send"
                                                  )}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* File Upload Controls */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center space-x-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".txt,.csv,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                    />
                                    <button
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={chatLoading || isUploading}
                                        className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md text-sm transition-colors"
                                    >
                                        <span className="text-base">📎</span>
                                        <span>
                                            {selectedFile
                                                ? t(
                                                      "ai_training.promptTesting.chat.buttons.changeFile"
                                                  )
                                                : t(
                                                      "ai_training.promptTesting.chat.buttons.attachFile"
                                                  )}
                                        </span>
                                    </button>
                                    <span className="text-xs text-gray-400 hidden sm:inline">
                                        {selectedFile
                                            ? t(
                                                  "ai_training.promptTesting.chat.file.help"
                                              )
                                            : t(
                                                  "ai_training.promptTesting.chat.file.sizeLimit"
                                              )}
                                    </span>
                                </div>

                                {chatHistory.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setChatHistory([]);
                                            setSelectedFile(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                            }
                                        }}
                                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                                    >
                                        {t(
                                            "ai_training.promptTesting.chat.buttons.clearChat"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptTestingPage;
