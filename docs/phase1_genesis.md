# 🏗️ Phase 1: Genesis & Foundations (July 2025)

## ⏱️ Historical Context & Ideation

AcaTrack was conceived to solve a systemic challenge in academic operations: the tracking and analysis of student grade records. Historically, grade collation at academic institutions relied heavily on manual data entry from complex PDF result sheets published by Visvesvaraya Technological University (VTU). Administrators manually extracted grades into scattered Excel files, leading to high error rates, delayed dashboard updates, and severe bottlenecks in academic audits.

The vision for AcaTrack was simple yet ambitious: build an automated end-to-end platform that extracts grades from academic PDFs, structures them in a central relational database, and exposes intuitive, real-time dashboards for students, staff, and mentors. 

In late July 2025, the foundation of the repository was laid with a strict focus on standardizing development workflows, clean boundary segregation, and rapid prototyping capabilities.

---

## 🏛️ The Day-by-Day Journey of July 2025

### 📅 July 22, 2025: The First Step
The project was officially initialized. The primary repository workspace was created, establishing a clean root environment for all future iterations. The initial repository structure defined the scope of a shared workspace where frontend and backend components would operate.

### 📅 July 23, 2025: Collaboration Standards & Operational Blueprint
Development during this period focused entirely on standardizing collaboration and environment hygiene:
*   **The Collaboration Blueprint**: A detailed operational guide was added to establish clear trunk-based development practices, branch naming conventions, merge request standards, and step-by-step local configuration steps.
*   **Hygiene & Security**: Git ignore lists were configured to keep build artifacts, local environment variables, Python caches, and database files securely quarantined.
*   **Modularization Scoping**: Initial backend configuration files were placed in the root directory, detailing the basic dependencies required to build the early parsing scripts.

### 📅 July 24, 2025: Architectural Decisions & Dual-Stack Initialization
With the blueprint in place, the physical boundaries of the application were permanently separated into dedicated areas:
*   **Frontend Scaffold**: The user interface was initialized using the Vite build system paired with React. This decision was key to providing a lightning-fast Single Page Application (SPA) development feedback loop using Hot Module Replacement (HMR).
*   **Dependency Separation**: The backend dependency registers were migrated from the root directory into a dedicated backend workspace, separating frontend dependencies from Python module managers.
*   **The First Database & Seeding**: The initial SQLite relational database was created. To prepare for student authentication, a custom secure script was built to pre-generate encrypted passwords for the initial student roster, laying the groundwork for secure login mechanisms.

---

## 🛠️ Tech Stack & Early Architectural Decisions

*   **Vite & React (Frontend)**: Chosen instead of classic templating systems to deliver a modern, component-driven user interface. Vite provided exceptional build performance and a minimal bundle footprint.
*   **Python & SQLite (Backend & DB)**: Python was selected for its unparalleled ecosystem of PDF extraction, data transformation, and spreadsheet compilation libraries. SQLite was chosen as the initial zero-configuration database to facilitate rapid data-model changes without migrations.
*   **Workspace Boundaries**: Strict separation between the backend directory and frontend directory ensured that independent deployment paths could be engineered in the future.

---

## 🎯 Phase 1 Status at Month-End

At the close of July 2025, the AcaTrack codebase had successfully achieved its foundational goals:
1.  **Fully Configured Workspace**: Clear physical segregation between the React SPA and the Python backend services.
2.  **Standardized Team Rules**: Established rules for branch rebasing, environment installation, and clean commit standards.
3.  **Active Security Hygiene**: Strictly enforced git exclusion patterns to ensure sensitive database credentials and local build assets remained out of public repositories.
4.  **Initial Auth Seeds**: A functional SQLite database seeded with generated authentication records, setting the stage for user login portals in the coming month.
