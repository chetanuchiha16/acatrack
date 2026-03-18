# backend/repositories/mentor_repository.py
from models.schema import Mentor, Teacher, Meeting, MentorMessage, StudentMessageStatus

class MentorRepository:
    def __init__(self, db_session):
        self.db = db_session

    # --- Mentors ---
    def get_by_id(self, mentor_id: int) -> Mentor:
        return self.db.get(Mentor, mentor_id)

    def get_by_name(self, name: str) -> Mentor:
        return self.db.query(Mentor).filter_by(name=name).first()

    def get_all_by_names(self, names: list) -> list[Mentor]:
        return self.db.query(Mentor).filter(Mentor.name.in_(names)).all()

    def get_mentors_by_names_filter(self, names: list) -> list[Mentor]:
        """Alias for semantic clarity used in bulk upload routes."""
        return self.get_all_by_names(names)
        
    def get_all(self) -> list[Mentor]:
        return self.db.query(Mentor).all()

    def get_all_mentors(self) -> list[Mentor]:
        """Alias for get_all for semantic clarity."""
        return self.db.query(Mentor).all()

    def get_mentors_by_ids(self, ids: list) -> list[Mentor]:
        return self.db.query(Mentor).filter(Mentor.id.in_(ids)).all()

    # --- Teachers ---
    def get_teacher_by_username(self, username: str) -> Teacher | None:
        return self.db.query(Teacher).filter_by(username=username).first()

    def teacher_username_exists(self, username: str) -> bool:
        """Lightweight check used during unique-username generation."""
        return self.db.query(Teacher.username).filter_by(username=username).first() is not None

    def get_teacher_by_mentor_id(self, mentor_id: int) -> Teacher:
        return self.db.query(Teacher).filter_by(mentor_id=mentor_id).first()

    def get_teachers_by_names(self, names: list) -> list[Teacher]:
        return self.db.query(Teacher).filter(Teacher.name.in_(names)).all()

    # --- Meetings ---
    def get_meetings_by_mentor(self, mentor_id: int) -> list[Meeting]:
        return self.db.query(Meeting).filter_by(mentor_id=mentor_id).order_by(Meeting.date).all()
        
    def get_meeting_by_id(self, meeting_id: int) -> Meeting:
        return self.db.get(Meeting, meeting_id)

    # --- Messages ---
    def get_messages_by_mentor(self, mentor_id: int) -> list[MentorMessage]:
        return self.db.query(MentorMessage).filter_by(mentor_id=mentor_id).order_by(MentorMessage.created_at.desc()).all()

    def get_message_by_id_and_mentor(self, msg_id: int, mentor_id: int) -> MentorMessage:
        return self.db.query(MentorMessage).filter_by(id=msg_id, mentor_id=mentor_id).first()
        
    def get_all_messages(self) -> list[MentorMessage]:
         return self.db.query(MentorMessage).all()

    def delete_message_statuses(self, msg_id: int):
         self.db.query(StudentMessageStatus).filter_by(msg_id=msg_id).delete()

    def get_message_by_id(self, msg_id: int) -> MentorMessage:
        return self.db.query(MentorMessage).filter_by(id=msg_id).first()
