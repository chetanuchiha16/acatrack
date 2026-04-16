# 📈 Load Testing Results Report (Test #21)

## ⏱️ Overview
- **Total Test Duration**: 43.19 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1695
- **Requests per Second**: 40.26
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1421.09 MB
- **P95 RAM Usage**: 1421.09 MB
- **Average RAM Usage**: 1414.67 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (24.81 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 303.19 ms
- **P90 Response Time**: 1090.52 ms
- **P95 Response Time**: 1884.58 ms
- **Max Response Time**: 4467.29 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| PDF Report API | 806.09 ms | 99.82 ms | 1.58 MB |
| Student Analysis API | 543.69 ms | 82.09 ms | 1.56 MB |
| Chart Generation API | 540.92 ms | 88.79 ms | 1.90 MB |
| Staff Semester Result API | 486.87 ms | 306.57 ms | 5.16 MB |
| Overall Res API | 287.94 ms | 67.98 ms | 1.30 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 2.26 ms | 1.04 ms | 0.00 MB |
| List Batches API | 13.93 ms | 7.90 ms | 0.00 MB |
| Mentor PDFs File Tree API | 15.94 ms | 15.71 ms | 0.00 MB |
| Mentor Meetings API | 16.20 ms | 16.52 ms | 0.08 MB |
| Parent Student Details API | 23.90 ms | 14.76 ms | 0.05 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 1.99 ms | 1.50 MB | 1.56 MB |
| Chart Generation API | 2.55 ms | 1.77 MB | 1.90 MB |
| PDF Report API | 2.03 ms | 1.52 MB | 1.58 MB |
| Overall Res API | 29.52 ms | 1.22 MB | 1.30 MB |
| Staff PDF Report API | 221.56 ms | 23.38 MB | 24.81 MB |
| Staff Semester Result API | 235.33 ms | 4.26 MB | 5.16 MB |
| Mentor Students List API | 13.20 ms | 0.20 MB | 0.25 MB |
| Mentor Meetings API | 6.57 ms | 0.05 MB | 0.08 MB |
| Mentor PDFs File Tree API | 7.34 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 15.88 ms | 0.05 MB | 0.05 MB |
| Health Check | 1.99 ms | 0.00 MB | 0.00 MB |
| List Batches API | 5.65 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
