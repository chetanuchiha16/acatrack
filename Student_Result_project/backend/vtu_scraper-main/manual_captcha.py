from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

# --- CONFIGURATION ---
DOWNLOAD_DIR = os.path.abspath("VTU_Results")  # Folder to save PDFs
USN_PREFIX = "1JS23CS"
USN_START = 8
USN_END = 25

# Ask user which exam session to fetch
EXAM_SESSION = input("Enter exam session (DJ for Dec-Jan / JJE for Jun-Jul): ").strip().upper()
EXAM_YEAR = input("Enter exam year (last two digits, e.g. 24 for 2024): ").strip()

RESULTS_URL = f"https://results.vtu.ac.in/{EXAM_SESSION}cbcs{EXAM_YEAR}/index.php"

# Create download folder if it doesn't exist
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# --- SELENIUM SETUP ---
def setup_selenium():
    chrome_options = Options()
    
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--start-maximized')
    
    prefs = {
        "download.default_directory": DOWNLOAD_DIR,
        "printing.print_preview_sticky_settings.appState": '{"recentDestinations":[{"id":"Save as PDF","origin":"local"}],"selectedDestinationId":"Save as PDF","version":2}',
        "savefile.default_directory": DOWNLOAD_DIR,
        "profile.default_content_settings.popups": 0,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
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

# --- FETCH RESULTS ---
def fetch_results(usn_number):
    driver = setup_selenium()
    try:
        print(f"\nFetching results for USN: {usn_number}")
        driver.get(RESULTS_URL)
        time.sleep(2)

        # Enter USN
        usn_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "lns"))
        )
        usn_input.send_keys(usn_number)

        # Wait for user to solve CAPTCHA manually
        WebDriverWait(driver, 300).until(
            EC.url_contains("resultpage.php")
        )
        print("CAPTCHA solved, result page loaded.")

        # Click PRINT button to download PDF
        print_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='ಮುದ್ರಣ / PRINT']"))
        )
        print_button.click()
        print("Print button clicked. PDF download started.")
        
        # Wait a few seconds to ensure download
        time.sleep(5)

    except Exception as e:
        print(f"Error fetching results for USN {usn_number}: {e}")
    finally:
        driver.quit()

# --- MAIN FUNCTION ---
def main():
    print(f"\nFetching results from: {RESULTS_URL}")
    usn_list = [f"{USN_PREFIX}{str(i).zfill(3)}" for i in range(USN_START, USN_END + 1)]
    
    for usn in usn_list:
        fetch_results(usn)

    print("\nAll results fetched successfully!")

if __name__ == "__main__":
    main()
