import React from "react";

export default function LoadingSpinner({ message = "Loading...", fullScreen = true }) {
    const content = (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                {/* Inner spinning accent */}
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-semibold animate-pulse text-sm sm:text-base">
                {message}
            </p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 fixed inset-0">
                {content}
            </div>
        );
    }

    return (
        <div className="w-full flex items-center justify-center py-12">
            {content}
        </div>
    );
}
