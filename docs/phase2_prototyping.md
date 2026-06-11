# 🛠️ Phase 2: Rapid Feature Prototyping (August 2025)

## ⏱️ Architectural Paradigm: The Monolith Era

August 2025 was defined by rapid, monolithic expansion. The immediate priority was transforming AcaTrack from a static structure into a living web application. Database access in this era was simple: individual Python scripts established local SQLite connections to read and write records on demand. To avoid multi-write blocking issues on a single SQLite file, the team opted to segregate data domains into distinct database containers (such as separate users, teachers, and results databases). 

This approach enabled independent database transactions and extremely fast UI development, setting the stage for AcaTrack’s first complete feature set.

---

## 📅 Chronological Journey of August 2025

### 📅 Early August (August 2 - 5): Standardizing Authentication & User Interfaces
Development began by establishing the basic security wall of the application:
*   **The Login Interface**: The structural interface for user authentication was created, providing a clean, aesthetic form layout.
*   **Role-Based Separation**: Backend and frontend authentication handlers were written to process login credentials, validating security logs, and dividing users into Roles (Student vs Staff). Default redirects were engineered to lead authenticated students to their dashboard and faculty to the administrative panel.
*   **Fallback Pages**: Visual custom fallback screens were added to handle invalid browser directory requests (404 errors) gracefully.

### 📅 Mid-August (August 6 - 8): Collaborative Classrooms & The Staff Dashboard
The system expanded from personal profiles into collaborative spaces:
*   **The Classroom Module**: An interactive Classroom interface was introduced. This enabled instructors to upload lecture files, notes, and course handouts, while allowing students to download them directly from their student dashboards.
*   **🚨 The Tkinter Thread Crash Incident (Notable Messup)**: During early testing of the classroom download flows, the FastAPI server thread froze and crashed completely when specific file routines were triggered. The root cause was identified: importing Tkinter (a local desktop UI library expecting a window manager) in a headless, multi-threaded server. It was resolved immediately by removing all Tkinter references and designing pure programmatic OS-level file transfers.
*   **The Staff Dashboard**: Dhanush Singh G joined the project, building the foundational Staff Dashboard. This allowed teachers to manage classroom lists, track coursework, and oversee grades from a centralized administration panel.

### 📅 The Result Parsing Epoch (August 9 - 11): Parsing and Structuring Academics
This period marked the birth of AcaTrack's core value proposition: automating result management:
*   **Academic Dashboard**: The student results portal was built, complete with custom subcomponents to view subject-specific marks, semester-wise comparisons, and overall GPA trends.
*   **First Generation PDF Parser**: The first iteration of the PDF-to-Excel results extraction parser was constructed in Python. It scanned VTU results packages, processed academic grades, compiled them into a tabular Excel spreadsheet, and saved the result.
*   **Deployment Scoping**: Local tracking folders were cleaned of temporary test files, and dynamic hostable backend API configurations were introduced, allowing the system to run on external staging servers.

### 📅 Security, AI Chatbot & Responsive Design (August 12 - 20): Portal Completeness
The latter half of August was spent hardening the features and ensuring system cohesion:
*   **Auth Session Hardening**: Introduced secure token validation hooks and cookies to lock down admin and student dashboards.
*   **The Early AI Chatbot**: Added the first iteration of the academic chatbot, capable of reading PDF files and answering natural language questions about courses.
*   **Layout Responsiveness**: Overhauled all dashboards to ensure optimal layouts and fluid grids across mobile, tablet, and widescreen monitors.
*   **Mentor Databases**: Engineered the mentors relational schemas to match staff mentors with student cohorts, tracking performance and meeting notes. Standardized global subject name mappings and Excel column naming headers.

---

## 🎯 Phase 2 Status at Month-End

By the end of August 2025, AcaTrack had successfully evolved into a functional multi-user portal:
1.  **Fully Functional Authentication**: Students and Staff logged into separate, tailored dashboards with active session validation.
2.  **Interactive Classroom Sharing**: Faculty uploaded lecture slides and reference notes, which students fetched directly.
3.  **End-to-End Grade Audits**: Administrators successfully uploaded ZIP packages containing VTU results, parsing them into consolidated Excel worksheets.
4.  **Operational Mentorship Schemas**: Early databases mapped mentors to mentees, providing the foundation for professional academic supervision.
