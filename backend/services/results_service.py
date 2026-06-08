from models.paths import img_dir
from services.fetch_service import sem_subjects
from logger_config import get_logger

logger = get_logger(__name__)


class SubjectResult:
    def __init__(
        self, subject_code, semester, university, students=None, section_name=None
    ):
        self.subject_name = sem_subjects[semester].get(subject_code, "Unknown subject")
        self.subject_code = subject_code
        self.semester = semester
        self.university = university
        self.students = (
            students
            if students is not None
            else university.get_students_for_semester(semester, section_name)
        )

        self.students_data = self.fetch_students_data()

        self.total_students = len(
            [
                s
                for s in self.students
                if s.semester == self.semester and self.subject_code in s.subject_codes
            ]
        )
        self.present_students = len(self.students_data)
        self.absent_students = self.total_students - self.present_students
        self.pass_count, self.fail_count = self.calculate_subject_stats()
        self.fcd_count, self.fc_count, self.sc_count = (
            self.calculate_performance_grades()
        )
        self.pass_percentage = self.calculate_pass_percentage()

    def fetch_students_data(self):
        """
        Retrieves clean dictionaries of students enrolled in this subject.
        """
        records = []
        semester_enrolled_students = [
            student for student in self.students if student.semester == self.semester
        ]
        for student in semester_enrolled_students:
            if self.subject_code in student.subject_codes:
                idx = student.subject_codes.index(self.subject_code)
                records.append(
                    {
                        "name": student.name,
                        "USN": student.usn,
                        "ia": student.ia_marks[idx],
                        "see": student.see_marks[idx],
                        "Total_Marks": student.ia_marks[idx] + student.see_marks[idx],
                        "Credits": student.credits[idx],
                    }
                )
        return records

    def calculate_subject_stats(self):
        """
        Determines the count of students passing and failing this subject.
        """
        passing_total = 0
        for student in self.students_data:
            ia_score = student.get("ia", 0)
            see_score = student.get("see", 0)

            # If SEE is 0, pass-fail status relies solely on internal assessment
            if see_score == 0:
                if ia_score >= 18:
                    passing_total += 1
            else:
                if ia_score >= 18 and see_score >= 18:
                    passing_total += 1

        failing_total = self.present_students - passing_total
        return passing_total, failing_total

    def calculate_performance_grades(self):
        """
        Splits passing students into grade levels.
        """
        fcd_total = 0
        fc_total = 0
        sc_total = 0

        for student in self.students_data:
            score_to_eval = (
                student.get("ia", 0)
                if student.get("see", 0) == 0
                else student.get("Total_Marks", 0)
            )

            if score_to_eval >= 70:
                fcd_total += 1
            elif 60 <= score_to_eval < 70:
                fc_total += 1
            elif 50 <= score_to_eval < 60:
                sc_total += 1

        return fcd_total, fc_total, sc_total

    def calculate_pass_percentage(self):
        """
        Calculates pass percentage.
        """
        if self.present_students > 0:
            return (self.pass_count / self.present_students) * 100
        return 0.0

    def get_subject_results_dict(self):
        return {
            "subject_name": self.subject_name,
            "subject_code": self.subject_code,
            "semester": self.semester,
            "total_students": self.total_students,
            "present_students": self.present_students,
            "absent_students": self.absent_students,
            "pass_count": self.pass_count,
            "fail_count": self.fail_count,
            "pass_percentage": round(self.pass_percentage, 2),
            "fcd_count": self.fcd_count,
            "fc_count": self.fc_count,
            "sc_count": self.sc_count,
        }

    def plot_performance_pie_chart(self):
        """
        Generates pie chart of grade categories.
        """
        import matplotlib.pyplot as plt

        categories = ["FCD (>70%)", "FC (60-70%)", "SC (50-60%)"]
        values = [self.fcd_count, self.fc_count, self.sc_count]

        fig = plt.figure(figsize=(4, 4))
        plt.pie(
            values,
            labels=categories,
            autopct="%1.1f%%",
            startangle=140,
            colors=["#ff9999", "#66b3ff", "#99ff99"],
        )
        plt.title(f"Performance Distribution in {self.subject_code}")
        graph_path = f"{img_dir}/performance_pie_chart.png"
        plt.savefig(graph_path)
        plt.close(fig)
        return fig, graph_path

    def plot_attendance_pie_chart(self):
        """
        Generates pie chart of attendance rates.
        """
        import matplotlib.pyplot as plt

        labels = ["Present", "Absent"]
        values = [self.present_students, self.absent_students]

        fig = plt.figure(figsize=(4, 4))
        plt.pie(
            values,
            labels=labels,
            autopct="%1.1f%%",
            startangle=140,
            colors=["#66b3ff", "#ffcc99"],
        )
        plt.title(f"Attendance Distribution in {self.subject_code}")
        graph_path = f"{img_dir}/attendance_pie_chart.png"
        plt.savefig(graph_path)
        plt.close(fig)
        return fig, graph_path
