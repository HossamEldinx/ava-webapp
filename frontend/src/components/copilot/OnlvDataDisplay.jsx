import React from "react";
import OnlvTableWrapper from "../../onlv_js_web/OnlvTable"; // Import the wrapped table component

function OnlvDataDisplay({
    onlvData,
    onNavigateToFiles,
    title = "ONLV Data Table",
    description = "View and analyze your ONLV file data",
}) {
    console.log("OnlvDataDisplay - Component rendered");
    console.log("OnlvDataDisplay - Received data:", onlvData);
    console.log("OnlvDataDisplay - Data type:", typeof onlvData);
    console.log(
        "OnlvDataDisplay - Data stringified:",
        JSON.stringify(onlvData, null, 2)
    );

    return (
        <div className="h-full flex flex-col">
            {/* Page Header - Fixed at top */}

            {/* Main content area - Scrollable */}
            <div className="flex-1 overflow-hidden">
                {/* Conditionally render the table */}
                <div className="h-full overflow-auto px-4 sm:px-6 lg:px-8 py-4">
                    <OnlvTableWrapper jsonData={onlvData} />
                </div>
            </div>
        </div>
    );
}

export default OnlvDataDisplay;
