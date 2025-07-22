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

import models.data_prep
from gui import build_app
    
widgets = build_app()
# Run the GUI
widgets["root"].mainloop()
