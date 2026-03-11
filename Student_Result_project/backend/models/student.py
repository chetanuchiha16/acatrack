from extensions import db
from logger_config import get_logger
from models.schema import AcademicResult, StudentAuth, Subject
from utils.grading import (
    calculate_pass_fail,
    calculate_obtained_credits,
    calculate_sgpa_for_semester,
    calculate_cgpa,
    categorize
)
from utils.visuals import plot_subject_marks
from extensions import db
from logger_config import get_logger
from models.schema import AcademicResult, StudentAuth, Subject

logger = get_logger(__name__)


class Student:
    def __init__(self, usn, semester, batch_year, preloaded_data=None):
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
            for res, sub in zip(preloaded_data["current_semester"]["res"], preloaded_data["current_semester"]["sub"]):
                self.subject_codes.append(sub.subject_code)
                self.subject_names.append(sub.subject_name or sub.subject_code)
                self.ia_marks.append(res.ia_marks or 0)
                self.see_marks.append(res.see_marks or 0)
                self.credits.append(sub.credits or 0)
        else:
            # 1. Fetch core student details
            student_rec = StudentAuth.query.filter_by(usn=self.usn).first()
            if student_rec:
                self.name = student_rec.name
                self.found = True

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

        if not self.found:
            raise ValueError(f"No student data found for USN {usn}")

        # 3. Calculate derived attributes (Matching your old methods exactly)
        self.total_marks = sum(self.ia_marks) + sum(self.see_marks)
        self.pass_fail = self.calculate_pass_fail()
        self.obtained_credits = self.calculate_obtained_credits()
        self.sgpa = self.calculate_sgpa()
        
        previous_data = self.fetch_previous_sgpas()
        self.cgpa = self.calculate_cgpa(previous_data)
        self.percentage = self.calculate_percentage()

    def calculate_pass_fail(self):
        return calculate_pass_fail(self.ia_marks, self.see_marks, self.credits)

    def calculate_obtained_credits(self):
        return calculate_obtained_credits(self.ia_marks, self.see_marks, self.credits)

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

        if self._preloaded_data:
            for sem in range(1, sem_no):
                sem_name = f"sem{sem}"
                if sem_name in self._preloaded_data["previous_semesters"]:
                    sem_data = self._preloaded_data["previous_semesters"][sem_name]
                    ia_marks = [(r.ia_marks or 0) for r in sem_data["res"]]
                    see_marks = [(r.see_marks or 0) for r in sem_data["res"]]
                    credits_list = [(s.credits or 0) for s in sem_data["sub"]]

                    if credits_list:
                        sgpa_i = self.calculate_sgpa_for_semester(ia_marks, see_marks, credits_list)
                        total_credits_i = sum(credits_list)
                        previous_data.append({"sgpa": sgpa_i, "credits": total_credits_i})
            return previous_data

        student_rec = StudentAuth.query.filter_by(usn=self.usn).first()
        if not student_rec:
            return previous_data

        sem_names = [f"sem{sem}" for sem in range(1, sem_no)]
        all_results = (
            db.session.query(AcademicResult, Subject)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .filter(
                AcademicResult.student_id == student_rec.id,
                Subject.semester.in_(sem_names),
            )
            .all()
        )

        sem_data = {sem: [] for sem in sem_names}
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



    def calculate_cgpa(self, previous_data):
        return calculate_cgpa(previous_data, self.sgpa, sum(self.credits))

    def calculate_percentage(self):
        max_total = 100 * len(self.credits)
        return (self.total_marks / max_total * 100) if max_total > 0 else 0

    def categorize(self):
        return categorize(self.percentage, self.pass_fail)

    def plot_subject_marks(self):
        return plot_subject_marks(
            self.subject_names,
            self.subject_codes,
            self.ia_marks,
            self.see_marks,
            self.name
        )

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
    def bulk_fetch(cls, usns, semester, batch_year):
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

        # Fetch all StudentAuth records
        student_records = StudentAuth.query.filter(StudentAuth.usn.in_(usns)).all()
        student_map = {s.usn: s for s in student_records}
        student_id_to_usn = {s.id: s.usn for s in student_records}

        if not student_map:
            return {}

        # Fetch AcademicResult and Subject joined over required semesters
        student_ids = list(student_id_to_usn.keys())
        results = (
            db.session.query(AcademicResult, Subject)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .filter(
                AcademicResult.student_id.in_(student_ids),
                Subject.semester.in_(required_semesters)
            )
            .all()
        )
        
        preloaded_data = {
            usn: {
                "student": student_map[usn],
                "current_semester": {"res": [], "sub": []},
                "previous_semesters": {}
            } for usn in usns if usn in student_map
        }

        for res, sub in results:
            usn = student_id_to_usn[res.student_id]
            if sub.semester == semester:
                preloaded_data[usn]["current_semester"]["res"].append(res)
                preloaded_data[usn]["current_semester"]["sub"].append(sub)
            else:
                if sub.semester not in preloaded_data[usn]["previous_semesters"]:
                    preloaded_data[usn]["previous_semesters"][sub.semester] = {"res": [], "sub": []}
                preloaded_data[usn]["previous_semesters"][sub.semester]["res"].append(res)
                preloaded_data[usn]["previous_semesters"][sub.semester]["sub"].append(sub)

        # Instantiate memory-fed objects
        instantiated_students = {}
        for usn, data in preloaded_data.items():
            try:
                instantiated_students[usn] = cls(usn, semester, batch_year, preloaded_data=data)
            except ValueError:
                pass

        return instantiated_students

    @classmethod
    def get_all_semesters(cls, usn, batch_year, max_sem=6):
        """
        Fetches all semesters for a given USN in 2 queries, returning a dict of 
        instantiated Student objects mapping semester name (e.g. 'sem1') to Student.
        """
        required_semesters = [f"sem{i}" for i in range(1, max_sem + 1)]
        
        student_rec = StudentAuth.query.filter_by(usn=usn).first()
        if not student_rec:
            return {}

        results = (
            db.session.query(AcademicResult, Subject)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .filter(
                AcademicResult.student_id == student_rec.id,
                Subject.semester.in_(required_semesters)
            )
            .all()
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
                "previous_semesters": {s: sem_data[s] for s in required_semesters if int(s[-1]) < sem_index}
            }
            try:
                # If current semester has no results but student exists, Student__init__ 
                # might still initialize if it doesn't strictly throw error for empty current_semester array
                # But it's safer to check if there are results
                if sem_data[sem]["res"]:
                    instantiated[sem] = cls(usn, sem, batch_year, preloaded_data=preloaded)
            except ValueError:
                pass
                
        return instantiated
