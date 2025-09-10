# VTU Results Scraper and PDF to Excel Converter

This repository contains two primary Python scripts:

1. **VTU Results Scraper**: A Selenium-based tool that automates the process of fetching VTU (Visvesvaraya Technological University) results by entering a series of USNs (University Seat Numbers), downloading the result PDFs, and saving them to a specified folder.
2. **PDF to Excel Converter**: A script that extracts data from multiple result PDFs, processes the information, and converts it into an Excel sheet for further analysis.

## Table of Contents
- [Requirements](#requirements)
- [Setup](#setup)
- [VTU Results Scraper](#vtu-results-scraper)
  - [Features](#features)
  - [Usage](#usage)
- [PDF to Excel Converter](#pdf-to-excel-converter)
  - [Usage](#usage)
- [License](#license)

---

## Requirements

- Python 3.x
- Google Chrome (for VTU Results Scraper)
- Brave browser (if used, requires specific configuration)
- Installed dependencies as listed in `requirements.txt`:
  - `selenium`
  - `pandas`
  - `webdriver_manager`
  - `pdfplumber`
  - `openpyxl`

You can install these by running:
```bash
pip install -r requirements.txt
```

---

## Setup

Before using the tools, ensure you have the correct setup:
1. **Selenium WebDriver**: ChromeDriver is required to automate the browser. The script will automatically download and configure it using `webdriver_manager`.
2. **Tesseract** (optional): For CAPTCHA solving (if you opt to use OCR-based automation instead of manual input).

---

## VTU Results Scraper

### Features
- Automates the process of entering USNs on the VTU results website.
- Downloads result PDFs and stores them in a designated folder.
- Supports iterating over multiple USNs.
- Bypasses CAPTCHA by allowing the user to manually enter it on the website (currently no automated CAPTCHA solving).

### Usage
1. Run the scraper script:
   ```bash
   python vtu_scraper.py
   ```
2. Enter the CAPTCHA manually in the browser window.
3. Add custom path to a directory where you want pdfs to be stored. Comments in the code indicate where the path must be added

#### Customization
- You can modify the range of USNs by adjusting the loop in the `main()` function:
   ```python
   def main():
       for i in range(1, 26):
           usn = f'1BI22VL{str(i).zfill(3)}'
           fetch_results(usn)
   ```

---

## PDF to Excel Converter

### Features
- Processes downloaded VTU result PDFs and extracts data using `pdfplumber`.
- Saves the extracted data to a structured Excel sheet for easy viewing and analysis.

### Usage
1. Run the script:
   ```bash
   python pdf_to_excel.py
   ```
2. The script will read the PDFs from your custom directory on your local device and generate an Excel sheet with the extracted data.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
