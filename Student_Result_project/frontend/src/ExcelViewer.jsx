import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import * as ExcelJs from "exceljs";
import API_BASE from "./config";
import { subjectMapping } from "./config";

const EditableCell = React.memo(function EditableCell({
    value,
    rowIndex,
    cellIndex,
    handleCommit,
}) {
    return (
        <td className="border px-2 py-1">
            <input
                defaultValue={value ?? ""}
                onBlur={(e) =>
                    handleCommit(e.target.value, rowIndex, cellIndex)
                }
                className="w-full px-2 py-1 rounded text-sm bg-[var(--input-bg)] text-[var(--text-color)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />
        </td>
    );
});

const Row = React.memo(function Row({ row, rowIndex, updateCell }) {
    return (
        <tr>
            {row.map((cellValue, cellIndex) => (
                <EditableCell
                    key={cellIndex}
                    value={cellValue}
                    rowIndex={rowIndex}
                    cellIndex={cellIndex}
                    handleCommit={updateCell}
                />
            ))}
        </tr>
    );
});

export default function ExcelViewer({excel_route}) {
    const [worksheets, setWorksheets] = useState(null);
    const workbookRef = useRef(null);
    const [sheetIndex, setSheetIndex] = useState(0);
    const [excelData, setExcelData] = useState([]);

    // Load Excel file once
    useEffect(() => {
        fetch(`${excel_route}`,{credentials:"include"})
            .then((res) => res.arrayBuffer())
            .then(async (buffer) => {
                const workbook = await new ExcelJs.Workbook().xlsx.load(buffer);
                workbookRef.current = workbook;
                setWorksheets(workbook.worksheets);
            });
    }, [excel_route]);

    // Parse selected sheet
    useEffect(() => {
        if (!worksheets || !worksheets[sheetIndex]) return;

        let rows = [];
        let maxCols = 0;
        const sheet = worksheets[sheetIndex];

        sheet.eachRow((row) => {
            maxCols = Math.max(maxCols, row.cellCount);
        });

        sheet.eachRow((row) => {
            let values = row.values.slice(1);
            while (values.length < maxCols) values.push("");
            rows.push(values);
        });

        setExcelData(rows);
    }, [worksheets, sheetIndex]);

    // Commit change to both state + workbook
    const updateCell = useCallback(
        (newValue, r, c) => {
            setExcelData((prev) => {
                const copy = [...prev];
                const rowCopy = [...copy[r]];
                rowCopy[c] = newValue;
                copy[r] = rowCopy;
                return copy;
            });

            const worksheet = workbookRef.current.worksheets[sheetIndex];
            const row = worksheet.getRow(r + 1);
            row.getCell(c + 1).value = isNaN(newValue)
                ? newValue
                : Number(newValue);
            row.commit();
        },
        [sheetIndex]
    );

    async function toExcel() {
        const buffer = await workbookRef.current.xlsx.writeBuffer();
        let blob = new Blob([buffer], { type: "application/octet-stream" });

        let formData = new FormData();
        formData.append("file", blob, `${excel_route.split("/").pop()}`);

        const res = await fetch(`${API_BASE}/excel`, {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        alert(data.message || data.error);
    }

    function addRow() {
        let newRow = new Array(excelData[0]?.length || 1).fill("");
        setExcelData((prev) => [...prev, newRow]);
    }

    // Memoized headers
    const headers = useMemo(() => {
        if (!excelData[0]) return { main: [], sub: [] };

        const firstRow = excelData[0];
        const codes = firstRow
            .filter((cell) => !/usn|name/i.test(cell))
            .reduce((acc, cell) => {
                const [code] = String(cell).split("_");
                if (!acc.includes(code)) acc.push(code);
                return acc;
            }, []);

        const main = codes.map((code) => ({
            code,
            colSpan: firstRow.filter((c) => c.startsWith(code)).length,
            label:
                subjectMapping[worksheets?.[sheetIndex]?.name]?.[code] || code,
        }));

        const sub = firstRow
            .filter((cell) => !/usn|name/i.test(cell))
            .map((cell) => {
                const [, ...rest] = String(cell).split("_");
                const label = rest
                    .join(" ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                return label;
            });

        return { main, sub };
    }, [excelData, sheetIndex, worksheets]);

    return (
        <div style={{ padding: "1rem" }}>
            <h1 className="text-[1.125rem] sm:text-[1.5rem] md:text-[2rem] leading-tight mb-6 text-[var(--primary-color)]">
                Excel Table Viewer
            </h1>

            <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
                <select
                    value={sheetIndex}
                    onChange={(e) => setSheetIndex(Number(e.target.value))}
                    style={{
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-color)",
                    }}
                >
                    {worksheets?.map((sheet, index) => (
                        <option key={index} value={index}>
                            {sheet.name}
                        </option>
                    ))}
                </select>
                <button
                    onClick={addRow}
                    className="text-white px-4 py-2 rounded bg-blue-600"
                >
                    ➕ Add Row
                </button>
                <button
                    onClick={toExcel}
                    className="text-white px-4 py-2 rounded bg-green-600"
                >
                    ⬆ Upload
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-[var(--header-bg)] text-[var(--header-text)]">
                            <th
                                rowSpan={2}
                                className="border px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[200px]"
                            >
                                Student USN
                            </th>
                            <th
                                rowSpan={2}
                                className="border px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[200px]"
                            >
                                Student Name
                            </th>
                            {headers.main.map((h, idx) => (
                                <th
                                    key={idx}
                                    colSpan={h.colSpan}
                                    className="border px-3 py-2 text-center font-semibold whitespace-nowrap"
                                >
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                        <tr className="bg-[var(--header-bg)] text-[var(--header-text)]">
                            {headers.sub.map((label, idx) => (
                                <th
                                    key={idx}
                                    className="border px-3 py-2 text-center font-medium whitespace-nowrap min-w-[90px]"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {excelData.slice(1).map((row, idx) => (
                            <Row
                                key={idx}
                                row={row}
                                rowIndex={idx + 1}
                                updateCell={updateCell}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
