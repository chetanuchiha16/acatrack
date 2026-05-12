from pydantic import BaseModel
from typing import List, Optional

class SubjectResult(BaseModel):
    code: str
    subject_name: str
    ia: float | str
    see: float | str
    total: float | str
    credit: int
    status: str

class StudentResultResponse(BaseModel):
    usn: str
    name: str
    sgpa: float
    cgpa: float
    percentage: float
    total_marks: float | str
    credits: float | str
    status: str
    subjects: List[SubjectResult]
    pdf_url: Optional[str] = None
    semester: Optional[str] = None

class AuthStatusResponse(BaseModel):
    logged_in: bool
    who: str
    id: Optional[str] = None
    name: Optional[str] = None
    mentor_id: Optional[int] = None

class ChartResponse(BaseModel):
    image: str

class LoginResponse(BaseModel):
    token: str

class BatchesResponse(BaseModel):
    batches: List[int]

class MentorMenteeEntry(BaseModel):
    usn: str
    name: str
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    parent_phone: Optional[str] = None

class MentorMenteeListResponse(BaseModel):
    students: List[MentorMenteeEntry]

class MessageReadStatus(BaseModel):
    usn: str
    name: str
    read: bool

class MentorMessageResponse(BaseModel):
    id: int
    subject: str
    message: str
    created_at: str
    email_failed: bool = False
    student_usn: Optional[str] = None
    read_status: List[MessageReadStatus] = []

class EmailAllStatus(BaseModel):
    usn: str
    success: bool
