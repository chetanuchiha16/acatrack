import { useState, useEffect, useRef } from "react";
import * as ExcelJs from "exceljs";

export default function ExcelViewer() {
    const [worksheets, setWorksheets] = useState(null);
    const workbookRef = useRef(null);
    const [sheetIndex, setSheetIndex] = useState(0);
    const [excelData, setExcelData] = useState([]);

    useEffect(() => {
        fetch("/template.xlsx")
            .then((res) => res.arrayBuffer())
            .then(async (buffer) => {
                const workbook = await new ExcelJs.Workbook().xlsx.load(buffer);
                workbookRef.current = workbook;
                setWorksheets(workbook.worksheets);
            });
    }, []);

    useEffect(() => {
        if (!worksheets || !worksheets[sheetIndex]) return;
        let rows = [];
        worksheets[sheetIndex].eachRow((row) => {
            let values = row.values.slice(1);
            rows.push(values);
        });
        setExcelData(rows);
    }, [worksheets, sheetIndex]);

    function handleInput(e, rowIndex, cellIndex) {
        let rows = [...excelData];
        rows[rowIndex][cellIndex] = e.target.value;
        setExcelData(rows);

        let worksheet = workbookRef.current.worksheets[sheetIndex];
        let row = worksheet.getRow(rowIndex + 1);
        let cell = row.getCell(cellIndex + 1);
        cell.value = isNaN(e.target.value) ? e.target.value : Number(e.target.value);
        row.commit();
    }

    async function toExcel() {
        const buffer = await workbookRef.current.xlsx.writeBuffer();
        let blob = new Blob([buffer], { type: "application/octet-stream" });

        let formData = new FormData();
        formData.append("file", blob, "template.xlsx");

        fetch("http://localhost:5000/excel", {
            method: "POST",
            body: formData,
        })
            .then(async (res) => {
                let data = await res.json();
                return { data, status_code: res.status };
            })
            .then(({ data, status_code }) => {
                alert(data.message || data.error, status_code);
            });
    }

    function addRow() {
        let newRow = new Array(excelData[0]?.length || 1).fill("");
        setExcelData([...excelData, newRow]);
    }

    return (
        <div style={{ padding: "1rem" }}>
            <h1 style={{ color: "var(--primary-color)" }}>Excel Table Viewer</h1>

            <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
                <select
                    value={sheetIndex}
                    onChange={(e) => setSheetIndex(Number(e.target.value))}
                    style={{
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "var(--input-bg)",
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
                    style={{
                        backgroundColor: "var(--button-bg)",
                        color: "var(--button-text)",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    ➕ Add Row
                </button>
                <button
                    onClick={toExcel}
                    style={{
                        backgroundColor: "var(--accent-color)",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    ⬆ Upload
                </button>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        borderCollapse: "collapse",
                        width: "100%",
                        backgroundColor: "var(--table-bg)",
                    }}
                >
                    <thead>
                        <tr style={{ backgroundColor: "var(--header-bg)", color: "var(--header-text)" }}>
                            {excelData[0]?.map((cellValue, cellIndex) => (
                                <th
                                    key={cellIndex}
                                    style={{
                                        padding: "0.5rem",
                                        border: "1px solid var(--border-color)",
                                        textAlign: "left",
                                    }}
                                >
                                    {cellValue}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {excelData.slice(1).map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                style={{
                                    backgroundColor:
                                        rowIndex % 2 === 0
                                            ? "var(--row-even-bg)"
                                            : "var(--row-odd-bg)",
                                    transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--row-hover-bg)")}
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        rowIndex % 2 === 0
                                            ? "var(--row-even-bg)"
                                            : "var(--row-odd-bg)")
                                }
                            >
                                {row.map((cellValue, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        style={{
                                            padding: "0.4rem",
                                            border: "1px solid var(--border-color)",
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={cellValue}
                                            onChange={(e) =>
                                                handleInput(e, rowIndex + 1, cellIndex)
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "0.3rem",
                                                borderRadius: "4px",
                                                border: "1px solid var(--border-color)",
                                                backgroundColor: "var(--input-bg)",
                                                color: "var(--text-color)",
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
