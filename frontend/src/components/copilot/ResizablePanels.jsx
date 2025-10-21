import React, { useState, useRef, useEffect } from "react";

const ResizablePanels = ({
    leftPanel,
    rightPanel,
    defaultLeftWidth = 50,
    minLeftWidth = 20,
    maxLeftWidth = 80,
}) => {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth =
            ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Clamp the width between min and max values
        const clampedWidth = Math.min(
            Math.max(newLeftWidth, minLeftWidth),
            maxLeftWidth
        );
        setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        } else {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isDragging]);

    return (
        <div ref={containerRef} className="flex h-full w-full">
            {/* Left Panel */}
            <div
                className="flex-shrink-0 overflow-hidden"
                style={{ width: `${leftWidth}%` }}
            >
                {leftPanel}
            </div>

            {/* Resizer */}
            <div
                className={`flex-shrink-0 w-1 bg-gray-700 hover:bg-gray-600 cursor-col-resize transition-colors duration-200 relative group ${
                    isDragging ? "bg-indigo-500" : ""
                }`}
                onMouseDown={handleMouseDown}
            >
                {/* Visual indicator */}
                <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-500 group-hover:bg-gray-400 transition-colors duration-200" />

                {/* Drag handle - visible on hover */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="flex flex-col space-y-1">
                        <div className="w-0.5 h-1 bg-gray-300 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-gray-300 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div
                className="flex-1 overflow-hidden"
                style={{ width: `${100 - leftWidth}%` }}
            >
                {rightPanel}
            </div>
        </div>
    );
};

export default ResizablePanels;
