# 📈 Load Testing Results Report (Test #28)

## ⏱️ Overview
- **Total Test Duration**: 49.17 seconds
- **Total Assertions**: 88.72% Check Success
- **Total HTTP Requests**: 1035
- **Requests per Second**: 21.46
- **Failure Rate**: 10.53%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1504.84 MB
- **P95 RAM Usage**: 1504.82 MB
- **Average RAM Usage**: 1494.58 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (40.58 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 723.54 ms
- **P90 Response Time**: 2963.10 ms
- **P95 Response Time**: 3913.68 ms
- **Max Response Time**: 9292.98 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 2027.52 ms | 571.18 ms | 40.58 MB |
| Student Analysis API | 1079.49 ms | 311.73 ms | 1.50 MB |
| Chart Generation API | 778.27 ms | 244.69 ms | 8.09 MB |
| Overall Res API | 770.08 ms | 139.15 ms | 11.02 MB |
| PDF Report API | 706.88 ms | 180.89 ms | 3.12 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 5.09 ms | 2.33 ms | 0.00 MB |
| List Batches API | 37.51 ms | 12.20 ms | 0.00 MB |
| Mentor PDFs File Tree API | 66.17 ms | 28.56 ms | 0.00 MB |
| Parent Student Details API | 75.50 ms | 36.20 ms | 0.00 MB |
| Mentor Students List API | 92.87 ms | 20.75 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 1.10 ms | 1.46 MB | 1.50 MB |
| Chart Generation API | 17.19 ms | 7.84 MB | 8.09 MB |
| PDF Report API | 78.07 ms | 2.99 MB | 3.12 MB |
| Overall Res API | 19.54 ms | 10.70 MB | 11.02 MB |
| Staff PDF Report API | 438.18 ms | 32.38 MB | 40.58 MB |
| Staff Semester Result API | 25.74 ms | 0.01 MB | 0.01 MB |
| Mentor Students List API | 1.69 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 2.59 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 3.42 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 9.63 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.31 ms | 0.00 MB | 0.00 MB |
| List Batches API | 4.81 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
