from models import Student
from visuals import create_student_report
import customtkinter as ctk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import db_path, pdf_dir

def display_student_info(usn, semester, info_text, student_info_graph):
    try:
        student = Student(usn=usn, semester=semester, db_path=db_path)
        
        info_text.configure(state="normal")
        info_text.delete("1.0", ctk.END)
        
        info_text.insert(ctk.END, f"Name: {student.name}\n")
        info_text.insert(ctk.END, f"USN: {student.usn}\n")
        info_text.insert(ctk.END, f"Total Marks: {student.total_marks}\n")
        info_text.insert(ctk.END, f"Percentage: {student.percentage:.2f}%\n")
        info_text.insert(ctk.END, f"Credits Obtained: {student.obtained_credits}\n")
        info_text.insert(ctk.END, f"SGPA: {student.sgpa:.2f}\n")
        info_text.insert(ctk.END, f"CGPA: {student.cgpa:.2f}\n")
        info_text.insert(ctk.END, "Subject-wise Marks:\n")

        for i, (subject_code,ia, see, credit, status) in enumerate(zip(student.subject_codes,student.ia_marks, student.see_marks, student.credits, student.pass_fail), 1):
            info_text.insert(ctk.END, f"  {i} {subject_code}: IA Marks = {ia}, SEE Marks = {see}, Total Marks = {ia + see}, Credits = {credit}, Status = {status}\n")
        
        fig = student.plot_subject_marks()[0]
        fig.set_size_inches(10, 6)
        fig.set_dpi(65)
        for widget in student_info_graph.winfo_children():
            widget.destroy()
        canvas = FigureCanvasTkAgg(fig, master=student_info_graph)
        canvas.draw()
        canvas.get_tk_widget().pack(pady=20)

        create_student_report(student, file_path=f"{pdf_dir}/{student.name}_{semester}_report.pdf")

        info_text.configure(state="disabled")

    except Exception as e:
        info_text.configure(state="normal")
        info_text.insert(ctk.END, f"Error: {str(e)}\n")
        info_text.configure(state="disabled")
