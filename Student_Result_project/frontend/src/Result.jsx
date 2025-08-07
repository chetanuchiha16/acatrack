import { useEffect, useState } from "react";
import axios from "axios";

export default function Result({ usn, semester }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    const fetchStudent = async () => {
        try {
            const res = await axios.get(
                "http://localhost:5000/auth/Student/result",
                {
                    params: { usn, semester },
                }
            );
            setData(res.data);
            console.log(res.data, res.status);
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong.");
        }
    };

    useEffect(() => {
        if (usn && semester) {
            fetchStudent();
        }
    }, [usn, semester]);

    return (
        <div className="w-[80vw] h-[70vh] flex justify-center items-center border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] text-black backdrop-blur-sm p-4 overflow-hidden">
            {error && <p className="text-red-500 font-semibold">{error}</p>}

            {data && (
                <div className="w-full max-w-3xl bg-white dark:bg-[#1e1e1e] shadow-lg rounded-2xl p-6 space-y-6 border border-neutral-800 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
                        Student Report
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                        <p><span className="font-semibold">Name:</span> {data.name}</p>
                        <p><span className="font-semibold">Percentage:</span> {data.percentage.toFixed(2)}%</p>
                        <p><span className="font-semibold">USN:</span> {data.usn}</p>
                        <p><span className="font-semibold">SGPA:</span> {data.sgpa.toFixed(2)}</p>
                        <p><span className="font-semibold">Total Marks:</span> {data.total_marks}</p>
                        <p><span className="font-semibold">CGPA:</span> {data.cgpa.toFixed(2)}</p>
                        <p><span className="font-semibold">Credits:</span> {data.credits}</p>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-blue-500">Subjects</h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm max-h-64 overflow-y-auto pr-2">
                            {data.subjects.map((sub, idx) => (
                                <li
                                    key={idx}
                                    className="bg-gray-100 dark:bg-neutral-800 p-3 rounded-lg shadow-sm"
                                >
                                    <span className="font-medium">{idx + 1}. {sub.code}</span><br />
                                    IA: <span className="font-semibold">{sub.ia}</span>, SEE: <span className="font-semibold">{sub.see}</span>, Total: <span className="font-semibold">{sub.total}</span><br />
                                    Credits: <span className="font-semibold">{sub.credit}</span>,
                                    Status: <span className={`font-semibold ${sub.status === "Pass" ? "text-green-500" : "text-red-500"}`}>{sub.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                            
                    <div className="text-center">
                        <a
                            href={data.pdf_url}
                            download
                            className="inline-block px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                        >
                            📄 Download Report
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}