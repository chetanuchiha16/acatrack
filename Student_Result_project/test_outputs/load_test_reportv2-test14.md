# 📈 Load Testing Results Report (Test #14)

## ⏱️ Overview
- **Total Test Duration**: 42.63 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 2835
- **Requests per Second**: 68.90
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 1106.30 MB
- **P95 RAM Usage**: 1106.27 MB
- **Average RAM Usage**: 1038.19 MB
- **Max Database Connections**: 12
- **Average Database Connections**: 12.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Chart Generation API (25.33 MB)
- **Minimum P95 RAM Impact**: Student Analysis API (0.01 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 127.78 ms
- **P90 Response Time**: 310.33 ms
- **P95 Response Time**: 641.41 ms
- **Max Response Time**: 1541.38 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Chart Generation API | 1327.90 ms | 844.95 ms | 25.33 MB |
| PDF Report API | 229.50 ms | 59.59 ms | 0.16 MB |
| Mentor Students List API | 182.43 ms | 38.76 ms | 0.23 MB |
| Student Analysis API | 180.31 ms | 51.05 ms | 0.01 MB |
| Mentor PDFs File Tree API | 167.08 ms | 33.04 ms | 0.25 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 6.73 ms | 2.31 ms | 0.22 MB |
| Staff Semester Result API | 10.29 ms | 2.91 ms | 0.20 MB |
| Staff PDF Report API | 13.83 ms | 3.05 ms | 0.23 MB |
| Overall Res API | 17.93 ms | 3.81 ms | 0.16 MB |
| Parent Student Details API | 114.26 ms | 27.05 ms | 0.23 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 5.92 ms | 0.00 MB | 0.01 MB |
| Chart Generation API | 122.29 ms | 13.48 MB | 25.33 MB |
| PDF Report API | 6.19 ms | 0.08 MB | 0.16 MB |
| Overall Res API | 1.14 ms | 0.07 MB | 0.16 MB |
| Staff PDF Report API | 1.15 ms | 0.13 MB | 0.23 MB |
| Staff Semester Result API | 1.18 ms | 0.11 MB | 0.20 MB |
| Mentor Students List API | 2.72 ms | 0.14 MB | 0.23 MB |
| Mentor Meetings API | 2.09 ms | 0.13 MB | 0.23 MB |
| Mentor PDFs File Tree API | 2.20 ms | 0.15 MB | 0.25 MB |
| Parent Student Details API | 3.52 ms | 0.12 MB | 0.23 MB |
| Health Check | 0.86 ms | 0.12 MB | 0.22 MB |
| List Batches API | 1.97 ms | 0.12 MB | 0.21 MB |


---
*Generated automatically by benchmarking monitor.*
