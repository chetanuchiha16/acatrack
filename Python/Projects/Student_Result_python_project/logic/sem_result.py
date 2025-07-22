from models import University, SubjectResult
from visuals import generate_sem_pdf
import customtkinter as ctk
from models.config import db_path, pdf_dir


# Function to display semester-wise results
def display_semesterwise_results(selected_semester, semesterwise_result_table, semester_subject_mapping):
    try:
        if not selected_semester:
            raise ValueError("Please select a semester.")

        university = University(db_path)
        university.add_students(selected_semester=selected_semester)

        subjects = semester_subject_mapping.get(selected_semester, [])
        if not subjects:
            raise ValueError("No subjects found for the selected semester.")

        for widget in semesterwise_result_table.winfo_children():
            widget.destroy()

        headers = ["Subject Code", "Total Students", "Present", "Absent", "Pass %", "FCD", "FC", "SC", "Fail"]

        # Header row
        for col_index, header in enumerate(headers):
            header_label = ctk.CTkLabel(
                semesterwise_result_table,
                text=header,
                font=ctk.CTkFont(size=13, weight="bold"),
                anchor="center",
                fg_color="grey",  # Navy blue background
                text_color="black",  # White text for contrast
                corner_radius=3,
            )
            header_label.grid(row=0, column=col_index, padx=0.5, pady=0.5, sticky="nsew")

        total_present = total_absent = total_fcd = total_fc = total_sc = total_fail = total_students = 0

        for student in university.students:
            if student.semester != selected_semester:
                continue

            total_students += 1
            student.calculate_pass_fail()
            category = student.categorize()

            if category == "First Class with Distinction (FCD)":
                total_fcd += 1
            elif category == "First Class (FC)":
                total_fc += 1
            elif category == "Second Class (SC)":
                total_sc += 1

            fail_count = student.pass_fail.count("Fail")
            if fail_count > 0:
                total_fail += 1
                total_absent += 1
            else:
                total_present += 1

        pass_percentage = (
            (total_students-total_fail) / total_students * 100
            if total_students > 0
            else 0.0
        )

        # Data rows
        for row_index, subject_code in enumerate(subjects, start=1):
            subject_result = SubjectResult(subject_code, selected_semester, university)
            data = [
                subject_code,
                subject_result.total_students,
                subject_result.present_students,
                subject_result.absent_students,
                f"{subject_result.pass_percentage:.2f}%",
                subject_result.fcd_count,
                subject_result.fc_count,
                subject_result.sc_count,
                subject_result.fail_count,
            ]

            # Alternate row colors for readability
            row_bg = "black" if row_index % 2 == 0 else "black"  # Light blue shades
            for col_index, value in enumerate(data):
                data_label = ctk.CTkLabel(
                    semesterwise_result_table,
                    text=value,
                    font=ctk.CTkFont(size=12),
                    anchor="center",
                    fg_color=row_bg,  # Subtle color difference
                    text_color="white",
                    #corner_radius=8,
                )
                data_label.grid(row=row_index, column=col_index, padx=0.5, pady=0.5, sticky="nsew")

        # Totals row
        total_headers = [
            "Total Students Appeared",
            "No. of FCD",
            "No. of FC",
            "No. of SC",
            "No. of Fail",
            "Total pass %",
        ]
        total_values = [
            total_students,
            total_fcd,
            total_fc,
            total_sc,
            total_fail,
            f"{pass_percentage:.2f}",
        ]

        for col_index, header in enumerate(total_headers):
            header_label = ctk.CTkLabel(
                semesterwise_result_table,
                text=header,
                font=ctk.CTkFont(size=13, weight="bold"),
                anchor="center",
                fg_color="grey",  # Light green background for totals
                text_color="black",
                corner_radius=3,
            )
            header_label.grid(row=len(subjects) + 1, column=col_index, padx=0.5, pady=0.5, sticky="nsew")

        for col_index, value in enumerate(total_values):
            value_label = ctk.CTkLabel(
                semesterwise_result_table,
                text=value,
                font=ctk.CTkFont(size=12),
                anchor="center",
                fg_color="black", # Lighter green shade
                text_color="white", 
                #corner_radius=8,
            )
            value_label.grid(row=len(subjects) + 2, column=col_index, padx=0.5, pady=0.5, sticky="nsew")

        # Uniform grid configuration
        for col_index in range(len(headers)):
            semesterwise_result_table.grid_columnconfigure(col_index, weight=1)

        for row_index in range(len(subjects) + 3):
            semesterwise_result_table.grid_rowconfigure(row_index, weight=1)

        generate_sem_pdf(selected_semester, university, semester_subject_mapping, output_path=f"{pdf_dir}/{selected_semester}_results.pdf")
    except Exception as e:
        # Display error message using messagebox
        ctk.messagebox.showerror("Error", str(e))


def display_semesterwise_results_console(selected_semester, semester_subject_mapping):
    try:
        if not selected_semester:
            raise ValueError("Please select a semester.")

        university = University(db_path)
        university.add_students(selected_semester=selected_semester)

        subjects = semester_subject_mapping.get(selected_semester, [])
        if not subjects:
            raise ValueError("No subjects found for the selected semester.")

        headers = ["Subject Code", "Total Students", "Present", "Absent", "Pass %", "FCD", "FC", "SC", "Fail"]
        
        # Print header
        print("\nSemester-Wise Results")
        print("=" * 80)
        print("{:<15} {:<15} {:<10} {:<10} {:<10} {:<5} {:<5} {:<5} {:<5}".format(*headers))
        print("-" * 80)

        total_present = total_absent = total_fcd = total_fc = total_sc = total_fail = total_students = 0

        # Process students
        for student in university.students:
            if student.semester != selected_semester:
                continue

            total_students += 1
            student.calculate_pass_fail()
            category = student.categorize()

            if category == "First Class with Distinction (FCD)":
                total_fcd += 1
            elif category == "First Class (FC)":
                total_fc += 1
            elif category == "Second Class (SC)":
                total_sc += 1

            fail_count = student.pass_fail.count("Fail")
            if fail_count > 0:
                total_fail += 1
                total_absent += 1
            else:
                total_present += 1

        pass_percentage = (
            (total_fcd + total_fc + total_sc) / total_students * 100
            if total_students > 0
            else 0.0
        )

        # Print data rows
        for subject_code in subjects:
            subject_result = SubjectResult(subject_code, selected_semester, university)
            data = [
                subject_code,
                subject_result.total_students,
                subject_result.present_students,
                subject_result.absent_students,
                f"{subject_result.pass_percentage:.2f}%",
                subject_result.fcd_count,
                subject_result.fc_count,
                subject_result.sc_count,
                subject_result.fail_count,
            ]
            print("{:<15} {:<15} {:<10} {:<10} {:<10} {:<5} {:<5} {:<5} {:<5}".format(*data))

        # Print totals
        print("-" * 80)
        total_headers = [
            "Total Students",
            "FCD",
            "FC",
            "SC",
            "Fail",
            "Pass %",
        ]
        total_values = [
            total_students,
            total_fcd,
            total_fc,
            total_sc,
            total_fail,
            f"{pass_percentage:.2f}%",
        ]

        print("{:<15} {:<15} {:<10} {:<10} {:<10} {:<5}".format(*total_headers))
        print("{:<15} {:<15} {:<10} {:<10} {:<10} {:<5}".format(*total_values))
        print("=" * 80)

        # Optionally, generate a PDF report
        #generate_sem_pdf(selected_semester, university, semester_subject_mapping, output_path=f"{selected_semester}_results.pdf")
    except Exception as e:
        print(f"Error: {e}")


# Call the function with a valid semester
#display_semesterwise_results_console("SEM1")