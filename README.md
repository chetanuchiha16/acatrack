# 📊💻 Student_Result_Project (Legacy & Evolution)

Originally developed as a collaborative student management system, this repository now serves as the **active solo continuation** of the project. I am currently refactoring the legacy architecture to improve scalability and performance.

---

### 🛠 Project Evolution
* **Phase 1 (Collaborative):** Initial MVP build with the original team.
* **Phase 2 (Solo Maintenance):** Active evolution focused on architectural integrity:
    * **Database Normalization:** Redesigning schemas for better data integrity.
    * **Performance Tuning:** Identifying and resolving **N+1 query issues**.
    * **Resource Management:** Optimizing database engine usage to prevent connection pool exhaustion.
    * **UI/UX Refinement:** Modernizing components for a smoother user experience.
### 👥 Original Core Contributors (Legacy)
* **Lead Maintainer:** Chetan Kishor C G
* **Collaborators:** Abhishek R, Dhanush Singh G, Adithya V
---

### 📦 Tech Stack

#### 🖼️ **Frontend**

* `React` — component-based UI library
* `Vite` — fast frontend tooling and development server
* `Tailwind CSS` — utility-first CSS framework for styling
* `Axios` — for making API requests to the backend
* `i18next` — for multi-language support (English, Hindi, Kannada)
* `Firebase` — for cloud integration and messaging

#### 🔧 **Backend**

* `Flask` — backend framework
* `Flask-Bcrypt`, `Flask-Session`, `flask-cors` — authentication, sessions, and API support
* `Flask-SQLAlchemy` — ORM integration
* `Firebase Admin` — for secure backend cloud services

#### 📊 **Data Handling & Visuals**

* `matplotlib` — data visualizations
* `pandas` — data processing
* `reportlab` — PDF report generation
* `scikit-learn` & `transformers` — for student analysis and AI insights
* `Selenium` — for automated university data scraping

#### 🗃️ **Database**

* `SQLAlchemy` — database management
* `PostgreSQL` support

---

### ✨ Features (Updated)

* 📊 **Visual Graphs** — Pie charts and bar graphs for individual and subject-wise analysis.
* 📄 **PDF Report Generator** — Auto-generates semester & subject reports.
* 🤝 **Comprehensive Mentorship System** — Integrated mentor-mentee tracking, including meeting logs, record filling, and direct email communication.
* 👨‍👩‍👧 **Parent Portal** — Dedicated dashboard for parents to monitor student progress and view results.
* 🤖 **AI Chatbot & Insights** — Intelligent assistant providing student performance analysis and automated query responses.
* 🌐 **Multi-language Support** — Full localization support for English, Hindi, and Kannada.
* 📝 **Notes Management** — A secure platform for teachers to upload and share study materials with students.
* 🛠️ **Admin Panel** — Centralized management interface for system administrators.
* 🧠 **University Comparison** — Compare student performance against university averages.
* 📥 **Excel & PDF Tools** — Easy loading of Excel sheets and tools for converting PDF results into structured data.

---

### ✨ Prerequisites

Make sure the following are installed on your system:

* **Python 3.10+** – [Download here](https://www.python.org/downloads/)
* **Node.js (v18 or above)** – [Download here](https://nodejs.org/en/download)
> 💡 This includes `npm`, which is used to install frontend dependencies



---

### 🚀 How to Run

1. Run the backend server:
```bash
cd backend  # or open terminal inside backend folder
uv sync         # to install all required dependencies
uv run python app.py

```


2. Launch the frontend:
```bash
cd frontend         # or open terminal inside frontend folder
npm install         # install frontend dependencies (only needed once)
npm run dev

```



---

### 📂 Project Structure (Major Directories)

* `backend/routes/` — Contains API logic for Auth, Mentorship, AI, and Results.
* `backend/models/` — Database schemas and core logic for data preparation and scraping.
* `backend/visuals/` — Scripts for generating PDF reports and performance graphs.
* `frontend/src/` — React components for Student, Teacher, Mentor, and Parent interfaces.
* `frontend/src/locales/` — Translation files for multi-language support.

---

### 🤍 About the Project & Evolution
This project began as a group assignment where teamwork, coding, and late-night fixes came together. Every file and every solution carries the shared effort of students learning the ropes of full-stack development together.

Current Status: While the foundation was built in collaboration with the original team, this repository is now being independently maintained and evolved by me. I am currently treating the original codebase as a "Legacy System"—refining the logic, squashing remaining bugs, and implementing better architecture to take the initial prototype to a professional standard.
