# 📈 Load Testing Results Report (Test #19)

## ⏱️ Overview
- **Total Test Duration**: 64.81 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 600
- **Requests per Second**: 9.38
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 791.24 MB
- **P95 RAM Usage**: 791.24 MB
- **Average RAM Usage**: 638.53 MB
- **Max Database Connections**: 3
- **Average Database Connections**: 3.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (24.73 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 1893.90 ms
- **P90 Response Time**: 6489.16 ms
- **P95 Response Time**: 8873.60 ms
- **Max Response Time**: 13995.08 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 10647.94 ms | 9301.39 ms | 24.73 MB |
| Overall Res API | 4388.69 ms | 2670.23 ms | 11.55 MB |
| Student Analysis API | 1654.49 ms | 619.45 ms | 1.03 MB |
| PDF Report API | 1474.65 ms | 723.24 ms | 9.15 MB |
| Chart Generation API | 1364.56 ms | 508.99 ms | 0.50 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 2.44 ms | 1.29 ms | 0.00 MB |
| Mentor PDFs File Tree API | 18.30 ms | 10.10 ms | 0.00 MB |
| Mentor Meetings API | 19.91 ms | 10.49 ms | 0.00 MB |
| List Batches API | 23.87 ms | 17.26 ms | 0.00 MB |
| Mentor Students List API | 30.91 ms | 17.23 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 3.32 ms | 0.98 MB | 1.03 MB |
| Chart Generation API | 3.66 ms | 0.44 MB | 0.50 MB |
| PDF Report API | 294.83 ms | 8.44 MB | 9.15 MB |
| Overall Res API | 106.86 ms | 10.89 MB | 11.55 MB |
| Staff PDF Report API | 918.50 ms | 18.56 MB | 24.73 MB |
| Staff Semester Result API | 95.23 ms | 0.01 MB | 0.01 MB |
| Mentor Students List API | 11.24 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 6.83 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 6.05 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.42 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.44 ms | 0.00 MB | 0.00 MB |
| List Batches API | 5.50 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
