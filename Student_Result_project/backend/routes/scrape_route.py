#scrape_route.py
from flask import Blueprint, request, jsonify
from threading import Thread
import os
import time

from models.webscrape import setup_selenium, RESULTS_URL as BASE_RESULTS_URL, DOWNLOAD_DIR as BASE_DOWNLOAD_DIR
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ---------- Blueprint ----------
webscrape_bp = Blueprint("webscrape", __name__, url_prefix="/webscrape")

# ---------- Helpers ----------
def _fetch_single_result(usn, download_dir, exam_url):
    from selenium.common.exceptions import TimeoutException
    driver = setup_selenium()
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
    except TimeoutException:
        print(f"Timeout fetching results for {usn}")
    except Exception as e:
        print(f"Error fetching {usn}: {e}")
    finally:
        driver.quit()


def _fetch_usn_range(usn_prefix, start, end, exam_session, exam_year, download_dir):
    exam_url = f"https://results.vtu.ac.in/{exam_session}cbcs{exam_year}/index.php"
    os.makedirs(download_dir, exist_ok=True)

    for i in range(start, end + 1):
        usn = f"{usn_prefix}{str(i).zfill(3)}"
        _fetch_single_result(usn, download_dir, exam_url)


# ---------- Routes ----------
@webscrape_bp.route("/fetch-results", methods=["POST"])
def fetch_results_route():
    """
    Expects JSON:
    {
        "usn_prefix": "1JS23CS",
        "usn_start": 8,
        "usn_end": 25,
        "exam_session": "DJ",
        "exam_year": "24",
        "download_dir": "custom/path"  # optional
    }
    """
    data = request.json
    required_fields = ["usn_prefix", "usn_start", "usn_end", "exam_session", "exam_year"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    usn_prefix = data["usn_prefix"]
    start = int(data["usn_start"])
    end = int(data["usn_end"])
    exam_session = data["exam_session"].upper()
    exam_year = str(data["exam_year"])
    download_dir = data.get("download_dir", BASE_DOWNLOAD_DIR)

    # Run scraping in a background thread to avoid blocking Flask
    thread = Thread(target=_fetch_usn_range, args=(usn_prefix, start, end, exam_session, exam_year, download_dir))
    thread.start()

    return jsonify({
        "status": "started",
        "message": f"Fetching results for USNs {usn_prefix}{start:03d} to {usn_prefix}{end:03d} in background.",
        "download_dir": download_dir
    })
