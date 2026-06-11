# ⚡ Phase 5: The Repository Pattern & FastAPI Era (April 2026)

## ⏱️ Architectural Paradigm: The Great Migration

April 2026 was defined by the single largest backend restructuring in AcaTrack’s history: the official migration from legacy Flask-like monolithic scripts to **FastAPI**. The goal was to support high-performance asynchronous API requests, establish strict request/response schema validation, and introduce the **Repository Pattern** for database access.

By decoupling routing logic from direct database query builders, AcaTrack established a clean, three-tier architecture:
1.  **APIRouter Layer**: Managed HTTP request routing, input schema validation, and query parameter handling.
2.  **Service/Repository Layer**: Encapsulated business logic and database queries, utilizing FastAPI’s dependency injection for database sessions.
3.  **Data Persistence Layer**: Handled relationships and transactional rollbacks cleanly using SQLAlchemy's async engine.

This migration laid the foundation for enterprise-level scaling, making AcaTrack’s API layer exceptionally fast and secure.

---

## 📅 Chronological Journey of April 2026

### 📅 April 14, 2026: FastAPI Foundations & Async Pools
The migration began by rebuilding the core web server infrastructure:
*   **FastAPI APIRouters**: All 22 active backend routes were completely rewritten and organized into clean, separate FastAPI routers.
*   **🚨 The Database Pool Starvation Incident (Notable Messup)**: During early benchmark stress tests, the server crashed due to database connection pool depletion and unclosed chunked database iterators. The team immediately optimized the asynchronous connection pool configuration, resolved chunked query scopes, and verified that all open database transactions cleanly released connections back to the pool.
*   **Async Test Suite**: The entire Pytest suite was refactored to support async-aware database operations, verifying transaction rollbacks and session isolation.

### 📅 April 15 - 16, 2026: Eager Loading, Caching & Response Tuning
With the asynchronous FastAPI core stable, the team focused on polishing query times and report delivery:
*   **Relational Typo Resolution**: Audited and fixed a relational model typo inside database relationship definitions that was causing eager loading joins to fail silently.
*   **Advanced Endpoint Caching**: Integrated a centralized Redis-based caching decorator, applying it to expensive student analytics and performance chart routes to prevent duplicate DB scans.
*   **Highly Optimized SQL Stats**: Optimized the academic statistics engine. Instead of scanning student records sequentially in Python memory to build PDF summaries, the team wrote direct joined SQL statements to calculate cohort averages and topper lists directly inside PostgreSQL, drastically reducing processing times.
*   **🚨 PDF Streaming Timeout (Notable Messup)**: High-volume PDF report downloads caused memory spikes and occasional gateway timeouts in production. The cause was identified as the overhead of streaming response blocks for heavy binary files. The fix was immediate: refactoring the PDF routes to compile and deliver reports using standard, memory-efficient FastAPI binary Response classes.

### 📅 April 17, 2026: Production Settings & Staging Release
The month ended with environment tuning and CI/CD alignments:
*   **Staging Configurations**: Adjusted backend production parameters and caching rules specifically for mentor dashboards to optimize concurrent lookups.
*   **Pipeline Success**: Resolved minor CI/CD build issues, fully passing the integration tests and officially merging the FastAPI architecture into the main staging deployment.

---

## 🎯 Phase 5 Status at Month-End

By the close of April 2026, the AcaTrack backend had successfully achieved its modern state:
1.  **Fully Asynchronous Backend**: Extremely low-latency FastAPI server layer with strict request/response data-type validation.
2.  **Structured Repository Pattern**: Clean, testable three-tier database abstractions using robust dependency injection.
3.  **Resilient Connection Pools**: Starvation-free async database pooling with unblocked query iterators.
4.  **Optimized Academic Queries**: High-speed joined database joins and advanced endpoint caching for instant data delivery.
5.  **High-Speed Report Delivery**: Capped memory PDF reports providing immediate, zero-overhead browser downloads.
