from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
import tempfile
import os
from logger_config import get_logger
from utils.cloud import upload_excel_to_supabase, download_excel_from_supabase
from utils.helpers import get_batch_year_from_request

logger = get_logger(__name__)

router = APIRouter(tags=["excel"])


@router.post("/excel")
async def excel(request: Request, file: UploadFile = File(...)):
    batch_year = get_batch_year_from_request(request)

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        try:
            folder = f"{batch_year}"
            excel_name = f"result_list_{batch_year}.xlsx"
            import asyncio
            cloud_url = await asyncio.get_event_loop().run_in_executor(
                None, upload_excel_to_supabase, tmp.name, excel_name, folder
            )
            message = "File uploaded successfully"
        except Exception:
            cloud_url = None
            message = "File uploaded but cloud storage is currently unavailable."
            logger.exception("Cloud upload failed during manual excel upload")

    try:
        os.remove(tmp.name)
    except Exception:
        pass

    return {"message": message, "excel_cloud_url": cloud_url}


@router.get("/excel/template.xlsx")
async def get_template(request: Request):
    batch_year = get_batch_year_from_request(request)
    excel_name = f"result_list_{batch_year}.xlsx"
    folder = f"{batch_year}"
    try:
        import asyncio
        local_path = await asyncio.get_event_loop().run_in_executor(
            None, download_excel_from_supabase, excel_name, folder
        )
        from fastapi.responses import FileResponse
        return FileResponse(
            local_path,
            filename=excel_name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception:
        logger.exception(f"Failed to download template: {excel_name}")
        return JSONResponse(content={"error": "Template not found or unavailable."}, status_code=404)
