import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import ExcelJs from "exceljs";
import { subjectMapping } from "../../config";
import { excelExcelPost } from "../../client/sdk.gen";
import { client } from "../../client/client.gen";

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
        void client.instance.get(excel_route, { responseType: "arraybuffer" })
            .then(async (res) => {
                const workbook = await new ExcelJs.Workbook().xlsx.load(res.data as ArrayBuffer);
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
                body: { file: blob }
            });
            if (res.data) {
                const data = res.data as { message?: string; error?: string };
                alert(data?.message || data?.error);
            }
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
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[80vh]">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Spreadsheet Editor
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Editing: <span className="font-semibold text-blue-500">{worksheets?.[sheetIndex]?.name || "Loading..."}</span>
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
                    >
                        <span className="text-blue-500">➕</span> Add Row
                    </button>
                    <button
                        onClick={toExcel}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <span className="text-lg">⬆</span> Upload Data
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto relative">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 shadow-sm">
                        <tr>
                            <th
                                rowSpan={2}
                                className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 min-w-[180px] bg-gray-50 dark:bg-gray-900"
                            >
                                Student USN
                            </th>
                            <th
                                rowSpan={2}
                                className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 min-w-[200px] bg-gray-50 dark:bg-gray-900"
                            >
                                Student Name
                            </th>
                            {headers.main.map((h, idx) => (
                                <th
                                    key={idx}
                                    colSpan={h.colSpan}
                                    className="px-4 py-2 text-center font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400 border-b border-r border-gray-200 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10"
                                >
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {headers.sub.map((label, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-2 text-center font-semibold text-[10px] border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 min-w-[100px]"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody 
                        key={sheetIndex}
                        className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50"
                    >
                        {excelData.slice(1).map((row, idx) => (
                            <Row
                                key={`${sheetIndex}-${idx}`}
                                row={row}
                                rowIndex={idx + 1}
                                updateCell={updateCell}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Sheet Tabs (Bottom Bar) */}
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-3 border-r border-gray-300 dark:border-gray-700 mr-2 text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-tighter">Sheets</span>
                </div>
                {worksheets?.map((sheet, index) => (
                    <button
                        key={index}
                        onClick={() => setSheetIndex(index)}
                        className={`px-4 py-1.5 rounded-t-lg text-xs font-bold transition-all whitespace-nowrap border-x border-t -mb-2 ${
                            sheetIndex === index
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
                                : "bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-800/50"
                        }`}
                    >
                        {sheet.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
