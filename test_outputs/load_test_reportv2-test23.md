# 📈 Load Testing Results Report (Test #23)

## ⏱️ Overview
- **Total Test Duration**: 43.40 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1830
- **Requests per Second**: 43.22
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1425.61 MB
- **P95 RAM Usage**: 1425.61 MB
- **Average RAM Usage**: 1423.96 MB
- **Max Database Connections**: 7
- **Average Database Connections**: 7.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Chart Generation API (12.75 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 283.64 ms
- **P90 Response Time**: 1360.94 ms
- **P95 Response Time**: 1619.32 ms
- **Max Response Time**: 2649.47 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Mentor Students List API | 572.65 ms | 98.86 ms | 0.00 MB |
| Student Analysis API | 540.98 ms | 79.95 ms | 10.31 MB |
| PDF Report API | 283.65 ms | 47.95 ms | 3.13 MB |
| Chart Generation API | 273.14 ms | 46.40 ms | 12.75 MB |
| Overall Res API | 108.41 ms | 43.88 ms | 12.02 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 3.14 ms | 1.70 ms | 0.00 MB |
| List Batches API | 20.88 ms | 7.67 ms | 0.00 MB |
| Staff Semester Result API | 26.50 ms | 12.89 ms | 0.56 MB |
| Mentor PDFs File Tree API | 35.24 ms | 16.30 ms | 0.08 MB |
| Mentor Meetings API | 39.45 ms | 29.38 ms | 1.55 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 153.39 ms | 9.75 MB | 10.31 MB |
| Chart Generation API | 44.15 ms | 12.13 MB | 12.75 MB |
| PDF Report API | 113.15 ms | 2.93 MB | 3.13 MB |
| Overall Res API | 63.20 ms | 11.42 MB | 12.02 MB |
| Staff PDF Report API | 81.14 ms | 10.21 MB | 10.86 MB |
| Staff Semester Result API | 12.31 ms | 0.51 MB | 0.56 MB |
| Mentor Students List API | 11.76 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 6.23 ms | 1.49 MB | 1.55 MB |
| Mentor PDFs File Tree API | 5.95 ms | 0.05 MB | 0.08 MB |
| Parent Student Details API | 12.85 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.39 ms | 0.00 MB | 0.00 MB |
| List Batches API | 4.62 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
