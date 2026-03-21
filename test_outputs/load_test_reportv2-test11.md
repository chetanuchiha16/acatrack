# 📈 Load Testing Results Report (Test #23)

## ⏱️ Overview
- **Total Test Duration**: 49.76 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 915
- **Requests per Second**: 18.66
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1934.21 MB
- **Average RAM Usage**: 1893.14 MB
- **Max Database Connections**: 34
- **Average Database Connections**: 34.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum RAM Impact**: Staff PDF Report API (4.14 MB)
- **Minimum RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 776.48 ms
- **P90 Response Time**: 2517.25 ms
- **P95 Response Time**: 4446.08 ms
- **Max Response Time**: 7544.61 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | Requests |
|-------|-------------|-------------|----------|
| Staff PDF Report API | 6958.31 ms | 4970.00 ms | 0 |
| Chart Generation API | 4130.88 ms | 2648.56 ms | 0 |
| Staff Semester Result API | 1547.39 ms | 895.09 ms | 0 |
| Overall Res API | 1530.41 ms | 712.85 ms | 0 |
| Mentor PDFs File Tree API | 1330.35 ms | 539.88 ms | 0 |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | Requests |
|-------|-------------|-------------|----------|
| Health Check | 30.74 ms | 9.08 ms | 0 |
| Mentor Meetings API | 38.80 ms | 15.99 ms | 0 |
| Mentor Students List API | 46.04 ms | 14.61 ms | 0 |
| List Batches API | 60.11 ms | 17.42 ms | 0 |
| Parent Student Details API | 65.49 ms | 24.93 ms | 0 |

## 👤 Single User Baseline
| Route | Latency (avg) | RAM Impact |
|-------|---------------|------------|
| Student Analysis API | 9.25 ms | 0.00 MB |
| Chart Generation API | 149.04 ms | 0.00 MB |
| PDF Report API | 9.38 ms | 0.00 MB |
| Overall Res API | 35.31 ms | 0.00 MB |
| Staff PDF Report API | 272.32 ms | 4.14 MB |
| Staff Semester Result API | 249.32 ms | 0.00 MB |
| Mentor Students List API | 3.30 ms | 0.00 MB |
| Mentor Meetings API | 2.82 ms | 0.00 MB |
| Mentor PDFs File Tree API | 2.76 ms | 0.00 MB |
| Parent Student Details API | 4.26 ms | 0.00 MB |
| Health Check | 0.92 ms | 0.00 MB |
| List Batches API | 2.35 ms | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
