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
from models.paths import set_current_batch_db
from models.batch_manager import BatchManager, db
from routes import register_routes

batch_year = 2022  # Can be dynamic later

# Set DB path for this batch
set_current_batch_db(batch_year)

# Initialize batch manager
bm = BatchManager()

# Create batch DB from Excel if not exists
if batch_year not in bm.list_batches():
    bm.create_batch(batch_year, excel_path=None)  # `prepare_data` internally uses batch_year

# Get Flask app for this batch
app = bm.get_flask_app(batch_year)

with app.app_context():
    db.create_all()  # Create auth tables for this batch

# Register routes
register_routes(app)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)


