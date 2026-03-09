Originally developed as a collaborative student management system, this repository now serves as the **active solo continuation** of the project. The core application logic and assets are located within the [`Student_Result_project`]directory.

I am currently refactoring the legacy architecture to improve scalability and performance, focusing on moving from a monolithic project to a professional-grade system.

---

### 🛠 Project Evolution
* **Phase 1 (Collaborative):** Initial MVP build with the original team.
* **Phase 2 (Solo Maintenance):** Active evolution focused on architectural integrity:
    * **Database Normalization:** Decoupling `students`, `subjects`, and `results` from fixed semester tables for dynamic scalability.
    * **State-Driven Authentication:** Refactored staff login to utilize a dynamic batch filter in the dashboard rather than a static login selection.
    * **Performance Tuning:** Identifying and resolving **N+1 query issues** and optimizing database engine usage.
    * **UI/UX Refinement:** Modernizing the Parent Dashboard and Academic result displays (SGPA/CGPA accuracy).
### 👥 Original Core Contributors (Legacy)
* **Lead Maintainer:** Chetan Kishor C G
* **Collaborators:** Abhishek R, Dhanush Singh G, Adithya V
---

### 📦 Tech Stack

#### 🖼️ **Frontend**

* `React` — Component-based UI library
* `Vite` — Fast frontend tooling and development server
* `Tailwind CSS` — Utility-first CSS framework (v4 integration)
* `Zustand` — Lightweight state management
* `React Router` — Client-side routing for multi-page feel
* `Axios` — API request handling
* `i18next` — Multi-language support (English, Hindi, Kannada)
* `Web-LLM` — On-device LLM integration for AI features
* `Firebase` — Cloud messaging and integration

#### 🔧 **Backend**

* `Flask` — Micro-backend framework
* `Flask-SQLAlchemy` & `Alembic` — ORM and database migrations
* `Flask-Caching` — Performance optimization through caching
* `Supabase` — Backend-as-a-Service integration for data and auth
* `Flask-Bcrypt`, `Flask-Session`, `flask-cors` — Secure auth and API support
* `Firebase Admin` — Secure backend cloud services

#### 📊 **Data Handling & Visuals**

* `matplotlib` — Data visualizations
* `pandas` & `openpyxl` — Advanced data processing and Excel handling
* `reportlab` & `PyMuPDF` — PDF report generation and parsing
* `scikit-learn` & `transformers` — Student analysis and AI insights
* `Deep Translator` — Automated multi-language content translation
* `Selenium` — Automated university data scraping

#### 🗃️ **Database**

* `SQLAlchemy` — Database management
* `PostgreSQL` & `Redis` support

#### 🛠️ **DevOps & Tooling**

* `uv` — Ultra-fast Python package installer and resolver
* `Makefile` — Standardized task automation
* `k6` — Performance and load testing
* `pytest` — Comprehensive backend testing suite

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
* ⚡ **Performance Optimized** — Built-in benchmarking and load testing to ensure system reliability.

---

### 🛠️ Development & Workflow

The project includes a `Makefile` in the [`Student_Result_project`] directory to simplify common tasks.

#### **Recommended Workflow (via Makefile)**

Inside the `Student_Result_project` directory, run:

| Command | Action |
| :--- | :--- |
| `make install` | Install all backend (uv) and frontend (npm) dependencies |
| `make run` | Launch both backend and frontend servers concurrently |
| `make backend` | Start only the Flask backend server |
| `make frontend` | Start only the Vite frontend server |
| `make test` | Run the backend test suite |
| `make load-test` | Execute performance load tests using `k6` |
| `make clean` | Purge cache files and virtual environments |

---

### ✨ Prerequisites

Make sure the following are installed on your system:

* **Python 3.10+** – [Download here](https://www.python.org/downloads/)
* **Node.js (v18 or above)** – [Download here](https://nodejs.org/en/download)
> 💡 This includes `npm`, which is used to install frontend dependencies



---

### 🚀 Manual Execution (Alternative)

If you prefer running commands manually without the Makefile:

1. **Backend**:
```bash
cd Student_Result_project/backend
uv sync
uv run python app.py
```

2. **Frontend**:
```bash
cd Student_Result_project/frontend
npm install
npm run dev
```

---

### 🧪 Testing & Performance

The project leverages **k6** for load testing and **pytest** for backend verification.

* **Load Testing**: Located at `Student_Result_project/load_testv2.js`. Run via `make load-test`.
* **Benchmarking**: `benchmarkv2.py` monitors database performance and query efficiency.



---

### 📂 Project Structure (Major Directories)

* `Student_Result_project/backend/routes/` — Contains API logic for Auth, Mentorship, AI, and Results.
* `Student_Result_project/backend/models/` — Database schemas and core logic for data preparation and scraping.
* `Student_Result_project/backend/visuals/` — Scripts for generating PDF reports and performance graphs.
* `Student_Result_project/frontend/src/` — React components for Student, Teacher, Mentor, and Parent interfaces.
* `Student_Result_project/frontend/src/locales/` — Translation files for multi-language support.

---

### 🤍 About the Project & Evolution
This project began as a group assignment where teamwork, coding, and late-night fixes came together. Every file and every solution carries the shared effort of students learning the ropes of full-stack development together.

Current Status: While the foundation was built in collaboration with the original team, this repository is now being independently maintained and evolved by me. I am currently treating the original codebase as a "Legacy System"—refining the logic, squashing remaining bugs, and implementing better architecture to take the initial prototype to a professional standard.
