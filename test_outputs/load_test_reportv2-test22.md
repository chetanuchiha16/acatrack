# 📈 Load Testing Results Report (Test #22)

## ⏱️ Overview
- **Total Test Duration**: 43.90 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1800
- **Requests per Second**: 41.86
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1387.99 MB
- **P95 RAM Usage**: 1387.96 MB
- **Average RAM Usage**: 1385.42 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff Semester Result API (3.74 MB)
- **Minimum P95 RAM Impact**: Mentor PDFs File Tree API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 292.67 ms
- **P90 Response Time**: 1344.64 ms
- **P95 Response Time**: 1632.91 ms
- **Max Response Time**: 4061.57 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Student Analysis API | 294.66 ms | 95.65 ms | 1.56 MB |
| PDF Report API | 287.83 ms | 51.77 ms | 0.07 MB |
| Chart Generation API | 272.46 ms | 52.75 ms | 1.87 MB |
| Overall Res API | 101.64 ms | 43.30 ms | 1.00 MB |
| Mentor Students List API | 93.76 ms | 58.91 ms | 0.21 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 2.59 ms | 1.54 ms | 1.54 MB |
| List Batches API | 16.60 ms | 7.04 ms | 0.09 MB |
| Mentor PDFs File Tree API | 16.77 ms | 8.88 ms | 0.00 MB |
| Mentor Meetings API | 18.04 ms | 12.20 ms | 0.12 MB |
| Staff Semester Result API | 34.38 ms | 17.01 ms | 3.74 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 3.35 ms | 1.51 MB | 1.56 MB |
| Chart Generation API | 4.34 ms | 1.80 MB | 1.87 MB |
| PDF Report API | 3.06 ms | 0.04 MB | 0.07 MB |
| Overall Res API | 35.28 ms | 0.88 MB | 1.00 MB |
| Staff PDF Report API | 3.63 ms | 1.77 MB | 1.86 MB |
| Staff Semester Result API | 120.53 ms | 3.48 MB | 3.74 MB |
| Mentor Students List API | 12.51 ms | 0.16 MB | 0.21 MB |
| Mentor Meetings API | 6.91 ms | 0.09 MB | 0.12 MB |
| Mentor PDFs File Tree API | 6.32 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.05 ms | 0.03 MB | 0.07 MB |
| Health Check | 1.49 ms | 1.48 MB | 1.54 MB |
| List Batches API | 5.61 ms | 0.05 MB | 0.09 MB |


---
*Generated automatically by benchmarking monitor.*
