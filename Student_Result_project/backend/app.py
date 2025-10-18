# import pathlib
# import pandas as pd
# import sqlite3
# import matplotlib.pyplot as plt
# from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
# import os

# import customtkinter as ctk

# os.chdir(r"C:\Users\CHEKI\Documents\VS coding\Python\Student Result python project")

# from models.config import 
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
from app_init import create_app, db
import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv

load_dotenv()
cred_path = os.environ.get("FIREBASE_CRED_PATH")
if not cred_path:
    raise Exception("FIREBASE_CRED_PATH not set!")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

bm = BatchManager()

# Use the factory to create Flask app
app = create_app()
register_routes(app)

print("Using database:", app.config['SQLALCHEMY_DATABASE_URI'])

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
