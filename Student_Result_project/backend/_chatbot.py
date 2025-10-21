# Import necessary libraries for PDF generation and file operations
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from io import BytesIO
import os
import pandas as pd # Library to read Excel/CSV files using pandas
from models.paths import excel_path

def _calculate_grade(score):
    """
    Calculates a letter grade based on a given score.
    """
    try:
        score = float(score)
        if score >= 36:
            return "PASS"
        else:
            return "FAIL"
    except (ValueError, TypeError):
        return "N/A" # Handle cases where score is not a valid number

def generate_pdf_report(student_data):
    """
    Generates a PDF report based on the provided student data, organized by semester.

    Args:
        student_data (dict): A dictionary containing student details and semester-wise results,
                             following the structure:
                             {
                                 "student_name": "John Doe",
                                 "semester_results": {
                                     "sem1": [{"subject": "Math", "score": 92, "grade": "A"}],
                                     "sem2": [{"subject": "Science", "score": 88, "grade": "B+"}]
                                 },
                                 "comments": "Excellent progress."
                             }
    Returns:
        BytesIO: An in-memory buffer containing the generated PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    story = []

    # Extract data with default values for robustness
    student_name = student_data.get("student_name", "N/A")
    # Now expects 'semester_results' which is a dictionary of semesters to subject lists
    semester_results = student_data.get("semester_results", {})
    comments = student_data.get("comments", "No additional comments provided.")

    # Add a title
    story.append(Paragraph("<b>Student Academic Report</b>", styles['h1']))
    story.append(Spacer(1, 0.2 * 10))

    # Add student information
    story.append(Paragraph(f"<b>Student Name:</b> {student_name}", styles['Normal']))
    story.append(Spacer(1, 0.2 * 10))

    # Add results semester by semester
    if not semester_results:
        story.append(Paragraph("<b>No subject results found for this student across all semesters.</b>", styles['Normal']))
    else:
        # Sort semesters to ensure a consistent order (e.g., sem1, sem2, sem3, sem4)
        # Assuming sheet names like "sem1", "sem2" will sort correctly lexicographically.
        sorted_semesters = sorted(semester_results.keys())

        for sem in sorted_semesters:
            subjects_in_semester = semester_results[sem]

            # Only add a semester section if there are actual subjects with scores for it
            if subjects_in_semester:
                story.append(Spacer(1, 0.3 * 10)) # More space between semester sections
                story.append(Paragraph(f"<b>--- Semester: {sem} ---</b>", styles['h2']))
                story.append(Spacer(1, 0.1 * 10))

                table_data = [['Subject', 'Score', 'Pass/Fail']]
                for res in subjects_in_semester:
                    table_data.append([
                        str(res.get('subject', 'N/A')),
                        str(res.get('score', 'N/A')),
                        str(res.get('grade', 'N/A'))
                    ])

                # Create and style the table for the current semester
                table = Table(table_data, colWidths=[2 * 72, 1 * 72, 1 * 72])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ADD8E6')), # Light blue header
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F0F8FF')), # AliceBlue for rows
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
                ]))
                story.append(table)
            else:
                story.append(Paragraph(f"<i>No results found for Semester: {sem}</i>", styles['Normal']))

    story.append(Spacer(1, 0.5 * 10)) # Add some space before general text

    # Add general text and comments
    story.append(Paragraph(
        "This report provides an overview of the student's academic performance for the current period. "
        "The scores reflect their proficiency in each subject, and the grades are assigned based on "
        "standard academic benchmarks. We encourage a review of these results to identify areas of strength "
        "and areas that may require additional focus.", styles['Normal']
    ))
    story.append(Spacer(1, 0.2 * 10))
    story.append(Paragraph(f"<b>Teacher's Comments:</b> {comments}", styles['Normal']))
    story.append(Spacer(1, 0.2 * 10))
    story.append(Paragraph("<i>Generated by the Student Result Chatbot.</i>", styles['Normal']))

    doc.build(story)
    buffer.seek(0)
    return buffer


def _calculate_summary(semester_results):
    """
    Calculates summary information including total marks, percentage, SGPA per semester and CGPA.
    Returns a dict with semester-wise and overall summary.
    """
    summary = {}
    total_sgpa = 0
    sem_count = 0

    for sem, subjects in semester_results.items():
        total_marks = 0
        max_marks_per_subject = 100  # Assuming max marks per subject is 100
        num_subjects = len(subjects)

        if num_subjects == 0:
            continue

        for subject in subjects:
            try:
                total_marks += float(subject['score'])
            except:
                pass  # Ignore invalid scores

        percentage = total_marks / (num_subjects * max_marks_per_subject) * 100
        sgpa = round((percentage / 10), 2)  # Simple estimation: SGPA out of 10
        summary[sem] = {
            "total_marks": total_marks,
            "percentage": round(percentage, 2),
            "sgpa": sgpa
        }
        total_sgpa += sgpa
        sem_count += 1

    cgpa = round(total_sgpa / sem_count, 2) if sem_count > 0 else 0
    summary["CGPA"] = cgpa

    return summary


def main():
    """
    Main function for the command-line chatbot interface.
    Reads student data from a multi-sheet Excel file using pandas and generates PDFs.
    """
    print("Welcome to the Student Result Chatbot! 🎓")
    print("I can help you generate PDF reports for specific students from your Excel file.")

    excel_file_path = excel_path

    # Get the directory where the Excel file is located for saving PDFs
    excel_directory = os.path.dirname(excel_file_path)
    if not excel_directory:
        excel_directory = "." # Use current directory if no path is specified

    # List of sheet names to read from within the Excel file
    sheet_names = ["sem1", "sem2", "sem3", "sem4"] # Assuming these are the exact sheet names

    if not os.path.exists(excel_file_path):
        print(f"❌ Error: File '{excel_file_path}' not found. Please ensure the path is correct.")
        return

    student_data_map = {} # To group results by student name, now structured semester-wise

    for sheet_name in sheet_names:
        try:
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
            print(f"✅ Successfully loaded sheet: '{sheet_name}' from '{excel_file_path}'.")

            student_name_col = 'student_name'
            if student_name_col not in df.columns:
                print(f"⚠ Warning: Sheet '{sheet_name}' is missing expected column '{student_name_col}'. Skipping this sheet.")
                continue

            # Identify subject total columns for THIS specific sheet/semester
            current_sheet_subject_total_cols = [
                col for col in df.columns
                if col.endswith('TOTAL') and not col.startswith('TOTAL MARKS')
            ]

            for index, row in df.iterrows():
                student_full_name = str(row.get(student_name_col, "") or "").strip()

                if not student_full_name:
                    continue # Skip rows with no student name

                if student_full_name not in student_data_map:
                    student_data_map[student_full_name] = {
                        "student_name": student_full_name,
                        "semester_results": {}, # Initialize dict for semester results
                        "comments": "No additional comments provided." # Default comments
                    }

                # Initialize list for current semester if not present for this student
                if sheet_name not in student_data_map[student_full_name]["semester_results"]:
                    student_data_map[student_full_name]["semester_results"][sheet_name] = []

                # Populate subject results for the current semester
                for col in current_sheet_subject_total_cols:
                    subject_code = col.replace('_TOTAL', '')
                    score = row.get(col)

                    if pd.notna(score) and score is not None:
                        grade = _calculate_grade(score)
                        student_data_map[student_full_name]["semester_results"][sheet_name].append({
                            "subject": subject_code,
                            "score": score,
                            "grade": grade
                        })

        except Exception as e:
            print(f"❌ Error processing sheet '{sheet_name}' from '{excel_file_path}': {e}. Skipping this sheet.")

    if not student_data_map:
        print("🤷 No valid student data found after processing all specified sheets. Please check the file contents, sheet names, and column headers.")
        return

    print("\n--- Available Students ---")
    unique_student_names = sorted(list(student_data_map.keys()))
    for name in unique_student_names:
        print(f"- {name}")
    print("--------------------------\n")

    while True:
        target_student_name = input("Enter the full name of the student whose result you need (or 'exit' to quit): ").strip()
        if target_student_name.lower() == 'exit':
            print("Exiting chatbot. Goodbye!")
            break

        # Case-insensitive matching
        normalized_input_name = target_student_name.lower()
        normalized_name_map = {name.lower(): name for name in student_data_map.keys()}

        if normalized_input_name in normalized_name_map:
            matched_student_name = normalized_name_map[normalized_input_name]
            selected_student_data = student_data_map[matched_student_name]

            print(f"\n✅ Generating report for {matched_student_name}... ⏳")

            # Calculate and display summary
            summary = _calculate_summary(selected_student_data["semester_results"])
            print("\n📊 --- Result Summary ---\n")
            for sem in sorted(selected_student_data["semester_results"].keys()):
                sem_data = summary.get(sem)
                if sem_data:
                    print(f"Semester: {sem}")
                    print(f"  ➤ Total Marks: {sem_data['total_marks']}")
                    print(f"  ➤ Percentage : {sem_data['percentage']}%")
                    print(f"  ➤ SGPA       : {sem_data['sgpa']}")
                    print()
            print(f"🎓 CGPA (Cumulative): {summary['CGPA']}")
            print("--------------------------")

            # Generate PDF
            pdf_buffer = generate_pdf_report(selected_student_data)
            pdf_file_name = f"{matched_student_name}_Semester_Report.pdf"
            full_pdf_path = os.path.join(excel_directory, pdf_file_name)
            try:
                with open(full_pdf_path, 'wb') as f:
                    f.write(pdf_buffer.getbuffer())
                print(f"✅ The results of {matched_student_name} are saved as '{pdf_file_name}'")
                print(f"📄 You can find the PDF at: {full_pdf_path}")
            except IOError as e:
                print(f"❌ Error saving file for {matched_student_name}: {e}")

            another_report = input("\nIs the report generated correct? (yes/no): ").strip().lower()
            if another_report == 'yes':
                print("Thank You, Have a Great Day and Goodbye!")
                break
        else:
            print(f"\n❌ Student '{target_student_name}' not found. Please check the name along with their intials.")

if __name__ == "__main__":
    # Ensure ReportLab is installed
    try:
        from reportlab.lib.pagesizes import letter # Check if it can be imported
    except ImportError:
        print("Error: 'reportlab' module not found.")
        print("Please install it using: pip install reportlab")
        exit()

    # Ensure pandas is installed
    try:
        import pandas as pd # Check if it can be imported
    except ImportError:
        print("Error: 'pandas' module not found.")
        print("Please install it using: pip install pandas")
        exit()

    main()