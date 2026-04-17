# 📈 Load Testing Results Report (Test #31)

## ⏱️ Overview
- **Total Test Duration**: 43.49 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 2520
- **Requests per Second**: 59.62
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1389.46 MB
- **P95 RAM Usage**: 1389.43 MB
- **Average RAM Usage**: 1388.72 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (26.20 MB)
- **Minimum P95 RAM Impact**: Mentor PDFs File Tree API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 158.79 ms
- **P90 Response Time**: 982.68 ms
- **P95 Response Time**: 1191.33 ms
- **Max Response Time**: 1993.94 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Mentor Meetings API | 207.89 ms | 29.79 ms | 0.06 MB |
| Student Analysis API | 201.86 ms | 33.92 ms | 1.48 MB |
| Chart Generation API | 199.40 ms | 23.19 ms | 1.86 MB |
| PDF Report API | 198.87 ms | 14.87 ms | 1.52 MB |
| Parent Student Details API | 22.56 ms | 26.80 ms | 0.11 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 1.69 ms | 2.10 ms | 1.54 MB |
| Mentor Students List API | 3.55 ms | 7.84 ms | 0.04 MB |
| Overall Res API | 4.05 ms | 10.49 ms | 11.63 MB |
| Staff Semester Result API | 5.24 ms | 9.33 ms | 0.02 MB |
| Staff PDF Report API | 5.47 ms | 10.49 ms | 26.20 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 1.24 ms | 1.44 MB | 1.48 MB |
| Chart Generation API | 1.66 ms | 1.75 MB | 1.86 MB |
| PDF Report API | 1.22 ms | 1.47 MB | 1.52 MB |
| Overall Res API | 30.19 ms | 11.28 MB | 11.63 MB |
| Staff PDF Report API | 158.30 ms | 25.21 MB | 26.20 MB |
| Staff Semester Result API | 6.63 ms | 0.02 MB | 0.02 MB |
| Mentor Students List API | 2.48 ms | 0.03 MB | 0.04 MB |
| Mentor Meetings API | 3.67 ms | 0.03 MB | 0.06 MB |
| Mentor PDFs File Tree API | 3.09 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 6.20 ms | 0.06 MB | 0.11 MB |
| Health Check | 0.76 ms | 1.49 MB | 1.54 MB |
| List Batches API | 2.76 ms | 0.11 MB | 0.15 MB |


---
*Generated automatically by benchmarking monitor.*
