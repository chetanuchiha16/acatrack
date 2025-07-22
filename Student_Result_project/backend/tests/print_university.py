from models import University

#temp function to print university class data
def test_university_class(selected_semester, db_path="Outputs/student_data.db"):
    try:
        # Initialize the University class
        university = University(db_path=db_path)

        # Add all students from the database
        university.add_students(selected_semester)

        # Display all students and their semester details (optional, for debugging)
        university.display_students()

        # Calculate academic performance for all students in the selected semester
        result = university.calculate_academic_performance_by_semester(selected_semester, db_path=db_path)

        # Display the results in the terminal (optional, for debugging)
        print(f"\n=== Calculating Academic Performance for Semester: {selected_semester} ===")
        print(result)
        
        # Plot total marks for all students
        print("\n=== Plotting Total Marks for All Students ===")
        fig = university.plot_student_totals(selected_semester)
        #fig.show()

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    # Example usage
    test_university_class(selected_semester="SEM3", db_path="Outputs/student_data.db")