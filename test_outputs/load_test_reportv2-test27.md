# 📈 Load Testing Results Report (Test #27)

## ⏱️ Overview
- **Total Test Duration**: 45.47 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 900
- **Requests per Second**: 20.33
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 363.10 MB
- **P95 RAM Usage**: 363.05 MB
- **Average RAM Usage**: 361.59 MB
- **Max Database Connections**: 2
- **Average Database Connections**: 2.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Student Analysis API (1.56 MB)
- **Minimum P95 RAM Impact**: Staff Semester Result API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 794.17 ms
- **P90 Response Time**: 3243.84 ms
- **P95 Response Time**: 3981.95 ms
- **Max Response Time**: 5923.91 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Mentor Meetings API | 1871.81 ms | 367.23 ms | 0.00 MB |
| Student Analysis API | 1202.42 ms | 412.42 ms | 1.56 MB |
| Mentor PDFs File Tree API | 1051.78 ms | 184.43 ms | 0.00 MB |
| Chart Generation API | 1008.41 ms | 296.44 ms | 0.12 MB |
| PDF Report API | 1001.90 ms | 279.18 ms | 0.06 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 7.22 ms | 8.13 ms | 0.06 MB |
| List Batches API | 58.03 ms | 33.08 ms | 0.06 MB |
| Parent Student Details API | 230.78 ms | 143.15 ms | 0.02 MB |
| Mentor Students List API | 615.39 ms | 131.77 ms | 0.03 MB |
| Overall Res API | 630.88 ms | 190.89 ms | 0.60 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 1.58 ms | 1.51 MB | 1.56 MB |
| Chart Generation API | 1.54 ms | 0.09 MB | 0.12 MB |
| PDF Report API | 1.42 ms | 0.03 MB | 0.06 MB |
| Overall Res API | 13.68 ms | 0.57 MB | 0.60 MB |
| Staff PDF Report API | 1.72 ms | 0.00 MB | 0.00 MB |
| Staff Semester Result API | 1.62 ms | 0.00 MB | 0.00 MB |
| Mentor Students List API | 2.06 ms | 0.03 MB | 0.03 MB |
| Mentor Meetings API | 3.51 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 3.36 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 6.61 ms | 0.01 MB | 0.02 MB |
| Health Check | 0.75 ms | 0.04 MB | 0.06 MB |
| List Batches API | 2.71 ms | 0.04 MB | 0.06 MB |


---
*Generated automatically by benchmarking monitor.*
