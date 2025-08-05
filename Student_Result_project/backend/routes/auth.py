from flask import Blueprint, request, jsonify
from models.config import app,db
from models import User


auth_bp = Blueprint(__name__)

@app.route("/login", methods = ["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")

    if username in User.query.filter_by(username = username, password = password).first():
        return jsonify({"message":"success"})
    else:
        return jsonify({"error":"user not found"})