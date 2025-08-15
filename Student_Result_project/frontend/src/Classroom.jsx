import { useEffect, useState } from "react";
import { FaFolder, FaFilePdf } from "react-icons/fa";
import API_BASE from "./config";

function FileItem({ name, isFolder, onClick, selected }) {
    return (
        <div
            className={`flex flex-col items-center p-3 sm:p-4 rounded-lg cursor-pointer transition hover:bg-blue-100 dark:hover:bg-blue-900 ${
                selected ? "ring-2 ring-blue-400 dark:ring-blue-300" : ""
            }`}
            onClick={onClick}
        >
            <div className="text-3xl sm:text-4xl mb-2">
                {isFolder ? (
                    <FaFolder className="text-yellow-500" />
                ) : (
                    <FaFilePdf className="text-red-500" />
                )}
            </div>
            <div className="text-xs sm:text-sm text-center break-words dark:text-white">
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
        <div className="w-full max-w-7xl mx-auto flex flex-col border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] backdrop-blur-sm p-4 h-[80vh]">
            {/* Sticky header */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-[#1e1e1e] z-10 p-2 rounded">
                <h2 className="text-lg sm:text-xl font-semibold">
                    🗃️ File Explorer
                </h2>
                {currentPath && (
                    <button
                        className="text-sm text-blue-600 hover:underline dark:text-blue-300"
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
                    <p className="text-gray-600 dark:text-gray-400">
                        Loading...
                    </p>
                )}
            </div>
        </div>
    );
}
