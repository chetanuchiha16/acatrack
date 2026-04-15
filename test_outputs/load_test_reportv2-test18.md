# 📈 Load Testing Results Report (Test #18)

## ⏱️ Overview
- **Total Test Duration**: 70.70 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 361
- **Requests per Second**: 5.18
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 823.57 MB
- **P95 RAM Usage**: 821.34 MB
- **Average RAM Usage**: 702.09 MB
- **Max Database Connections**: 3
- **Average Database Connections**: 3.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (34.88 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 3080.61 ms
- **P90 Response Time**: 7470.72 ms
- **P95 Response Time**: 19088.03 ms
- **Max Response Time**: 39402.03 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 37270.34 ms | 22639.61 ms | 34.88 MB |
| Staff Semester Result API | 14780.57 ms | 8517.34 ms | 0.00 MB |
| PDF Report API | 2010.32 ms | 1112.22 ms | 0.88 MB |
| Student Analysis API | 1404.78 ms | 544.82 ms | 10.45 MB |
| Chart Generation API | 1092.68 ms | 417.94 ms | 5.77 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 46.11 ms | 12.81 ms | 0.00 MB |
| Mentor PDFs File Tree API | 281.79 ms | 83.80 ms | 0.00 MB |
| Mentor Meetings API | 300.63 ms | 112.46 ms | 0.00 MB |
| List Batches API | 368.14 ms | 119.00 ms | 0.00 MB |
| Mentor Students List API | 587.93 ms | 160.90 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 205.16 ms | 9.92 MB | 10.45 MB |
| Chart Generation API | 45.69 ms | 5.43 MB | 5.77 MB |
| PDF Report API | 78.34 ms | 0.38 MB | 0.88 MB |
| Overall Res API | 27.07 ms | 0.75 MB | 0.81 MB |
| Staff PDF Report API | 1149.55 ms | 27.97 MB | 34.88 MB |
| Staff Semester Result API | 2615.53 ms | 0.00 MB | 0.00 MB |
| Mentor Students List API | 12.33 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 4.47 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 5.02 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.70 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.42 ms | 0.00 MB | 0.00 MB |
| List Batches API | 4.91 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
