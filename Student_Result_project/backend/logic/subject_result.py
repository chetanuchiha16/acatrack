from visuals import create_subject_report
import customtkinter as ctk
from models import University
from models import SubjectResult
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import pdf_dir,db_path,img_dir
# Function to handle subject-wise results
def display_subjectwise_result(subjectwise_semester_dropdown, subjectwise_subject_dropdown, subjectwise_result_graph, subjectwise_result_text):
    try:
        selected_semester = subjectwise_semester_dropdown.get()
        selected_subject = subjectwise_subject_dropdown.get()

        if not selected_semester or not selected_subject:
            raise ValueError("Please select both semester and subject code.")

        university = University(db_path)
        university.add_students(selected_semester=selected_semester)

        subject_result = SubjectResult(selected_subject, selected_semester, university)

        # Clear and update the text display
        subjectwise_result_text.configure(state="normal")
        subjectwise_result_text.delete("1.0", ctk.END)
        subjectwise_result_text.insert(ctk.END, f"=== Subject-wise Results for {selected_subject} ({selected_semester}) ===\n\n")
        create_subject_report(subject_result, file_path=f"{pdf_dir}\\subject_report_{selected_semester}_{selected_subject}.pdf")
        subject_result.display_subject_results(output_widget=subjectwise_result_text)
        subjectwise_result_text.configure(state="disabled")

        

        # Plot charts
        for widget in subjectwise_result_graph.winfo_children():
            widget.destroy()

        # Plot Performance Chart
        pie_chart1 = subject_result.plot_performance_pie_chart()[0]
        pie_chart1.set_size_inches(10, 6)
        pie_chart1.set_dpi(70)
        canvas1 = FigureCanvasTkAgg(pie_chart1, master=subjectwise_result_graph)
        canvas1.draw()
        canvas1.get_tk_widget().grid(row=0, column=0, ipadx=0.5, ipady=0.5, sticky="nsew")

        # Plot Attendance Chart
        pie_chart2 = subject_result.plot_attendance_pie_chart()[0]
        pie_chart2.set_size_inches(10, 6)
        pie_chart2.set_dpi(70)
        canvas2 = FigureCanvasTkAgg(pie_chart2, master=subjectwise_result_graph)
        canvas2.draw()
        canvas2.get_tk_widget().grid(row=0, column=1, ipadx=0.1, ipady=0.1, sticky="nsew")
        
        

    except Exception as e:
        subjectwise_result_text.configure(state="normal")
        subjectwise_result_text.insert(ctk.END, f"Error: {str(e)}\n")
        subjectwise_result_text.configure(state="disabled")