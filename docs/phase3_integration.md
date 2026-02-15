# 🔄 Phase 3: Middleware & API Interconnection (September - October 2025)

## ⏱️ Architectural Paradigm: Scalable Integrations

September and October 2025 were defined by a massive shift toward system integration and architectural modularity. As the platform welcomed concurrent testing, the initial monolithic design (a single SQLite database and ad-hoc client requests) began showing critical stress points, particularly with database locking and UI state persistence.

To resolve these scaling limitations, AcaTrack underwent three major architectural transformations:
1.  **Dynamic Database Segmentation (The BatchManager)**: Transitioned from a single locked SQLite database to a modular, multi-database architecture governed by a custom `BatchManager` scope.
2.  **Stateless JWT Security & Interceptors**: Migrated from stateful cookie sessions to JSON Web Token (JWT) bearer authentication, backed by a centralized Axios interceptor.
3.  **Centralized State Management (Zustand)**: Replaced complex React prop-drilling with light, atomic global state stores.

These upgrades converted AcaTrack into a robust, secure, and production-ready application.

---

## 📅 Chronological Journey of September & October 2025

### 📅 September 2025: Batch Isolation, Interceptors, AI Analytics & Push Notifications
September was a month of high-frequency engineering, laying the foundation for scalable multi-cohort operations:
*   **🚨 The SQLite Relational Database Lock & The BatchManager (Architectural Shift)**: With multiple semesters querying the same database, SQLite transactions began throwing locking errors. On September 6, 2025, the team implemented the `BatchManager` framework. This architecture dynamically spawned and isolated separate SQLite database files by academic cohort year. Every query, user check, and results sync was dynamically scoped using a session manager, isolating databases and completely eliminating write locks.
*   **Zustand State Management**: To coordinate UI states across dashboards, AcaTrack integrated Zustand. This replaced brittle React context layers, enabling secure parent contact data sharing and theme preferences.
*   **The Multi-Process Orchestrator**: The team introduced a centralized orchestration script (`run.py`), allowing developers to concurrently boot and manage the FastAPI server and the React Vite client with a single command.
*   **Voice-Enabled Chatbot & Parents Dashboard**: A dedicated Parents Dashboard was introduced, complete with native language translations. The AI chatbot was upgraded with a text-to-speech voice assistant and custom backtracking logic.
*   **Firebase Cloud Messaging (FCM)**: Real-time Firebase push notifications were integrated into the student and staff dashboards, enabling instant notifications for grade updates and mentor meetings.
*   **Stateless JWT Authentication Transition**: On September 20, 2025, the team migrated from stateful cookie sessions to stateless JSON Web Tokens (JWT). Cryptographic helpers and token extraction signatures were added to backend auth routing, allowing APIs to validate student and faculty identities instantly without hitting persistent session tables.
*   **🚨 The "useLocation" to Session State UX Break (Notable Messup)**: During a major refactor to secure dashboard routes, the team replaced raw React router hooks (`useLocation`) with persistent session states to prevent authentication leaks. Because so many components relied on location state parameters for navigation context, this change broke wide areas of the frontend interface. The team spent several days auditing and updating component navigation blocks to resolve the regressions.

### 📅 October 2025: Cloud Migration, UI Hardening & Form Safety
October was dedicated to migrating all local resources to the cloud and hardening interfaces:
*   **Hosted Supabase Cloud Migration**: October marked the complete transition from local file storage and SQLite databases to the cloud. The backend database was migrated to a hosted Supabase PostgreSQL instance. Concurrently, all local directory saves (including student grade workbooks, scraped PDFs, and lecture classroom files) were migrated to secure Supabase Storage buckets under the unified "deploy/supabase-everything" architecture.
*   **Strict Semester Sanitation**: Hardened SQL query inputs to use case-insensitive semester codes, resolving a bug where lowercase semester strings failed backend database joins.
*   **Form Constraints & Visual Integrity**: Staff forms, mentor meeting logs, and student feedback inputs were overhauled. Text areas were assigned fixed dimensions and strict character thresholds to prevent layout overflows and secure the databases from excessive payload sizes.

---

## 🎯 Phase 3 Status at Month-End

At the close of October 2025, AcaTrack had successfully matured into a secure, cloud-backed application:
1.  **Dynamically Scoped Databases**: Roster and grade records safely segregated by academic cohort via the `BatchManager` scope.
2.  **Stateless JWT Interceptors**: Decentralized bearer token authorization completely automated across all dashboard modules.
3.  **Zustand State Management**: Lightweight, atomic client-side state layers providing smooth, prop-drill-free layouts.
4.  **Supabase Cloud Infrastructure**: All data domains migrated to a hosted Supabase PostgreSQL database, and all local files/notes transitioned to Supabase Cloud Storage.
5.  **Real-Time Firebase Push Feeds**: Active push notification pipelines to deliver alerts to student and staff portals instantly.
