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
    available_semesters: Optional[List[str]] = None


class AuthStatusResponse(BaseModel):
    logged_in: bool
    who: str
    id: Optional[str] = None
    name: Optional[str] = None
    mentor_id: Optional[int | str] = None
    batch_year: Optional[int] = None


class BatchRequest(BaseModel):
    batch_year: int


class FetchResultsRequest(BaseModel):
    usn_prefix: str
    usn_start: int
    usn_end: int
    sem: int
    download_dir: Optional[str] = None


class MentorSendEmailAllRequest(BaseModel):
    recipientType: str = "student"
    subject: str
    message: str


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


class MenteeProjectInternship(BaseModel):
    company: Optional[str] = None
    address: Optional[str] = None
    duration: Optional[str] = None
    stipend: Optional[str] = None


class MenteeActivity(BaseModel):
    Sports: Optional[str] = None
    conference_details: Optional[str] = None
    papers_published: Optional[str] = None
    certifications_from_MOOC: Optional[str] = None


class MenteeSummary(BaseModel):
    cultural_activities: Optional[str] = None
    co_curricular_activities: Optional[str] = None
    hackathon: Optional[str] = None
    coding_competitions: Optional[str] = None
    other_achievements: Optional[str] = None


class MenteeUploadFormRequest(BaseModel):
    name: Optional[str] = None
    usn: Optional[str] = None
    mentor_name: Optional[str] = None
    mentor_phone: Optional[str] = None
    temporary_address: Optional[str] = None
    permanent_address: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    father_name: Optional[str] = None
    Contact: Optional[str] = None
    Occupation: Optional[str] = None
    mother_name: Optional[str] = None
    Contact_Mother: Optional[str] = None
    Occupation_Mother: Optional[str] = None
    sgpa: List[Optional[float | str]] = []
    projects: List[MenteeProjectInternship] = []
    internships: List[MenteeProjectInternship] = []
    activities: List[MenteeActivity] = []
    summary: MenteeSummary = MenteeSummary()
