import sqlite3
# Function to fetch data from the database with error handling for missing USN
from models.paths import db_path
sem_subjects = {
    "SEM1": {
        "BMATS101": "Mathematics for CSE Stream-I",
        "BCHES102": "Applied Chemistry for CSE Stream",
        "BCEDK103": "Computer-Aided Engineering Drawing",
        "BENGK106": "Communicative English",
        "BICOK107": "Indian Constitution",
        "BIDTK158": "Innovation and Design Thinking",
        "BESCK104A": "Introduction to Civil Engineering",
        "BETCK105H": "Introduction to Internet of Things (IoT)"
    },
    "SEM2": {
        "BMAT201": "Mathematics for CSE Stream-II",
        "BPHYS202": "Applied Physics for CSE Stream",
        "BPOPS203": "Principles of Programming Using C",
        "BPWSK206": "Professional Writing Skills in English",
        "BKSKK207": "Samskrutika Kannada",
        "BKBKK207": "Balake Kannada",
        "BSFHK258": "Scientific Foundations of Health",
        "BPLCK205B": "Introduction to Python Programming",
        "BESCK204C": "Introduction to Electronics Engineering"
    },
    "SEM3": {
        "BCS301": "Mathematics for Computer Science",
        "BCS302": "Digital Design & Computer Organization",
        "BCS303": "Operating Systems",
        "BCS304": "Data Structures and Applications",
        "BCSL305": "Data Structures Lab",
        "BSCK307": "Social Connect and Responsibility",
        "BNSK359": "National Service Scheme (NSS)",
        "BCS306A": "Object Oriented Programming with Java",
        "BCS358D": "Data Visualization with Python"
    },
    "SEM4": {
        "BCS401": "Analysis & Design of Algorithms",
        "BCS402": "Microcontrollers",
        "BCS403": "Database Management Systems",
        "BCSL404": "Analysis & Design of Algorithms Lab",
        "BBOC407": "Biology for Computer Engineers",
        "BUHK408": "Universal Human Values",
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": "Physical Education or NSS",
        "BCS405B": "Graph Theory",
        "BCSL456D": "Technical Writing using LaTeX"
    },
    "SEM5": {
        "BCS501": "Software Engineering and Project Management",
        "BCS502": "Computer Networks",
        "BCS503": "Theory of Computation",
        "BCSL504": "Web Technology Lab",
        "BAI515A": "Computer Graphics",
        "BCS515B": "Artificial Intelligence",
        "BCS515C": "Unix System Programming",
        "BCS515D": "Distributed Systems",
        "BAIL504": "Data Visualization Lab",
        "BRMK557": "Research Methodology & IPR",
        "BES508": "Environmental Studies",
        "BCS586": "Mini Project",
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": "Physical Education or NSS"
    },
    "SEM6": {
        # Sem 6 subjects not found explicitly; placeholders
        "BCS601": "<Professional Core Course 6-1>",
        "BCS602": "<Professional Core Course 6-2>",
        "BCS603": "<Professional Core Course 6-3>",
        "BCSL604": "<PCCL Lab for Sem 6>",
        "PEC605x": "Professional Elective",
        "OEC606x": "Open Elective",
        "BSK6xx": "Skill Development Activity / NSS / Physical Education"
    },
    "SEM7": {
        "PEC701x": "Professional Elective",
        "PEC702x": "Professional Elective",
        "PEC703x": "Professional Elective",
        "OEC704x": "Open Elective",
        "OEC705x": "Open Elective",
        "PROJ786": "Major Project Phase II"  # includes practical/project work
    },
    "SEM8": {
        "PEC801x": "Professional Elective (Online Courses)",
        "OEC802x": "Open Elective (Online Courses)",
        "INT803": "Internship (Industry / Research / Rural – 14-20 weeks)"
    }
}

def fetch_student_data(usn, semester, db_path=db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Make sure the query uses the correct semester table
        query = f"""
        SELECT *
        FROM {semester}
        WHERE "student_usn" = ?
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
            "subject_name": [sem_subjects[semester].get(code,"unknown_subject") for code in subject_code],
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
    
    print(fetch_student_data("1JS22CS006","SEM1"))
