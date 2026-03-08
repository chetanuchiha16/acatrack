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
import { fetchWithAuth } from "./fetchWithAuth";
const EditableCell = React.memo(function EditableCell({
    value,
    rowIndex,
    cellIndex,
    handleCommit,
}) {
    return (
        <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <input
                defaultValue={value ?? ""}
                onBlur={(e) =>
                    handleCommit(e.target.value, rowIndex, cellIndex)
                }
                className="w-full px-2 py-1.5 rounded-md text-sm bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
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

export default function ExcelViewer({ excel_route }) {
    const [worksheets, setWorksheets] = useState(null);
    const workbookRef = useRef(null);
    const [sheetIndex, setSheetIndex] = useState(0);
    const [excelData, setExcelData] = useState([]);

    // Load Excel file once
    useEffect(() => {
        fetchWithAuth(`${excel_route}`, {})
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

        const res = await fetchWithAuth(`${API_BASE}/excel`, {
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
    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-6">
                Spreadsheet Editor
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6">
                <select
                    value={sheetIndex}
                    onChange={(e) => setSheetIndex(Number(e.target.value))}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[150px]"
                >
                    {worksheets?.map((sheet, index) => (
                        <option key={index} value={index}>
                            {sheet.name}
                        </option>
                    ))}
                </select>
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={addRow}
                        className="text-white px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm"
                    >
                        ➕ Add Row
                    </button>
                    <button
                        onClick={toExcel}
                        className="text-white px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 font-medium text-sm transition-colors shadow-sm"
                    >
                        ⬆ Upload Data
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400">
                        <tr>
                            <th
                                rowSpan={2}
                                className="px-4 py-3 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700 min-w-[180px]"
                            >
                                Student USN
                            </th>
                            <th
                                rowSpan={2}
                                className="px-4 py-3 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700 min-w-[200px]"
                            >
                                Student Name
                            </th>
                            {headers.main.map((h, idx) => (
                                <th
                                    key={idx}
                                    colSpan={h.colSpan}
                                    className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-xs border-b border-l border-gray-200 dark:border-gray-700"
                                >
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {headers.sub.map((label, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-2 text-center font-semibold text-xs border-b border-l border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 min-w-[100px]"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
