import React, { useState } from "react";
import { useLocalization } from "./contexts/LocalizationContext";
import Modal from "./components/common/Modal";
import CreateNewPosition from "./components/elements/CreateNewPosition";

function HomePage({
    onNavigateToBoQ,
    onNavigateToCategories,
    onNavigateToCustomPositions,
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useLocalization();

    const closeModal = () => setIsModalOpen(false);

    const cardClasses =
        "bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-indigo-600 transition-all duration-300 flex flex-col items-center text-center";
    const titleClasses = "text-xl font-semibold text-white mb-4";
    const linkButtonClasses =
        "mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";

    return (
        <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <div className="max-w-4xl mx-auto text-center mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                    AVA-Software 2.0
                </h1>
                <p className="mt-4 text-lg sm:text-xl text-gray-300">
                    {t("homepage.subtitle")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
                {/* Box 1: BoQ Page */}
                <div className={cardClasses}>
                    <svg
                        className="w-16 h-16 text-indigo-400 mb-4"
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
                    <h2 className={titleClasses}>{t("homepage.boq.title")}</h2>
                    <p className="text-gray-300 mb-6 flex-grow">
                        {t("homepage.boq.description")}
                    </p>
                    <button
                        onClick={onNavigateToBoQ}
                        className={linkButtonClasses}
                    >
                        {t("homepage.boq.button")}
                    </button>
                </div>

                {/* Box 3: Elements Page */}
                <div className={cardClasses}>
                    <svg
                        className="w-16 h-16 text-indigo-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                    <h2 className={titleClasses}>
                        {t("homepage.elements.title")}
                    </h2>
                    <p className="text-gray-300 mb-6 flex-grow">
                        {t("homepage.elements.description")}
                    </p>
                    <button
                        onClick={onNavigateToCategories}
                        className={linkButtonClasses}
                    >
                        {t("homepage.elements.button")}
                    </button>
                </div>

                {/* Box 3: Create New Position */}
                {/*                 <div className={cardClasses}>
                    <svg
                        className="w-16 h-16 text-indigo-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <h2 className={titleClasses}>
                        {t("homepage.createPosition.title")}
                    </h2>
                    <p className="text-gray-300 mb-6 flex-grow">
                        {t("homepage.createPosition.description")}
                    </p>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={openModal}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 text-sm"
                        >
                            {t("homepage.createPosition.button")}
                        </button>
                        <button
                            onClick={onNavigateToCustomPositions}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 text-sm"
                        >
                            {t("homepage.createPosition.seeAllButton")}
                        </button>
                    </div>
                </div> */}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={t("modal.createNewPosition")}
            >
                <CreateNewPosition />
            </Modal>
        </div>
    );
}

export default HomePage;
