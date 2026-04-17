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
    mentor_id: Optional[str] = None

class ChartResponse(BaseModel):
    image: str

class LoginResponse(BaseModel):
    token: str

class BatchesResponse(BaseModel):
    batches: List[int]
