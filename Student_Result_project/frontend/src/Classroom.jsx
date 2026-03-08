import { useEffect, useState } from "react";
import { FaFolder, FaFilePdf, FaRegFolderOpen } from "react-icons/fa";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";
import LoadingSpinner from "./LoadingSpinner";
function FileItem({ name, isFolder, onClick }) {
    return (
        <div
            className="flex flex-col items-center p-3 rounded-lg cursor-pointer transition 
                       hover:bg-indigo-100 dark:hover:bg-indigo-800 shadow-md border border-gray-200 dark:border-gray-700"
            onClick={onClick}
        >
            <div className="text-3xl mb-2 text-amber-500">
                {isFolder ? (
                    <FaFolder />
                ) : (
                    <FaFilePdf className="text-red-500" />
                )}
            </div>
            <div className="text-sm text-center break-words text-gray-800 dark:text-gray-200">
                {name}
            </div>
        </div>
    );
}

function FileGrid({ tree, path = "", setPath }) {
    const entries = Object.entries(tree);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {entries.map(([name, value]) => {
                const fullPath = `${path}/${name}`;
                const isFolder = typeof value === "object" && value !== null;

                return (
                    <FileItem
                        key={fullPath}
                        name={name}
                        isFolder={isFolder}
                        onClick={() => {
                            if (isFolder) {
                                setPath(fullPath);
                            } else if (typeof value === "string") {
                                // Open/download PDF (direct URL, not backend route)
                                window.open(value, "_blank");
                            }
                        }}
                    />
                );
            })}
        </div>
    );
}

function getDirAtPath(tree, path) {
    if (!path) return tree;
    const parts = path.split("/").filter(Boolean);
    let current = tree;
    for (let part of parts) {
        current = current?.[part];
        if (!current) return {};
    }
    return current;
}

export default function FileExplorer() {
    const [fileTree, setFileTree] = useState(null);
    const [currentPath, setCurrentPath] = useState("");

    useEffect(() => {
        fetchWithAuth(`${API_BASE}/auth/Student/notes`)
            .then((res) => res.json())
            .then(setFileTree)
            .catch((err) => console.error("Failed to load notes:", err));
    }, []);

    const currentDir = fileTree ? getDirAtPath(fileTree, currentPath) : null;

    const goBack = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        setCurrentPath("/" + parts.join("/"));
    };

    return (
        <div className="w-full flex justify-center p-4">
            <div className="w-full max-w-7xl flex flex-col border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        🗃️ Classroom Files
                    </h2>
                    {currentPath && (
                        <button
                            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 transition"
                            onClick={goBack}
                        >
                            🔙 Back
                        </button>
                    )}
                </div>

                {/* File area */}
                <div className="flex-1 overflow-auto mt-4">
                    {currentDir ? (
                        Object.keys(currentDir).length > 0 ? (
                            <FileGrid
                                tree={currentDir}
                                path={currentPath}
                                setPath={setCurrentPath}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-full mb-6 shadow-inner">
                                    <FaRegFolderOpen className="text-6xl text-indigo-400 dark:text-indigo-500 opacity-80" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Folder is Empty</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                    There are no files or subdirectories uploaded to this location yet. Check back later or navigate back to the main directory.
                                </p>
                            </div>
                        )
                    ) : (
                        <LoadingSpinner message="Fetching classroom materials..." fullScreen={false} />
                    )}
                </div>
            </div>
        </div>
    );
}
