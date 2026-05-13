import React, { useEffect, useState } from "react";
import { FaFolder, FaFilePdf, FaRegFolderOpen } from "react-icons/fa";
import { listNotesAuthStudentNotesGet } from "./client/sdk.gen";
import LoadingSpinner from "./LoadingSpinner";

interface FileItemProps {
    name: string;
    isFolder: boolean;
    onClick: () => void;
}

const FileItem: React.FC<FileItemProps> = ({ name, isFolder, onClick }) => {
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
};

export type FileTreeNode = string | FileTree;
export interface FileTree {
    [key: string]: FileTreeNode;
}

function isFileTree(node: unknown): node is FileTree {
    return typeof node === "object" && node !== null && !Array.isArray(node);
}

interface FileGridProps {
    tree: FileTree;
    path?: string;
    setPath: (path: string) => void;
}

const FileGrid: React.FC<FileGridProps> = ({ tree, path = "", setPath }) => {
    const entries = Object.entries(tree);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {entries.map(([name, value]) => {
                const fullPath = `${path}/${name}`;
                const isFolder = isFileTree(value);

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
};

function getDirAtPath(tree: FileTree | null, path: string): FileTree | null {
    if (!tree) return null;
    if (!path) return tree;

    const parts = path.split("/").filter(Boolean);
    let current: FileTreeNode = tree;

    for (const part of parts) {
        if (!isFileTree(current)) return {};
        const next: FileTreeNode = (current as FileTree)[part];
        if (!next) return {};
        current = next;
    }

    return isFileTree(current) ? current : {};
}

const FileExplorer: React.FC = () => {
    const [fileTree, setFileTree] = useState<FileTree | null>(null);
    const [currentPath, setCurrentPath] = useState<string>("");

    useEffect(() => {
        listNotesAuthStudentNotesGet()
            .then((res) => {
                const data = res.data as unknown;
                setFileTree(isFileTree(data) ? data : {});
            })
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
};

export default FileExplorer;
