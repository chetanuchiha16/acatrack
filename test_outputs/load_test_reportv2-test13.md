# 📈 Load Testing Results Report (Test #13)

## ⏱️ Overview
- **Total Test Duration**: 43.08 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 2715
- **Requests per Second**: 64.16
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1005.90 MB
- **P95 RAM Usage**: 1002.00 MB
- **Average RAM Usage**: 882.90 MB
- **Max Database Connections**: 3
- **Average Database Connections**: 3.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Chart Generation API (21.20 MB)
- **Minimum P95 RAM Impact**: Staff Semester Result API (0.01 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 138.24 ms
- **P90 Response Time**: 317.43 ms
- **P95 Response Time**: 601.08 ms
- **Max Response Time**: 1946.55 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Chart Generation API | 1607.30 ms | 890.63 ms | 21.20 MB |
| PDF Report API | 277.57 ms | 61.00 ms | 0.23 MB |
| Student Analysis API | 250.09 ms | 69.53 ms | 2.27 MB |
| Parent Student Details API | 246.48 ms | 43.17 ms | 0.10 MB |
| Mentor Students List API | 227.89 ms | 59.50 ms | 0.02 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 14.19 ms | 4.53 ms | 0.04 MB |
| Staff Semester Result API | 19.07 ms | 5.17 ms | 0.01 MB |
| Staff PDF Report API | 33.02 ms | 8.28 ms | 0.05 MB |
| Overall Res API | 39.29 ms | 9.37 ms | 4.14 MB |
| Mentor PDFs File Tree API | 183.78 ms | 28.52 ms | 0.01 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 5.98 ms | 2.06 MB | 2.27 MB |
| Chart Generation API | 140.82 ms | 12.64 MB | 21.20 MB |
| PDF Report API | 6.00 ms | 0.12 MB | 0.23 MB |
| Overall Res API | 5.24 ms | 3.72 MB | 4.14 MB |
| Staff PDF Report API | 1.72 ms | 0.03 MB | 0.05 MB |
| Staff Semester Result API | 1.25 ms | 0.00 MB | 0.01 MB |
| Mentor Students List API | 3.09 ms | 0.01 MB | 0.02 MB |
| Mentor Meetings API | 2.53 ms | 0.01 MB | 0.01 MB |
| Mentor PDFs File Tree API | 2.47 ms | 0.00 MB | 0.01 MB |
| Parent Student Details API | 3.85 ms | 0.07 MB | 0.10 MB |
| Health Check | 0.89 ms | 0.02 MB | 0.04 MB |
| List Batches API | 2.73 ms | 0.03 MB | 0.04 MB |


---
*Generated automatically by benchmarking monitor.*
