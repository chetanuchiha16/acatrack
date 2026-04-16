# 📈 Load Testing Results Report (Test #24)

## ⏱️ Overview
- **Total Test Duration**: 43.75 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1755
- **Requests per Second**: 41.11
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1363.34 MB
- **P95 RAM Usage**: 1363.34 MB
- **Average RAM Usage**: 1361.56 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Overall Res API (2.16 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.02 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 299.63 ms
- **P90 Response Time**: 1103.84 ms
- **P95 Response Time**: 1696.57 ms
- **Max Response Time**: 4769.89 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Student Analysis API | 661.62 ms | 138.52 ms | 1.55 MB |
| Chart Generation API | 454.32 ms | 67.96 ms | 0.35 MB |
| Staff PDF Report API | 280.47 ms | 43.69 ms | 1.71 MB |
| PDF Report API | 274.08 ms | 45.10 ms | 0.06 MB |
| Mentor Students List API | 166.70 ms | 116.62 ms | 0.23 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 2.95 ms | 1.57 ms | 0.09 MB |
| List Batches API | 14.46 ms | 7.00 ms | 0.02 MB |
| Mentor PDFs File Tree API | 19.18 ms | 13.30 ms | 0.12 MB |
| Mentor Meetings API | 21.96 ms | 24.40 ms | 1.53 MB |
| Staff Semester Result API | 32.99 ms | 16.72 ms | 0.07 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 3.39 ms | 1.50 MB | 1.55 MB |
| Chart Generation API | 3.75 ms | 0.30 MB | 0.35 MB |
| PDF Report API | 2.79 ms | 0.03 MB | 0.06 MB |
| Overall Res API | 25.56 ms | 2.08 MB | 2.16 MB |
| Staff PDF Report API | 2.94 ms | 1.63 MB | 1.71 MB |
| Staff Semester Result API | 2.71 ms | 0.04 MB | 0.07 MB |
| Mentor Students List API | 13.03 ms | 0.18 MB | 0.23 MB |
| Mentor Meetings API | 6.23 ms | 1.48 MB | 1.53 MB |
| Mentor PDFs File Tree API | 6.04 ms | 0.09 MB | 0.12 MB |
| Parent Student Details API | 13.39 ms | 0.09 MB | 0.14 MB |
| Health Check | 1.30 ms | 0.07 MB | 0.09 MB |
| List Batches API | 5.43 ms | 0.02 MB | 0.02 MB |


---
*Generated automatically by benchmarking monitor.*
