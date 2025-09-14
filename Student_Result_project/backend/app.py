# import pathlib
# import pandas as pd
# import sqlite3
# import matplotlib.pyplot as plt
# from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
# import os

# import customtkinter as ctk

# os.chdir(r"C:\Users\CHEKI\Documents\VS coding\Python\Student Result python project")

# from models.config import db_path
# import models.data_prep #noqa
# from models.fetch import fetch_student_data
# from models import Student, University, SubjectResult
# from visuals import plot_student_marks, plot_results, plot_university_totals, generate_sem_pdf, create_student_report, create_toppers_list_pdf, create_subject_report, create_university_report

#print functions
# from tests import print_table_names,print_column_names
# from logic import display_student_info
# from logic import test_university_class
# from logic import display_subjectwise_result
# from logic import display_semesterwise_results


# from gui import build_app
    
# widgets = build_app()
# Run the GUI
# widgets["root"].mainloop()
# from flask import Flask, request, jsonify
# from backend.models.users import db
# app.py
from flask import Flask
from flask_cors import CORS
from models.batch_manager import BatchManager
from routes import register_routes
import firebase_admin
from firebase_admin import credentials, messaging
import os 
from dotenv import load_dotenv

load_dotenv()  # load .env variables
cred_path = os.environ.get("FIREBASE_CRED_PATH")

if not cred_path:
    raise Exception("FIREBASE_CRED_PATH not set!")

if not firebase_admin._apps:  # avoid re-initialization
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Initialize BatchManager (responsible for multiple batch DBs + apps)
bm = BatchManager()

# Create main Flask app (acts as entrypoint/gateway)
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "super-secret-key"  # should load from config/env

# Register all routes (auth, admin, etc.)
register_routes(app)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

