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
        self.cgpa = (
            self.calculate_cgpa_cumulative()
        )  # Refactored to look at all DB records
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

    def calculate_cgpa_cumulative(self):
        """
        New Logic: Calculates CGPA across ALL semesters in the 3NF database.
        This replaces 'fetch_previous_sgpas' with a more accurate full-DB calculation.
        """
        try:
            student_rec = StudentAuth.query.filter_by(usn=self.usn).first()
            all_res = (
                db.session.query(AcademicResult, Subject)
                .join(Subject, AcademicResult.subject_code == Subject.subject_code)
                .filter(AcademicResult.student_id == student_rec.id)
                .all()
            )

            if not all_res:
                return 0.0

            total_weighted_points = 0
            total_credits = 0

            for res, sub in all_res:
                if not sub.credits:
                    continue
                m = (res.ia_marks or 0) + (res.see_marks or 0)
                if m >= 90:
                    gp = 10
                elif m >= 80:
                    gp = 9
                elif m >= 70:
                    gp = 8
                elif m >= 60:
                    gp = 7
                elif m >= 50:
                    gp = 6
                elif m >= 40:
                    gp = 5
                elif m >= 30:
                    gp = 3
                elif m >= 20:
                    gp = 2
                elif m >= 10:
                    gp = 1
                else:
                    gp = 0
                total_weighted_points += gp * sub.credits
                total_credits += sub.credits

            return total_weighted_points / total_credits if total_credits > 0 else 0.0
        except Exception as e:
            logger.error(f"Error calculating CGPA for {self.usn}: {e}")
            return 0.0

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
            "pass_fail": self.pass_fail,
            "results": {
                "subject_codes": self.subject_codes,
                "subject_names": self.subject_names,
                "ia_marks": self.ia_marks,
                "see_marks": self.see_marks,
                "credits": self.credits,
            },
        }
