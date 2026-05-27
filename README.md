# 🎓 AcaTrack: Academic Performance Tracking & Analytics System

AcaTrack is a comprehensive, full-stack academic management platform designed to provide real-time insights into student performance. Originally developed as a collaborative student management system, it has evolved into a professional-grade analytics engine featuring AI-driven insights, automated data ingestion, and multi-role dashboards.

> [!NOTE]
> This repository serves as the **active solo continuation** and architectural refactor of the original project. It focuses on performance, scalability, and modern engineering practices.

> [!IMPORTANT]
> **Scraper Decoupling**: The legacy server-side Selenium-based scraper has been deprecated and completely migrated to our standalone, high-performance desktop application: **[VTU Result Scraper](https://github.com/chetanuchiha16/result-scraper)**. This eliminates CAPTCHA, browser rendering, and server-side CPU bottlenecks.

---

### 🏗️ System Architecture

```mermaid
graph TD
    subgraph Desktop ["Local Desktop client (Go + Wails)"]
        Scraper["[result-scraper](https://github.com/chetanuchiha16/result-scraper)"]
    end

    subgraph Client ["Frontend (React + Vite)"]
        UI[User Interface]
        Store[Zustand State]
    end

    subgraph API ["Backend (FastAPI)"]
        Router[FastAPI Routers]
        Service[Business Logic Services]
        AI_Remote[Transformers/ML Models]
    end

    subgraph Data ["Data Layer"]
        DB[(PostgreSQL - Supabase)]
        Cache[(Redis - Caching)]
        Files[Supabase Storage]
    end

    subgraph External ["External Services"]
        Firebase[Firebase - Auth/Messaging]
    end

    Scraper -- Exports PDF ZIP Bundle --> UI
    UI -- Ingests ZIP Archive --> Router
    UI <--> Router
    Router <--> Service
    Service <--> DB
    Service <--> Cache
    Service <--> AI_Remote
    Service <--> Firebase
```

---

### 🛠️ Project Evolution

AcaTrack has undergone a significant architectural transformation to reach its current state:

*   **Phase 1 (Collaborative)**: Full-stack academic management system built with the original team — [Group-Projects](https://github.com/chetanuchiha16/Group-Projects)
*   **Phase 2 (Solo Refactor)**: Active evolution focused on professional-grade integrity:
    *   **FastAPI Migration**: Replaced the legacy Flask core with **FastAPI** for asynchronous performance and automatic OpenAPI documentation.
    *   **Database Normalization**: Decoupling `students`, `subjects`, and `results` from fixed semester tables for dynamic, multi-year scalability.
    *   **SDK-Driven Frontend**: Implemented automated client SDK generation via **HeyAPI**, ensuring 100% type safety between backend and frontend.
    *   **Strict Type Safety**: Migrated the entire frontend to **TypeScript** with strict null checks and centralized interface definitions.
    *   **State-Driven Authentication**: Refactored staff login to utilize a dynamic batch filter in the dashboard, replacing static legacy selections.
    *   **Performance Engineering**: Integrated **Redis caching**, resolved N+1 query issues, and switched to **uv** for lightning-fast package resolution.
    *   **High-Performance Standalone Rust Core**: Extracted, modularized, and published our native parallel **Rust PDF parsing engine ([acatrack-pdf-parser-rs](https://github.com/chetanuchiha16/acatrack-pdf-parser-rs))** directly to **PyPI**, delivering a **38.4x** ingestion speedup (from 21.78 min down to 34.06 seconds for 1,300+ documents) with zero local compiler toolchain dependencies.
    *   **UI/UX Modernization**: Transitioned to a **Bento-box dashboard layout**, implemented **code-splitting** (React.lazy), and redesigned result views with Lucide icons.
    *   **Containerization**: Implemented **Docker** and **Docker Compose** for standardized deployment across all environments.

---

### 👥 Role-Based Access Control (RBAC)

AcaTrack provides specialized interfaces for four key stakeholders:

*   **👨‍🎓 Student Portal**: View academic results (SGPA/CGPA), track progress via visual graphs, download **auto-generated PDF reports**, access shared study materials, and receive personalized AI insights.
*   **👨‍👩‍👧 Parent Portal**: Secure access for parents to monitor their ward's academic standing, attendance trends, and semester-wise results in real-time.
*   **🤝 Mentor/Staff Dashboard**: Manage student groups, log mentorship meetings, fill student records, **upload study materials**, and communicate via integrated email services.
*   **🛡️ Admin Panel**: Centralized control for user management, batch data processing, university data scraping, and system configuration.

> [!TIP]
> **Localization**: The platform provides full multi-language support for **English, Hindi, and Kannada**, ensuring accessibility for a diverse user base.

---

### 🤖 AI & Predictive Analytics

AcaTrack integrates advanced AI capabilities to move beyond simple data storage:

*   **Smart Performance Prediction**: Machine learning models analyze historical data to predict future performance trends and identify at-risk students early.
*   **Automated Insights**: Backend-driven AI (Transformers/ML) provides natural language summaries of academic results and suggests personalized study focus areas.
*   **University Benchmarking**: Intelligent comparison engine to evaluate student and subject performance against **university-wide averages** and historical trends.

---

### 📥 Data Processing Pipeline

The system features robust tools for handling complex academic data:

*   **Standalone Desktop Scraping**: Leverage our dedicated, native Go + Wails cross-platform **[VTU Result Scraper](https://github.com/chetanuchiha16/result-scraper)** for high-volume local scraping, effortless CAPTCHA resolution, and local PDF packaging.
*   **PDF to Data Conversion**: Blazing-fast parallel extraction using our custom compiled, standalone **Rust engine ([acatrack-pdf-parser-rs](https://github.com/chetanuchiha16/acatrack-pdf-parser-rs) via PyO3 & Rayon)**, published directly to **PyPI** for zero-dependency high-speed ingestion.
*   **Excel Ingestion**: Bulk upload capabilities for student records, staff lists, and subject mappings with automated validation.

---

### 📦 Tech Stack

#### **Frontend**
*   **Framework**: `React` (with TypeScript)
*   **Build Tool**: `Vite` — Blazing fast HMR and optimized builds.
*   **Styling**: `Tailwind CSS v4` — Utility-first styling with modern CSS features.
*   **State Management**: `Zustand` — Minimalistic and scalable state handling.
*   **Networking**: `Axios` with generated SDK via `HeyAPI`.

#### **Backend**
*   **Framework**: `FastAPI` — High-performance Python web framework.
*   **High-Performance Core**: `Rust` bridged via `PyO3` & `Rayon` for multi-threaded parallel PDF parsing.
*   **Package Manager**: `uv` — Ultra-fast Python package installer and resolver.
*   **Server**: `Uvicorn` with `uvloop` and `httptools`.
*   **ORM**: `SQLAlchemy 2.0` with `Alembic` for migrations.
*   **Caching**: `Redis` for optimized API response times.
*   **AI/ML**: `Transformers`, `scikit-learn`, and `pandas`.

#### **Infrastructure & Services**
*   **Database**: `PostgreSQL` (hosted via **Supabase**).
*   **Reporting**: `Matplotlib` (visuals) and `ReportLab`/`PyMuPDF` (PDF generation).
*   **DevOps**: `Docker` & `Docker Compose`.

---

### 🛠️ Development & Workflow

The project uses a `Makefile` to standardize common operations across the stack.

| Command | Action |
| :--- | :--- |
| `make install` | Install all backend (`uv`) and frontend (`npm`) dependencies. |
| `make run` | Launch both FastAPI and Vite servers concurrently. |
| `make backend` | Start the FastAPI development server (port 5000). |
| `make frontend` | Start the Vite development server. |
| `make test` | Run the comprehensive backend test suite. |
| `make benchmark` | Execute database and query performance benchmarks. |
| `make load-test` | Run high-concurrency performance tests using `k6`. |
| `make docker-up` | Spin up the entire stack using Docker Compose. |
| `make clean` | Purge cache files and virtual environments. |

---

### 🚀 Getting Started

#### **Prerequisites**
*   **Python 3.10+** (managed via `uv` recommended)
*   **Node.js (v18+)**
*   **Docker** (optional, for containerized execution)

#### **Manual Execution**

1.  **Environment Setup**:
    Copy the `.env.example` files in both `backend/` and `frontend/` and fill in your credentials.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```

2.  **Installation**:
    ```bash
    make install
    ```

3.  **Run Development Servers**:
    ```bash
    make run
    ```

---

### ⚙️ Environment Configuration

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase). |
| `REDIS_URL` | Redis connection string for caching. |
| `FIREBASE_CRED_PATH` | Path to Firebase Admin SDK JSON. |
| `SUPABASE_URL` / `KEY` | Connection details for Supabase services. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins. |

---

### ⚡ Performance & Reliability

AcaTrack is engineered for high performance and reliability, with a focus on low latency and high concurrency.

#### **Benchmarking: Legacy (Flask) vs. Modern (FastAPI)**
The following metrics were captured using **k6** across comparable high-concurrency scenarios (120+ requests):

| Metric | Legacy (v1) | **AcaTrack (v2)** | **Improvement** |
| :--- | :--- | :--- | :--- |
| **Throughput (RPS)** | 1.84 | **59.62** | **~32x Increase** |
| **Avg. Response Time** | 2,840 ms | **158.79 ms** | **~18x Faster** |
| **Success Rate** | 96.77% | **100.00%** | **Perfect Reliability** |
| **Avg. DB Connections** | 42 | **5** | **8.4x More Efficient** |

#### **Benchmarking: Sequential Python Parser vs. Parallel Rust Core**
The following metrics show the dramatic performance boost after migrating the CPU-bound VTU result PDF scraping pipeline to a parallel Rust core bridged via PyO3 (benchmarked over 1,308 PDFs across 4 ZIP upload requests):

| Metric | Sequential Python (pdfplumber) | **Parallel Rust Core (PyO3 + Rayon)** | **Improvement** |
| :--- | :--- | :--- | :--- |
| **Total Parsing Duration** | 21.78 minutes | **34.06 seconds (~0.57 min)** | **38.4x Faster** 🚀 |
| **Speed per PDF** | 0.9992 seconds | **0.0260 seconds** | **38.4x Faster** 🚀 |
| **Upload p(95) Latency** | 10,598 ms | **5,534 ms** | **1.91x Faster** ⚡ |
| **Net RAM Impact** | +268.48 MB | **+76.43 MB** | **71.5% Lower Memory** 📉 |

*   **Optimized Execution**: Migrated to **FastAPI** with **Uvloop** and **Httptools**, delivering significantly higher throughput compared to the legacy Flask implementation.
*   **Advanced Caching**: Implemented **Redis-based caching** for expensive academic result computations and university data fetching.
*   **Database Efficiency**: Resolved critical **N+1 query bottlenecks** using SQLAlchemy joined-loading and optimized database indexing.
*   **Load Tested**: Verified to handle high-concurrency scenarios via **k6** load testing, ensuring stability during peak result periods.
*   **Automated Benchmarking**: Continuous monitoring via `benchmarkv2.py` to ensure query latency remains within professional standards (metrics tracked for database and API response times).

---

### 📂 Project Structure

```text
├── backend/            # FastAPI source code, models, services, and routes
├── frontend/           # React + Vite source code and assets
├── scripts/            # Database seeding and utility scripts
├── docker-compose.yml  # Container orchestration
├── Makefile            # Standardized task automation
├── openapi.json        # Generated API documentation
└── load_testv2.js      # Performance testing script
```

---

### 👥 Contributors (Legacy)
*   **Lead Maintainer**: Chetan Kishor C G
*   **Collaborators**: Abhishek R, Dhanush Singh G, Adithya V

---

### 🤍 Evolution
This project began as a student group assignment and have been refactoring into a modern, production-ready system. It represents a journey from learning full-stack basics to implementing advanced patterns like RBAC, AI integration, and high-performance caching.
