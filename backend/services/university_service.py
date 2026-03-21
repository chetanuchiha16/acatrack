from extensions import db
from logger_config import get_logger
from models.paths import img_dir, postgres_db_url
from models.schema import AcademicResult, StudentAuth, Subject
from services.student_service import Student

logger = get_logger(__name__)


class University:
    def __init__(self, postgres_url=None, batch_year=None):
        self.postgres_url = postgres_url or postgres_db_url
        self.batch_year = batch_year
        # We assume operations happen within a Flask app context with `db.session` active.

    def fetch_semester_tables(self):
        """
        In the new schema, there are no separate tables per semester.
        Instead, we find all distinct semesters matching the batch_year.
        """
        try:
            results = (
                db.session.query(Subject.semester)
                .join(
                    AcademicResult, AcademicResult.subject_code == Subject.subject_code
                )
                .filter(AcademicResult.batch_year == self.batch_year)
                .distinct()
                .all()
            )
            semesters = [r[0] for r in results if r[0]]
            logger.debug(f"DEBUG: Semesters for batch {self.batch_year}: {semesters}")
            return semesters
        except Exception as e:
            logger.debug(f"Error fetching semesters: {e}")
            return []

    def fetch_students(self, semester):
        """
        Fetch all unique USNs for a given semester based on AcademicResult and Subject.
        """
        try:
            results = (
                db.session.query(StudentAuth.usn)
                .join(AcademicResult, AcademicResult.student_id == StudentAuth.id)
                .join(Subject, Subject.subject_code == AcademicResult.subject_code)
                .filter(
                    AcademicResult.batch_year == self.batch_year,
                    Subject.semester == semester,
                )
                .distinct()
                .all()
            )
            return [r[0] for r in results]
        except Exception as e:
            logger.debug(f"Error fetching students for {semester}: {e}")
            return []

    def get_students_for_semester(self, selected_semester):
        """
        Fetch all Student objects for a semester instantly using a bulk query,
        avoiding N+1 queries. Returns a list representing the cohort.
        """
        all_usns = self.fetch_students(selected_semester)
        if not all_usns:
            logger.debug(
                f"No students found for {selected_semester} in batch {self.batch_year}."
            )
            return []

        bulk_students = Student.bulk_fetch(all_usns, selected_semester, self.batch_year)
        return list(bulk_students.values())

    def calculate_all_sgpa_and_cgpa(self, previous_sgpas_list):
        """Calculates SGPA and CGPA for each student. This was redundant as Student calculates it, leaving intact for compatibility."""
        pass

    def calculate_academic_performance_by_semester(self, selected_semester):
        """
        Calculates academic performance for all students in the selected semester.
        """
        try:
            semesters = self.fetch_semester_tables()

            if not semesters:
                return [{"error": "No semester data available for this batch."}]

            if selected_semester not in semesters:
                return [
                    {
                        "error": f"No data found for {selected_semester} in batch {self.batch_year}"
                    }
                ]

            semester_results = []
            students = self.get_students_for_semester(selected_semester)

            for student in students:
                try:
                    if not student.name:
                        continue

                    semester_results.append(
                        {
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
                        }
                    )

                except ValueError as e:
                    logger.debug(f"Processing error for {student.usn}: {str(e)}")
                    semester_results.append(
                        {
                            "semester": selected_semester,
                            "usn": student.usn,
                            "error": "Error processing student data.",
                        }
                    )

            return semester_results

        except Exception as e:
            logger.error(f"Error calculating performance: {str(e)}")
            return [{"error": "An internal error occurred."}]

    def find_failed_students(self, selected_semester):
        failed_students_list = []
        try:
            students = self.get_students_for_semester(selected_semester)

            for student in students:
                try:
                    if "Fail" in student.pass_fail:
                        failed_students_list.append(
                            {
                                "name": student.name,
                                "usn": student.usn,
                                "cgpa": student.cgpa,
                                "percentage": student.percentage,
                                "obtained_credits": student.obtained_credits,
                                "pass_fail": student.pass_fail,
                                "ia_marks": student.ia_marks,
                                "see_marks": student.see_marks,
                                "subject_codes": student.subject_codes,
                                "subject_names": student.subject_names,
                            }
                        )

                except ValueError:
                    continue

            return failed_students_list
        except Exception as e:
            logger.debug(f"Error occurred while fetching failed students: {str(e)}")
            return []

    def display_failed_students(self, selected_semester):
        failed_students = self.find_failed_students(selected_semester)

        if not failed_students:
            logger.debug("No failed students in the selected semester.")
            return

        logger.debug(f"Failed students in {selected_semester}:")
        for fail_item in failed_students:
            logger.debug(f"USN: {fail_item['usn']}, Details: {fail_item}")

    def plot_student_totals(self, selected_semester, mode="top_n", n=10, bins=10):
        # Dynamically fetch students for plotting stateless calculations
        import matplotlib
        import matplotlib.pyplot as plt

        matplotlib.use("Agg")

        filtered_students = self.get_students_for_semester(selected_semester)

        if not filtered_students:
            logger.debug(f"No student data available for {selected_semester}.")
            return None, None

        student_names = [student.name for student in filtered_students]
        total_marks = [student.total_marks for student in filtered_students]

        fig = plt.figure(figsize=(12, 6))

        if mode == "top_n":
            sorted_data = sorted(
                zip(student_names, total_marks), key=lambda x: x[1], reverse=True
            )[:n]
            top_names, top_marks = zip(*sorted_data)
            plt.bar(top_names, top_marks, color="orange", alpha=0.7)
            plt.xlabel("Students")
            plt.ylabel("Total Marks")
            plt.title(f"Top {n} Students in {selected_semester}")
            plt.xticks(rotation=45, ha="right")

        elif mode == "histogram":
            plt.hist(
                total_marks, bins=bins, color="orange", alpha=0.7, edgecolor="black"
            )
            plt.xlabel("Marks Range")
            plt.ylabel("Number of Students")
            plt.title(f"Total Marks Distribution in {selected_semester}")

        else:
            logger.debug("Invalid mode. Choose 'top_n' or 'histogram'.")
            return plt.figure(), None

        plt.tight_layout()
        import uuid

        graph_path = f"{img_dir}/plot_student_totals_{uuid.uuid4().hex}.png"
        plt.savefig(graph_path)
        plt.close(fig)  # Prevent memory leak!

        return None, graph_path

    def get_toppers(self, selected_semester, n=5):
        filtered_students = self.get_students_for_semester(selected_semester)

        if not filtered_students:
            logger.debug(f"No student data available for {selected_semester}.")
            return []

        sorted_students = sorted(
            filtered_students, key=lambda x: x.total_marks, reverse=True
        )
        toppers = sorted_students[:n]

        toppers_list = []
        for topper in toppers:
            toppers_list.append(
                {
                    "usn": topper.usn,
                    "name": topper.name,
                    "total_marks": topper.total_marks,
                    "sgpa": topper.sgpa,
                    "cgpa": topper.cgpa,
                }
            )

        logger.debug(f"\nTop {n} Students in {selected_semester}:")
        for rank, topper in enumerate(toppers_list, start=1):
            logger.debug(
                f"Rank {rank}: {topper['name']} (USN: {topper['usn']}, Marks: {topper['total_marks']}, SGPA: {topper['sgpa']})"
            )

        return toppers_list
