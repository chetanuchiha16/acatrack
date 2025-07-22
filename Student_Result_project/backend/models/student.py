import matplotlib.pyplot as plt
from models.fetch import fetch_student_data
from models.config import db_path, img_dir

# Define Student class
class Student:
    def __init__(self, usn, semester, db_path=db_path):
        self.db_path = db_path
        self.semester=semester
        student_info = fetch_student_data(usn, semester, self.db_path)
        if student_info is None:
            raise ValueError("Student data not found")
        self.usn = usn
        self.name = student_info["name"]
        self.subject_codes=student_info["subject_code"]
        self.ia_marks = student_info["ia_marks"]
        self.see_marks = student_info["see_marks"]
        self.credits = student_info["credits"]
        self.total_marks = sum(self.ia_marks) + sum(self.see_marks)
        self.obtained_credits=0
        #self.obtained_credits = self.calculate_obtained_credits()
        self.sgpa = None
        self.sgpa = self.calculate_sgpa()
        self.cgpa = None
        previous_sgpas = self.fetch_previous_sgpas()
        self.cgpa = self.calculate_cgpa(previous_sgpas)
        self.percentage = self.calculate_percentage()
        self.pass_fail = self.calculate_pass_fail()

    def calculate_pass_fail(self):
        """
        Calculates pass/fail status for each subject and handles edge cases like SCR and No Credits.
        """
        pass_fail_subjects = []
        for ia, see, credits in zip(self.ia_marks, self.see_marks, self.credits):
            if credits == 0:
                pass_fail_subjects.append("No Credits")  # Subject has no credits
            elif see == 0:
                pass_fail_subjects.append("SCR")  # Student skipped SEE
            elif ia >= 20 and see >= 18:
                pass_fail_subjects.append("Pass")  # Passed both IA and SEE
            else:
                pass_fail_subjects.append("Fail")  # Failed IA or SEE
        self.pass_fail = pass_fail_subjects
        return pass_fail_subjects
    
    def categorize(self):
        """
        Categorize the student into FCD, FC, or SC based on percentage or CGPA.

        Returns:
            str: The category of the student (FCD, FC, or SC).
        """
        if self.percentage >= 70:
            return "First Class with Distinction (FCD)"
        elif 60 <= self.percentage < 69:
            return "First Class (FC)"
        elif 35 <= self.percentage < 59:
            return "Second Class (SC)"
        elif 'Fail' in self.pass_fail:
            return 'Fail'


    def calculate_obtained_credits(self):
        obtained_credits = 0
        for ia, see, credit in zip(self.ia_marks, self.see_marks, self.credits):
            # Check eligibility for subject
            if self.credits==0:
                continue
            total_score = ia + see
            
            # Assign grade points based on total score
            if total_score >= 90:
                grade_points = 10
            elif total_score >= 80:
                grade_points = 9
            elif total_score >= 70:
                grade_points = 8
            elif total_score >= 60:
                grade_points = 7
            elif total_score >= 50:
                grade_points = 6
            elif total_score >= 40:
                grade_points = 5
            elif total_score >= 30:
                grade_points = 3
            elif total_score >= 20:
                grade_points = 2
            elif total_score >= 10:
                grade_points = 1
            else:
                grade_points = 0

                # Calculate subject credit score
            subject_credit_score = grade_points * credit
            obtained_credits += subject_credit_score
            
        self.obtained_credits = obtained_credits
        return obtained_credits
    
    def fetch_previous_sgpas(self):
        """
        Fetch the SGPAs for all previous semesters by iterating through semester numbers.
        """
        previous_sgpas = []
        semno=int(self.semester[-1])
        for sem in range(1, semno):  # Iterate through previous semesters
            try:
                student_info = fetch_student_data(self.usn,f"SEM{sem}" , self.db_path)
                if student_info:
                    # Calculate SGPA for the semester
                    ia_marks = student_info["ia_marks"]
                    see_marks = student_info["see_marks"]
                    credits = student_info["credits"]
                    sgpa = self.calculate_sgpa_for_semester(ia_marks, see_marks, credits)
                    previous_sgpas.append(sgpa)
            except Exception as e:
                print(f"Error fetching SGPA for semester {sem}: {e}")
        return previous_sgpas

    def calculate_sgpa_for_semester(self, ia_marks, see_marks, credits):
        """
        Calculate SGPA for a specific semester based on IA marks, SEE marks, and credits.
        """
        obtained_credits = 0
        total_credits = sum(credits)

        for ia, see, credit in zip(ia_marks, see_marks, credits):
            total_score = ia + see
            if total_score >= 90:
                grade_points = 10
            elif total_score >= 80:
                grade_points = 9
            elif total_score >= 70:
                grade_points = 8
            elif total_score >= 60:
                grade_points = 7
            elif total_score >= 50:
                grade_points = 6
            elif total_score >= 40:
                grade_points = 5
            elif total_score >= 30:
                grade_points = 3
            elif total_score >= 20:
                grade_points = 2
            elif total_score >= 10:
                grade_points = 1
            else:
                grade_points = 0

            subject_credit_score = grade_points * credit
            obtained_credits += subject_credit_score

        return obtained_credits / total_credits if total_credits > 0 else 0

    def calculate_sgpa(self):
        """
        Calculate SGPA for the current semester.
        """
        self.calculate_obtained_credits()
        total_credits = sum(self.credits)
        if total_credits > 0:
            self.sgpa = self.obtained_credits / total_credits
        else:
            self.sgpa = 0
        return self.sgpa

    def calculate_cgpa(self, previous_sgpas):
        """
        Calculate CGPA based on previous SGPAs and the current semester SGPA.
        """
        if self.sgpa is None:
            raise ValueError("SGPA must be calculated before CGPA.")

        all_sgpas = previous_sgpas + [self.sgpa]
        self.cgpa = sum(all_sgpas) / len(all_sgpas)
        return self.cgpa
    
    def calculate_percentage(self):
        max_total_marks = 100 * len(self.credits)
        return (self.total_marks / max_total_marks) * 100
    
    
    def display_student_info(self):
        str =( 
            f"Name: {self.name}\n"
            f"USN: {self.usn}\n"
            f"Total Marks: {self.total_marks}\n"
            f"Percentage: {self.percentage:.2f}%\n"
            f"Credits: {self.credits}\n"
            f"Credits Obtained: {self.obtained_credits}\n"
            f"SGPA: {self.sgpa}\n"
            f"CGPA: {self.cgpa:.2f}\n"
            f"Subject-wise Marks:\n"
        )

        print(str)
        #print(self.subject_codes))
        # Display subject-wise details using the subject codes
        for i,(subject_code,ia, see, credit, status) in enumerate(zip(self.subject_codes,self.ia_marks, self.see_marks, self.credits, self.pass_fail)):
            print(f" {i+1}  {subject_code}: IA Marks = {ia}, SEE Marks = {see}, Total Marks = {ia + see}, Credits = {credit}, Status = {status}")
            #self.plot_subject_marks()

    def plot_subject_marks(self):
        """Bar graph showing IA and SEE marks for each subject."""
        subjects = [f" {subject_code}" for subject_code in self.subject_codes]

        fig=plt.figure(figsize=(10, 6))
        plt.bar(subjects, self.ia_marks, label='IA Marks', color='skyblue', alpha=0.7)
        plt.bar(subjects, self.see_marks, label='SEE Marks', color='salmon', alpha=0.7, bottom=self.ia_marks)
        plt.xlabel('Subjects')
        plt.ylabel('Marks')
        plt.title(f'Subject-wise IA and SEE Marks for {self.name}')
        plt.legend()
        graph_path=f"{img_dir}/plot_subject_marks.png"
        plt.savefig(graph_path)
        #plt.show()
        return fig,graph_path
        #self.plot_subject_marks() #optional
