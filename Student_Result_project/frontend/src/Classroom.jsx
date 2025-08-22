import { useEffect, useState } from "react";
import { FaFolder, FaFilePdf } from "react-icons/fa";
import API_BASE from "./config";

function FileItem({ name, isFolder, onClick, selected }) {
    return (
        <div
            className={`flex flex-col items-center p-3 sm:p-4 rounded-lg cursor-pointer transition 
                hover:bg-indigo-100 dark:hover:bg-indigo-800 shadow-sm
                ${selected ? "ring-2 ring-indigo-400 dark:ring-indigo-300" : ""}`}
            onClick={onClick}
        >
            <div className="text-3xl sm:text-4xl mb-2 text-amber-500">
                {isFolder ? (
                    <FaFolder />
                ) : (
                    <FaFilePdf className="text-red-500" />
                )}
            </div>
            <div className="text-xs sm:text-sm text-center break-words text-gray-800 dark:text-gray-200">
                {name}
            </div>
        </div>
    );
}

function FileGrid({ tree, path = "", setPath }) {
    const [selected, setSelected] = useState(null);
    const entries = Object.entries(tree);

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {entries.map(([name, value]) => {
                const fullPath = `${path}/${name}`;
                const isFolder = value !== null;

                return (
                    <FileItem
                        key={fullPath}
                        name={name}
                        isFolder={isFolder}
                        selected={selected === fullPath}
                        onClick={() => {
                            setSelected(fullPath);
                            if (isFolder) {
                                setPath(fullPath);
                            } else {
                                const encodedPath = fullPath
                                    .split("/")
                                    .map(encodeURIComponent)
                                    .join("/");
                                const downloadUrl = `${API_BASE}/auth/Student/report${encodedPath}`;
                                const link = document.createElement("a");
                                link.href = downloadUrl;
                                link.download = "";
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
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
        fetch(`${API_BASE}/auth/Student/notes`)
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
        <div className="w-screen min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-gray-900 dark:to-gray-800 flex justify-center items-center p-4">
            <div className="w-full max-w-7xl mx-auto flex flex-col border border-gray-300 dark:border-gray-700 rounded-2xl shadow-lg 
                dark:text-gray-100 dark:bg-gray-900 bg-white text-gray-900 backdrop-blur-sm p-4 h-[80vh]">
                
                {/* Sticky header */}
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 p-2 rounded">
                    <h2 className="text-lg sm:text-xl font-semibold text-indigo-600 dark:text-indigo-400">
                        🗃️ File Explorer
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

                {/* Scrollable file area */}
                <div className="flex-1 overflow-auto">
                    {currentDir ? (
                        <FileGrid
                            tree={currentDir}
                            path={currentPath}
                            setPath={setCurrentPath}
                        />
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                            Loading...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
