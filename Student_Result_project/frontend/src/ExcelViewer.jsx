import { useState, useEffect, useRef } from "react";
import * as ExcelJs from "exceljs";

export default function ExcelViewer() {
    let [worksheets, setWorksheets] = useState(null);
    //   let [workbook, setWorkBook] = useState()
    let workbookRef = useRef(null);
    let [sheetIndex, setSheetIndex] = useState(0);
    let [excelData, setExcelData] = useState([]);

    useEffect(() => {
        fetch("template.xlsx")
            .then((res) => res.arrayBuffer())
            .then(async (buffer) => {
                // let workbook = new ExcelJs.Workbook();
                let workbook = await new ExcelJs.Workbook().xlsx.load(buffer);
                // await workbook.xlsx.load(buffer);
                workbookRef.current = workbook;
                let worksheets = workbook.worksheets;
                setWorksheets(worksheets);
            });
    }, []);

    useEffect(() => {
        if (!worksheets || !worksheets[sheetIndex]) return;
        let rows = [];
        worksheets[sheetIndex].eachRow((row) => {
            let values = row.values.slice(1);
            rows.push(values);
        });
        console.log(rows);
        setExcelData(rows);
    }, [worksheets, sheetIndex]);

    function handleInput(e, rowIndex, cellIndex) {
        let rows = [...excelData];
        rows[rowIndex][cellIndex] = e.target.value;
        setExcelData(rows);

        let value = e.target.value;
        let worksheet = workbookRef.current.worksheets[sheetIndex];
        let row = worksheet.getRow(rowIndex + 1);
        let cell = row.getCell(cellIndex + 1);
        cell.value = Number(value);
        row.commit();
    }

    async function toExcel() {
        // let workbook = new ExcelJs.Workbook()
        // let worksheet = workbook.addWorksheet(worksheets[sheetIndex].name).addRows(excelData)
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
                if (data.message) {
                    alert(data.message, status_code);
                } else if (data.error) {
                    alert(data.error, status_code);
                }
            });
    }

    function addRow() {
        let newRow = new Array(excelData[0]?.length || 1).fill("");
        setExcelData([...excelData, newRow]);

        // let a = [[1,2,3,4],[5,6,7,8]]

        // addrow[rowIndex][cellIndex] = ""
    }

    return (
        <div>
            <h1>Table</h1>
            <select
                value={sheetIndex}
                onChange={(e) => setSheetIndex(Number(e.target.value))}
            >
                {worksheets?.map((sheet, index) => (
                    <option key={index} value={index}>
                        {sheet.name}
                    </option>
                ))}
            </select>
            <table>
                <thead>
                    <tr>
                        {excelData[0]?.map((cellValue, cellIndex) => (
                            <th key={cellIndex}>{cellValue}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {excelData.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cellValue, cellIndex) => (
                                <td key={cellIndex}>
                                    {
                                        <input
                                            type="text"
                                            value={cellValue}
                                            onChange={(e) =>
                                                handleInput(
                                                    e,
                                                    rowIndex + 1,
                                                    cellIndex
                                                )
                                            }
                                        />
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={addRow}>Add Row</button>
            <button onClick={toExcel}>Upload</button>
        </div>
    );
}
