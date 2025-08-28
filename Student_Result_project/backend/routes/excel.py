from flask import send_from_directory
from flask import Blueprint, jsonify, request
from models.paths import excel_path,base_dir

excel_bp = Blueprint("excel", __name__)

@excel_bp.route("/excel", methods = ["POST"])
def excel():
    file = request.files.get("file")
    file.save(excel_path)
    return jsonify({"message":"File uploaded successfull"})



@excel_bp.route("/excel/template.xlsx")
def get_template():
    return send_from_directory(base_dir / "Inputs/ExcelSheet/", "result list project.xlsx")
