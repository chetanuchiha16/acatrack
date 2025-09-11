if __name__ == "__main__":    
    from models import Student
    from visuals import create_student_report
    import customtkinter as ctk
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
    from models.paths import db_path, pdf_dir
    import mplcursors

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

            for i, (subject_code,subject_name,ia, see, credit, status) in enumerate(zip(student.subject_codes,student.subject_names,student.ia_marks, student.see_marks, student.credits, student.pass_fail), 1):
                info_text.insert(ctk.END, f"  {i} {subject_code} {subject_name}: IA Marks = {ia}, SEE Marks = {see}, Total Marks = {ia + see}, Credits = {credit}, Status = {status}\n")
            
            # ---------------------- Plot Section ----------------------
            # ---------------------- Plot Section ----------------------
            # ---------------------- Plot Section ----------------------
            fig, ax = student.plot_subject_marks()
            fig.set_size_inches(10, 6)
            fig.set_dpi(65)

            # ✅ Use subject codes as x-axis labels to avoid long overlaps
            ax.set_xticks(range(len(student.subject_codes)))
            ax.set_xticklabels(student.subject_codes, rotation=45, ha="right", fontsize=8)

            fig.tight_layout()

            cursor = mplcursors.cursor(ax.containers, hover=True)  # all bar containers

            def on_hover(sel):
                idx = sel.index
                subject_name = student.subject_names[idx]
                marks = student.total_marks[idx]
                credit = student.credits[idx]
                status = student.pass_fail[idx]

                sel.annotation.set_text(
                    f"{subject_name}\nMarks: {marks}\nCredits: {credit}\nStatus: {status}"
                )

            cursor.connect("add", on_hover)   # ← register callback (no decorator duplication)

            # ✅ Clear previous graph widget and insert new one
            for widget in student_info_graph.winfo_children():
                widget.destroy()
            canvas = FigureCanvasTkAgg(fig, master=student_info_graph)
            canvas.draw()
            canvas.get_tk_widget().pack(pady=20)

            # ---------------------- PDF Report ----------------------
            create_student_report(
                student,
                file_path=f"{pdf_dir}/{student.name}_{semester}_report.pdf"
            )

            info_text.configure(state="disabled")



        except Exception as e:
            info_text.configure(state="normal")
            info_text.insert(ctk.END, f"Error: {str(e)}\n")
            info_text.configure(state="disabled")