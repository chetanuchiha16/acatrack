# 📈 Load Testing Results Report (Test #12)

## ⏱️ Overview
- **Total Test Duration**: 49.74 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 825
- **Requests per Second**: 16.84
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1911.22 MB
- **P95 RAM Usage**: 1911.22 MB
- **Average RAM Usage**: 1878.82 MB
- **Max Database Connections**: 34
- **Average Database Connections**: 34.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (55.09 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.01 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 869.42 ms
- **P90 Response Time**: 2573.64 ms
- **P95 Response Time**: 4967.22 ms
- **Max Response Time**: 8022.11 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 7724.64 ms | 5703.18 ms | 55.09 MB |
| Chart Generation API | 4760.31 ms | 2792.77 ms | 3.45 MB |
| Staff Semester Result API | 1979.24 ms | 1039.30 ms | 0.01 MB |
| Overall Res API | 1549.84 ms | 784.41 ms | 0.02 MB |
| PDF Report API | 1448.15 ms | 639.54 ms | 0.03 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 28.71 ms | 9.49 ms | 0.01 MB |
| List Batches API | 42.63 ms | 17.28 ms | 0.01 MB |
| Mentor Students List API | 69.37 ms | 30.18 ms | 0.01 MB |
| Mentor Meetings API | 78.42 ms | 29.06 ms | 0.01 MB |
| Parent Student Details API | 86.97 ms | 39.44 ms | 0.01 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 9.32 ms | 0.00 MB | 0.01 MB |
| Chart Generation API | 121.65 ms | 2.12 MB | 3.45 MB |
| PDF Report API | 15.56 ms | 0.00 MB | 0.03 MB |
| Overall Res API | 39.32 ms | 0.01 MB | 0.02 MB |
| Staff PDF Report API | 292.31 ms | 30.77 MB | 55.09 MB |
| Staff Semester Result API | 338.27 ms | 0.00 MB | 0.01 MB |
| Mentor Students List API | 3.51 ms | 0.00 MB | 0.01 MB |
| Mentor Meetings API | 2.47 ms | 0.00 MB | 0.01 MB |
| Mentor PDFs File Tree API | 2.37 ms | 0.00 MB | 0.01 MB |
| Parent Student Details API | 4.17 ms | 0.00 MB | 0.01 MB |
| Health Check | 0.91 ms | 0.00 MB | 0.01 MB |
| List Batches API | 3.45 ms | 0.00 MB | 0.01 MB |


---
*Generated automatically by benchmarking monitor.*
