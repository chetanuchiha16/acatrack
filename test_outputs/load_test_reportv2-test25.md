# 📈 Load Testing Results Report (Test #25)

## ⏱️ Overview
- **Total Test Duration**: 47.10 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 900
- **Requests per Second**: 19.48
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 421.95 MB
- **P95 RAM Usage**: 421.90 MB
- **Average RAM Usage**: 400.89 MB
- **Max Database Connections**: 2
- **Average Database Connections**: 2.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Student Analysis API (1.56 MB)
- **Minimum P95 RAM Impact**: Staff Semester Result API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 836.63 ms
- **P90 Response Time**: 3440.26 ms
- **P95 Response Time**: 4010.61 ms
- **Max Response Time**: 7659.87 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Student Analysis API | 4967.40 ms | 873.67 ms | 1.56 MB |
| Chart Generation API | 3306.92 ms | 965.31 ms | 0.44 MB |
| PDF Report API | 1182.15 ms | 333.70 ms | 0.05 MB |
| Staff PDF Report API | 642.86 ms | 139.21 ms | 0.00 MB |
| Mentor Students List API | 627.98 ms | 210.02 ms | 0.02 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 9.80 ms | 5.36 ms | 0.06 MB |
| List Batches API | 72.76 ms | 34.37 ms | 0.07 MB |
| Parent Student Details API | 129.23 ms | 79.89 ms | 0.11 MB |
| Mentor PDFs File Tree API | 130.47 ms | 52.82 ms | 0.00 MB |
| Mentor Meetings API | 191.94 ms | 83.22 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 3.64 ms | 1.51 MB | 1.56 MB |
| Chart Generation API | 4.15 ms | 0.38 MB | 0.44 MB |
| PDF Report API | 3.08 ms | 0.03 MB | 0.05 MB |
| Overall Res API | 35.47 ms | 0.40 MB | 0.43 MB |
| Staff PDF Report API | 1.64 ms | 0.00 MB | 0.00 MB |
| Staff Semester Result API | 1.41 ms | 0.00 MB | 0.00 MB |
| Mentor Students List API | 5.80 ms | 0.02 MB | 0.02 MB |
| Mentor Meetings API | 3.21 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 3.06 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 6.51 ms | 0.07 MB | 0.11 MB |
| Health Check | 0.79 ms | 0.03 MB | 0.06 MB |
| List Batches API | 2.73 ms | 0.04 MB | 0.07 MB |


---
*Generated automatically by benchmarking monitor.*
