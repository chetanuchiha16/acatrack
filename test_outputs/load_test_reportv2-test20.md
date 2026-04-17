# 📈 Load Testing Results Report (Test #20)

## ⏱️ Overview
- **Total Test Duration**: 45.72 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 1140
- **Requests per Second**: 25.44
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1847.83 MB
- **P95 RAM Usage**: 1847.83 MB
- **Average RAM Usage**: 1722.77 MB
- **Max Database Connections**: 5
- **Average Database Connections**: 5.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Staff PDF Report API (39.87 MB)
- **Minimum P95 RAM Impact**: Parent Student Details API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 571.05 ms
- **P90 Response Time**: 2028.01 ms
- **P95 Response Time**: 2858.73 ms
- **Max Response Time**: 7491.69 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 6343.08 ms | 3477.52 ms | 39.87 MB |
| Student Analysis API | 842.14 ms | 195.00 ms | 1.57 MB |
| Chart Generation API | 678.06 ms | 136.54 ms | 1.88 MB |
| PDF Report API | 656.43 ms | 98.62 ms | 0.07 MB |
| Staff Semester Result API | 457.22 ms | 231.85 ms | 5.25 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 2.21 ms | 1.38 ms | 1.55 MB |
| Mentor PDFs File Tree API | 11.41 ms | 14.16 ms | 0.02 MB |
| List Batches API | 13.04 ms | 5.74 ms | 0.13 MB |
| Mentor Meetings API | 15.84 ms | 10.23 ms | 0.01 MB |
| Parent Student Details API | 22.94 ms | 13.08 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 3.46 ms | 1.52 MB | 1.57 MB |
| Chart Generation API | 4.31 ms | 1.81 MB | 1.88 MB |
| PDF Report API | 3.01 ms | 0.04 MB | 0.07 MB |
| Overall Res API | 37.81 ms | 2.66 MB | 2.79 MB |
| Staff PDF Report API | 1032.35 ms | 31.22 MB | 39.87 MB |
| Staff Semester Result API | 218.61 ms | 4.34 MB | 5.25 MB |
| Mentor Students List API | 12.47 ms | 0.02 MB | 0.02 MB |
| Mentor Meetings API | 6.37 ms | 0.00 MB | 0.01 MB |
| Mentor PDFs File Tree API | 5.76 ms | 0.02 MB | 0.02 MB |
| Parent Student Details API | 14.39 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.84 ms | 1.49 MB | 1.55 MB |
| List Batches API | 5.29 ms | 0.09 MB | 0.13 MB |


---
*Generated automatically by benchmarking monitor.*
