# Sandbox Performance Latency Breakdown

## Overall HTTP Latency Metrics
* **Minimum Response Time:** `4.25 ms`
* **Median Response Time (p50):** `505.22 ms`
* **90th Percentile (p90):** `2.68 s`
* **Average Response Time:** `1.36 s`

---

## Endpoint Latency Table

| API Group / Endpoint | Min Latency | Median (p50) | p90 Latency | Avg Latency | Analysis / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student Details API** | `16.7 ms` | `94.1 ms` | `490.0 ms` | `333.2 ms` | Extremely fast lookup once database connection is initialized. |
| **PDF Report API** | `43.6 ms` | `228.5 ms` | `832.6 ms` | `416.0 ms` | Runs visual rendering library in an async executor thread. |
| **Student Analysis API** | `23.0 ms` | `532.9 ms` | `1.68 s` | `677.7 ms` | Computational/statistical logic on academic records. |
| **Sandbox Seeding & Setup** (First Hit) | `1.50 s` | `2.80 s` | `4.20 s` | `2.90 s` | First request of each session takes longer due to SQLite database file generation, schema application, and data seeding. |
