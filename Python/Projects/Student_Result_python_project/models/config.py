from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
# print("../Inputs")
excel_path = str(base_dir / "Inputs/ExcelSheet/result list project.xlsx")
logo_path = str(base_dir / "Inputs" / "Images" / "logo.png")
db_path = str(base_dir / "Outputs" / "student_data.db")
pdf_dir = str(base_dir / "Outputs" / "PDFs")
img_dir = str(base_dir / "Outputs" / "Images")

print(excel_path)
# print(logo_path)
# print(base_dir)
print(f"[DEBUG] Using DB path: {base_dir}")
print(f"[DEBUG] Exists? {Path(excel_path).exists()}")
