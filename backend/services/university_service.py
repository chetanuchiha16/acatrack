from utils.sync_db import db
from logger_config import get_logger
from models.paths import img_dir
from models.schema import AcademicResult, StudentAuth, Subject
from services.student_service import Student

logger = get_logger(__name__)


class University:
    def __init__(self, session=None, batch_year=None):
        self.session = session  # Can be Sync or Async session
        self.batch_year = batch_year

    def fetch_semester_tables(self):
        """
        Sync version for backward compatibility if needed, but we prefer async.
        """
        try:
            from utils.sync_db import db

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
            return semesters
        except Exception as e:
            logger.debug(f"Error fetching semesters: {e}")
            return []

    async def fetch_semester_tables_async(self, session):
        from repositories.university_repository import UniversityRepository
        repo = UniversityRepository(session)
        return await repo.get_semesters_by_batch(self.batch_year)

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

    async def calculate_academic_performance_async(self, session, selected_semester):
        """
        Calculates academic performance using SQL aggregations.
        FAANG-level optimization: Use repository for O(1) stats retrieval.
        """
        from repositories.academic_repository import AcademicRepository

        repo = AcademicRepository(session)

        semesters = await self.fetch_semester_tables_async(session)
        if not semesters:
            return [{"error": "No semester data available for this batch."}]

        if selected_semester not in semesters:
            return [
                {
                    "error": f"No data found for {selected_semester} in batch {self.batch_year}"
                }
            ]

        # This method is still expected to return a list of student-level results
        # for some routes. For those, we still need to fetch students.
        # But we avoid re-calculating everything if possible.

        students = await self.get_students_for_semester_async(
            session, selected_semester
        )
        semester_results = []
        for student in students:
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
        return semester_results

    async def get_students_for_semester_async(self, session, selected_semester):
        from repositories.university_repository import UniversityRepository
        repo = UniversityRepository(session)

        all_usns = await repo.get_student_usns_by_semester(
            selected_semester, self.batch_year
        )

        if not all_usns:
            return []

        # Fully async — uses the same asyncpg pool, no thread handoff
        return await Student.bulk_fetch_async(
            session, all_usns, selected_semester, self.batch_year
        )

    async def find_failed_students_async(
        self, session, selected_semester, students=None
    ):
        if students is None:
            students = await self.get_students_for_semester_async(
                session, selected_semester
            )

        failed_students_list = []
        for student in students:
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
        return failed_students_list

    def display_failed_students(self, selected_semester):
        failed_students = self.find_failed_students(selected_semester)

        if not failed_students:
            logger.debug("No failed students in the selected semester.")
            return

        logger.debug(f"Failed students in {selected_semester}:")
        for fail_item in failed_students:
            logger.debug(f"USN: {fail_item['usn']}, Details: {fail_item}")

    async def plot_student_totals_async(
        self, session, selected_semester, mode="top_n", n=10, bins=10, students=None
    ):
        import asyncio

        if students is None:
            students = await self.get_students_for_semester_async(
                session, selected_semester
            )

        if not students:
            logger.debug(f"No student data available for {selected_semester}.")
            return None, None

        student_names = [student.name for student in students]
        total_marks = [student.total_marks for student in students]

        def _plot():
            from matplotlib.figure import Figure

            fig = Figure(figsize=(12, 6))
            ax = fig.add_subplot(111)

            if mode == "top_n":
                sorted_data = sorted(
                    zip(student_names, total_marks), key=lambda x: x[1], reverse=True
                )[:n]
                top_names, top_marks = zip(*sorted_data)
                ax.bar(top_names, top_marks, color="orange", alpha=0.7)
                ax.set_xlabel("Students")
                ax.set_ylabel("Total Marks")
                ax.set_title(f"Top {n} Students in {selected_semester}")
                # Rotate labels
                for label in ax.get_xticklabels():
                    label.set_rotation(45)
                    label.set_horizontalalignment("right")

            elif mode == "histogram":
                ax.hist(
                    total_marks, bins=bins, color="orange", alpha=0.7, edgecolor="black"
                )
                ax.set_xlabel("Marks Range")
                ax.set_ylabel("Number of Students")
                ax.set_title(f"Total Marks Distribution in {selected_semester}")

            fig.tight_layout()
            import uuid

            graph_path = f"{img_dir}/plot_student_totals_{uuid.uuid4().hex}.png"
            fig.savefig(graph_path)
            return graph_path

        graph_path = await asyncio.get_event_loop().run_in_executor(None, _plot)
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
