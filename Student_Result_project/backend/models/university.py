import sqlite3
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from models import Student
from models.paths import img_dir,pdf_dir  , get_db_path
import pandas as pd
from sqlalchemy import create_engine
from models.paths import postgres_db_url
class University:
    def __init__(self, postgres_url=None, batch_year=None):
        self.postgres_url = postgres_url or postgres_db_url
        self.batch_year = batch_year
        self.engine = create_engine(self.postgres_url)
        self.students = []

    def fetch_semester_tables(self):
        try:
            # Fetch all tables in public schema
            query = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
            tables_df = pd.read_sql(query, self.engine)
            all_tables = tables_df['table_name'].tolist()
            print("DEBUG: All tables in database:\n", all_tables)

            # Filter in Python for SEM tables of this batch
            semester_tables = [t for t in all_tables if t.startswith("SEM") and t.endswith(f"_{self.batch_year}")]
            print("DEBUG: Semester tables for batch:", semester_tables)
            return semester_tables
        except Exception as e:
            print(f"Error fetching semester tables: {e}")
            return []



    def fetch_students(self, semester):
        """
        Fetch all unique USNs from a given semester table.
        """
        query = f'SELECT DISTINCT student_usn FROM "{semester}"'
        try:
            df = pd.read_sql(query, self.engine)
            return df['student_usn'].tolist()
        except Exception as e:
            print(f"Error fetching students from {semester}: {e}")
            return []

    def add_students(self, selected_semester):
        """
        Add all students from all semester tables into the University class.
        """
        semester_tables = self.fetch_semester_tables()
        if not semester_tables:
            print("No semester tables found in the database.")
            return

        all_usns = set()
        for semester in semester_tables:
            usns = self.fetch_students(semester)
            all_usns.update(usns)

        for usn in all_usns:
            try:
                student = Student(usn, selected_semester, self.batch_year, self.engine)
                self.students.append(student)
            except ValueError:
                pass

    def display_students(self):
        """
        Display all students and their details.
        """
        if not self.students:
            print("No students in the university.")
            return

        for student in self.students:
            print("\n" + "=" * 50)
            student.display_student_info()
            print("=" * 50)


    def calculate_all_sgpa_and_cgpa(self, previous_sgpas_list):
        """Calculates SGPA and CGPA for each student, using corresponding previous SGPA lists."""
        for student, previous_sgpas in zip(self.students, previous_sgpas_list):
            student.calculate_sgpa()  # Ensure SGPA is calculated
            student.calculate_cgpa(previous_sgpas)

    def calculate_academic_performance_by_semester(self, selected_semester):
        """
        Calculates academic performance for all students in the selected semester.

        Parameters:
            selected_semester (str): The selected semester to filter students.

        Returns:
            list: List of dictionaries containing student academic details for the selected semester.
        """
        try:
            # Fetch all tables in the public schema
            tables_df = pd.read_sql(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public';",
                self.engine
            )
            all_tables = tables_df['table_name'].tolist()
            print("DEBUG: All tables in database:\n", all_tables)

            # Filter only SEM tables for the given batch
            semesters = [t for t in all_tables if t.upper().startswith("SEM") and t.endswith(f"_{self.batch_year}")]
            print(f"DEBUG: Semester tables for batch {self.batch_year}:", semesters)

            if not semesters:
                return [{"error": "No semester data available for this batch."}]

            semester_results = []
            table_name = f"{selected_semester}_{self.batch_year}"

            if table_name not in semesters:
                return [{"error": f"No data found for {selected_semester} in batch {self.batch_year}"}]

            # Fetch all student USNs for this semester
            query_usns = f'SELECT DISTINCT student_usn FROM "{table_name}" WHERE student_usn IS NOT NULL'
            student_usns_df = pd.read_sql(query_usns, self.engine)
            student_usns = student_usns_df['student_usn'].tolist()

            for usn in student_usns:
                try:
                    student = Student(usn, selected_semester, self.batch_year, self.engine)

                    if not student.name:
                        continue

                    # Calculate SGPA and CGPA
                    student.calculate_sgpa()
                    student.calculate_cgpa(student.fetch_previous_sgpas())

                    semester_results.append({
                        "semester": selected_semester,
                        "usn": student.usn,
                        "name": student.name,
                        "obtained_credits": student.obtained_credits,
                        "sgpa": student.sgpa,
                        "cgpa": student.cgpa,
                        "percentage": student.percentage,
                        "ia_marks": student.ia_marks,
                        "see_marks": student.see_marks,
                        "total_marks": student.total_marks,
                        "pass_fail": student.pass_fail,
                        "subject_names": student.subject_names,
                        "subject_codes": student.subject_codes,
                    })

                except ValueError as e:
                    semester_results.append({"semester": selected_semester, "usn": usn, "error": str(e)})

            return semester_results

        except Exception as e:
            return [{"error": f"Error occurred: {str(e)}"}]


        

    def find_failed_students_old(self, selected_semester):
        """
        Find students who failed in the selected semester and the subjects they failed.

        Parameters:
            selected_semester (str): The semester to check for failed students.

        Returns:
            dict: A dictionary where keys are student USNs, and values are lists of subjects the student failed.
        """
        failed_students = {}

        try:
            table_name = f"{selected_semester}_{self.batch_year}"

            # Fetch all student USNs for this semester
            query_usns = f'SELECT DISTINCT student_usn FROM "{table_name}" WHERE student_usn IS NOT NULL'
            student_usns_df = pd.read_sql(query_usns, self.engine)
            student_usns = student_usns_df['student_usn'].tolist()

            for usn in student_usns:
                try:
                    # Create a Student object
                    student = Student(usn, selected_semester, self.batch_year, self.postgres_url)

                    # Get pass/fail status for each subject
                    pass_fail_subjects = student.calculate_pass_fail()

                    for idx, status in enumerate(pass_fail_subjects):
                        if status == "Fail":
                            failed_students.setdefault(usn, [])
                            failed_students[usn].append(student.subject_names[idx])

                except ValueError:
                    # Skip if student data is not found
                    continue

            return failed_students

        except Exception as e:
            print(f"Error occurred while fetching failed students: {str(e)}")
            return {}


    def find_failed_students(self, selected_semester):
        """
        Returns full information for all students who failed in the selected semester.

        Parameters:
            selected_semester (str): The semester to check for failed students.

        Returns:
            list: List of dictionaries containing details of failed students.
        """
        failed_students_list = []

        try:
            table_name = f"{selected_semester}_{self.batch_year}"

            # Fetch all student USNs for this semester
            query_usns = f'SELECT DISTINCT student_usn FROM "{table_name}" WHERE student_usn IS NOT NULL'
            student_usns_df = pd.read_sql(query_usns, self.engine)
            student_usns = student_usns_df['student_usn'].tolist()

            for usn in student_usns:
                try:
                    # Create Student object for Postgres
                    student = Student(usn, selected_semester, self.batch_year, self.postgres_url)
                    pass_fail_subjects = student.calculate_pass_fail()

                    if "Fail" in pass_fail_subjects:
                        # Add full student info to the list
                        failed_students_list.append({
                            "name": student.name,
                            "usn": student.usn,
                            "cgpa": student.cgpa,
                            "percentage": student.percentage,
                            "obtained_credits": student.obtained_credits,
                            "pass_fail": pass_fail_subjects,
                            "ia_marks": student.ia_marks,
                            "see_marks": student.see_marks,
                            "subject_codes": student.subject_codes,
                            "subject_names": student.subject_names,
                            # Add any additional fields expected by frontend
                        })

                except ValueError:
                    # Skip if student data is missing
                    continue

            return failed_students_list

        except Exception as e:
            print(f"Error occurred while fetching failed students: {str(e)}")
            return []



    def display_failed_students(self, selected_semester):
        failed_students = self.find_failed_students(selected_semester)

        if not failed_students:
            print("No failed students in the selected semester.")
            return

        print(f"Failed students in {selected_semester}:")
        for usn, subjects in failed_students.items():
            print(f"USN: {usn}, Subjects Failed: {', '.join(subjects)}")    


    def plot_student_totals(self, selected_semester, mode='top_n', n=10, bins=10):
        """
        Generates a bar graph or histogram of total marks for students in the selected semester.
        
        Parameters:
            selected_semester (str): The semester to filter students.
            mode (str): 'top_n' to plot top n students, 'histogram' to group into bins.
            n (int): Number of top students to display (used when mode='top_n').
            bins (int): Number of bins for grouping marks (used when mode='histogram').
            
        Returns:
            fig (matplotlib.figure.Figure): The generated figure.
            graph_path (str): Path to the saved graph image.
        """
        # Filter students by the selected semester
        filtered_students = [student for student in self.students if student.semester == selected_semester]
        
        if not filtered_students:
            print(f"No student data available for {selected_semester}.")
            return plt.figure()  # Return an empty figure if no data
        
        # Get total marks and names for the filtered semester
        student_names = [student.name for student in filtered_students]
        total_marks = [student.total_marks for student in filtered_students]

        fig = plt.figure(figsize=(12, 6))
        
        if mode == 'top_n':
            # Sort students by total marks and select the top n
            sorted_data = sorted(zip(student_names, total_marks), key=lambda x: x[1], reverse=True)[:n]
            top_names, top_marks = zip(*sorted_data)
            plt.bar(top_names, top_marks, color='orange', alpha=0.7)
            plt.xlabel('Students')
            plt.ylabel('Total Marks')
            plt.title(f'Top {n} Students in {selected_semester}')
            plt.xticks(rotation=45, ha='right')
        
        elif mode == 'histogram':
            # Create bins for total marks
            plt.hist(total_marks, bins=bins, color='orange', alpha=0.7, edgecolor='black')
            plt.xlabel('Marks Range')
            plt.ylabel('Number of Students')
            plt.title(f'Total Marks Distribution in {selected_semester}')
        
        else:
            print("Invalid mode. Choose 'top_n' or 'histogram'.")
            return plt.figure()  # Return an empty figure if mode is invalid

        # Save the plot
        plt.tight_layout()
        graph_path = f"{img_dir}/plot_student_totals.png"
        plt.savefig(graph_path)
        
        return fig, graph_path  # Return figure and saved path

    def get_toppers(self, selected_semester, n=5):
        """
        Generate a list of top N students based on total marks for the selected semester.
        
        Parameters:
            selected_semester (str): The semester to get toppers from.
            n (int): Number of toppers to list (default is 5).

        Returns:
            list: List of dictionaries containing topper details.
        """
        # Filter students by the selected semester
        filtered_students = [student for student in self.students if student.semester == selected_semester]

        if not filtered_students:
            print(f"No student data available for {selected_semester}.")
            return []

        # Sort students by total marks in descending order
        sorted_students = sorted(filtered_students, key=lambda x: x.total_marks, reverse=True)

        # Get the top N students
        toppers = sorted_students[:n]

        # Prepare topper details for display
        toppers_list = []
        for topper in toppers:
            toppers_list.append({
                "usn": topper.usn,
                "name": topper.name,
                "total_marks": topper.total_marks,
                "sgpa": topper.sgpa,
                "cgpa": topper.cgpa,
            })

        # Print topper details for debugging or console display
        print(f"\nTop {n} Students in {selected_semester}:")
        for rank, topper in enumerate(toppers_list, start=1):
            print(f"Rank {rank}: {topper['name']} (USN: {topper['usn']}, Marks: {topper['total_marks']}, SGPA: {topper['sgpa']})")

        return toppers_list