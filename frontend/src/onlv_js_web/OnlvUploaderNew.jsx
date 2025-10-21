// This file creates a React component that allows users to upload a special type of file called ".onlv".
// An ".onlv" file contains construction project data in an XML format.
// The main job of this component is to:
// 1. Let the user select an ".onlv" file from their computer.
// 2. Send that file to a server (our backend).
// 3. The server then converts the XML data from the file into a more modern format called JSON.
// 4. Once the conversion is successful, this component receives the JSON data back.
// 5. It then gives the user options to either download the JSON data as a new file or copy it to their clipboard.
// This component is like a bridge between the user's computer and our server, making it easy to convert file formats.

import React, { useState } from "react"; // We need React to build our component, and "useState" to manage its memory (state).
import { API_ENDPOINTS } from "../config/api";

// This is our main component. It's like a blueprint for the uploader UI.
// It takes two special functions as inputs ("props"):
// - onUploadSuccess: A function to call when the file is successfully converted, passing the new JSON data to the parent component.
// - onFileListUpdate: A function to call to tell the parent component to refresh its list of files.
// - projectId: The ID of the project to associate the uploaded file with.
export default function OnlvUploaderNew({
    onUploadSuccess,
    onFileListUpdate,
    projectId,
}) {
    // Here we use "useState" to create "state variables". These are like the component's memory.
    // When these variables change, React automatically re-renders the component to show the updates.

    // This holds the file that the user has selected. It starts as "null" because no file is selected initially.
    const [file, setFile] = useState(null);
    // This will store any error message we want to show to the user. It starts as an empty string.
    const [error, setError] = useState("");
    // This is a true/false flag to know if we are currently in the process of uploading. This helps us show a loading spinner.
    const [uploading, setUploading] = useState(false);
    // This stores a success message to show the user, like "File uploaded successfully!".
    const [uploadMessage, setUploadMessage] = useState("");
    // This will hold the JSON data that we get back from the server after conversion.
    const [jsonData, setJsonData] = useState(null);

    // This function is called whenever the user selects a file using the file input button.
    const handleFileChange = (e) => {
        // 'e.target.files[0]' gets the first file the user selected.
        const selectedFile = e.target.files[0];

        // We reset all our state variables to clear out any old information from previous uploads.
        setFile(null);
        setError("");
        setUploadMessage("");
        setJsonData(null);

        // We check if the user actually selected a file.
        if (selectedFile) {
            // It's very important to check if the file has the correct ".onlv" extension.
            // This prevents users from uploading the wrong type of file.
            if (selectedFile.name.endsWith(".onlv")) {
                // If the file is correct, we store it in our "file" state.
                setFile(selectedFile);
            } else {
                // If the file extension is wrong, we set an error message to inform the user.
                setError("Please upload a file with .onlv extension");
            }
        }
    };

    // This function is called when the user clicks the "Convert to JSON" button.
    const handleUpload = async () => {
        // If no file has been selected, we do nothing.
        if (!file) return;

        // We set "uploading" to true to show the loading spinner and disable the buttons.
        setUploading(true);
        // We clear any old error or success messages.
        setError("");
        setUploadMessage("");
        setJsonData(null);

        // "FormData" is a special object used to send files and data to a server,
        // much like filling out a form on a website.
        const formData = new FormData();
        // We add our file to the form data. The server will look for a field named "file".
        formData.append("file", file);
        // Add the project_id to the form data
        formData.append("project_id", projectId);

        try {
            // This is where we send the file to our backend server.
            // We use the "fetch" function, which is the modern way to make network requests in browsers.
            const response = await fetch(
                API_ENDPOINTS.FILES.UPLOAD_ONLV_PROCESSED,
                {
                    method: "POST", // We use the "POST" method because we are sending data to the server.
                    body: formData, // The "body" of our request is the form data we just created.
                }
            );

            // If the server responds with an error (e.g., "Not Found" or "Internal Server Error"),
            // the 'response.ok' property will be false.
            if (!response.ok) {
                // We try to get a detailed error message from the server's response.
                const errorData = await response.json();
                // We "throw" an error, which stops the 'try' block and jumps to the 'catch' block below.
                throw new Error(
                    errorData.detail || `HTTP error! status: ${response.status}`
                );
            }

            // If the response was successful, we get the JSON data from the response.
            const result = await response.json();

            // Our server is expected to send back an object with a "parsed_content" property containing the converted JSON.
            if (result.parsed_content) {
                // We show a success message to the user.
                setUploadMessage(
                    `File "${file.name}" uploaded and processed successfully!`
                );
                // We store the converted JSON data in our state.
                setJsonData(result.parsed_content);

                // If the parent component gave us an "onUploadSuccess" function, we call it now.
                // This is how we pass the new JSON data up to the parent.
                if (onUploadSuccess) {
                    onUploadSuccess(result.parsed_content);
                }

                // If the parent component gave us an "onFileListUpdate" function, we call it.
                // This tells the parent to refresh its list of files, so the new converted file appears.
                if (onFileListUpdate) {
                    onFileListUpdate();
                }
            } else {
                // If the server's response was successful but didn't contain the data we expected, we create an error.
                throw new Error("No data received from server");
            }
        } catch (err) {
            // This "catch" block runs if any error happened in the "try" block (e.g., network failure or server error).
            console.error("Upload error:", err); // We log the technical error for developers to see.
            // We create a user-friendly error message.
            const errorMessage =
                err instanceof Error ? err.message : String(err);
            setError(`Upload failed: ${errorMessage}`);
            setUploadMessage(""); // Clear any success message.

            // If an error occurs, we should clear any old data in the parent component by passing "null".
            if (onUploadSuccess) {
                onUploadSuccess(null);
            }
        } finally {
            // The "finally" block runs no matter what, whether the upload succeeded or failed.
            // We set "uploading" back to false to hide the loading spinner and re-enable the buttons.
            setUploading(false);
        }
    };

    // This function is called when the user clicks the "Download" button.
    const handleDownloadJson = () => {
        // If there's no JSON data, we can't download anything.
        if (!jsonData) return;

        // We convert our JavaScript JSON object into a string format.
        // The "null, 2" part makes the JSON nicely formatted with indentation, so it's easy for humans to read.
        const dataStr = JSON.stringify(jsonData, null, 2);
        // We create a "Blob", which is a file-like object, from our JSON string.
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        // We create a temporary URL that points to our Blob in the browser's memory.
        const url = URL.createObjectURL(dataBlob);
        // We create a hidden link element (<a> tag).
        const link = document.createElement("a");
        link.href = url; // The link points to our temporary URL.
        link.download = `${file.name.replace(".onlv", "")}_converted.json`; // This sets the default filename for the download.
        document.body.appendChild(link); // We add the hidden link to the page.
        link.click(); // We programmatically click the link, which starts the download.
        document.body.removeChild(link); // We remove the hidden link from the page.
        URL.revokeObjectURL(url); // We clean up the temporary URL to free up memory.
    };

    // This function is called when the user clicks the "Copy" button.
    const handleCopyJson = async () => {
        // If there's no JSON data, we can't copy anything.
        if (!jsonData) return;

        try {
            // The "navigator.clipboard.writeText" is a modern browser API to securely copy text to the clipboard.
            // It's asynchronous, so we use "await".
            await navigator.clipboard.writeText(
                JSON.stringify(jsonData, null, 2) // Again, we format the JSON to be readable.
            );
            // We show a temporary message to confirm that the copy was successful.
            setUploadMessage("JSON data copied to clipboard!");
            // After 3 seconds, we clear the message.
            setTimeout(() => setUploadMessage(""), 3000);
        } catch (err) {
            // If copying fails (e.g., due to browser permissions), we show an error.
            setError("Failed to copy to clipboard");
        }
    };

    // This is the "render" part of the component. It returns JSX, which looks like HTML but is actually JavaScript.
    // This JSX describes what the user interface should look like.
    return (
        <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
            {/* Header section with an icon and title */}
            <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    {/* This is an SVG icon for "upload". */}
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
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-100">
                        ONLV File Converter
                    </h2>
                    <p className="text-sm text-gray-400">
                        Upload .onlv files and convert XML to JSON
                    </p>
                </div>
            </div>

            {/* File Upload Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select ONLV File
                </label>
                <div className="relative">
                    {/* This is the actual file input element. It's styled to look nice. */}
                    <input
                        type="file"
                        accept=".onlv" // This tells the browser to only allow files with the .onlv extension.
                        onChange={handleFileChange} // When the user selects a file, this function is called.
                        disabled={uploading} // The input is disabled while an upload is in progress.
                        className={`block w-full text-sm text-gray-400
                            file:mr-4 file:py-3 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-600 file:text-white
                            hover:file:bg-indigo-700 cursor-pointer
                            border border-gray-600 rounded-lg bg-gray-700
                            focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                            ${
                                // This is a conditional class: if "uploading" is true, it adds styles to make the input look disabled.
                                uploading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                    />
                </div>

                {/* This is a conditional render. The error message only appears if the "error" state is not empty. */}
                {error && (
                    <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {/* This is also a conditional render for the success/info message. */}
                {uploadMessage && (
                    <div className="mt-3 p-3 bg-green-900/50 border border-green-700 rounded-lg">
                        <p className="text-sm text-green-300">
                            {uploadMessage}
                        </p>
                    </div>
                )}
            </div>

            {/* This section shows details about the selected file. It only appears if a file is selected and we are not uploading. */}
            {file && !uploading && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-200">
                                <span className="font-medium text-gray-100">
                                    {file.name}
                                </span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {/* We calculate the file size in kilobytes and show it with 2 decimal places. */}
                                Size: {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                            <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* The main action button to start the conversion. */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading} // The button is disabled if no file is selected or if we are uploading.
                className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center
                    ${
                        // We change the button's style based on whether it's disabled or not.
                        !file || uploading
                            ? "bg-gray-600 cursor-not-allowed text-gray-400"
                            : "bg-indigo-600 hover:bg-indigo-700 transform hover:scale-[1.02]"
                    }
                    transition-all duration-200 shadow-lg`}
            >
                {/* We show different content inside the button depending on the "uploading" state. */}
                {uploading ? (
                    // If uploading, show a spinning loading icon and text.
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Converting XML to JSON...
                    </>
                ) : (
                    // If not uploading, show the normal icon and text.
                    <>
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
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        Convert to JSON
                    </>
                )}
            </button>

            {/* This section appears only after the JSON data has been successfully received. */}
            {jsonData && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-100">
                            Conversion Complete
                        </h3>
                        {/* This contains the "Copy" and "Download" buttons. */}
                        <div className="flex space-x-2">
                            <button
                                onClick={handleCopyJson}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center"
                            >
                                <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                Copy
                            </button>
                            <button
                                onClick={handleDownloadJson}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center"
                            >
                                <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Download
                            </button>
                        </div>
                    </div>
                    {/* This shows a small preview of the converted JSON data. */}
                    <div className="bg-gray-800 rounded-md p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                            {/* We only show the first 500 characters of the JSON to avoid a huge wall of text. */}
                            {JSON.stringify(jsonData, null, 2).substring(
                                0,
                                500
                            )}
                            {/* If the JSON is longer than 500 characters, we add "..." at the end. */}
                            {JSON.stringify(jsonData, null, 2).length > 500 &&
                                "..."}
                        </pre>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {/* A small note to the user about how the conversion works. */}
                        Array elements (leistungsteil, position, teilposition,
                        zuschlag, abschlag, kennwert) are automatically
                        converted to arrays.
                    </p>
                </div>
            )}
        </div>
    );
}
