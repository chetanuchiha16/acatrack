import { useEffect, useState } from "react";
import { FaFolder, FaFilePdf } from "react-icons/fa";

function FileItem({ name, isFolder, onClick, selected }) {
    return (
        <div
            className={`flex flex-col items-center w-24 m-2 p-2 rounded-lg cursor-pointer transition hover:bg-blue-100 dark:hover:bg-blue-900 ${
                selected ? "ring-2 ring-blue-400 dark:ring-blue-300" : ""
            }`}
            onClick={onClick}
        >
            <div className="text-4xl mb-1 text-yellow-500">
                {isFolder ? (
                    <FaFolder />
                ) : (
                    <FaFilePdf className="text-red-500" />
                )}
            </div>
            <div className="text-xs text-center break-words dark:text-white">
                {name}
            </div>
        </div>
    );
}

function FileGrid({ tree, path = "", setPath }) {
    const [selected, setSelected] = useState(null);
    const entries = Object.entries(tree);

    return (
        <div className="flex flex-wrap">
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
                                const downloadUrl = `http://localhost:5000/auth/Student/report${fullPath}`;
                                const link = document.createElement("a");
                                link.href = downloadUrl;
                                link.download = ""; // empty string prompts download with original filename
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
        fetch("http://localhost:5000/auth/Student/notes")
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
        <div className="w-[80vw] h-[70vh] flex justify-center items-center border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] text-black backdrop-blur-sm p-4 overflow-hidden">
            <div className="w-full max-w-6xl mx-auto mt-8 p-6 rounded-xl bg-white dark:bg-[#1e1e1e] shadow-lg h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold dark:text-white">
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
