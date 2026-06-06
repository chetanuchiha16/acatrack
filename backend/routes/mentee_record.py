from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, FileResponse
import fitz
import os
from models.paths import pdf_dir, base_dir
from utils.cloud import save_file, supabase, SUPABASE_BUCKET, SUPABASE_URL
from services.batch_manager import bm
from repositories.student_repository import StudentRepository
from logger_config import get_logger
from utils.helpers import get_batch_year_from_request
from schemas import MenteeUploadFormRequest
import requests as http_requests
import asyncio

logger = get_logger(__name__)
RECORD_UPLOAD_PATH = pdf_dir
os.makedirs(RECORD_UPLOAD_PATH, exist_ok=True)

router = APIRouter(prefix="/mentee", tags=["mentee_record"])
TEMPLATE_PATH = str(base_dir / "Inputs" / "New_mentor_Record[final].pdf")


def construct_mentee_pdf_name(mentee_info) -> str:
    """
    Builds a unique and safe PDF filename for a mentee.
    """
    sanitized_name = (mentee_info.name or "").replace(" ", "_")
    return f"{mentee_info.usn}_{sanitized_name}_record.pdf"


@router.post("/upload_form")
async def upload_form(body: MenteeUploadFormRequest):
    name = body.name
    usn = body.usn
    mentor_name = body.mentor_name
    mentor_phone = body.mentor_phone
    temporary_address = body.temporary_address
    permanent_address = body.permanent_address
    phone_number = body.phone_number
    email = body.email
    father_name = body.father_name
    Contact = body.Contact
    Occupation = body.Occupation
    mother_name = body.mother_name
    Contact_Mother = body.Contact_Mother
    Occupation_Mother = body.Occupation_Mother
    sgpas = body.sgpa
    projects = [p.model_dump() for p in body.projects]
    internships = [i.model_dump() for i in body.internships]
    activities = [a.model_dump() for a in body.activities]
    summary = body.summary.model_dump()

    def _generate_pdf():
        pdf = fitz.open(TEMPLATE_PATH)
        page = pdf[0]
        page.insert_text((160, 205), name or "")
        page.insert_text((135, 230), usn or "")
        page.insert_text((160, 260), mentor_name or "")
        page.insert_text((160, 285), mentor_phone or "")
        page.insert_text((50, 400), temporary_address or "")
        page.insert_text((175, 400), permanent_address or "")
        page.insert_text((330, 425), phone_number or "")
        page.insert_text((425, 425), email or "")
        page.insert_text((70, 595), father_name or "")
        page.insert_text((180, 595), Contact or "")
        page.insert_text((290, 560), Occupation or "")
        page.insert_text((360, 595), mother_name or "")
        page.insert_text((425, 595), Contact_Mother or "")
        page.insert_text((495, 595), Occupation_Mother or "")

        coords = [
            (60, 760),
            (135, 760),
            (190, 760),
            (250, 760),
            (330, 760),
            (390, 760),
            (450, 760),
            (520, 760),
        ]
        for i, sgpa in enumerate(sgpas):
            if i < len(coords):
                page.insert_text(coords[i], str(sgpa or ""))

        page = pdf[1]
        for i, proj in enumerate(projects):
            y = 135 + i * 45
            page.insert_text((105, y), proj.get("company", ""))
            page.insert_text((225, y), proj.get("address", ""))
            page.insert_text((340, y), proj.get("duration", ""))
            page.insert_text((450, y), proj.get("stipend", ""))

        for i, intern in enumerate(internships):
            y = 490 + i * 40
            page.insert_text((105, y), intern.get("company", ""))
            page.insert_text((225, y), intern.get("address", ""))
            page.insert_text((340, y), intern.get("duration", ""))
            page.insert_text((450, y), intern.get("stipend", ""))

        page = pdf[2]
        for i, act in enumerate(activities):
            y = 180 + i * 75
            page.insert_text((105, y), act.get("Sports", ""))
            page.insert_text((215, y), act.get("conference_details", ""))
            page.insert_text((335, y), act.get("papers_published", ""))
            page.insert_text((455, y), act.get("certifications_from_MOOC", ""))

        page.insert_text((90, 645), summary.get("cultural_activities", ""))
        page.insert_text((185, 645), summary.get("co_curricular_activities", ""))
        page.insert_text((280, 645), summary.get("hackathon", ""))
        page.insert_text((370, 645), summary.get("coding_competitions", ""))
        page.insert_text((460, 645), summary.get("other_achievements", ""))

        filename = f"{usn}_{name}_record.pdf"
        pdf_bytes = pdf.write()
        pdf.close()
        file_url = save_file(pdf_bytes, filename, folder="pdfs")
        return file_url

    file_url = await asyncio.get_event_loop().run_in_executor(None, _generate_pdf)
    return {"status": "success", "file": file_url}


@router.get("/files")
async def files():
    if not supabase:
        pdf_names = [f for f in os.listdir(RECORD_UPLOAD_PATH) if f.lower().endswith(".pdf")]
        return pdf_names

    def _list():
        response = supabase.storage.from_(SUPABASE_BUCKET).list("pdfs", {"limit": 1000})
        return [
            f["name"]
            for f in getattr(response, "data", [])
            if f["name"] != ".emptyFolderPlaceholder"
            and f["name"].lower().endswith(".pdf")
        ]

    pdf_names = await asyncio.get_event_loop().run_in_executor(None, _list)
    return pdf_names


@router.get("/download/{filename}")
async def download(filename: str):
    if not supabase:
        filepath = os.path.join(RECORD_UPLOAD_PATH, filename)
        if not os.path.exists(filepath):
            return JSONResponse(content={"error": "File not found"}, status_code=404)
        return FileResponse(filepath, filename=filename)

    def _sign():
        response = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(
            f"pdfs/{filename}", 3600
        )
        signed_url = (
            getattr(response, "data", {}).get("signedURL")
            if hasattr(response, "data")
            else None
        )
        return signed_url

    signed_url = await asyncio.get_event_loop().run_in_executor(None, _sign)
    if not signed_url:
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    return {"file_url": signed_url}


@router.get("/mentor/{mentor_id}/pdfs")
async def list_mentor_pdfs(
    mentor_id: int, request: Request, batch_year: int | None = Query(None)
):
    try:
        by = batch_year or get_batch_year_from_request(request)
        async with bm.session_scope(by) as session:
            student_repo = StudentRepository(session)
            if by:
                mentees = await student_repo.get_mentees_by_mentor_and_batch(
                    mentor_id, by
                )
            else:
                mentees = await student_repo.get_mentees_by_mentor(mentor_id)

        files_list = []
        for mentee in mentees:
            filename = construct_mentee_pdf_name(mentee)
            if supabase:
                url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/pdfs/{filename}"
                try:
                    resp = http_requests.head(url, timeout=5)
                    if resp.status_code == 200:
                        files_list.append(
                            {"usn": mentee.usn, "name": mentee.name, "file_url": url}
                        )
                except http_requests.RequestException:
                    pass
            else:
                local_pdfs = [
                    f for f in os.listdir(RECORD_UPLOAD_PATH) if f.lower().endswith(".pdf")
                ]
                if filename in local_pdfs:
                    files_list.append(
                        {
                            "usn": mentee.usn,
                            "name": mentee.name,
                            "file_url": f"/mentee/download/{filename}",
                        }
                    )
        return files_list
    except Exception:
        logger.exception("List mentor PDFs failed")
        return JSONResponse(content={"error": "Internal server error"}, status_code=500)


@router.get("/mentor/{mentor_id}/download/{usn}")
async def download_mentee_pdf(
    mentor_id: int, usn: str, request: Request, batch_year: int | None = Query(None)
):
    by = batch_year or get_batch_year_from_request(request)
    async with bm.session_scope(by) as session:
        student_repo = StudentRepository(session)
        student = await student_repo.get_auth_by_usn(usn)
        if not student:
            return JSONResponse(content={"error": "Student not found"}, status_code=404)
        if student.mentor_id != mentor_id:
            return JSONResponse(content={"error": "Access denied"}, status_code=403)
        filename = construct_mentee_pdf_name(student)

    if supabase:
        url = (
            f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/pdfs/{filename}"
        )
        try:
            resp = http_requests.head(url, timeout=3)
            if resp.status_code == 200:
                return {"file_url": url}
            else:
                return JSONResponse(content={"error": "PDF not found"}, status_code=404)
        except http_requests.RequestException:
            return JSONResponse(
                content={"error": "Failed to check file"}, status_code=500
            )
    else:
        pdf_names = [f for f in os.listdir(RECORD_UPLOAD_PATH) if f.lower().endswith(".pdf")]
        if filename not in pdf_names:
            return JSONResponse(content={"error": "PDF not found"}, status_code=404)
        return {"file_url": f"/mentee/download/{filename}"}
