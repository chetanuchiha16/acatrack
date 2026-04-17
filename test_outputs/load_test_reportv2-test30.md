# 📈 Load Testing Results Report (Test #30)

## ⏱️ Overview
- **Total Test Duration**: 44.68 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 600
- **Requests per Second**: 13.78
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 353.61 MB
- **P95 RAM Usage**: 353.60 MB
- **Average RAM Usage**: 353.55 MB
- **Max Database Connections**: 4
- **Average Database Connections**: 4.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Overall Res API (11.05 MB)
- **Minimum P95 RAM Impact**: Health Check (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 1233.77 ms
- **P90 Response Time**: 5119.66 ms
- **P95 Response Time**: 6040.32 ms
- **Max Response Time**: 10866.85 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Student Analysis API | 1625.08 ms | 617.31 ms | 1.59 MB |
| PDF Report API | 1117.68 ms | 401.66 ms | 3.10 MB |
| Chart Generation API | 1088.76 ms | 393.34 ms | 6.47 MB |
| Overall Res API | 1086.59 ms | 252.99 ms | 11.05 MB |
| Staff Semester Result API | 569.22 ms | 136.64 ms | 0.01 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 18.69 ms | 7.00 ms | 0.00 MB |
| List Batches API | 93.01 ms | 39.33 ms | 0.00 MB |
| Mentor PDFs File Tree API | 191.63 ms | 130.29 ms | 0.00 MB |
| Parent Student Details API | 275.18 ms | 158.63 ms | 0.00 MB |
| Mentor Students List API | 284.66 ms | 50.55 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 4.41 ms | 1.53 MB | 1.59 MB |
| Chart Generation API | 40.13 ms | 0.00 MB | 6.47 MB |
| PDF Report API | 116.61 ms | 2.94 MB | 3.10 MB |
| Overall Res API | 26.64 ms | 10.69 MB | 11.05 MB |
| Staff PDF Report API | 41.46 ms | 7.52 MB | 7.85 MB |
| Staff Semester Result API | 6.82 ms | 0.01 MB | 0.01 MB |
| Mentor Students List API | 2.59 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 3.80 ms | 0.01 MB | 0.01 MB |
| Mentor PDFs File Tree API | 6.70 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.60 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.60 ms | 0.00 MB | 0.00 MB |
| List Batches API | 5.10 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
