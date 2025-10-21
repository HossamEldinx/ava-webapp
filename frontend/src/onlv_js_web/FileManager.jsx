// This file creates a "File Manager" component for our web application.
// Think of it as a special section on the webpage that shows a list of files
// that are stored on our server. It's designed to handle specific file types:
// ".onlv" files (which are special project files) and their ".json" counterparts.

// The main purpose of this component is to let the user:
// 1. See all the available ".onlv" files from the server.
// 2. Refresh the file list to see any new files.
// 3. "Load" a file, which means opening its data in the main application.
// 4. "Download" the original ".onlv" file or its ".json" version to their computer.
// 5. "Delete" files from the server.

// It communicates with a backend server (at "http://127.0.0.1:8000") to get the
// file list and to perform actions like downloading and deleting. It also handles
// loading states (showing a spinner while fetching) and displays any errors that might happen.

import React, {
    useState, // A React hook that lets us create and manage "state" (data that can change over time).
    useEffect, // A hook that lets us perform side effects, like fetching data when the component first loads.
    forwardRef, // A special React function that lets a parent component control a child component (we use it to let the parent refresh the file list).
    useImperativeHandle, // A hook used with forwardRef to customize what the parent can control.
} from "react";
import { API_ENDPOINTS } from "../config/api";

// We wrap our component in `forwardRef`. This is like giving the parent component a remote control
// so it can call functions inside this FileManager component.
// The component receives two "props" (properties):
// - `onFileSelect`: A function passed down from the parent. We call this function when the user clicks "Load" to send the file's data back to the parent.
// - `ref`: The special "remote control" reference from the parent.
const FileManager = forwardRef(({ onFileSelect }, ref) => {
    // Here we use the `useState` hook to create pieces of "state" for our component.
    // State is just data that our component needs to remember and that can change.

    // `files`: This state holds the list of files we get from the server.
    // It starts as an empty object until we fetch the real data.
    const [files, setFiles] = useState({
        onlv_files: [], // This will be a list of our .onlv files.
        json_files: [], // This will be a list of our .json files.
        total_count: 0, // The total number of files.
    });

    // `loading`: A simple true/false state. When it's `true`, we show a loading spinner.
    // When it's `false`, we show the file list. It starts as `true` because we load data right away.
    const [loading, setLoading] = useState(true);

    // `error`: This state holds any error message. If something goes wrong (like the server is down),
    // we store the error message here so we can show it to the user.
    const [error, setError] = useState("");

    // `deleteLoading`: This state helps us show a spinner on a specific "Delete" button.
    // It will hold the name of the file that is currently being deleted. It's `null` if nothing is being deleted.
    const [deleteLoading, setDeleteLoading] = useState(null);

    // This is an "async" function, which means it can perform actions that take time (like fetching from a server)
    // without freezing the whole webpage. Its job is to get the latest list of files from our backend.
    const fetchFiles = async () => {
        try {
            // Step 1: Show the main loading spinner for the whole file manager.
            setLoading(true);
            // And clear any previous error messages.
            setError("");

            // Step 2: Use the `fetch` API to make a GET request to our server's "/files/" endpoint.
            // `await` tells JavaScript to pause here until the server responds.
            const response = await fetch(API_ENDPOINTS.FILES.GET_ALL());

            // Step 3: Check if the server responded successfully.
            // A successful response has a status code like 200. If not, something went wrong.
            if (!response.ok) {
                // If the response is not okay, we create an error to be caught by the `catch` block below.
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Step 4: If the response was okay, we get the JSON data from the response body.
            // `await` pauses here until the data is fully downloaded and parsed.
            const data = await response.json();

            // Step 5: Update our `files` state with the new data from the server.
            // This will cause React to re-render the component and show the new file list.
            setFiles(data);
        } catch (err) {
            // This `catch` block runs if anything in the `try` block failed (e.g., network error, server error).
            console.error("Error fetching files:", err); // Log the technical error for developers.
            setError(`Failed to load files: ${err.message}`); // Set a user-friendly error message.
        } finally {
            // This `finally` block runs no matter what (whether the `try` succeeded or the `catch` was triggered).
            // We always want to hide the main loading spinner when the process is finished.
            setLoading(false);
        }
    };

    // This is the magic that connects our `fetchFiles` function to the parent's "remote control" (`ref`).
    // It says: "When the parent uses the ref, give it an object that has a `fetchFiles` method."
    // This allows the parent component to call `ref.current.fetchFiles()` to refresh the list.
    useImperativeHandle(ref, () => ({
        fetchFiles,
    }));

    // The `useEffect` hook runs code at specific times in the component's life.
    // Because we provide an empty array `[]` as the second argument, this effect
    // will run only ONCE, right after the component is first added to the screen.
    // This is the perfect place to fetch our initial data.
    useEffect(() => {
        fetchFiles();
    }, []);

    // This function handles the download logic when a user clicks a "Download" button.
    // It takes the `filename` to download.
    const handleDownload = async (filename, fileType) => {
        try {
            // Step 1: Fetch the specific file from the server's download endpoint.
            const response = await fetch(
                `${API_ENDPOINTS.FILES.DOWNLOAD(filename)}`
            );

            // Step 2: Check if the download request was successful.
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            // Step 3: Get the file content as a "blob". A blob is just raw data, perfect for files.
            const blob = await response.blob();

            // Step 4: Create a temporary URL that points to our blob data in the browser's memory.
            const url = window.URL.createObjectURL(blob);

            // Step 5: Create a hidden link (`<a>` element) to trigger the download.
            const link = document.createElement("a");
            link.href = url; // The link points to our blob data.
            link.download = filename; // This tells the browser what to name the downloaded file.
            document.body.appendChild(link); // Add the link to the page.
            link.click(); // Programmatically click the link to start the download.
            document.body.removeChild(link); // Clean up by removing the link.
            window.URL.revokeObjectURL(url); // Clean up by releasing the blob URL from memory.
        } catch (err) {
            console.error("Download error:", err);
            setError(`Download failed: ${err.message}`);
        }
    };

    // This function handles deleting a file when the user clicks the "Delete" button.
    const handleDelete = async (filename) => {
        // First, we ask the user for confirmation, because deleting is a permanent action.
        if (
            !window.confirm(
                `Are you sure you want to delete "${filename}" and its corresponding file?`
            )
        ) {
            return; // If the user clicks "Cancel", we stop right here.
        }

        try {
            // Show a loading spinner ON THE SPECIFIC delete button that was clicked.
            setDeleteLoading(filename);

            // Send a "DELETE" request to the server for the specific filename.
            const response = await fetch(
                `${API_ENDPOINTS.FILES.DELETE(filename)}`,
                {
                    method: "DELETE", // We must specify the DELETE method.
                }
            );

            // If the server couldn't delete the file, it will send back an error.
            if (!response.ok) {
                const errorData = await response.json(); // Try to get a detailed error message from the server.
                throw new Error(
                    errorData.detail || `Delete failed: ${response.status}`
                );
            }

            // If the deletion was successful, we need to refresh the file list to show the change.
            await fetchFiles();
        } catch (err) {
            console.error("Delete error:", err);
            setError(`Delete failed: ${err.message}`);
        } finally {
            // No matter what, we stop showing the loading spinner on the delete button.
            setDeleteLoading(null);
        }
    };

    // This function handles loading a file's content into the main application.
    const handleLoadFile = async (filename) => {
        try {
            // We assume that for every "file.onlv", there is a "file.json" we can load.
            const jsonFilename = filename.replace(".onlv", ".json");

            // Fetch the JSON version of the file.
            const response = await fetch(
                `${API_ENDPOINTS.FILES.DOWNLOAD(jsonFilename)}`
            );

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status}`);
            }

            // Get the JSON data from the response.
            const jsonData = await response.json();

            // If the parent component gave us an `onFileSelect` function, we call it now.
            // This sends the loaded data up to the parent so it can be used in the app.
            if (onFileSelect) {
                onFileSelect(jsonData);
            }
        } catch (err) {
            console.error("Load file error:", err);
            setError(`Failed to load file: ${err.message}`);
        }
    };

    // A small helper function to make file sizes look nice (e.g., "1024 Bytes" becomes "1.00 KB").
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // A helper function to make the date string from the server easier to read.
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // --- RENDER LOGIC ---
    // This is where we decide what to show on the screen based on our component's state.

    // If the `loading` state is true, we show a loading spinner and nothing else.
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                <div className="flex items-center justify-center py-8">
                    <svg
                        className="animate-spin h-8 w-8 text-indigo-600 mr-3"
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
                    <span className="text-gray-100">Loading files...</span>
                </div>
            </div>
        );
    }

    // This is the main JSX (HTML-like code) that gets returned when we are not loading.
    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
            {/* Header Section: Title and Refresh Button */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                        {/* Folder Icon */}
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
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            File Manager
                        </h2>
                        <p className="text-sm text-gray-300">
                            {/* Display the total number of files found */}
                            {files.total_count} files stored (
                            {files.onlv_files.length} ONLV,{" "}
                            {files.json_files.length} JSON)
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchFiles} // The refresh button simply calls `fetchFiles` again.
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 flex items-center"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Error Display Section */}
            {/* This part only shows up if the `error` state has a message in it. */}
            {error && (
                <div className="mb-6 p-4 bg-red-600/50 border border-red-600 rounded-lg">
                    <p className="text-sm text-red-100">{error}</p>
                </div>
            )}

            {/* File List Section */}
            {/* We check if the `onlv_files` array is empty. */}
            {files.onlv_files.length === 0 ? (
                // If it's empty, we show a "No files found" message.
                <div className="text-center py-12">
                    <svg
                        className="w-16 h-16 text-gray-400 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-100 mb-2">
                        No files found
                    </h3>
                    <p className="text-gray-400">
                        Upload some .onlv files to see them here.
                    </p>
                </div>
            ) : (
                // If there are files, we "map" over the array. This is like a loop
                // that creates a block of HTML for each file in the list.
                <div className="space-y-4">
                    {files.onlv_files.map((file, index) => (
                        <div
                            key={index} // `key` is a special React prop that helps it keep track of list items efficiently.
                            className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                        >
                            <div className="flex items-center justify-between">
                                {/* Left side: File icon, name, and details */}
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                                        {/* File Icon */}
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
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-white">
                                            {file.name}
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                                            <span>
                                                {/* Use our helper function to format the size */}
                                                {formatFileSize(file.size)}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {/* Use our helper function to format the date */}
                                                {formatDate(file.modified)}
                                            </span>
                                            {/* Only show the "JSON Available" text if the file has a JSON version */}
                                            {file.has_json && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-green-600">
                                                        ✓ JSON Available
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Right side: Action Buttons */}
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() =>
                                            handleLoadFile(file.name)
                                        }
                                        // The "Load" button is disabled if there's no JSON file to load.
                                        disabled={!file.has_json}
                                        // We use template literals (the backticks ``) to conditionally change the button's style.
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                                            file.has_json
                                                ? "bg-green-600 hover:bg-green-700 text-white" // Style for enabled button
                                                : "bg-gray-600 text-gray-300 cursor-not-allowed" // Style for disabled button
                                        }`}
                                    >
                                        Load
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleDownload(file.name, "onlv")
                                        }
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors duration-200"
                                    >
                                        Download ONLV
                                    </button>
                                    {/* The "Download JSON" button only appears if a JSON file exists. */}
                                    {file.has_json && (
                                        <button
                                            onClick={() =>
                                                handleDownload(
                                                    file.name.replace(
                                                        ".onlv",
                                                        ".json"
                                                    ),
                                                    "json"
                                                )
                                            }
                                            className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 text-white text-sm rounded-md transition-colors duration-200"
                                        >
                                            Download JSON
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(file.name)}
                                        // Disable the button if this specific file is currently being deleted.
                                        disabled={deleteLoading === file.name}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors duration-200 disabled:opacity-50"
                                    >
                                        {/* Show a spinner inside the button if it's loading, otherwise show the text "Delete". */}
                                        {deleteLoading === file.name ? (
                                            <svg
                                                className="animate-spin h-4 w-4"
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
                                        ) : (
                                            "Delete"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// Setting a `displayName` is good practice for debugging in React Developer Tools,
// especially for components created with `forwardRef`.
FileManager.displayName = "FileManager";

// We export the component so other files in our project can import and use it.
export default FileManager;
