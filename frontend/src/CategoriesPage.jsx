import React from "react";
import { CategoryList } from "./components/elements";

const CategoriesPage = ({ currentUser }) => {
    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
                {/* Categories Management Component */}
                <CategoryList currentUser={currentUser} />
            </div>
        </div>
    );
};

export default CategoriesPage;
