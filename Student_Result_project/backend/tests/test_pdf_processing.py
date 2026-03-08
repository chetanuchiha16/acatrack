import os
import sys
from models.pdftoexcel import process_single_pdf
import traceback

def main():
    try:
        pdf_path = os.path.abspath("test.pdf")
        output_xlsx = os.path.abspath("test_output.xlsx")
        
        if not os.path.exists(pdf_path):
            print(f"Error: Could not find {pdf_path}")
            return
            
        print(f"Processing {pdf_path}...")
        process_single_pdf(pdf_path, output_xlsx)
        
        if os.path.exists(output_xlsx):
            print(f"Success! Output created at {output_xlsx}")
        else:
            print("Finished processing but output Excel was not generated.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
