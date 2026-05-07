import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import ExcelJs from "exceljs";
import { subjectMapping } from "./config";
import { excelExcelPost } from "./client/sdk.gen";
import { client } from "./client/client.gen";

type ExcelCellValue = string | number | boolean | Date | null | undefined;
type ExcelRowData = ExcelCellValue[];
type ExcelGridData = ExcelRowData[];

interface EditableCellProps {
    value: ExcelCellValue;
    rowIndex: number;
    cellIndex: number;
    handleCommit: (newValue: string, r: number, c: number) => void;
}

const EditableCell: React.FC<EditableCellProps> = React.memo(
    function EditableCell({ value, rowIndex, cellIndex, handleCommit }) {
        const displayValue =
            typeof value === "string" || typeof value === "number"
                ? value
                : value instanceof Date
                ? value.toISOString()
                : value === null || value === undefined
                ? ""
                : String(value);

        return (
            <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <input
                    defaultValue={displayValue}
                    onBlur={(e) =>
                        handleCommit(e.target.value, rowIndex, cellIndex)
                    }
                    className="w-full px-2 py-1.5 rounded-md text-sm bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                />
            </td>
        );
    }
);

interface RowProps {
    row: ExcelRowData;
    rowIndex: number;
    updateCell: (newValue: string, r: number, c: number) => void;
}

const Row: React.FC<RowProps> = React.memo(function Row({
    row,
    rowIndex,
    updateCell,
}) {
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

interface ExcelViewerProps {
    excel_route: string;
}

interface ExcelUploadResponse {
    message?: string;
    error?: string;
}

interface HeaderMainItem {
    code: string;
    colSpan: number;
    label: string;
}

interface ComputedHeaders {
    main: HeaderMainItem[];
    sub: string[];
}

function normalizeCellValue(value: unknown): ExcelCellValue {
    if (
        value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value instanceof Date
    ) {
        return value as ExcelCellValue;
    }

    return String(value);
}

export default function ExcelViewer({ excel_route }: ExcelViewerProps) {
    const [worksheets, setWorksheets] = useState<ExcelJs.Worksheet[] | null>(
        null
    );
    const workbookRef = useRef<ExcelJs.Workbook | null>(null);
    const [sheetIndex, setSheetIndex] = useState<number>(0);
    const [excelData, setExcelData] = useState<ExcelGridData>([]);

    // Load Excel file once
    useEffect(() => {
        client.instance.get(excel_route, { responseType: "arraybuffer" })
            .then(async (res) => {
                const workbook = await new ExcelJs.Workbook().xlsx.load(res.data);
                workbookRef.current = workbook;
                setWorksheets(workbook.worksheets);
            });
    }, [excel_route]);

    // Parse selected sheet
    useEffect(() => {
        if (!worksheets || !worksheets[sheetIndex]) return;

        const rows: ExcelGridData = [];
        let maxCols = 0;
        const sheet = worksheets[sheetIndex];

        sheet.eachRow((row) => {
            maxCols = Math.max(maxCols, row.cellCount);
        });

        sheet.eachRow((row) => {
            const values = row.values;
            // The row.values array from ExcelJS often is 1-indexed (index 0 is null/empty)
            // So slice(1) typically grabs the actual cell values.
            const rawValues = Array.isArray(values) ? values.slice(1) : [];
            const cellValues: ExcelRowData = rawValues.map(normalizeCellValue);

            while (cellValues.length < maxCols) cellValues.push("");
            rows.push(cellValues);
        });

        setExcelData(rows);
    }, [worksheets, sheetIndex]);

    // Commit change to both state + workbook
    const updateCell = useCallback(
        (newValue: string, r: number, c: number) => {
            setExcelData((prev) => {
                const copy = [...prev];
                const rowCopy = [...(copy[r] ?? [])];
                rowCopy[c] = newValue;
                copy[r] = rowCopy;
                return copy;
            });

            if (workbookRef.current) {
                const worksheet = workbookRef.current.worksheets[sheetIndex];
                const row = worksheet.getRow(r + 1);
                row.getCell(c + 1).value = isNaN(Number(newValue))
                    ? newValue
                    : Number(newValue);
                row.commit();
            }
        },
        [sheetIndex]
    );

    async function toExcel() {
        if (!workbookRef.current) return;
        const buffer = await workbookRef.current.xlsx.writeBuffer();
        let blob = new Blob([buffer], { type: "application/octet-stream" });

        try {
            const res = await excelExcelPost({
                body: { file: blob as any }
            });
            const data = res.data as any;
            alert(data?.message || data?.error);
        } catch (err) {
            console.error(err);
            alert("Error uploading Excel file.");
        }
    }

    function addRow() {
        const newRow: ExcelRowData = new Array(excelData[0]?.length || 1).fill(
            ""
        );
        setExcelData((prev) => [...prev, newRow]);
    }

    // Memoized headers
    const headers = useMemo<ComputedHeaders>(() => {
        if (!excelData[0]) return { main: [], sub: [] };

        const firstRow = excelData[0];
        const codes = firstRow
            .filter((cell) => !/usn|name/i.test(String(cell)))
            .reduce((acc: string[], cell) => {
                const [code] = String(cell).split("_");
                if (!acc.includes(code)) acc.push(code);
                return acc;
            }, []);

        const currentSheetName = worksheets?.[sheetIndex]?.name || "";
        const mappingDictionary = subjectMapping as Record<
            string,
            Record<string, string>
        >;

        const main = codes.map((code) => ({
            code,
            colSpan: firstRow.filter((c) => String(c).startsWith(code)).length,
            label:
                mappingDictionary[currentSheetName]?.[code] || code,
        }));

        const sub = firstRow
            .filter((cell) => !/usn|name/i.test(String(cell)))
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
