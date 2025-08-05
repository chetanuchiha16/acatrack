from flask import Blueprint, request, jsonify
from app_init import db,bcrypt
from models import User


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods = ["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")

    user_exist = User.query.filter_by(username = username).first()

    if user_exist:
        pw_correct = bcrypt.check_password_hash(User.password,password)
        if pw_correct:
            return jsonify({"message":"login success"})
        else:
            return jsonify({"error":"Incorrect Password"})
    else:
        return jsonify({"error":"user not found"})