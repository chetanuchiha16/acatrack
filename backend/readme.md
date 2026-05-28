# ⚡ AcaTrack Backend — FastAPI API Engine

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Rust Core](https://img.shields.io/badge/Rust%20Core-PyO3%20%2F%20Rayon-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![uv](https://img.shields.io/badge/Package%20Manager-uv-F1B04C)](https://github.com/astral-sh/uv)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

AcaTrack Backend is the high-performance, asynchronous REST API engine powering the AcaTrack ecosystem. Rebuilt from a legacy Flask core, it leverages **FastAPI**, **SQLAlchemy 2.0**, **Redis caching**, and a native **Rust parallel PDF parsing core** bridged via PyO3 to provide lightning-fast, secure, and data-rich endpoints.

---

## 🏛️ Architecture & System Integration

The backend serves as the central orchestration layer, managing secure multi-role queries, executing AI predictive analytics, orchestrating email/messaging channels, and handling high-speed parallel result data ingestion.

```mermaid
graph TB
    subgraph Client ["Client Layer"]
        UI["React + Vite UI"]
        SDK["HeyAPI TypeScript SDK"]
    end

    subgraph Core ["FastAPI Backend Application"]
        Router["API Routers (backend.routes)"]
        Service["Service Layer (backend.services)"]
        Repo["Repository Layer (backend.repositories)"]
        AI_Eng["AI Predictive Engine"]
    end

    subgraph Data ["Data & Caching Layer"]
        DB[(Supabase PostgreSQL)]
        Cache[(Redis - In-Memory Cache)]
        Storage["Supabase Storage (PDFs)"]
    end

    subgraph External ["External Integrations"]
        Firebase["Firebase Admin SDK (Auth/Cloud Messages)"]
        SMTP["SMTP Email Gateway"]
    end

    UI <--> SDK
    SDK <--> Router
    Router <--> Service
    Service <--> Repo
    Repo <--> DB
    Service <--> Cache
    Service <--> AI_Eng
    Service <--> Storage
    Service <--> Firebase
    Service <--> SMTP
```

---

## 🌟 Core Architectural Features

*   **Asynchronous Core**: Fully non-blocking event-driven execution using FastAPI, built on top of `uvloop` and `httptools` for maximal requests-per-second (RPS) processing capacity.
*   **High-Performance Rust Core**: Integrates with our custom compiled native Rust parallel engine (`acatrack-pdf-parser-rs` via PyO3 & Rayon) to run multi-threaded result parsing, bypassing Python GIL bottlenecks to achieve a **38.4x ingestion speedup** (parsing 1,300+ PDFs in under 34 seconds).
*   **Dual-Tier Ingestion**: Combines background task processing (`FastAPI.BackgroundTasks`) with local extraction validation to process bulk result ZIP archives instantly.
*   **Optimized Redis Caching**: Caches expensive, multi-semester student analytics, university-wide averages, and SGPA trends, reducing average response latency down to **158 ms**.
*   **Layered Design Pattern**: Implements a clean separation of concerns using a **Controller-Service-Repository** pattern, which guarantees testability, extensibility, and maintainable DB queries.
*   **Firebase Authentication & RBAC**: Enforces strict Attribute-Based and Role-Based Access Control (RBAC) across four user roles: **Student, Parent, Staff/Mentor, and Admin**, verified via Firebase JWT tokens.
*   **AI Predictive Analysis**: Implements Ridge regression models to project future cumulative GPA (CGPA) and runs semantic assessment algorithms to generate custom placement advice, study roadmaps, and fuzzy search queries for chatbot assistants.

---

## 📂 Backend Project Structure

```text
backend/
├── migrations/          # Alembic database migration files and scripts
├── models/              # DB Models
│   ├── schema.py        # SQLAlchemy 2.0 database tables & models
│   └── paths.py         # Static filesystem paths mapping configuration
├── repositories/        # Database Access Layer (Data Access Objects)
│   ├── academic_repository.py
│   ├── admin_repository.py
│   ├── mentor_repository.py
│   ├── parent_repository.py
│   ├── student_repository.py
│   └── university_repository.py
├── routes/              # FastAPI Router Controllers (Endpoint Handlers)
│   ├── admin_routes.py  # Admin panels & bulk ingestion
│   ├── auth.py          # JWT Session validation
│   ├── excel.py         # Bulk Excel imports (students/subjects)
│   ├── parent.py        # Parental ward mapping
│   ├── student_ai.py    # AI Chatbot & summary generation
│   └── ... (role controllers)
├── services/            # Core Business Logic Layer
│   ├── academic_service.py
│   ├── admin_service.py
│   ├── ai_algorithms.py
│   ├── auth_service.py
│   ├── pdf_service.py   # High-speed PDF ingestion & Rust bridge
│   ├── student_ai_service.py
│   └── ... (operational services)
├── utils/               # Common Utility helpers
│   ├── cloud.py         # Supabase Storage client integrations
│   ├── grading.py       # CGPA/SGPA grade calculator helper
│   ├── helpers.py       # Common string, list & datetime operations
│   └── visuals.py       # Performance chart generator (Matplotlib)
├── validators/          # Input schema and payload validators
├── tests/               # Pytest unit and integration test suite
├── app.py               # Compatibility shim (runs main.py via uvicorn)
├── main.py              # Application entrypoint & lifespan events
├── pyproject.toml       # Python package, toolchain & dependency manifest
├── settings.py          # Pydantic BaseSettings environment loader
└── uv.lock              # Lockfile for precise package reproducibility
```

---

## ⚙️ Environment Configuration

The backend uses Pydantic-Settings to load and validate configurations from a local `.env` file. A template is provided in `.env.example`.

### Core Configuration Keys

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Supabase / PostgreSQL async connection string. |
| `REDIS_URL` | `redis://localhost:6379/0` | Connection string for Redis caching. |
| `FIREBASE_CRED_PATH`| `firebase-service-account.json` | Absolute or relative path to your Firebase Admin SDK credentials. |
| `SECRET_KEY` | `your-jwt-signing-secret` | Internal JWT signing and verification key. |
| `ADMIN_SECRET` | `your-admin-bypass-key` | Special bypass secret for administrative backend triggers. |
| `SUPABASE_URL` | `https://your-project.supabase.co`| API gateway URL for your Supabase cloud project. |
| `SUPABASE_KEY` | `your-supabase-service-role-key` | Service role key for Supabase Storage manipulation. |
| `SUPABASE_BUCKET` | `academic-reports` | Cloud storage bucket name for mentee PDF and spreadsheet archives. |
| `EMAIL_PASS` | `smtp-app-password` | SMTP app password for automated email dispatches. |
| `A_EMAIL` | `noreply@acatrack.com` | Outgoing email dispatcher address. |
| `CORS_ALLOWED_ORIGINS`| `http://localhost:5173,http://localhost:3000` | Comma-separated list of web clients allowed to connect. |

---

## 🚀 Setting Up & Running Locally

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   Python **3.12+**
*   **uv** (recommended for ultra-fast, robust virtualenv management)
*   Redis server (running locally on port `6379`)
*   PostgreSQL / Supabase instance

### 2. Dependency Installation
Create a localized virtual environment and install all packages locked in `uv.lock` by running:
```bash
# Install dependencies using uv
uv sync

# Or alternatively use the Makefile helper from root
make install
```

### 3. Running Database Migrations
AcaTrack uses Alembic to manage database changes. Apply migrations or seed the schema directly using the utility handler:
```bash
# Run migrations using alembic
uv run alembic upgrade head

# At startup, the server also auto-ensures schema synchronization:
# backend/database.py -> create_tables()
```

### 4. Running the Development Server
Launch the FastAPI uvicorn daemon locally:
```bash
# Directly with uvicorn (on port 5000)
uv run uvicorn main:app --host 0.0.0.0 --port 5000 --reload

# Or use the backward-compatibility shim
uv run python app.py

# Or use the project Makefile from root
make backend
```
The API documentation will be instantly accessible at **[http://localhost:5000/docs](http://localhost:5000/docs)**.

---

## 🛠️ Developer Workflows

### 🧪 Running Tests
Run the comprehensive suite of unit, integration, and mock tests:
```bash
# Run full suite
uv run pytest

# Run with verbose logs
uv run pytest -v
```

### 🧹 Linting & Formatting
Ensure strict styling and rule conformance before pushing commits (configured with `Ruff`):
```bash
# Check code syntax and styling violations
uv run ruff check .

# Automatically apply safe styling fixes and format the codebase
uv run ruff check . --fix
uv run ruff format .
```

### 📝 Exporting OpenAPI Documentation
To synchronize the frontend SDK types, you can dump the current OpenAPI schema into a static JSON descriptor:
```bash
uv run python export_openapi.py
```

---

## 🚀 API Documentation & Endpoints

All endpoints are logically split across routers in `backend/routes/`. Below is a comprehensive catalog of active endpoints:

### 1. Authentication & Session Management
Enforces secure token-based logins, JWT validation, credentials tracking, and role verification.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/auth` | `POST` | JSON: `who` (role), `username`, `password`, `batch_year` | Authenticates user and returns JWT credentials. |
| `/auth/status` | `GET` | Header: `Authorization: Bearer <token>` | Validates active session token and returns context role & details. |
| `/batches` | `GET` | None | Retrieves a list of active batch years defined in the system. |
| `/auth/forgot/request` | `POST` | JSON: `username` (USN / Email) | Generates and dispatches a secure password reset token via email. |
| `/auth/forgot/reset/{token}` | `POST` | Path: `token`, JSON: `password` | Updates authentication credentials using an unexpired recovery token. |
| `/logout` | `POST` | None | Terminates active server-side session. |
| `/student/{usn}/fcm-token` | `POST` | Path: `usn`, JSON: `fcm_token` | Registers/updates student FCM token for cloud messages. |

### 2. Student & Parent Services
Provides endpoints tailored to students requesting performance figures, grade lists, progress cards, and parents monitoring ward updates.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/auth/Student/result` | `GET` | Query: `usn`, `semester` | Computes semester grades and returns Base64-encoded result card PDF. |
| `/auth/Student/report/{filename}`| `GET` | Path: `filename` | Serves direct downloads for student PDF result reports. |
| `/auth/Student/notes` | `GET` | Query: `path` (folder path) | Lists lecture notes and shared learning materials for the student's batch. |
| `/auth/Student/notes/{file_path:path}`| `GET` | Path: `file_path` | Streams a specific PDF learning material. |
| `/parent/student-details` | `GET` | Header: JWT Token | Decrypts parent session and yields details for linked student and assigned mentor. |

### 3. Mentorship & Meetings
Allows academic mentors to organize schedules, broadcast alerts, schedule student follow-ups, and review student record folders.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/auth/Staff/Mentor/meeting/{mentor_id}` | `GET` | Path: `mentor_id` | Lists all past and upcoming meetings logged by a specific mentor. |
| `/auth/Staff/Mentor/meeting/{mentor_id}` | `POST` | Path: `mentor_id`, JSON: `title`, `venue`, `agenda`, `date` | Creates a mentorship meeting and sends push/email alerts to all mentees. |
| `/auth/Staff/Mentor/meeting/delete/{meeting_id}`| `DELETE` | Path: `meeting_id` | Deletes a previously logged mentorship meeting. |
| `/auth/Student/Mentee/meeting/{student_usn}` | `GET` | Path: `student_usn` | Displays all recorded meetings scheduled for a specific student. |
| `/mentee/upload_form` | `POST` | JSON: Personal/Academic history details | Aggregates student detail record form into a structured PDF and uploads to cloud. |
| `/mentee/files` | `GET` | None | Lists all uploaded student record sheets. |
| `/mentee/download/{filename}` | `GET` | Path: `filename` | Downloads an uploaded student record sheet. |
| `/mentee/mentor/{mentor_id}/pdfs` | `GET` | Path: `mentor_id` | Yields storage endpoints for all uploaded PDF records of the mentor's mentees. |
| `/mentee/mentor/{mentor_id}/download/{usn}`| `GET` | Path: `mentor_id`, `usn` | Streams or downloads a specific mentee's record PDF folder. |
| `/auth/Staff/Mentor/result` | `GET` | Query: `mentor_id`, `semester`, `batch_year` | Fetches grades and results lists for all mentees assigned to a mentor. |
| `/auth/Staff/Mentor/report/{filename}`| `GET` | Path: `filename` | Serves direct academic reports for a mentor's mentees. |
| `/auth/Staff/Mentor/chart` | `GET` | Query: `usn`, `semester`, `batch_year` | Returns a Base64-encoded student performance graph. Enforces access checks. |

### 4. Direct Communication & Notes
Standardizes email broadcasts, announcements, lecture notes, and internal messaging queues.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/send-email/all` | `POST` | JSON: `recipientType` (Student/Parent), `subject`, `message` | Broadcasts emails to all students/parents in a batch. |
| `/send-email/student` | `POST` | JSON: `usn`, `recipientType`, `subject`, `message` | Sends a direct email to a single student/parent. |
| `/messages` | `POST` | JSON: `usn`, `recipientType`, `subject`, `message` | Stores a message in the system logs. |
| `/messages` | `GET` | None | Retrieves lists of logged messages. |
| `/messages/{msg_id}` | `DELETE` | Path: `msg_id` | Deletes a logged database message. |
| `/mentor/{mentor_id}/students` | `GET` | Path: `mentor_id` | Lists all students assigned to a specific mentor. |
| `/mentor/{mentor_id}/messages` | `GET` | Path: `mentor_id` | Lists messages registered under a specific mentor. |
| `/mentor/{mentor_id}/messages` | `POST` | Path: `mentor_id`, JSON: `usn`, `recipientType`, `subject`, `message` | Registers a logged message sent by a specific mentor. |
| `/mentor/{mentor_id}/send-email/student`| `POST` | Path: `mentor_id`, JSON: `usn`, `recipientType`, `subject`, `message` | Sends a mentor-directed email to a specific student. |
| `/mentor/{mentor_id}/send-email/all` | `POST` | Path: `mentor_id`, JSON: `recipientType`, `subject`, `message` | Sends custom email broadcasts from a mentor to their assigned mentees. |
| `/mentor/{mentor_id}/messages/{msg_id}`| `DELETE` | Path: `mentor_id`, `msg_id` | Deletes a logged mentor message. |
| `/student/{usn}/messages` | `GET` | Path: `usn` | Retrieves historical lists of direct messages and alerts sent to the student. |
| `/student/{usn}/messages/{msg_id}` | `GET` | Path: `usn`, `msg_id` | Retrieves a single message. |
| `/student/{usn}/messages/{msg_id}/read`| `POST` | Path: `usn`, `msg_id` | Marks a specific communication item as read in the student's logs. |
| `/auth/Staff/upload_notes` | `GET` | Query: `path` (folder path filter) | Lists lecture notes uploaded by teachers to Supabase Storage. |
| `/auth/Staff/upload_notes` | `POST` | Form-data: `file` (PDF), `path` (folder path) | Uploads new lecture notes and study material folders to the batch space. |

### 5. AI Engine & Predictive Insights
Integrates machine learning modeling and generative translation engines to predict grades and offer custom feedback.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/auth/Student/analysis` | `GET` | Query: `usn`, `semester` | Provides granular, subject-level advice and projects the next semester's SGPA. |
| `/ai/summary` | `GET` | Query: `usn`, `lng` | Summarizes multi-semester performance trends in clear, translated natural language. |
| `/ai/trend` | `GET` | Query: `usn` | Analyzes performance slope (Improving, Stable, or Declining) and average SGPA. |
| `/ai/predict_cgpa` | `GET` | Query: `usn` | Fits historical marks onto a Ridge regression model to forecast final CGPA. |
| `/ai/profile` | `GET` | Query: `usn`, `lng` | Recommends industry-specific placement prep guides and learning paths. |

### 6. Administrative Operations & Ingestion
Restricted endpoints for importing datasets, triggering raw VTU parser background scripts, and compiling university-wide aggregates.

| Endpoint | Method | Input Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/pdftoexcel/upload` | `POST` | Form-data: `file` (ZIP), `excel_filename` | Spawns background job running PyO3 Rust parsers to ingest bulk result PDFs. |
| `/pdftoexcel/status/{job_id}`| `GET` | Path: `job_id` | Polls the current percentage and processing logs of a parser job. |
| `/excel` | `POST` | Form-data: `file` (Excel) | Bulk-imports student metadata and subject allocation worksheets. |
| `/excel/template.xlsx` | `GET` | None | Downloads a standardized Excel formatting template. |
| `/auth/Staff/sem_res` | `GET` | Query: `semester` | Aggregates results of all subjects in a semester for stats. |
| `/auth/Staff/sem_res/report/{semester}`| `GET`| Path: `semester` | Renders and downloads semester-wide aggregate results report PDF. |
| `/auth/Staff/sub_res` | `GET` | Query: `subject_code`, `semester` | Fetches results for a specific subject. |
| `/auth/Staff/sub_res/report` | `GET` | None | Downloads subject results report PDF. |
| `/auth/Staff/overall_res` | `GET` | Query: `semester`, `show_toppers`, `show_failed` | Compiles university statistics, topper leaderboards, and failure lists. |
| `/auth/Staff/report/{semester}` | `GET` | Path: `semester` | Compiles and downloads a comprehensive university-wide results PDF report. |
| `/webscrape/fetch-results` | `POST` | JSON: `FetchResultsRequest` | **[Deprecated]** Deprecation warning pointing clients to VTU Desktop client. |
| `/admin/health` | `GET` | None | Checks admin module scope and status. |
| `/admin/list-batches` | `GET` | None | Lists database batches in the cluster. |
| `/admin/create-batch` | `POST` | JSON: `batch_year` | Creates a new academic batch year database. |
| `/admin/init-batch` | `POST` | JSON: `batch_year` | Initializes base tables and config values for a batch. |
| `/admin/enroll-students` | `POST` | JSON: `enrollments` | Maps student records to active courses. |
| `/admin/assign-subjects` | `POST` | JSON: `assignments` | Assigns sections and subjects to specific teachers. |
| `/admin/list-assignments` | `GET` | Query: `batch_year` | Lists all active teacher-subject-section assignments. |
| `/admin/unassign-subject/{assignment_id}`| `DELETE`| Path: `assignment_id` | Removes an active teacher subject assignment. |

---

> [!NOTE]
> All API schemas and payload models are strictly validated at runtime using **Pydantic v2**. For detailed JSON schemas of request/response payloads, check `/openapi.json` at the root, or view the `/docs` UI.

