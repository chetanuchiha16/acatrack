import sqlite3
import matplotlib.pyplot as plt
from models import Student
from models.config import db_path,img_dir,pdf_dir
class University:
    def __init__(self, db_path=db_path):
        self.db_path = db_path
        self.students = []

    def fetch_semester_tables(self):
        """
        Fetch all semester tables (e.g., SEM1, SEM2, etc.) from the database.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'SEM%'")
            tables = cursor.fetchall()
            conn.close()
            return [table[0] for table in tables]
        except sqlite3.Error as e:
            print(f"Database error occurred: {e}")
            return []

    def fetch_students(self, semester):
        """
        Fetch all unique USNs from a given semester table.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            query = f"SELECT DISTINCT Subject_Code_USN FROM {semester}"
            cursor.execute(query)
            usns = [row[0] for row in cursor.fetchall()]
            conn.close()
            return usns
        except sqlite3.Error as e:
            print(f"Database error occurred: {e}")
            return []

    def add_students(self,selected_semester):
        """
        Add all students from all semester tables into the University class.
        """
        semester_tables = self.fetch_semester_tables()
        if not semester_tables:
            print("No semester tables found in the database.")
            return

        all_usns = set()  # To ensure no duplicates
        for semester in semester_tables:
            usns = self.fetch_students(semester)
            all_usns.update(usns)

        # Create Student objects for each unique USN and add to the university's student list
        for usn in all_usns:
            try:
                # Using SEM1 as a sample semester here, it can be changed based on your requirement
                student = Student(usn, selected_semester, self.db_path)
                self.students.append(student)
            except ValueError as e:
                pass
                #print(f"Error fetching data for USN {usn}: {e}")

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

    def calculate_academic_performance_by_semester(self, selected_semester, db_path=db_path):
        """
        Calculates academic performance for all students in the selected semester.

        Parameters:
            selected_semester (str): The selected semester to filter students.
            db_path (str): Path to the student database.

        Returns:
            list: List of dictionaries containing student academic details for the selected semester.
        """
        try:
            # Connect to the database and get all semester tables
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            semesters = [table[0] for table in tables if table[0].startswith('SEM')]
            conn.close()

            if not semesters:
                return [{"error": "No semester data available."}]

            semester_results = []

            for semester in sorted(semesters):  # Process semesters in order
                if semester != selected_semester:
                    continue  # Skip semesters that do not match the selected semester

                try:
                    # Fetch all students for the selected semester
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute(f"SELECT SUBJECT_CODE_USN FROM {semester} WHERE SUBJECT_CODE_USN IS NOT NULL;")
                    student_usns = cursor.fetchall()
                    conn.close()

                    for student_usn in student_usns:
                        usn = student_usn[0]
                        # Create a Student object for the semester
                        student = Student(usn, semester, db_path=db_path)

                        # Ensure the student exists in the semester table
                        if not student.name:
                            continue  # Skip if student not found in this semester

                        # Retrieve the specific student's previous SGPAs (reset for each student)
                        #student_previous_sgpas = self.get_previous_sgpas(student.usn, selected_semester)

                        # Calculate SGPA and CGPA
                        student.calculate_sgpa()
                        student.calculate_cgpa(student.fetch_previous_sgpas())

                        # Store results
                        semester_results.append({
                            "semester": semester,
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
                        })

                except ValueError as e:
                    # Handle errors for a specific semester
                    semester_results.append({"semester": selected_semester, "error": str(e)})
            
            return semester_results

        except Exception as e:
            return [{"error": f"Error occurred: {str(e)}"}]
        

    def find_failed_students(self, selected_semester):
        """
        Find students who failed in the selected semester and the subjects they failed.

        Parameters:
            selected_semester (str): The semester to check for failed students.

        Returns:
            dict: A dictionary where keys are student USNs, and values are lists of subjects the student failed.
        """
        failed_students = {}

        try:
            # Fetch all students for the selected semester
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(f"SELECT SUBJECT_CODE_USN FROM {selected_semester}")
            rows = cursor.fetchall()
            conn.close()

            for row in rows:
                usn = row[0]
                # Create a student object for this USN and selected semester
                student = Student(usn, selected_semester, self.db_path)

                # Get the pass/fail status for all subjects of the student
                pass_fail_subjects = student.calculate_pass_fail()

                # Check each subject's pass/fail status
                for subject_index, status in enumerate(pass_fail_subjects):
                    if status == "Fail":
                        if usn not in failed_students:
                            failed_students[usn] = []
                        # Assuming that the subject codes are stored in a list
                        subject_code = student.subject_codes[subject_index]  # Example, assuming `subject_codes` is a list
                        failed_students[usn].append(subject_code)

            return failed_students

        except Exception as e:
            print(f"Error occurred while fetching failed students: {str(e)}")
            return {}

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