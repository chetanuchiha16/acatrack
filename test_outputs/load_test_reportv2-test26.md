# 📈 Load Testing Results Report (Test #26)

## ⏱️ Overview
- **Total Test Duration**: 46.02 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 900
- **Requests per Second**: 19.94
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 384.58 MB
- **P95 RAM Usage**: 384.57 MB
- **Average RAM Usage**: 384.53 MB
- **Max Database Connections**: 2
- **Average Database Connections**: 2.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (14.54 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 813.23 ms
- **P90 Response Time**: 3263.24 ms
- **P95 Response Time**: 3940.65 ms
- **Max Response Time**: 6177.56 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Mentor Students List API | 2583.53 ms | 559.88 ms | 0.00 MB |
| Student Analysis API | 1042.13 ms | 362.81 ms | 1.55 MB |
| Overall Res API | 1030.12 ms | 252.81 ms | 11.75 MB |
| Chart Generation API | 1017.77 ms | 262.62 ms | 0.12 MB |
| PDF Report API | 831.16 ms | 285.31 ms | 0.06 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 13.92 ms | 7.12 ms | 0.00 MB |
| List Batches API | 82.27 ms | 39.04 ms | 0.00 MB |
| Parent Student Details API | 174.97 ms | 106.89 ms | 0.00 MB |
| Mentor PDFs File Tree API | 199.93 ms | 104.86 ms | 0.00 MB |
| Staff Semester Result API | 424.50 ms | 145.05 ms | 0.02 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 1.74 ms | 1.50 MB | 1.55 MB |
| Chart Generation API | 1.45 ms | 0.09 MB | 0.12 MB |
| PDF Report API | 1.40 ms | 0.04 MB | 0.06 MB |
| Overall Res API | 27.69 ms | 11.42 MB | 11.75 MB |
| Staff PDF Report API | 120.67 ms | 14.01 MB | 14.54 MB |
| Staff Semester Result API | 6.22 ms | 0.02 MB | 0.02 MB |
| Mentor Students List API | 5.63 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 3.24 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 3.22 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 6.91 ms | 0.00 MB | 0.00 MB |
| Health Check | 0.78 ms | 0.00 MB | 0.00 MB |
| List Batches API | 2.77 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
