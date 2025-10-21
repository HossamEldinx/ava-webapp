import React, { useState } from "react";
import CreateOnlvChangeDetector, {
    validateIdentifier,
    parseIdentifier,
    detectChanges,
    generateChangeSummary,
} from "./CreateOnlvChangeDetector";
import ChangeBasedModal from "./ChangeBasedModal";

/**
 * Test component to demonstrate the CreateOnlv change detection functionality
 */
const CreateOnlvChangeDetectorTest = () => {
    const [detector] = useState(() => new CreateOnlvChangeDetector());
    const [currentIdentifier, setCurrentIdentifier] = useState("");
    const [previousIdentifier, setPreviousIdentifier] = useState("");
    const [results, setResults] = useState(null);
    const [history, setHistory] = useState([]);

    // State for testing folgeposition modal
    const [showFolgepositionModal, setShowFolgepositionModal] = useState(false);
    const [folgepositionTestData, setFolgepositionTestData] = useState(null);

    const handleTest = () => {
        if (!currentIdentifier.trim()) {
            alert("Please enter a current identifier");
            return;
        }

        // Test validation
        const validation = validateIdentifier(currentIdentifier);

        // Test parsing
        const parsed = parseIdentifier(currentIdentifier);

        // Test change detection if we have a previous identifier
        let changeResult = null;
        if (previousIdentifier.trim()) {
            changeResult = detectChanges(previousIdentifier, currentIdentifier);
        }

        // Set identifier in detector
        const detectorResult = detector.setIdentifier(
            currentIdentifier,
            !!previousIdentifier.trim()
        );

        const testResults = {
            identifier: currentIdentifier,
            validation,
            parsed,
            changeResult,
            detectorResult,
            summary: changeResult ? generateChangeSummary(changeResult) : null,
        };

        setResults(testResults);

        // Add to history
        setHistory((prev) => [
            ...prev,
            {
                timestamp: new Date().toLocaleString(),
                ...testResults,
            },
        ]);

        console.log("Test Results:", testResults);
    };

    const handleClear = () => {
        setCurrentIdentifier("");
        setPreviousIdentifier("");
        setResults(null);
        setHistory([]);
        detector.clearHistory();
    };

    const handleTestFolgepositionModal = () => {
        setShowFolgepositionModal(true);
    };

    const handleFolgepositionSave = (data) => {
        console.log("Folgeposition data saved:", data);
        setFolgepositionTestData(data);
        setShowFolgepositionModal(false);
    };

    const handleFolgepositionClose = () => {
        setShowFolgepositionModal(false);
    };

    const testCases = [
        { name: "Valid 6-digit with letter", value: "991090A" },
        { name: "Valid 6-digit standalone", value: "991090" },
        { name: "Valid 4-digit", value: "9910" },
        { name: "Valid 2-digit", value: "99" },
        { name: "Invalid 3-digit", value: "991" },
        { name: "Invalid 1-digit", value: "9" },
        { name: "Invalid with multiple letters", value: "9910AB" },
        { name: "Invalid empty", value: "" },
    ];

    return (
        <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-blue-300">
                CreateOnlv Change Detector Test
            </h1>

            {/* Test Input Section */}
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-4 text-blue-300">
                    Test Input
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Previous Identifier (optional)
                        </label>
                        <input
                            type="text"
                            value={previousIdentifier}
                            onChange={(e) =>
                                setPreviousIdentifier(e.target.value)
                            }
                            placeholder="e.g., 991090"
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Current Identifier
                        </label>
                        <input
                            type="text"
                            value={currentIdentifier}
                            onChange={(e) =>
                                setCurrentIdentifier(e.target.value)
                            }
                            placeholder="e.g., 991091A"
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-gray-200"
                        />
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={handleTest}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Test
                    </button>
                    <button
                        onClick={handleClear}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleTestFolgepositionModal}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Test Folgeposition Form
                    </button>
                </div>

                {/* Quick Test Cases */}
                <div>
                    <h3 className="text-sm font-medium mb-2">
                        Quick Test Cases:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {testCases.map((testCase, index) => (
                            <button
                                key={index}
                                onClick={() =>
                                    setCurrentIdentifier(testCase.value)
                                }
                                className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600"
                                title={testCase.name}
                            >
                                {testCase.value || "empty"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {results && (
                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-blue-300">
                        Test Results
                    </h2>

                    {/* Validation Results */}
                    <div className="mb-4">
                        <h3 className="font-medium mb-2">Validation:</h3>
                        <div
                            className={`p-2 rounded ${
                                results.validation.isValid
                                    ? "bg-green-900 border border-green-600"
                                    : "bg-red-900 border border-red-600"
                            }`}
                        >
                            <div className="font-medium">
                                {results.validation.isValid
                                    ? "✓ Valid"
                                    : "✗ Invalid"}
                            </div>
                            {!results.validation.isValid && (
                                <ul className="text-sm mt-1 list-disc list-inside">
                                    {results.validation.errors.map(
                                        (error, index) => (
                                            <li key={index}>{error}</li>
                                        )
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Parsing Results */}
                    {results.parsed && (
                        <div className="mb-4">
                            <h3 className="font-medium mb-2">
                                Parsed Structure:
                            </h3>
                            <div className="bg-gray-700 p-2 rounded">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>LG: {results.parsed.lg || "null"}</div>
                                    <div>
                                        ULG: {results.parsed.ulg || "null"}
                                    </div>
                                    <div>
                                        Grundtextnr:{" "}
                                        {results.parsed.grundtextnr || "null"}
                                    </div>
                                    <div>
                                        FTNR: {results.parsed.ftnr || "null"}
                                    </div>
                                    <div>
                                        Type:{" "}
                                        {results.parsed.isStandalone
                                            ? "Standalone"
                                            : "Follow-up"}
                                    </div>
                                    <div>
                                        Digits: {results.parsed.digitCount}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Change Detection Results */}
                    {results.changeResult && (
                        <div className="mb-4">
                            <h3 className="font-medium mb-2">
                                Change Detection:
                            </h3>
                            <div className="bg-gray-700 p-2 rounded">
                                {results.changeResult.hasChanges ? (
                                    <div>
                                        <div className="font-medium text-yellow-300 mb-2">
                                            Changes Detected:
                                        </div>
                                        <div className="text-sm mb-2">
                                            {results.summary}
                                        </div>
                                        <div className="text-xs">
                                            <strong>Changed Components:</strong>
                                            <ul className="list-disc list-inside ml-2">
                                                {results.changeResult.changedComponents.map(
                                                    (component) => (
                                                        <li key={component}>
                                                            {component.toUpperCase()}
                                                            :{" "}
                                                            {results
                                                                .changeResult
                                                                .changes[
                                                                component
                                                            ].from ||
                                                                "null"}{" "}
                                                            →{" "}
                                                            {results
                                                                .changeResult
                                                                .changes[
                                                                component
                                                            ].to || "null"}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-green-300">
                                        No changes detected
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold mb-4 text-blue-300">
                        Test History
                    </h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history
                            .slice()
                            .reverse()
                            .map((entry, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-700 p-2 rounded text-sm"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">
                                            {entry.identifier}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {entry.timestamp}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-300">
                                        Valid:{" "}
                                        {entry.validation.isValid
                                            ? "Yes"
                                            : "No"}
                                        {entry.changeResult &&
                                            entry.changeResult.hasChanges && (
                                                <span className="ml-2 text-yellow-300">
                                                    | Changes:{" "}
                                                    {entry.changeResult.changedComponents.join(
                                                        ", "
                                                    )}
                                                </span>
                                            )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Folgeposition Test Results */}
            {folgepositionTestData && (
                <div className="bg-gray-800 p-4 rounded-lg mt-6">
                    <h2 className="text-lg font-semibold mb-4 text-blue-300">
                        Folgeposition Test Results
                    </h2>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto bg-gray-700 p-3 rounded">
                        {JSON.stringify(folgepositionTestData, null, 2)}
                    </pre>
                </div>
            )}

            {/* Folgeposition Modal */}
            {showFolgepositionModal && (
                <ChangeBasedModal
                    title="90C" // Test title with 2 digits + letter
                    type="folgeposition"
                    onClose={handleFolgepositionClose}
                    onSaveInputs={handleFolgepositionSave}
                    initialPositionInfoData={{
                        data: {
                            langtext: {
                                p: "Test grundtext langtext for folgeposition",
                            },
                        },
                    }}
                    onlvData={{
                        // Mock ONLV data for testing
                        "ausschreibungs-lv": {
                            "gliederung-lg": {
                                "lg-liste": {
                                    lg: [
                                        {
                                            "@_nr": "01",
                                            "lg-eigenschaften": {
                                                ueberschrift:
                                                    "Test Leistungsgruppe 01",
                                            },
                                            "ulg-liste": {
                                                ulg: [
                                                    {
                                                        "@_nr": "02",
                                                        "ulg-eigenschaften": {
                                                            ueberschrift:
                                                                "Test Unterleistungsgruppe 01.02",
                                                        },
                                                        positionen: {
                                                            grundtextnr: [],
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                        metadaten: {
                            dateiname: "test.onlv",
                            erstelltam: new Date().toISOString(),
                        },
                    }} // Mock ONLV data for testing
                    parentContext={{
                        lgNr: "01",
                        ulgNr: "02",
                        grundtextNrPath: "01.02.90", // Test path for adding to existing grundtext
                        parentId: "test-parent-id",
                        level: 2,
                    }} // Test parent context
                    onDataUpdate={(updatedData) => {
                        console.log("Test: ONLV data updated:", updatedData);
                        // In a real app, this would update the parent component's state
                    }} // Test callback for data updates
                />
            )}
        </div>
    );
};

export default CreateOnlvChangeDetectorTest;
