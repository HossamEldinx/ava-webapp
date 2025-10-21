// This file creates a simple pop-up window (a "modal") that shows detailed information
// about a specific item from an ONLV project, like a task or a group of tasks.
//
// The main idea of this file is to:
// 1. Receive an object containing data for a "Position" or a "ULG" (a group of positions).
// 2. Display this data in a clean, easy-to-read format inside a pop-up window.
// 3. This modal is for viewing information only ("read-only"). You can look at the data, but you can't change it here.
// 4. It appears on the screen when a user wants to see more details about a specific item,
//    and it can be closed by clicking a button or the background.

import React from "react"; // We need to import React to create our component.

// This is our main pop-up window component. Think of it as a reusable building block for our app.
// It takes two pieces of information (called "props") to know what to show and how to close itself.
const PositionInfoModal = ({
    positionInfo, // This is the object that holds all the data we want to display in the pop-up.
    onClose, // This is a function that tells the app how to close this pop-up window.
}) => {
    // This is a safety check. If for some reason there is no information to display (`positionInfo` is empty),
    // we simply show nothing. This prevents the app from crashing.
    if (!positionInfo) return null;

    // This is a small helper function that takes a JavaScript object and converts it into a nicely formatted string.
    // The `JSON.stringify(obj, null, 2)` part makes the text readable by adding line breaks and spaces,
    // much like formatting a document to make it easier to read.
    const formatObject = (obj) => {
        return JSON.stringify(obj, null, 2);
    };

    // This is the visual part of our component. It describes what the pop-up will look like on the screen.
    return (
        // The `<>` is a React Fragment. It lets us group multiple elements together without adding an extra box to the webpage.
        <>
            {/* This `div` is the dark, semi-transparent background that covers the whole screen behind the pop-up.
                When you click on it, it calls the `onClose` function to close the modal. */}
            <div
                className="fixed inset-0 bg-gray-900 bg-opacity-70 z-[999]"
                onClick={onClose}
            ></div>

            {/* This `div` is the actual pop-up box that you see in the middle of the screen. */}
            <div
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                  bg-gray-800 p-6 rounded-lg shadow-xl z-[1000]
                  w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl text-gray-200
                  flex flex-col max-h-[90vh]"
            >
                {/* This is the title of the pop-up window.
                    It checks if the item is a "ULG" and changes the title accordingly. */}
                <h3 className="text-xl font-semibold mb-4 flex-shrink-0">
                    {positionInfo.isUlg
                        ? "ULG Information" // If it's a ULG, show this title.
                        : "Position Information"}{" "}
                    {/* Otherwise, show this title. */}
                </h3>

                {/* This small section displays the type of information being shown (e.g., "ulg"). */}
                <div className="mb-4 p-2 bg-gray-700 rounded-md inline-block">
                    <span className="font-semibold">Info Type:</span>{" "}
                    <span className="text-green-600">
                        {positionInfo.info_type ||
                            (positionInfo.isUlg ? "ulg" : "unknown")}
                    </span>
                </div>

                {/* This is the main content area where the detailed information is displayed.
                    It's designed to be scrollable if the content is too long to fit in the box. */}
                <div className="overflow-y-auto flex-grow pr-2 py-2">
                    {/* The `<pre>` tag is special. It tells the browser to keep the text exactly as it is,
                        including all the spaces and line breaks from our `formatObject` function.
                        This is perfect for showing code or formatted data. */}
                    <pre className="text-sm whitespace-pre-wrap bg-gray-700 p-4 rounded">
                        {/* Here, we call our helper function to get the formatted string of our data. */}
                        {formatObject(positionInfo)}
                    </pre>
                </div>

                {/* This section contains the action buttons at the bottom of the pop-up. */}
                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    {/* This is the "Close" button. When a user clicks it, it calls the `onClose` function,
                        which was given to us from the parent component, to hide the pop-up. */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-600 transition ease-in-out duration-150"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </>
    );
};

// We export our component so that other parts of the application can use it.
export default PositionInfoModal;
