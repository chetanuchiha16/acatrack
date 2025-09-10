from flask import Blueprint, request, jsonify
from threading import Thread
import os
import time
from models.paths import excel_dir
from models.webscrape import setup_selenium  # only need setup_selenium now
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from models import pdftoexcel

# ---------- Blueprint ----------
webscrape_bp = Blueprint("webscrape", __name__, url_prefix="/webscrape")

# Base folder where results will be stored
# BASE_DOWNLOAD_DIR = os.path.abspath("VTU_Results")
BASE_DOWNLOAD_DIR = excel_dir

# ---------- Helpers ----------
def _fetch_single_result(usn, download_dir, exam_url, batch_year):
    from selenium.common.exceptions import TimeoutException
    driver = setup_selenium(download_dir)
    try:
        print(f"Fetching results for USN: {usn}")
        driver.get(exam_url)
        time.sleep(1)

        usn_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "lns"))
        )
        usn_input.send_keys(usn)

        # Wait for user to solve CAPTCHA manually
        WebDriverWait(driver, 300).until(
            EC.url_contains("resultpage.php")
        )
        print(f"CAPTCHA solved for {usn}")

        # Click PRINT button to download PDF
        print_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='ಮುದ್ರಣ / PRINT']"))
        )
        print_button.click()
        print(f"Download triggered for {usn}")
        time.sleep(5)
        # Wait for the PDF to download and rename it
        latest_pdf = pdftoexcel.wait_and_rename_pdf(download_dir, usn)
        # 🔥 Convert the latest PDF only
        latest_pdf = os.path.join(download_dir, f"{usn}.pdf")  # make sure PDF is named by USN
        excel_filename = f"result_list_{batch_year}.xlsx"
        excel_path = os.path.join(excel_dir, excel_filename)

        print(f"Updating Excel at {excel_path} for {usn}...")
        pdftoexcel.process_single_pdf(latest_pdf, excel_path)
        print(f"✅ Excel updated for {usn}")

    except TimeoutException:
        print(f"Timeout fetching results for {usn}")
    except Exception as e:
        print(f"Error fetching {usn}: {e}")
    finally:
        driver.quit()


def _fetch_usn_range(usn_prefix, start, end, exam_session, exam_year, download_dir):
    batch_year = batch_from_usn(usn_prefix)
    exam_url = f"https://results.vtu.ac.in/{exam_session}cbcs{exam_year}/index.php"
    os.makedirs(download_dir, exist_ok=True)

    for i in range(start, end + 1):
        usn = f"{usn_prefix}{str(i).zfill(3)}"
        _fetch_single_result(usn, download_dir, exam_url, batch_year)
        
def batch_from_usn(usn_prefix: str) -> int:
    year_suffix = usn_prefix[3:5]   # "23"
    return 2000 + int(year_suffix)  # 2023

def get_exam_session_and_year(usn_prefix: str, sem: int):
    batch_year = batch_from_usn(usn_prefix)

    if sem % 2 == 1:
        exam_session = "DJ"   # odd sem → Dec–Jan
    else:
        exam_session = "JJE"  # even sem → Jun–Jul

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
        "sem": 1,
        "download_dir": "custom/path"  # optional
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

    download_dir = data.get(
        "download_dir",
        os.path.join(BASE_DOWNLOAD_DIR, f"{batch_year}_SEM{sem}")
    )

    thread = Thread(
        target=_fetch_usn_range,
        args=(usn_prefix, start, end, exam_session, exam_year_suffix, download_dir)
    )
    thread.start()

    return jsonify({
        "status": "started",
        "message": (
            f"Fetching results for batch {batch_year}, sem {sem} → "
            f"{exam_session}{exam_year_suffix}, "
            f"USNs {usn_prefix}{start:03d} to {usn_prefix}{end:03d}"
        ),
        "download_dir": download_dir
    })