import matplotlib.pyplot as plt
from extensions import db
from logger_config import get_logger
from models.schema import AcademicResult, StudentAuth, Subject

logger = get_logger(__name__)


class Student:
    def __init__(self, usn, semester, batch_year, engine=None):
        """
        Load student information using SQLAlchemy from normalized tables.
        Keeps the exact logic and attributes for frontend compatibility.
        """
        self.usn = usn
        self.semester = semester.lower().strip() if semester else None
        self.batch_year = batch_year
        # engine is accepted but ignored as we use the Flask-SQLAlchemy db session

        # 1. Fetch core student details
        student_rec = StudentAuth.query.filter_by(usn=self.usn).first()
        if not student_rec:
            # Maintain the behavior of raising ValueError if not found
            raise ValueError(f"No student data found for USN {usn}")

        self.name = student_rec.name
        self.found = True

        # Result containers
        self.subject_codes = []
        self.subject_names = []
        self.ia_marks = []
        self.see_marks = []
        self.credits = []

        # 2. Fetch marks for the specific semester
        if self.semester:
            results = (
                db.session.query(AcademicResult, Subject)
                .join(Subject, AcademicResult.subject_code == Subject.subject_code)
                .filter(
                    AcademicResult.student_id == student_rec.id,
                    Subject.semester == self.semester,
                )
                .all()
            )

            for res, sub in results:
                self.subject_codes.append(sub.subject_code)
                self.subject_names.append(sub.subject_name or sub.subject_code)
                self.ia_marks.append(res.ia_marks or 0)
                self.see_marks.append(res.see_marks or 0)
                self.credits.append(sub.credits or 0)

        # 3. Calculate derived attributes (Matching your old methods exactly)
        self.total_marks = sum(self.ia_marks) + sum(self.see_marks)
        self.pass_fail = self.calculate_pass_fail()
        self.obtained_credits = self.calculate_obtained_credits()
        self.sgpa = self.calculate_sgpa()
        previous_data = self.fetch_previous_sgpas()
        self.cgpa = self.calculate_cgpa(
            previous_data
        )  # Refactored to look at all DB records and calculate VTU formula
        self.percentage = self.calculate_percentage()

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

    def calculate_obtained_credits(self):
        obtained = 0
        for ia, see, credit in zip(self.ia_marks, self.see_marks, self.credits):
            total_score = ia + see
            if credit == 0:
                continue

            # Your specific grading logic
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

            obtained += grade_points * credit
        return obtained

    def calculate_sgpa(self):
        total_credits = sum(self.credits)
        return self.obtained_credits / total_credits if total_credits > 0 else 0

    def fetch_previous_sgpas(self):
        """
        Calculates SGPAs and total credits for all previous semesters using the normalized database.
        """
        previous_data = []  # Stores dicts with 'sgpa' and 'credits'
        try:
            sem_no = int(self.semester[-1]) if self.semester else 1
        except Exception:
            sem_no = 1

        student_rec = StudentAuth.query.filter_by(usn=self.usn).first()
        if not student_rec:
            return previous_data

        for sem in range(1, sem_no):
            sem_name = f"sem{sem}"

            # Fetch for this previous semester
            results = (
                db.session.query(AcademicResult, Subject)
                .join(Subject, AcademicResult.subject_code == Subject.subject_code)
                .filter(
                    AcademicResult.student_id == student_rec.id,
                    Subject.semester == sem_name,
                )
                .all()
            )

            if results:
                ia_marks = [(r.ia_marks or 0) for r, s in results]
                see_marks = [(r.see_marks or 0) for r, s in results]
                credits = [(s.credits or 0) for r, s in results]

                sgpa_i = self.calculate_sgpa_for_semester(ia_marks, see_marks, credits)
                total_credits_i = sum(credits)

                previous_data.append({"sgpa": sgpa_i, "credits": total_credits_i})

        return previous_data

    def calculate_sgpa_for_semester(self, ia_marks, see_marks, credits):
        obtained = 0
        total_credits = sum(credits)
        if total_credits == 0:
            return 0
        for ia, see, credit in zip(ia_marks, see_marks, credits):
            total_score = ia + see
            if credit == 0:
                continue
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
            obtained += grade_points * credit
        return obtained / total_credits

    def calculate_cgpa(self, previous_data):
        """
        Calculates VTU accurate CGPA using the semester formula:
        CGPA = Sum(Semester SGPA * Semester Total Credits) / Sum(Total Credits from all Semesters)
        """
        # Append current semester
        all_semesters = previous_data + [
            {"sgpa": self.sgpa, "credits": sum(self.credits)}
        ]

        sum_sgpa_x_credits = 0.0
        cumulative_credits = 0

        for sem in all_semesters:
            if sem["credits"] > 0:
                sum_sgpa_x_credits += sem["sgpa"] * sem["credits"]
                cumulative_credits += sem["credits"]

        if cumulative_credits == 0:
            return 0.0

        return round(sum_sgpa_x_credits / cumulative_credits, 2)

    def calculate_percentage(self):
        max_total = 100 * len(self.credits)
        return (self.total_marks / max_total * 100) if max_total > 0 else 0

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

    def plot_subject_marks(self):
        subjects = [
            f"{name} ({code})"
            for name, code in zip(self.subject_names, self.subject_codes)
        ]
        fig = plt.figure(figsize=(10, 6))

        plt.bar(subjects, self.ia_marks, label="IA Marks", color="skyblue", alpha=0.7)
        plt.bar(
            subjects,
            self.see_marks,
            label="SEE Marks",
            color="salmon",
            alpha=0.7,
            bottom=self.ia_marks,
        )

        plt.xlabel("Subjects")
        plt.ylabel("Marks")
        plt.title(f"Subject-wise IA and SEE Marks for {self.name}")
        plt.xticks(rotation=45, ha="right")
        plt.legend()
        plt.tight_layout()

        return fig

    def to_dict(self):
        """Standard serialization for frontend."""
        subjects = []
        for code, name, ia, see, credit, status in zip(
            self.subject_codes,
            self.subject_names,
            self.ia_marks,
            self.see_marks,
            self.credits,
            self.pass_fail,
        ):
            subjects.append(
                {
                    "code": code,
                    "subject_name": name,
                    "ia": ia,
                    "see": see,
                    "total": ia + see,
                    "credit": credit,
                    "status": status,
                }
            )

        return {
            "usn": self.usn,
            "name": self.name,
            "batch_year": self.batch_year,
            "found": self.found,
            "semester": self.semester,
            "total_marks": self.total_marks,
            "percentage": round(self.percentage, 2),
            "sgpa": round(self.sgpa, 2),
            "cgpa": round(self.cgpa, 2),
            "credits": sum(self.credits),
            "subjects": subjects,
        }
