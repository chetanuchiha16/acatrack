# from services.university_service import University
# from services.results_service import SubjectResult
# from models.paths import
# #toppers list
# # Create an instance of University and load students
# university = University(db_path=db_path)
# selected_semester = "sem1"
# university.add_students(selected_semester)

# # Generate the toppers list
# toppers_list = university.get_toppers(selected_semester, n=3)  # Get top 3 students

# # Further actions with toppers_list (e.g., display in GUI or save to a file)

# #test failed students
# university = University(db_path="Outputs/student_data.db")
# selected_semester = "sem1"
# university.display_failed_students(selected_semester)

# #test subjectresult class
# university = University("Outputs/student_data.db")
# university.add_students(selected_semester="sem1")

# subject_result = SubjectResult("BMATS101", "sem1", university)

# # Display results
# subject_result.display_subject_results()
# subject_result.fetch_subject_stats()
# # Plot charts
# subject_result.plot_performance_pie_chart()
# subject_result.plot_attendance_pie_chart()

# #test pdf
# '''student = Student(usn="1JS22CS001", semester="sem1", db_path="Outputs/student_data.db")
# create_student_report(student, file_path="student_report_1JS22CS001.pdf")

# university = University(db_path="Outputs/student_data.db")
# university.add_students(selected_semester="sem1")
# create_university_report(university, selected_semester="sem1", file_path="university_report_sem1.pdf")

# university = University(db_path="Outputs/student_data.db")
# university.add_students(selected_semester="sem1")
# subject_result = SubjectResult(subject_code="BMATS101", semester="sem1", university=university)
# create_subject_report(subject_result, file_path="subject_report_BMATS101.pdf")'''
