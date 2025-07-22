import sqlite3
# Function to fetch data from the database with error handling for missing USN
from models.config import db_path
def fetch_student_data(usn, semester, db_path=db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Make sure the query uses the correct semester table
        query = f"""
        SELECT *
        FROM {semester}
        WHERE "Subject_Code_USN" = ?
        """
        cursor.execute(query, (usn,))
        rows = cursor.fetchall()
        conn.close()

        # Check if rows are found
        if not rows:
            return None  # Return None if no data is found for the USN in that semester

        # Extract data from the row
        student_data = rows[0]

        # Extracting internal marks, external marks, and credits
        subject_code=[]
        ia_marks = []
        see_marks = []
        credits = []

        # Iterate through the columns to extract marks and credits
        for i in range(2, len(student_data)):  # Start from the 3rd column (index 2)
            column_name = cursor.description[i][0]  # Get the column name

            # Only check columns that contain marks or credits
            if 'INTERNALS' in column_name:
                ia_marks.append(student_data[i])
                subject_code.append(column_name.split('_')[0])
            elif 'EXTERNALS' in column_name:
                see_marks.append(student_data[i])
            elif 'CREDITS' in column_name:
                credits.append(student_data[i])

        return {
            "name": student_data[1],  # Student Name
            "usn": usn,
            "subject_code": subject_code,
            "ia_marks": ia_marks,
            "see_marks": see_marks,
            "credits": credits,
        }

    except sqlite3.Error as e:
        print(f"Database error occurred in fetch.py : {e}")
        return None
    
if(__name__) == ("__main__"):
        #test the above function
    '''student_data = fetch_student_data('1JS22CS001')  # Replace with a valid USN
    if student_data:
        print(student_data)
    else:
        print("No data found for the specified USN.")'''
