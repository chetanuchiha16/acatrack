import React, { useState, useEffect, useRef } from "react";
import { FaFolder, FaFilePdf } from "react-icons/fa";
import API_BASE from "./config";

function FileItem({ name, isFolder, onClick, selected }) {
    return (
        <div
            className={`flex flex-col items-center w-24 sm:w-28 m-2 p-2 rounded-lg cursor-pointer transition hover:bg-blue-100 dark:hover:bg-blue-900 ${selected ? "ring-2 ring-blue-400 dark:ring-blue-300" : ""
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
        <div className="flex flex-wrap justify-center">
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

export default function TeacherNotesUploader() {
    const [fileTree, setFileTree] = useState(null);
    const [currentPath, setCurrentPath] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE}/auth/Staff/upload_notes`)
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

    const handleFileSelect = (file) => {
        if (file.type !== "application/pdf") {
            setUploadStatus("❌ Only PDF files are allowed.");
            return;
        }
        uploadFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const uploadFile = (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", currentPath);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/auth/Staff/upload_notes`, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                setUploadStatus("✅ Uploaded successfully");
                setUploadProgress(0);
                fetch(`${API_BASE}/auth/Staff/upload_notes`)
                    .then((res) => res.json())
                    .then(setFileTree);
            } else {
                setUploadStatus("❌ Upload failed");
            }
        };

        xhr.onerror = () => setUploadStatus("❌ Upload error");

        xhr.send(formData);
    };

    return (
        <div className="w-full sm:w-[90vw] lg:w-[80vw] h-auto min-h-[70vh] mx-auto flex flex-col border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] text-black p-4 overflow-hidden">
            {/* Header */}
            {/* <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center mb-4 gap-3 text-center">
        <h2 className="text-lg sm:text-xl font-semibold">
          📄 Upload Notes (PDF)
        </h2>
        {currentPath && (
          <button
            className="text-sm text-blue-600 hover:underline dark:text-blue-300"
            onClick={goBack}
          >
            🔙 Back
          </button>
        )}
      </div> */}


            <div className="flex flex-col sm:flex-row justify-center items-center mb-4 gap-3 text-center">
                <h2 className="text-lg sm:text-xl font-semibold">
                    📄 Upload Notes (PDF)
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

            {/* Drop Zone / File Grid */}
            <div
                className={`flex-1 p-4 rounded-xl border-2 border-dashed transition cursor-pointer ${dragActive
                        ? "border-green-500 bg-green-50 dark:bg-green-900"
                        : "border-gray-300"
                    }`}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                {currentDir ? (
                    <FileGrid
                        tree={currentDir}
                        path={currentPath}
                        setPath={setCurrentPath}
                    />
                ) : (
                    <p className="text-center text-gray-500">Loading...</p>
                )}
                <p className="mt-4 text-center text-xs sm:text-sm text-gray-500">
                    {dragActive
                        ? "📂 Drop file here to upload to this folder"
                        : "Drag & drop or click the button below to select a PDF"}
                </p>
            </div>

            {/* Upload Button */}
            <div className="mt-4 flex justify-center">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                    onClick={() => fileInputRef.current.click()}
                >
                    📤 Upload PDF
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={(e) => {
                    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
                }}
                className="hidden"
            />

            {/* Progress Bar */}
            {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                    ></div>
                </div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
                <p
                    className={`mt-2 text-sm text-center ${uploadStatus.startsWith("✅")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                >
                    {uploadStatus}
                </p>
            )}
        </div>
    );
}
