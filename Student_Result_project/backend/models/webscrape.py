from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

# --- SELENIUM SETUP ---
def setup_selenium(download_dir: str):
    """Initialize Selenium Chrome driver with a custom download directory."""
    os.makedirs(download_dir, exist_ok=True)

    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--start-maximized')

    # Configure downloads + PDF auto-saving
    prefs = {
        "download.default_directory": download_dir,
        "savefile.default_directory": download_dir,
        "profile.default_content_settings.popups": 0,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "printing.print_preview_sticky_settings.appState": (
            '{"recentDestinations":[{"id":"Save as PDF","origin":"local"}],'
            '"selectedDestinationId":"Save as PDF","version":2}'
        ),
        "printing.default_destination_selection_rules": {
            "kind": "local",
            "namePattern": "Save as PDF"
        }
    }
    chrome_options.add_experimental_option("prefs", prefs)
    chrome_options.add_argument('--kiosk-printing')

    driver_path = ChromeDriverManager().install()
    service = Service(driver_path)
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver


# --- FETCH SINGLE RESULT ---
def fetch_single_result(usn: str, download_dir: str, exam_session: str, exam_year: str):
    """Fetch result PDF for a single USN."""
    RESULTS_URL = f"https://results.vtu.ac.in/{exam_session}cbcs{exam_year}/index.php"
    driver = setup_selenium(download_dir)
    try:
        print(f"Fetching results for USN: {usn}")
        driver.get(RESULTS_URL)
        time.sleep(2)

        # Input USN
        usn_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "lns"))
        )
        usn_input.send_keys(usn)

        # Wait for CAPTCHA to be solved manually
        WebDriverWait(driver, 300).until(EC.url_contains("resultpage.php"))
        print(f"CAPTCHA solved for {usn}")

        # Click PRINT button
        print_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='ಮುದ್ರಣ / PRINT']"))
        )
        print_button.click()
        time.sleep(5)
        print(f"Download triggered for {usn}")

    except Exception as e:
        print(f"Error fetching {usn}: {e}")
    finally:
        driver.quit()


# --- FETCH RANGE OF USNs ---
def fetch_usn_range(usn_prefix: str, start: int, end: int, exam_session: str, exam_year: str, download_dir: str):
    """Fetch result PDFs for a range of USNs."""
    os.makedirs(download_dir, exist_ok=True)
    for i in range(start, end + 1):
        usn = f"{usn_prefix}{str(i).zfill(3)}"
        fetch_single_result(usn, download_dir, exam_session, exam_year)
