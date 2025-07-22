from models import University
from visuals import create_toppers_list_pdf, create_university_report
import customtkinter as ctk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import db_path, pdf_dir, img_dir

def test_university_class(selected_semester, overall_result_text, overall_result_graph, tabview,  show_toppers=False, show_failed=False ):
    try:
        university = University(db_path=db_path)
        university.add_students(selected_semester)

        # Calculate academic performance for all students in the selected semester
        result = university.calculate_academic_performance_by_semester(selected_semester, db_path=db_path)

        # Clear and update the text display in the "Overall Result" tab
        overall_result_text.configure(state="normal")
        overall_result_text.delete("1.0", ctk.END)

        if show_toppers:
            # Display toppers' list
            overall_result_text.insert(ctk.END, f"=== Toppers List for Semester: {selected_semester} ===\n\n")
            toppers = sorted(result, key=lambda x: x['percentage'], reverse=True)[:10]  # Get top 10 students by percentage
            for i, topper in enumerate(toppers, start=1):
                overall_result_text.insert(ctk.END, f"{i}. USN: {topper['usn']}\n Name: {topper['name']}\nTotal marks: {topper['total_marks']} \tPercentage: {topper['percentage']:.2f}%\n sgpa: {topper['sgpa']:.2f}%\tcgpa: {topper['cgpa']:.2f}%\n\n")
            overall_result_text.insert(ctk.END, "-" * 50 + "\n")
            # Create PDF for toppers
            create_toppers_list_pdf(toppers, selected_semester, file_path=f"{pdf_dir}/{selected_semester}_toppers_list.pdf")
        elif show_failed:
            # Display failed students
            overall_result_text.insert(ctk.END, f"=== Failed Students List for Semester: {selected_semester} ===\n\n")
            failed_students = university.find_failed_students(selected_semester)
            for usn, subjects in failed_students.items():
                overall_result_text.insert(ctk.END, f"USN: {usn}, Subjects Failed: {', '.join(subjects)}\n")
            overall_result_text.insert(ctk.END, "-" * 50 + "\n")
        else:
            # Display academic performance
            overall_result_text.insert(ctk.END, f"=== Academic Performance for Semester: {selected_semester} ===\n\n")
            for sem_result in result:
                overall_result_text.insert(ctk.END, f"USN: {sem_result['usn']}\n")  # Print USN
                overall_result_text.insert(ctk.END, f"Name: {sem_result['name']}\n")
                
                overall_result_text.insert(ctk.END, f"IA Marks: {sem_result['ia_marks']}\n")
                overall_result_text.insert(ctk.END, f"SEE Marks: {sem_result['see_marks']}\n")
                overall_result_text.insert(ctk.END, f"Total Marks: {sem_result['total_marks']}\n")
                overall_result_text.insert(ctk.END, f"Percentage: {sem_result['percentage']:.2f}%\n")
                overall_result_text.insert(ctk.END, f"Obtained Credits: {sem_result['obtained_credits']}\n")
                overall_result_text.insert(ctk.END, f"SGPA: {sem_result['sgpa']:.2f}, CGPA: {sem_result['cgpa']:.2f}\n")
                
                overall_result_text.insert(ctk.END, f"Pass/Fail Status: {', '.join(sem_result['pass_fail'])}\n")
                overall_result_text.insert(ctk.END, "-" * 50 + "\n")

        overall_result_text.configure(state="disabled")

        if not show_toppers and not show_failed:
            # Plot total marks for all students in the selected semester
            fig = university.plot_student_totals(selected_semester, mode='histogram', n=10, bins=10)[0]
            fig.set_size_inches(10, 6)
            fig.set_dpi(65)
            for widget in overall_result_graph.winfo_children():
                widget.destroy()
            canvas = FigureCanvasTkAgg(fig, master=overall_result_graph)
            canvas.draw()
            canvas.get_tk_widget().pack(pady=20)

            create_university_report(university, selected_semester, file_path=f"{pdf_dir}/{selected_semester}_report.pdf")

            # Switch to the "Overall Result" tab
            tabview.set("Overall Result")

    except Exception as e:
        overall_result_text.configure(state="normal")
        overall_result_text.insert(ctk.END, f"Error: {str(e)}\n")
        overall_result_text.configure(state="disabled")