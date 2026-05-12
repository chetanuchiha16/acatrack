import React, { useState, useEffect } from "react";
import { semesterOptions, subjectMapping } from "./config";
import { 
    getSubjectResultsAuthStaffSubResGet,
    getSubjectReportPdfAuthStaffSubResReportGet
} from "./client/sdk.gen";

interface SubjectResultsProps {
    batchYear: string;
}

interface StatProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    danger?: boolean;
}

interface SubjectData {
    subject_name: string;
    subject_code: string;
    semester: string;
    total_students: number;
    present_students: number;
    absent_students: number;
    pass_percentage: number;
    pass_count: number;
    fcd_count: number;
    fc_count: number;
    sc_count: number;
    fail_count: number;
}

const SubjectResults: React.FC<SubjectResultsProps> = ({ batchYear }) => {
    const [semester, setSemester] = useState<string>("");
    const [subject, setSubject] = useState<string>("");
    const [data, setData] = useState<SubjectData | null>(null);

    useEffect(() => {
        if (semester && subject && batchYear) {
            void fetchData();
        } else {
            setData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semester, subject, batchYear]);

    const fetchData = async () => {
        if (!semester || !subject || !batchYear) return;
        try {
            const res = await getSubjectResultsAuthStaffSubResGet({
                query: { semester, subject, batch_year: parseInt(batchYear, 10) }
            });
            if (res.data) setData(res.data as unknown as SubjectData);
        } catch (error) {
            console.error("Failed to fetch subject data:", error);
            setData(null);
        }
    };

    const downloadPDF = async () => {
        if (!semester) return;

        try {
            const res = await getSubjectReportPdfAuthStaffSubResReportGet({
                query: { semester, subject, batch_year: parseInt(batchYear, 10) }
            });

            if (res.error) {
                console.error("PDF download failed");
                return;
            }

            const blob = res.data as unknown as Blob;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${semester}_report.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to download PDF:", error);
        }
    };
    
    // Safety check to handle potential unmapped semesters gracefully
    const currentMapping = semester ? subjectMapping[semester as keyof typeof subjectMapping] : undefined;
    const mappedSubjects = currentMapping 
        ? Object.entries(currentMapping) 
        : [];

    return (
        <div className="max-w-3xl mx-auto p-6 rounded-lg bg-[var(--background)] text-[var(--foreground)] transition-colors">
            <h2 className="text-2xl font-bold mb-4">Subject Results</h2>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-6">
                <select
                    value={semester}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setSemester(e.target.value);
                        setSubject("");
                    }}
                    className="border rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] border-gray-400"
                >
                    <option value="">Select Semester</option>
                    {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                            {sem}
                        </option>
                    ))}
                </select>

                <select
                    value={subject}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubject(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] border-gray-400"
                    disabled={!semester}
                >
                    <option value="">Select Subject</option>
                    {semester &&
                        mappedSubjects.map(
                            ([code, name]) => (
                                <option key={code} value={code}>
                                    {String(name)}
                                </option>
                            )
                        )}
                </select>

                <button
                    onClick={fetchData}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!semester || !subject}
                >
                    Fetch
                </button>

                <button
                    onClick={downloadPDF}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!semester || !subject}
                >
                    PDF
                </button>
            </div>

            {/* Stats Card */}
            {data && (
                <div className="p-6 rounded-xl shadow-sm bg-[var(--card)] text-[var(--card-foreground)] transition-colors">
                    <h3 className="text-lg font-semibold mb-4">
                        {data.subject_name} {data.subject_code} —{" "}
                        {data.semester}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Stat
                            label="Total Students"
                            value={data.total_students}
                        />
                        <Stat label="Present" value={data.present_students} />
                        <Stat label="Absent" value={data.absent_students} />
                        <Stat
                            label="Pass %"
                            value={`${data.pass_percentage}%`}
                            highlight
                        />
                    </div>

                    <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-4">
                        <Stat label="Pass Count" value={data.pass_count} />
                        <Stat label="FCD" value={data.fcd_count} />
                        <Stat label="FC" value={data.fc_count} />
                        <Stat label="SC" value={data.sc_count} />
                        <Stat label="Fail" value={data.fail_count} danger />
                    </div>
                </div>
            )}
        </div>
    );
};

const Stat: React.FC<StatProps> = ({ label, value, highlight, danger }) => {
    let classes =
        "flex flex-col items-center justify-center p-3 rounded-lg shadow-sm";
    
    // Fix string assignment spacing properly avoiding potential missing spaces
    if (highlight) {
        classes += " bg-green-200 text-green-900";
    } else if (danger) {
        classes += " bg-red-200 text-red-900";
    } else {
        classes += " bg-[var(--background)] text-[var(--foreground)]";
    }

    return (
        <div className={classes}>
            <div className="text-xs uppercase opacity-70">{label}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    );
};

export default SubjectResults;
