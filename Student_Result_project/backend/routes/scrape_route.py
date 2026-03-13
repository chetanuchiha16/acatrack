from flask import Blueprint, request, jsonify
from threading import Thread
import os
import time
from services.scraper import setup_selenium
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from models import pdftoexcel
from utils.cloud import (
    upload_pdf_to_supabase,
    upload_excel_to_supabase,
    download_excel_from_supabase,
    excel_exists_in_supabase
)
import tempfile
from logger_config import get_logger
import logging

logger = get_logger(__name__)
logging.getLogger("pdfminer").setLevel(logging.WARNING)


# ---------- Blueprint ----------
webscrape_bp = Blueprint("webscrape", __name__, url_prefix="/webscrape")


# ---------- Helpers ----------
def _fetch_single_result(usn, exam_url, batch_year, sem):
    from selenium.common.exceptions import TimeoutException
    pdf_folder = f"{batch_year}/{batch_year}_SEM{sem}"
    excel_folder = f"{batch_year}"
    with tempfile.TemporaryDirectory() as tmpdir:
        driver = setup_selenium(tmpdir)
        try:
            logger.debug(f"Fetching results for USN: {usn}")
            driver.get(exam_url)
            time.sleep(1)
            usn_input = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, "lns"))
            )
            usn_input.send_keys(usn)
            WebDriverWait(driver, 300).until(
                EC.url_contains("resultpage.php")
            )
            logger.debug(f"CAPTCHA solved for {usn}")
            print_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//input[@value='ಮುದ್ರಣ / PRINT']"))
            )
            print_button.click()
            logger.debug(f"Download triggered for {usn}")
            time.sleep(5)
            logger.debug(f"Files in tmpdir after download: {os.listdir(tmpdir)}")

            latest_pdf = pdftoexcel.wait_and_rename_pdf(tmpdir, usn)
            local_pdf = os.path.join(tmpdir, f"{usn}.pdf")
            logger.debug(f"local_pdf: {local_pdf}")

            # Confirm file exists before upload
            if os.path.exists(local_pdf):
                try:
                    pdf_url = upload_pdf_to_supabase(local_pdf, f"{usn}", pdf_folder)
                    logger.debug(f"PDF uploaded to Supabase: {pdf_url}")
                except Exception as e:
                    logger.error(f"PDF upload failed: {e}")
            else:
                logger.error(f"PDF file not found for {usn} in {tmpdir}")
                return

            excel_filename = f"result_list_{batch_year}.xlsx"

            # Download (and update) existing Excel or start new.
            if excel_exists_in_supabase(excel_filename, excel_folder):
                local_excel = download_excel_from_supabase(excel_filename, excel_folder)
                tmp_excel_path = os.path.join(tmpdir, excel_filename)
                # Copy downloaded Excel to workspace, so as not to edit cloud copy in place
                import shutil
                shutil.copy(local_excel, tmp_excel_path)
                local_excel = tmp_excel_path
            else:
                local_excel = os.path.join(tmpdir, excel_filename)

            logger.debug(f"Updating Excel at {local_excel} for {usn}...")
            pdftoexcel.process_single_pdf(local_pdf, local_excel)

            try:
                excel_url = upload_excel_to_supabase(local_excel, excel_filename, excel_folder)
                logger.debug(f"Excel uploaded to Supabase: {excel_url}")
            except Exception as e:
                logger.error(f"Excel upload failed: {e}")

            logger.debug(f"✅ Uploaded/updated Excel for {usn}")

        except TimeoutException:
            logger.debug(f"Timeout fetching results for {usn}")
        except Exception as e:
            logger.debug(f"Error fetching {usn}: {e}")
        finally:
            driver.quit()

def _fetch_usn_range(usn_prefix, start, end, exam_session, exam_year, sem):
    batch_year = batch_from_usn(usn_prefix)
    exam_url = f"https://results.vtu.ac.in/{exam_session}cbcs{exam_year}/index.php"
    for i in range(start, end + 1):
        usn = f"{usn_prefix}{str(i).zfill(3)}"
        _fetch_single_result(usn, exam_url, batch_year, sem)

def batch_from_usn(usn_prefix: str) -> int:
    year_suffix = usn_prefix[3:5]
    return 2000 + int(year_suffix)

def get_exam_session_and_year(usn_prefix: str, sem: int):
    batch_year = batch_from_usn(usn_prefix)
    if sem % 2 == 1:  # odd sem
        exam_session = "DJ"
        exam_year = batch_year + (sem // 2) + 1
    else:
        exam_session = "JJE"
        exam_year = batch_year + (sem // 2)
    exam_year_suffix = str(exam_year)[-2:]
    return exam_session, exam_year_suffix, batch_year

# ---------- Routes ----------
@webscrape_bp.route("/fetch-results", methods=["POST"])
def fetch_results_route():
    """
    Expects JSON:
    {
        "usn_prefix": "1JS23CS",
        "usn_start": 8,
        "usn_end": 25,
        "sem": 1
    }
    """
    data = request.json
    required_fields = ["usn_prefix", "usn_start", "usn_end", "sem"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    usn_prefix = data["usn_prefix"].upper()
    start = int(data["usn_start"])
    end = int(data["usn_end"])
    sem = int(data["sem"])
    exam_session, exam_year_suffix, batch_year = get_exam_session_and_year(usn_prefix, sem)

    thread = Thread(
        target=_fetch_usn_range,
        args=(usn_prefix, start, end, exam_session, exam_year_suffix, sem)
    )
    thread.start()
    return jsonify({
        "status": "started",
        "message": (
            f"Fetching results for batch {batch_year}, sem {sem} → "
            f"{exam_session}{exam_year_suffix}, "
            f"USNs {usn_prefix}{start:03d} to {usn_prefix}{end:03d}"
        )
    })
