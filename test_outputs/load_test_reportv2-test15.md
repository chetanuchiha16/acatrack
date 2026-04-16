# 📈 Load Testing Results Report (Test #15) [Flask]

## ⏱️ Overview
- **Total Test Duration**: 43.44 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 2535
- **Requests per Second**: 59.56
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1020.33 MB
- **P95 RAM Usage**: 1020.17 MB
- **Average RAM Usage**: 935.16 MB
- **Max Database Connections**: 6
- **Average Database Connections**: 6.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Chart Generation API (26.46 MB)
- **Minimum P95 RAM Impact**: Mentor Students List API (0.01 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 161.91 ms
- **P90 Response Time**: 386.70 ms
- **P95 Response Time**: 709.57 ms
- **Max Response Time**: 2334.40 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Chart Generation API | 1685.20 ms | 1038.84 ms | 26.46 MB |
| Student Analysis API | 491.21 ms | 139.52 ms | 0.16 MB |
| Mentor Students List API | 343.33 ms | 82.00 ms | 0.01 MB |
| PDF Report API | 326.59 ms | 87.24 ms | 0.30 MB |
| Parent Student Details API | 239.92 ms | 52.47 ms | 0.17 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 4.91 ms | 2.37 ms | 0.19 MB |
| Staff Semester Result API | 8.56 ms | 3.10 ms | 1.64 MB |
| Overall Res API | 22.63 ms | 5.61 ms | 3.30 MB |
| Staff PDF Report API | 31.39 ms | 8.85 ms | 15.88 MB |
| List Batches API | 207.20 ms | 32.93 ms | 0.18 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 8.35 ms | 0.15 MB | 0.16 MB |
| Chart Generation API | 144.03 ms | 11.95 MB | 26.46 MB |
| PDF Report API | 6.03 ms | 0.17 MB | 0.30 MB |
| Overall Res API | 4.57 ms | 3.19 MB | 3.30 MB |
| Staff PDF Report API | 30.84 ms | 15.36 MB | 15.88 MB |
| Staff Semester Result API | 1034.59 ms | 1.29 MB | 1.64 MB |
| Mentor Students List API | 3.27 ms | 0.01 MB | 0.01 MB |
| Mentor Meetings API | 2.27 ms | 0.03 MB | 0.07 MB |
| Mentor PDFs File Tree API | 2.31 ms | 0.09 MB | 0.14 MB |
| Parent Student Details API | 3.66 ms | 0.10 MB | 0.17 MB |
| Health Check | 0.96 ms | 0.09 MB | 0.19 MB |
| List Batches API | 1.97 ms | 0.12 MB | 0.18 MB |


---
*Generated automatically by benchmarking monitor.*
