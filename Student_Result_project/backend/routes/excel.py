from flask import Blueprint, jsonify, request
from models.paths import excel_path

excel_bp = Blueprint("excel", __name__)

@excel_bp.route("/excel", methods = ["POST"])
def excel():
    file = request.files.get("file")
    file.save(excel_path)
    return jsonify({"message":"File uploaded successfull"})