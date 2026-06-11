# 🔒 Phase 4: Security Sweeps & Performance Hardening (November 2025 - March 2026)

## ⏱️ Architectural Paradigm: Enterprise Resilience

Between late 2025 and March 2026, AcaTrack underwent an intense architectural transformation. With the core feature set established, the development focus shifted from adding features to auditing the codebase for security, scalability, and performance leaks. 

The goal was to transform AcaTrack from a functional prototype into a bulletproof, production-grade application capable of handling high loads. This era introduced sandboxed Docker environments, strict security sweeps, and deep profiling to eliminate memory leaks, startup blockages, and database locking.

---

## 📅 Chronological Journey of November 2025 - March 2026

### 📅 November 2025 - February 2026: Blueprint Audits, Schema Normalization & Dependency Isolation
This winter period focused on schema standardization, developer onboarding blueprints, and advanced type structures:
*   **Documentation & Blueprint Sweep (December 30, 2025)**: Re-aligned the system’s architectural guides, onboarding instructions, and project README to officially standardize the PostgreSQL integration, public API endpoints, and production configuration schemas.
*   **The Database Schema Normalization Sweep (February 15 - 28, 2026)**: Under the `arch/normalize-the-database` migration, the team restructured the entire database schema inside `models/schema.py`. Brittle string-packed tables were broken down into clean, normalized relationships. Subject codes, titles, credits, and grade values were decoupled into dedicated, foreign-key-aligned tables, ensuring data consistency.
*   **The Modern `uv` Package Port (February 26, 2026)**: Migrated backend dependency systems from traditional `pip` commands to the ultra-fast Python package manager, adding `pyproject.toml` and `uv.lock` to isolate environment setups.
*   **🚨 Roster Payload Format Crash (February 28, 2026 - Notable Messup)**: Following the schema normalization sweep, the student results view crashed because the backend grades payload shape (`sent_students_data.py`) was incompatible with the React UI. The team resolved this by refactoring the backend response builders to map and serialize relational student objects into standardized, UI-compliant JSON dictionaries.

### 📅 March 2026: The Security & Performance Transformation
March was a month of massive technical accomplishments:
*   **Dockerization & Dependency Lock**: Migrated backend runtime installations from traditional builders to the modern, ultra-fast Python package manager. The Docker environment was rebuilt to sync and freeze dependencies strictly inside lightweight binary containers.
*   **🚨 The CodeQL Plaintext Password Incident (Notable Messup)**: A high-severity security audit flagged a major risk: temporary administrative CSV exports containing raw student passwords were cached plaintext inside database export cache tables. The team immediately implemented secure symmetric encryption using cryptography keys. This ensured that all cached payloads were scrambled on write and safely decrypted only during authenticated downloads.
*   **🚨 The Matplotlib Memory Leak (Notable Messup)**: Frequent generation of student report cards and cohort analytical graphs caused container memory to grow rapidly until out-of-memory (OOM) crashes occurred. The cause: Matplotlib figures generated dynamically remained open in server RAM. The fix was immediate: forcing the headless graphics backend and strictly releasing figure resources from memory after every chart compile loop.
*   **🚨 The Synchronous Supabase Startup Lock (Notable Messup)**: The backend consistently timed out and failed server health checks during deployment startup. The cause: the application attempted to synchronously download logo assets from Supabase cloud storage during startup imports. The team refactored the paths to lazy-load these lookups on demand, allowing the server to boot up instantly.
*   **N+1 Query Optimizations**: Discovered that loading mentor dashboards, student lists, and class results triggered hundreds of secondary database queries to retrieve relational metadata (N+1 queries). The team refactored database operations to use eager loading via joined database statements, drastically reducing latency.

---

## 🎯 Phase 4 Status at Month-End

By the end of March 2026, AcaTrack had successfully completed its transition to an enterprise-secure, highly structured application:
1.  **Fully Containerized UV Builds**: Sandboxed, ultra-fast Docker environments running with strictly frozen, minimal dependency trees.
2.  **Symmetrically Encrypted Cache**: Complete eradication of plaintext user credentials in database exports, protected by robust cryptographic wrappers.
3.  **Capped Memory Footprint**: Headless chart engines that strictly release graphics memory, eliminating OOM crash risks.
4.  **Instant Startup Routing**: Lazy-loaded college assets that allowed servers to boot up instantly without waiting for blocking external network requests.
5.  **Optimized Database Feeds**: Eager loading of database queries, delivering exceptionally clean and fast dashboard loads.
6.  **Documentation & Blueprint Standardization**: Aligned all developer blueprints, README guides, and build configurations to support standard PostgreSQL APIs and deployment setups.
7.  **Normalized Relational Schemas**: Eradicated brittle flat tables, decoupling grades, course codes, and cohort records into foreign-key-secured normalized tables.
