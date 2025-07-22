# 📊💻 Student_Result_Project

A collaborative student management system project integrating a Tkinter-based frontend with a Flask-powered backend. Built with modularity, teamwork, and practicality in mind.

---

### 👥 Contributors

* Abhishek R
* Adithya V
* Chetan Kishor C G
* Dhanush Singh G
---

### 📦 Tech Stack

* `customtkinter` — for modern UI components
* `Flask` — backend framework
* `Flask-Bcrypt`, `Flask-Session`, `flask-cors` — authentication, sessions, and API support
* `Flask-SQLAlchemy` — ORM integration
* `matplotlib` — data visualizations
* `pandas` — data processing
* `reportlab` — PDF report generation
* `SQLAlchemy` — DB management

---

### 🚀 How to Run

1. Run the backend server:

   ```bash
   cd backend #or open terminal inside backend folder
   python app.py
   ```

2. Launch the frontend:

   ```bash
   cd frontend #or open terminal inside frontend folder
   npm run dev
   ```

---

### 📂 Project Structure

```bash
Student_Result_project/
├── README.md
├── requirements.txt
├── backend/
│   ├── app.py
│   ├── gui/
│   │   ├── events.py
│   │   └── main_window.py
│   ├── Inputs/
│   │   ├── ExcelSheet/
│   │   │   └── result list project.xlsx
│   │   └── Images/
│   │       └── logo.png
│   ├── logic/
│   │   ├── sem_result.py
│   │   ├── student_info.py
│   │   ├── subject_result.py
│   │   └── university_result.py
│   ├── models/
│   │   ├── config.py
│   │   ├── data_prep.py
│   │   ├── fetch.py
│   │   ├── student.py
│   │   ├── subject_results.py
│   │   └── university.py
│   ├── Outputs/
│   │   ├── student_data.db
│   │   ├── Images/
│   │   └── PDFs/
│   ├── tests/
│   │   ├── test_sql.py
│   │   └── print_students.py
│   └── visuals/
│       ├── plot_results.py
│       ├── sem_pdf.py
│       └── university_report.py
├── frontend/
└── structure.txt

```

---

### 🤍 About the Project

This was a group assignment where teamwork, coding, and late-night fixes came together.
Every file, every bug, every solution carries the effort of students learning together.

---

### ✨ Features

* 📊 **Visual Graphs** – Pie charts, bar graphs for individual and subject-wise analysis
* 📄 **PDF Report Generator** – Auto-generates semester & subject reports
* 🧠 **University Comparison** – Compare student performance against university averages
* 📥 **Excel Input** – Easy-to-load structured Excel sheets
* 💾 **SQLite Storage** – All student and result data is persisted and retrievable
* 🌈 **Customtkinter UI** – Modern, themed interface

---