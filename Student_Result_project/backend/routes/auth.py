from flask import Blueprint, request, jsonify
from app_init import db,bcrypt
from models import User


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth", methods = ["POST"])
def auth():
    who = request.json.get("who")
    username = request.json.get("username")
    password = request.json.get("password")

    user = User.query.filter(User.username == username).first()
    name = user.name

    if user:
        pw_correct = bcrypt.check_password_hash(user.password,password)
        if pw_correct:
            return jsonify({"message":"login success","id":username,"name":name})
        else:
            return jsonify({"error":"Incorrect Password"})
    else:
        return jsonify({"error":"user not found"})