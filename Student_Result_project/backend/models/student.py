import matplotlib.pyplot as plt
from models.fetch import fetch_student_data
from models.paths import img_dir
from sqlalchemy import create_engine
from models.paths import postgres_db_url
from logger_config import get_logger

logger = get_logger(__name__)

class Student:
    def __init__(self, usn, semester, batch_year, engine):
        """
        Load student information from PostgreSQL for a given batch and semester.
        """
        self.usn = usn
        self.semester = semester
        self.batch_year = batch_year
        self.engine = engine

        # Default database connection
        # self.postgres_url = (
            
        #     postgres_db_url
        # )

        # Fetch data using the new Postgres function
        student_info = fetch_student_data(usn, semester, batch_year, self.engine)

        if student_info is None:
            raise ValueError(f"No student data found for USN {usn} in {semester}_{batch_year}")

        self.usn = usn
        self.name = student_info.get("name", "")
        self.subject_codes = student_info.get("subject_code", [])
        self.subject_names = student_info.get("subject_name", [])
        self.ia_marks = [x or 0 for x in student_info.get("ia_marks", [])]
        self.see_marks = [x or 0 for x in student_info.get("see_marks", [])]
        self.credits = [x or 0 for x in student_info.get("credits", [])]

        self.total_marks = sum(self.ia_marks) + sum(self.see_marks)
        self.obtained_credits = self.calculate_obtained_credits()
        self.sgpa = self.calculate_sgpa()

        previous_sgpas = self.fetch_previous_sgpas()
        self.cgpa = self.calculate_cgpa(previous_sgpas)
        self.percentage = self.calculate_percentage()
        self.pass_fail = self.calculate_pass_fail()

    # def calculate_pass_fail(self):
    #     """
    #     Calculates pass/fail status for each subject and handles edge cases like SCR and No Credits.
    #     """
    #     pass_fail_subjects = []
    #     for ia, see, credits in zip(self.ia_marks, self.see_marks, self.credits):
    #         if credits == 0:
    #             pass_fail_subjects.append("No Credits")  # Subject has no credits
    #         elif see == 0:
    #             pass_fail_subjects.append("SCR")  # Student skipped SEE
    #         elif ia >= 20 and see >= 18:
    #             pass_fail_subjects.append("Pass")  # Passed both IA and SEE
    #         else:
    #             pass_fail_subjects.append("Fail")  # Failed IA or SEE
    #     self.pass_fail = pass_fail_subjects
    #     return pass_fail_subjects

    #new code updated logic

    def calculate_pass_fail(self):
        status_list = []
        for ia, see, credit in zip(self.ia_marks, self.see_marks, self.credits):
            if credit == 0:
                status_list.append("No Credits")
            elif see == 0:
                status_list.append("SCR")
            elif ia >= 20 and see >= 18:
                status_list.append("Pass")
            else:
                status_list.append("Fail")
        return status_list

    def categorize(self):
        if self.percentage >= 70:
            return "First Class with Distinction (FCD)"
        elif 60 <= self.percentage < 70:
            return "First Class (FC)"
        elif 35 <= self.percentage < 60:
            return "Second Class (SC)"
        elif "Fail" in self.pass_fail:
            return "Fail"
        return "Unknown"

    def calculate_obtained_credits(self):
        obtained = 0
        for ia, see, credit in zip(self.ia_marks, self.see_marks, self.credits):
            total_score = ia + see
            if credit == 0:
                continue
            if total_score >= 90: grade_points = 10
            elif total_score >= 80: grade_points = 9
            elif total_score >= 70: grade_points = 8
            elif total_score >= 60: grade_points = 7
            elif total_score >= 50: grade_points = 6
            elif total_score >= 40: grade_points = 5
            elif total_score >= 30: grade_points = 3
            elif total_score >= 20: grade_points = 2
            elif total_score >= 10: grade_points = 1
            else: grade_points = 0
            obtained += grade_points * credit
        return obtained

    def fetch_previous_sgpas(self):
        previous_sgpas = []
        try:
            sem_no = int(self.semester[-1])
        except Exception:
            sem_no = 1

        for sem in range(1, sem_no):
            try:
                
                student_info = fetch_student_data(self.usn, f"sem{sem}", self.batch_year, engine=self.engine)
                if student_info:
                    ia_marks = [x or 0 for x in student_info.get("ia_marks", [])]
                    see_marks = [x or 0 for x in student_info.get("see_marks", [])]
                    credits = [x or 0 for x in student_info.get("credits", [])]
                    sgpa = self.calculate_sgpa_for_semester(ia_marks, see_marks, credits)
                    previous_sgpas.append(sgpa)
            except Exception as e:
                logger.debug(f"Error fetching SGPA for semester {sem}: {e}")
        return previous_sgpas

    def calculate_sgpa_for_semester(self, ia_marks, see_marks, credits):
        obtained = 0
        total_credits = sum(credits)
        if total_credits == 0:
            return 0
        for ia, see, credit in zip(ia_marks, see_marks, credits):
            total_score = ia + see
            if credit == 0:
                continue
            if total_score >= 90: grade_points = 10
            elif total_score >= 80: grade_points = 9
            elif total_score >= 70: grade_points = 8
            elif total_score >= 60: grade_points = 7
            elif total_score >= 50: grade_points = 6
            elif total_score >= 40: grade_points = 5
            elif total_score >= 30: grade_points = 3
            elif total_score >= 20: grade_points = 2
            elif total_score >= 10: grade_points = 1
            else: grade_points = 0
            obtained += grade_points * credit
        return obtained / total_credits

    def calculate_sgpa(self):
        total_credits = sum(self.credits)
        return self.obtained_credits / total_credits if total_credits > 0 else 0

    def calculate_cgpa(self, previous_sgpas):
        all_sgpas = previous_sgpas + [self.sgpa]
        return sum(all_sgpas) / len(all_sgpas) if all_sgpas else 0

    def calculate_percentage(self):
        max_total = 100 * len(self.credits)
        return (self.total_marks / max_total * 100) if max_total > 0 else 0

    def display_student_info(self):
        logger.debug(f"Name: {self.name}")
        logger.debug(f"USN: {self.usn}")
        logger.debug(f"Total Marks: {self.total_marks}")
        logger.debug(f"Percentage: {self.percentage:.2f}%")
        logger.debug(f"Credits: {self.credits}")
        logger.debug(f"Credits Obtained: {self.obtained_credits}")
        logger.debug(f"SGPA: {self.sgpa:.2f}")
        logger.debug(f"CGPA: {self.cgpa:.2f}")
        logger.debug("Subject-wise Marks:")
        for i, (code, name, ia, see, credit, status) in enumerate(
            zip(self.subject_codes, self.subject_names, self.ia_marks, self.see_marks, self.credits, self.pass_fail), 1
        ):
            logger.debug(f"{i}. {name} ({code}): IA={ia}, SEE={see}, Total={ia+see}, Credits={credit}, Status={status}")

    def plot_subject_marks(self):
        subjects = [f"{name} ({code})" for name, code in zip(self.subject_names, self.subject_codes)]
        fig = plt.figure(figsize=(10, 6))
        plt.bar(subjects, self.ia_marks, label='IA Marks', color='skyblue', alpha=0.7)
        plt.bar(subjects, self.see_marks, label='SEE Marks', color='salmon', alpha=0.7, bottom=self.ia_marks)
        plt.xlabel('Subjects')
        plt.ylabel('Marks')
        plt.title(f'Subject-wise IA and SEE Marks for {self.name}')
        plt.legend()
        graph_path = f"{img_dir}/plot_subject_marks_{self.usn}.png"
        plt.savefig(graph_path)
        plt.close(fig)
        return fig, graph_path
