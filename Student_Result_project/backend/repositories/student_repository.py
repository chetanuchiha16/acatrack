from models.schema import StudentAuth, AcademicResult, Subject, ParentAuth
from models.student import Student
from sqlalchemy.orm import joinedload

class StudentRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_auth_by_usn(self, usn: str) -> StudentAuth:
        return self.db.query(StudentAuth).filter_by(usn=usn).first()

    def get_auths_by_usns(self, usns: list) -> list[StudentAuth]:
        return self.db.query(StudentAuth).filter(StudentAuth.usn.in_(usns)).all()

    def get_auths_with_parents_by_usns(self, usns: list) -> list[StudentAuth]:
        return self.db.query(StudentAuth).options(joinedload(StudentAuth.parent_account)).filter(StudentAuth.usn.in_(usns)).all()
        
    def get_mentees_by_mentor_and_batch(self, mentor_id: int, batch_year: int) -> list[StudentAuth]:
        return self.db.query(StudentAuth).filter_by(mentor_id=mentor_id, batch_year=batch_year).all()
        
    def get_mentees_by_mentor(self, mentor_id: int) -> list[StudentAuth]:
        return self.db.query(StudentAuth).filter_by(mentor_id=mentor_id).all()

    def count_by_batch(self, batch_year: int) -> int:
        return self.db.query(StudentAuth).filter_by(batch_year=batch_year).count()

    def get_distinct_batch_years(self) -> list:
        return self.db.query(StudentAuth.batch_year).distinct().all()

    # --- Student Auth by Batch ---
    def get_auths_by_batch(self, batch_year: int) -> list[StudentAuth]:
        return self.db.query(StudentAuth).filter_by(batch_year=batch_year).all()

    def get_auth_by_batch(self, batch_year: int) -> list[StudentAuth]:
        """Alias for get_auths_by_batch."""
        return self.get_auths_by_batch(batch_year)

    # --- Academic Results & Subjects ---
    def get_results_by_usn(self, usn: str) -> list[tuple]:
        return self.db.query(AcademicResult, Subject).join(Subject).join(StudentAuth).filter(StudentAuth.usn == usn).all()

    def get_results_in_usns(self, usns: list) -> list[tuple]:
        return self.db.query(AcademicResult, Subject).join(Subject).join(StudentAuth).filter(StudentAuth.usn.in_(usns)).all()

    def get_results_by_usns_and_sem(self, usns: list, semesters: list) -> list[tuple]:
        return self.db.query(AcademicResult, Subject).join(Subject).join(StudentAuth).filter(
            StudentAuth.usn.in_(usns),
            Subject.semester.in_(semesters)
        ).all()
        
    def get_results_by_usn_and_sem(self, usn: str, semester: str) -> list[tuple]:
        return self.db.query(AcademicResult, Subject).join(Subject).join(StudentAuth).filter(
            StudentAuth.usn == usn,
            Subject.semester == semester
        ).all()

    def count_results_by_batch(self, batch_year: int) -> int:
        return self.db.query(AcademicResult).filter_by(batch_year=batch_year).count()

    def get_subjects_by_codes(self, subject_codes: list) -> list[Subject]:
         return self.db.query(Subject).filter(Subject.subject_code.in_(subject_codes)).all()

    def count_subjects(self) -> int:
        return self.db.query(Subject).count()

    def get_distinct_semesters_by_branch(self, branch: str) -> list:
        return self.db.query(Subject.semester).filter_by(branch=branch).distinct().all()
