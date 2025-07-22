from logic import display_student_info
# from gui import build_app



def on_submit(widgets):
    usn = widgets["usn_entry"].get()
    semester = widgets["semester_dropdown"].get()
    display_student_info(usn, semester, widgets["info_text"], widgets["student_info_graph"])
    widgets["tabview"].set("Student Info")

# Function to update subject dropdown based on the selected semester
def update_subject_dropdown(selected_semester, widgets):
    # Clear the subject code dropdown
    widgets["subjectwise_subject_dropdown"].set("")  # Reset selection
    # Update values based on selected semester
    if selected_semester in widgets["semester_subject_mapping"]:
        widgets["subjectwise_subject_dropdown"].configure(values=widgets["semester_subject_mapping"][selected_semester])


