from __future__ import annotations

from typing import Optional

from logger_config import get_logger
from models.schema import AcademicResult, Subject
from utils.grading import (
    calculate_pass_fail,
    calculate_obtained_credits,
    calculate_sgpa_for_semester,
    calculate_cgpa,
    categorize,
)
from utils.visuals import plot_subject_marks

logger = get_logger(__name__)


_sync_engine_cache = {}


def _get_sync_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from settings import settings

    _raw_url = settings.database_url
    if _raw_url.startswith("postgresql+asyncpg://"):
        sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    else:
        sync_url = _raw_url

    if sync_url not in _sync_engine_cache:
        # FAANG-level: Use a pooled engine instead of disposing it every time
        _sync_engine_cache[sync_url] = create_engine(
            sync_url, pool_size=10, max_overflow=10
        )

    sync_engine = _sync_engine_cache[sync_url]
    return sessionmaker(bind=sync_engine), sync_engine


class Student:
    def __init__(
        self,
        usn: str,
        semester: Optional[str],
        batch_year: int,
        preloaded_data: Optional[dict] = None,
    ) -> None:
        """
        Load student information using SQLAlchemy from normalized tables.
        Keeps the exact logic and attributes for frontend compatibility.
        """
        self.usn = usn
        self.semester = semester.lower().strip() if semester else None
        self.batch_year = batch_year
        self.found = False

        self.subject_codes = []
        self.subject_names = []
        self.ia_marks = []
        self.see_marks = []
        self.credits = []

        self._preloaded_data = preloaded_data

        if preloaded_data:
            self.name = preloaded_data["student"].name
            self.found = True
            for res, sub in zip(
                preloaded_data["current_semester"]["res"],
                preloaded_data["current_semester"]["sub"],
            ):
                self.subject_codes.append(sub.subject_code)
                self.subject_names.append(sub.subject_name or sub.subject_code)
                self.ia_marks.append(res.ia_marks or 0)
                self.see_marks.append(res.see_marks or 0)
                self.credits.append(sub.credits or 0)
        else:
            from repositories.student_repository import StudentRepository

            SyncSessionMaker, sync_engine = _get_sync_session()
            with SyncSessionMaker() as session:
                repo = StudentRepository(session)
                student_rec = repo.get_auth_by_usn_sync(self.usn)

                if student_rec:
                    self.name = student_rec.name
                    self.found = True

                    if self.semester:
                        results = repo.get_results_by_student_and_sem_sync(
                            student_rec.id, self.semester
                        )

                        for res, sub in results:
                            self.subject_codes.append(sub.subject_code)
                            self.subject_names.append(
                                sub.subject_name or sub.subject_code
                            )
                            self.ia_marks.append(res.ia_marks or 0)
                            self.see_marks.append(res.see_marks or 0)
                            self.credits.append(sub.credits or 0)

        if not self.found:
            raise ValueError(f"No student data found for USN {usn}")

        # Calculate derived attributes
        self.total_marks: int = sum(self.ia_marks) + sum(self.see_marks)
        self.pass_fail: list[str] = self.calculate_pass_fail()
        self.obtained_credits: float = self.calculate_obtained_credits()
        self.sgpa: float = self.calculate_sgpa()

        previous_data: list[dict] = self.fetch_previous_sgpas()
        self.cgpa: float = self.calculate_cgpa(previous_data)
        self.percentage: float = self.calculate_percentage()

    def calculate_pass_fail(self) -> list[str]:
        return calculate_pass_fail(self.ia_marks, self.see_marks, self.credits)

    def calculate_obtained_credits(self) -> float:
        return calculate_obtained_credits(self.ia_marks, self.see_marks, self.credits)

    def calculate_sgpa(self) -> float:
        total_credits = sum(self.credits)
        return self.obtained_credits / total_credits if total_credits > 0 else 0

    def fetch_previous_sgpas(self) -> list[dict]:
        """
        Calculates SGPAs and total credits for all previous semesters using the normalized database.
        """
        previous_data: list[dict] = []  # Stores dicts with 'sgpa' and 'credits'
        try:
            sem_no: int = int(self.semester[-1]) if self.semester else 1
        except Exception:
            sem_no = 1

        if self._preloaded_data:
            for sem in range(1, sem_no):
                sem_name: str = f"sem{sem}"
                if sem_name in self._preloaded_data["previous_semesters"]:
                    sem_data: dict = self._preloaded_data["previous_semesters"][
                        sem_name
                    ]
                    ia_marks: list[int] = [(r.ia_marks or 0) for r in sem_data["res"]]
                    see_marks: list[int] = [(r.see_marks or 0) for r in sem_data["res"]]
                    credits_list: list[int] = [
                        (s.credits or 0) for s in sem_data["sub"]
                    ]

                    if credits_list:
                        sgpa_i: float = calculate_sgpa_for_semester(
                            ia_marks, see_marks, credits_list
                        )
                        total_credits_i: int = sum(credits_list)
                        previous_data.append(
                            {"sgpa": sgpa_i, "credits": total_credits_i}
                        )
            return previous_data

        from repositories.student_repository import StudentRepository

        SyncSessionMaker, sync_engine = _get_sync_session()

        with SyncSessionMaker() as session:
            repo = StudentRepository(session)
            student_rec = repo.get_auth_by_usn_sync(self.usn)

            if not student_rec:
                return previous_data

            sem_names: list[str] = [f"sem{sem}" for sem in range(1, sem_no)]
            all_results = repo.get_results_by_student_id_and_sems_sync(
                student_rec.id, sem_names
            )

        sem_data: dict[str, list[tuple[AcademicResult, Subject]]] = {
            sem: [] for sem in sem_names
        }
        for r, s in all_results:
            sem_data[s.semester].append((r, s))

        for sem in range(1, sem_no):
            sem_name = f"sem{sem}"
            results = sem_data[sem_name]

            if results:
                ia_marks = [(r.ia_marks or 0) for r, s in results]
                see_marks = [(r.see_marks or 0) for r, s in results]
                credits = [(s.credits or 0) for r, s in results]

                sgpa_i = calculate_sgpa_for_semester(ia_marks, see_marks, credits)
                total_credits_i = sum(credits)

                previous_data.append({"sgpa": sgpa_i, "credits": total_credits_i})

        return previous_data

    def calculate_cgpa(self, previous_data: list[dict]) -> float:
        return calculate_cgpa(previous_data, self.sgpa, sum(self.credits))

    def calculate_percentage(self) -> float:
        max_total: int = 100 * len(self.credits)
        return (self.total_marks / max_total * 100) if max_total > 0 else 0

    def categorize(self) -> str:
        return categorize(self.percentage, self.pass_fail)

    def plot_subject_marks(self):
        return plot_subject_marks(
            self.subject_names,
            self.subject_codes,
            self.ia_marks,
            self.see_marks,
            self.name,
        )

    def to_dict(self) -> dict:
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

        overall_status = "Fail" if "Fail" in self.pass_fail else "Pass"

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
            "status": overall_status,
            "subjects": subjects,
        }

    @classmethod
    def bulk_fetch(
        cls,
        usns: list[str],
        semester: Optional[str],
        batch_year: int,
    ) -> dict[str, "Student"]:
        """
        Efficiently fetches combined StudentAuth, AcademicResult, and Subject records for a list of USNs.
        Returns a dictionary mapping USN strings to fully instantiated Student objects.
        """
        if not usns:
            return {}

        semester = semester.lower().strip() if semester else None

        try:
            sem_no = int(semester[-1]) if semester else 1
        except Exception:
            sem_no = 1

        required_semesters = [f"sem{i}" for i in range(1, sem_no + 1)]

        from repositories.student_repository import StudentRepository

        SyncSessionMaker, sync_engine = _get_sync_session()

        with SyncSessionMaker() as session:
            repo = StudentRepository(session)
            student_records = repo.get_auths_by_usns_sync(usns)

            student_map = {s.usn: s for s in student_records}
            student_id_to_usn = {s.id: s.usn for s in student_records}

            if not student_map:
                return {}

            results = repo.get_results_by_student_ids_and_sems_sync(
                [s.id for s in student_records], required_semesters
            )

        preloaded_data = {
            usn: {
                "student": student_map[usn],
                "current_semester": {"res": [], "sub": []},
                "previous_semesters": {},
            }
            for usn in usns
            if usn in student_map
        }

        for res, sub in results:
            usn = student_id_to_usn[res.student_id]
            if sub.semester == semester:
                preloaded_data[usn]["current_semester"]["res"].append(res)
                preloaded_data[usn]["current_semester"]["sub"].append(sub)
            else:
                if sub.semester not in preloaded_data[usn]["previous_semesters"]:
                    preloaded_data[usn]["previous_semesters"][sub.semester] = {
                        "res": [],
                        "sub": [],
                    }
                preloaded_data[usn]["previous_semesters"][sub.semester]["res"].append(
                    res
                )
                preloaded_data[usn]["previous_semesters"][sub.semester]["sub"].append(
                    sub
                )

        instantiated_students = {}
        for usn, data in preloaded_data.items():
            try:
                instantiated_students[usn] = cls(
                    usn, semester, batch_year, preloaded_data=data
                )
            except ValueError:
                pass

        return instantiated_students

    @classmethod
    async def bulk_fetch_async(
        cls,
        session,
        usns: list[str],
        semester: Optional[str],
        batch_year: int,
    ) -> list["Student"]:
        """
        Truly async version of bulk_fetch.
        Uses the async session directly — no thread pool, no sync engine.
        Returns a list of Student objects (not a dict).
        """
        if not usns:
            return []

        semester = semester.lower().strip() if semester else None

        try:
            sem_no = int(semester[-1]) if semester else 1
        except Exception:
            sem_no = 1

        required_semesters = [f"sem{i}" for i in range(1, sem_no + 1)]

        from repositories.student_repository import StudentRepository

        repo = StudentRepository(session)

        # Query 1: fetch student records
        student_records = await repo.get_auths_by_usns(usns)

        student_map = {s.usn: s for s in student_records}
        student_id_to_usn = {s.id: s.usn for s in student_records}

        if not student_map:
            return []

        # Query 2: fetch all results + subjects for current + previous semesters
        # The repo method `get_results_by_usns_and_sem` uses `usns` instead of `student_ids` internally
        results = await repo.get_results_by_usns_and_sem(usns, required_semesters)

        # Pure Python: build preloaded_data and instantiate Students (no I/O)
        preloaded_data = {
            usn: {
                "student": student_map[usn],
                "current_semester": {"res": [], "sub": []},
                "previous_semesters": {},
            }
            for usn in usns
            if usn in student_map
        }

        for res, sub in results:
            usn = student_id_to_usn[res.student_id]
            if sub.semester == semester:
                preloaded_data[usn]["current_semester"]["res"].append(res)
                preloaded_data[usn]["current_semester"]["sub"].append(sub)
            else:
                if sub.semester not in preloaded_data[usn]["previous_semesters"]:
                    preloaded_data[usn]["previous_semesters"][sub.semester] = {
                        "res": [],
                        "sub": [],
                    }
                preloaded_data[usn]["previous_semesters"][sub.semester]["res"].append(
                    res
                )
                preloaded_data[usn]["previous_semesters"][sub.semester]["sub"].append(
                    sub
                )

        students = []
        for usn, data in preloaded_data.items():
            try:
                students.append(cls(usn, semester, batch_year, preloaded_data=data))
            except ValueError:
                pass

        return students

    @classmethod
    async def create_async(
        cls,
        session,
        usn: str,
        semester: Optional[str],
        batch_year: int,
    ) -> Optional["Student"]:
        """
        Creates a single Student object asynchronously using the bulk_fetch_async pipeline.
        """
        students = await cls.bulk_fetch_async(session, [usn], semester, batch_year)
        if not students:
            # Emulate the __init__ behavior which raises ValueError if not found
            raise ValueError(f"No student data found for USN {usn}")
        return students[0]

    @classmethod
    def get_all_semesters(
        cls,
        usn: str,
        batch_year: int,
        max_sem: int = 6,
    ) -> dict[str, "Student"]:
        required_semesters = [f"sem{i}" for i in range(1, max_sem + 1)]

        from repositories.student_repository import StudentRepository

        SyncSessionMaker, sync_engine = _get_sync_session()

        with SyncSessionMaker() as session:
            repo = StudentRepository(session)
            student_rec = repo.get_auth_by_usn_sync(usn)

            if not student_rec:
                return {}

            results = repo.get_results_by_student_id_and_sems_sync(
                student_rec.id, required_semesters
            )

        sem_data = {sem: {"res": [], "sub": []} for sem in required_semesters}
        for res, sub in results:
            if sub.semester in sem_data:
                sem_data[sub.semester]["res"].append(res)
                sem_data[sub.semester]["sub"].append(sub)

        instantiated = {}
        for sem in required_semesters:
            sem_index = int(sem[-1])
            preloaded = {
                "student": student_rec,
                "current_semester": sem_data[sem],
                "previous_semesters": {
                    s: sem_data[s] for s in required_semesters if int(s[-1]) < sem_index
                },
            }
            try:
                if sem_data[sem]["res"]:
                    instantiated[sem] = cls(
                        usn, sem, batch_year, preloaded_data=preloaded
                    )
            except ValueError:
                pass

        return instantiated
