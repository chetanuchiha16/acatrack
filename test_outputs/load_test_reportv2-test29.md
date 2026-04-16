# 📈 Load Testing Results Report (Test #29)

## ⏱️ Overview
- **Total Test Duration**: 44.54 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1125
- **Requests per Second**: 25.67
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1347.05 MB
- **P95 RAM Usage**: 1347.03 MB
- **Average RAM Usage**: 1346.78 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (22.18 MB)
- **Minimum P95 RAM Impact**: Health Check (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 549.77 ms
- **P90 Response Time**: 2449.48 ms
- **P95 Response Time**: 2726.63 ms
- **Max Response Time**: 6507.29 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| PDF Report API | 808.64 ms | 163.43 ms | 0.00 MB |
| Chart Generation API | 808.23 ms | 160.22 ms | 7.98 MB |
| Student Analysis API | 806.17 ms | 210.33 ms | 4.52 MB |
| Overall Res API | 539.92 ms | 85.22 ms | 11.03 MB |
| Staff Semester Result API | 356.58 ms | 60.77 ms | 1.73 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 5.16 ms | 3.05 ms | 0.00 MB |
| Mentor Students List API | 15.32 ms | 17.42 ms | 0.00 MB |
| List Batches API | 33.75 ms | 15.62 ms | 0.00 MB |
| Mentor PDFs File Tree API | 52.24 ms | 21.05 ms | 0.00 MB |
| Parent Student Details API | 75.38 ms | 44.34 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 120.12 ms | 4.27 MB | 4.52 MB |
| Chart Generation API | 46.40 ms | 0.00 MB | 7.98 MB |
| PDF Report API | 3.79 ms | 0.00 MB | 0.00 MB |
| Overall Res API | 47.18 ms | 10.49 MB | 11.03 MB |
| Staff PDF Report API | 96.42 ms | 20.97 MB | 22.18 MB |
| Staff Semester Result API | 119.71 ms | 1.64 MB | 1.73 MB |
| Mentor Students List API | 3.83 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 6.05 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 6.38 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.85 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.81 ms | 0.00 MB | 0.00 MB |
| List Batches API | 4.84 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
