import customtkinter as ctk
from logic import test_university_class
from logic import test_university_class
from logic import display_subjectwise_result
from logic import display_semesterwise_results
from gui.events import update_subject_dropdown, on_submit

def build_app():
    # Main window setup
    widgets = {}
    root = ctk.CTk()
    root.title("JSS Academy Of Technical Education Bengaluru-560060")
    root.geometry("900x600")
    widgets["root"] = root

    title_label = ctk.CTkLabel(root, text="JSS Academy Of Technical Education Bengaluru-560060", font=("Arial", 20, "bold"))
    title_label.pack(pady=20)

    tabview = ctk.CTkTabview(root, width=850, height=500)
    tabview.pack(expand=True, fill="both", padx=20, pady=10)

    widgets["tabview"] = tabview

    # Home Tab
    home_tab = tabview.add("Home")
    home_tab.grid_rowconfigure([0, 1, 2, 3], weight=1)  # Configure rows for alignment
    home_tab.grid_columnconfigure(0, weight=1)  # Center align content in the column

    # Buttons in Home Tab (closer spacing)
    student_result_button = ctk.CTkButton(home_tab, text="Student Result", command=lambda: tabview.set("Enter USN"))
    student_result_button.grid(row=0, rowspan=4,column=0, pady=5, padx=20, sticky="n")


    overall_result_button = ctk.CTkButton(home_tab, text="Overall Result", command=lambda: tabview.set("Overall Result"))
    overall_result_button.grid(row=1,rowspan=4, column=0, pady=5, padx=20, sticky="n")

    subjectwise_result_button = ctk.CTkButton(home_tab, text="Subject-wise Result", command=lambda: tabview.set("Subject-wise Result"))
    subjectwise_result_button.grid(row=2, rowspan=4,column=0, pady=5, padx=20, sticky="n")

    sem_result_button = ctk.CTkButton(home_tab, text="Sem Result", command=lambda: tabview.set("Sem Result"))
    sem_result_button.grid(row=3, rowspan=4,column=0, pady=5, padx=20, sticky="n")

    # Enter USN Tab
    usn_tab = tabview.add("Enter USN")
    usn_tab.grid_rowconfigure(0, weight=1)
    usn_tab.grid_columnconfigure(0, weight=1)

    usn_label = ctk.CTkLabel(usn_tab, text="Enter USN:")
    usn_label.grid(row=0, column=0, pady=10)

    usn_entry = ctk.CTkEntry(usn_tab)
    usn_entry.grid(row=1, column=0, pady=10)
    widgets["usn_entry"] = usn_entry

    semester_label = ctk.CTkLabel(usn_tab, text="Select Semester:")
    semester_label.grid(row=2, column=0, pady=10)

    semester_dropdown = ctk.CTkOptionMenu(usn_tab, values=["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6", "SEM7", "SEM8"])
    semester_dropdown.grid(row=3, column=0, pady=10)

    submit_button = ctk.CTkButton(usn_tab, text="Submit", command= lambda: on_submit(widgets))
    submit_button.grid(row=4, column=0, pady=20)

    # Overall Result Tab
    # Overall Result Tab
    overall_result_tab = tabview.add("Overall Result")
    overall_result_tab.grid_rowconfigure(0, weight=1)
    overall_result_tab.grid_rowconfigure(1, weight=1)
    overall_result_tab.grid_columnconfigure(0, weight=1)
    overall_result_tab.grid_columnconfigure(1, weight=1)

    semester_label_overall = ctk.CTkLabel(overall_result_tab, text="Select Semester for Academic Performance:")
    semester_label_overall.grid(row=0, column=0, pady=10, columnspan=2)

    semester_dropdown_overall = ctk.CTkOptionMenu(overall_result_tab, values=["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6", "SEM7", "SEM8"])
    semester_dropdown_overall.grid(row=1, column=0, pady=10, columnspan=2)

    overall_submit_button = ctk.CTkButton(overall_result_tab, text="Submit and save PDF", command=lambda: test_university_class(semester_dropdown_overall.get(), overall_result_text, overall_result_graph, tabview,))
    overall_submit_button.grid(row=2, column=0, pady=10, columnspan=2)

    # Add a button for generating the toppers list in the same tab
    toppers_button = ctk.CTkButton(
        overall_result_tab,
        text="Toppers List",
        command=lambda: test_university_class(semester_dropdown_overall.get(), overall_result_text, overall_result_graph, tabview, show_toppers=True)
    )
    toppers_button.grid(row=2, column=1, pady=10)

    overall_result_text = ctk.CTkTextbox(overall_result_tab, width=400, height=300)
    overall_result_text.grid(row=3, column=0, pady=10, padx=10, sticky="nsew")
    overall_result_text.configure(state="disabled")

    overall_result_graph = ctk.CTkFrame(overall_result_tab, width=400, height=300)
    overall_result_graph.grid(row=3, column=1, pady=10, padx=10, sticky="nsew")

    # Add a button for showing failed students and their subjects
    failed_button = ctk.CTkButton(
        overall_result_tab,
        text="Failed Students List",
        command=lambda: test_university_class(semester_dropdown_overall.get(), overall_result_text, overall_result_graph, tabview, show_failed=True)
    )
    failed_button.grid(row=2, column=2, pady=10)

    #semwise
    # For Treeview if CTkTreeview is unavailable

    # Define the tab
    semwise_tab = tabview.add("Sem Result")
    semwise_tab.grid_rowconfigure(0, weight=1)
    semwise_tab.grid_rowconfigure(1, weight=1)
    semwise_tab.grid_rowconfigure(3, weight=5)
    semwise_tab.grid_columnconfigure(0, weight=1)
    semwise_tab.grid_columnconfigure(1, weight=1)

    # Dropdown for selecting semester
    semester_label_semwise = ctk.CTkLabel(semwise_tab, text="Select Semester for Academic Performance:")
    semester_label_semwise.grid(row=0, column=0, pady=10, columnspan=2)

    semester_label_semwise = ctk.CTkOptionMenu(
        semwise_tab, 
        values=["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6", "SEM7", "SEM8"]
    )
    semester_label_semwise.grid(row=1, column=0, pady=10, columnspan=2)

    # Mapping for semesters and subject codes
    semester_subject_mapping = {
        "SEM1": ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BESCK104A", "BETCK105H"],
        "SEM2": ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BSFHK258", "BPLCK205B", "BESCK204C"],
        "SEM3": ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
        "SEM4": ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B"]
    }

    # Submit button to display semester-wise results
    semwise_submit_button = ctk.CTkButton(
        semwise_tab, 
        text="Submit and Display Results",
        command=lambda: display_semesterwise_results(semester_label_semwise.get(), semesterwise_result_table, semester_subject_mapping)
    )
    semwise_submit_button.grid(row=2, column=0, pady=10, columnspan=2)



    # Treeview table for displaying semester-wise results
    semesterwise_result_table = ctk.CTkFrame(semwise_tab, width=400, height=300)
    semesterwise_result_table.grid(row=3, column=0, pady=10, padx=10, sticky="nsew")

    # Graph display area
    semwise_graph = ctk.CTkFrame(semwise_tab, width=400, height=300)
    semwise_graph.grid(row=3, column=1, pady=10, padx=10, sticky="nsew")



    # Subject-wise Result Tab
    subjectwise_result_tab = tabview.add("Subject-wise Result")
    subjectwise_result_tab.grid_rowconfigure(0, weight=1)
    subjectwise_result_tab.grid_rowconfigure(1, weight=1)
    subjectwise_result_tab.grid_rowconfigure(2, weight=1)
    subjectwise_result_tab.grid_rowconfigure(3, weight=2)  # Allocate more space for results and graphs
    subjectwise_result_tab.grid_columnconfigure(0, weight=1)
    subjectwise_result_tab.grid_columnconfigure(1, weight=1)

    # Dropdown to select semester
    #subjectwise_semester_label = ctk.CTkLabel(subjectwise_result_tab, text="Select Semester:")
    #subjectwise_semester_label.grid(row=0, column=0, pady=10, padx=10)

    subjectwise_semester_dropdown = ctk.CTkOptionMenu(
        subjectwise_result_tab,
        values=list(semester_subject_mapping.keys()),
        command= lambda selected_semester: update_subject_dropdown(selected_semester, widgets)  # Link update function here
    )
    widgets["semester_subject_mapping"] = semester_subject_mapping
    subjectwise_semester_dropdown.grid(row=0, column=0, columnspan=2, pady=10,sticky="N")
    subjectwise_semester_dropdown.set("Select semester")  # Set to empty initially

    # Dropdown to select subject code
    #subjectwise_subject_label = ctk.CTkLabel(subjectwise_result_tab, text="Select Subject Code:")
    #subjectwise_subject_label.grid(row=1, column=0, pady=10, padx=10)

    subjectwise_subject_dropdown = ctk.CTkOptionMenu(subjectwise_result_tab, values=[])
    subjectwise_subject_dropdown.grid(row=1, column=0, columnspan=2, pady=10,sticky="N")
    subjectwise_subject_dropdown.set("Select subject code")

    widgets["subjectwise_subject_dropdown"] = subjectwise_subject_dropdown
    # Submit button for subject-wise result
    subjectwise_submit_button = ctk.CTkButton(
        subjectwise_result_tab,
        text="Submit and save PDF", 
        command= lambda: display_subjectwise_result(
            subjectwise_semester_dropdown, 
            subjectwise_subject_dropdown, 
            subjectwise_result_graph, 
            subjectwise_result_text
        )
    )
    widgets["semester_dropdown"] = semester_dropdown
    subjectwise_submit_button.grid(row=2, column=0, columnspan=2, pady=10,sticky="N")

    # Textbox to display results
    subjectwise_result_text = ctk.CTkTextbox(subjectwise_result_tab, width=400, height=300)
    subjectwise_result_text.grid(row=3, column=0, pady=10, padx=10,sticky="nsew")
    subjectwise_result_text.configure(state="disabled")

    # Frame to display subject-wise graphs (Performance and Attendance Pie Charts)
    subjectwise_result_graph = ctk.CTkFrame(subjectwise_result_tab, width=400, height=300)
    subjectwise_result_graph.grid(row=3, column=1, pady=10, padx=10,sticky="nsew")

    # Configure the graph frame for displaying two charts side by side
    subjectwise_result_graph.grid_rowconfigure(0, weight=0)
    subjectwise_result_graph.grid_columnconfigure(0, weight=1)
    subjectwise_result_graph.grid_columnconfigure(1, weight=1)


    # Student Info Tab
    # Student Info Tab
    student_info_tab = tabview.add("Student Info")
    student_info_tab.grid_rowconfigure(0, weight=1)
    student_info_tab.grid_columnconfigure(0, weight=1)
    student_info_tab.grid_columnconfigure(1, weight=1)


    info_text = ctk.CTkTextbox(student_info_tab, width=400, height=300)
    info_text.grid(row=0, column=0, pady=10, padx=10, sticky="nsew")
    info_text.configure(state="disabled")
    widgets["info_text"] = info_text

    student_info_graph = ctk.CTkFrame(student_info_tab, width=400, height=300)
    student_info_graph.grid(row=0, column=1, pady=10, padx=10, sticky="nsew")
    widgets["student_info_graph"] = student_info_graph

    return {
        "root":root,
        "usn_entry":usn_entry,
        "semester_dropdown":semester_dropdown,
        "info_text":info_text,
        "student_info_graph":student_info_graph,
        "tab_view":tabview,
        "subjectwise_subject_dropdown":subjectwise_subject_dropdown,
        "semester_subject_mapping": semester_subject_mapping
        
    }
