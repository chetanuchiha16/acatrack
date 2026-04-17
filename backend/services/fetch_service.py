from logger_config import get_logger

logger = get_logger(__name__)

# Function to fetch data from the database with error handling for missing USN
sem_subjects = {
    "sem1": {
        "BMATS101": "Mathematics for CSE Stream-I",
        "BCHES102": "Applied Chemistry for CSE Stream",
        "BCEDK103": "Computer-Aided Engineering Drawing",
        "BENGK106": "Communicative English",
        "BICOK107": "Indian Constitution",
        "BIDTK158": "Innovation and Design Thinking",
        "BESCK104A": "Introduction to Civil Engineering",
        "BETCK105H": "Introduction to Internet of Things (IoT)",
        "BESCK104C": "Introduction TO Electronics Engineering",
        "BPLCK105B": "Introduction TO to Python Programming",
    },
    "sem2": {
        "BMAT201": "Mathematics for CSE Stream-II",
        "BMATS201": "Mathematics-II for CSE Stream",
        "BPHYS202": "Applied Physics for CSE Stream",
        "BPOPS203": "Principles of Programming Using C",
        "BPWSK206": "Professional Writing Skills in English",
        "BKSKK207": "Samskrutika Kannada",
        "BKBKK207": "Balake Kannada",
        "BSFHK258": "Scientific Foundations of Health",
        "BPLCK205B": "Introduction to Python Programming",
        "BESCK204C": "Introduction to Electronics Engineering",
        "BESCK204D": "Introduction To Mechanical Engineering",
        "BETCK205H": "Introduction to Internet of Things (IoT)",
    },
    "sem3": {
        "BCS301": "Mathematics for Computer Science",
        "BCS302": "Digital Design & Computer Organization",
        "BCS303": "Operating Systems",
        "BCS304": "Data Structures and Applications",
        "BCSL305": "Data Structures Lab",
        "BSCK307": "Social Connect and Responsibility",
        "BNSK359": "National Service Scheme (NSS)",
        "BCS306A": "Object Oriented Programming with Java",
        "BCS358D": "Data Visualization with Python",
    },
    "sem4": {
        "BCS401": "Analysis & Design of Algorithms",
        "BCS402": "Microcontrollers",
        "BCS403": "Database Management Systems",
        "BCSL404": "Analysis & Design of Algorithms Lab",
        "BBOC407": "Biology for Computer Engineers",
        "BUHK408": "Universal Human Values",
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": "Physical Education or NSS",
        "BCS405B": "Graph Theory",
        "BCSL456D": "Technical Writing using LaTeX",
    },
    "sem5": {
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
        "BPEK459_PhysicalEducation_OR_BNSK459_NSS_": "Physical Education or NSS",
    },
    "sem6": {
        # Sem 6 subjects not found explicitly; placeholders
        "BCS601": "<Professional Core Course 6-1>",
        "BCS602": "<Professional Core Course 6-2>",
        "BCS603": "<Professional Core Course 6-3>",
        "BCSL604": "<PCCL Lab for Sem 6>",
        "PEC605x": "Professional Elective",
        "OEC606x": "Open Elective",
        "BSK6xx": "Skill Development Activity / NSS / Physical Education",
    },
    "sem7": {
        "PEC701x": "Professional Elective",
        "PEC702x": "Professional Elective",
        "PEC703x": "Professional Elective",
        "OEC704x": "Open Elective",
        "OEC705x": "Open Elective",
        "PROJ786": "Major Project Phase II",  # includes practical/project work
    },
    "sem8": {
        "PEC801x": "Professional Elective (Online Courses)",
        "OEC802x": "Open Elective (Online Courses)",
        "INT803": "Internship (Industry / Research / Rural - 14-20 weeks)",
    },
}


SEMESTERS = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6"]


def safe_int(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return 0  # or None if you want to indicate missing marks


def fetch_student_data(usn, semester, batch_year, engine):
    """
    Fetch student data from the normalized PostgreSQL tables.
    Returns a dictionary of relevant info, mapping the old JSON schema.
    """
    try:
        from utils.sync_db import db
        from models.schema import AcademicResult, StudentAuth, Subject

        # Fetch student base
        student_rec = StudentAuth.query.filter_by(usn=usn).first()
        if not student_rec:
            return None

        # Fetch results joined with subjects for the semester
        results = (
            db.session.query(AcademicResult, Subject)
            .join(Subject, AcademicResult.subject_code == Subject.subject_code)
            .filter(
                AcademicResult.student_id == student_rec.id,
                Subject.semester == semester.lower().strip(),
            )
            .all()
        )

        if not results:
            return None

        subject_code = []
        subject_name = []
        ia_marks = []
        see_marks = []
        credits = []

        for res, sub in results:
            subject_code.append(sub.subject_code)
            subject_name.append(
                sub.subject_name
                or sem_subjects.get(semester, {}).get(sub.subject_code, "Unknown")
            )
            ia_marks.append(res.ia_marks or 0)
            see_marks.append(res.see_marks or 0)
            credits.append(sub.credits or 0)

        return {
            "name": student_rec.name or "Unknown",
            "usn": student_rec.usn,
            "subject_code": subject_code,
            "subject_name": subject_name,
            "ia_marks": ia_marks,
            "see_marks": see_marks,
            "credits": credits,
        }

    except Exception as e:
        logger.debug(f"Database error occurred in fetch_student_data: {e}")
        return None


if (__name__) == ("__main__"):
    # test the above function
    """student_data = fetch_student_data('1JS22CS001')  # Replace with a valid USN
    if student_data:
        logger.debug(student_data)
    else:
        logger.debug("No data found for the specified USN.")"""

    # logger.debug(fetch_student_data("1JS22CS006","sem1"))
