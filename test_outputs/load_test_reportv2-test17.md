# 📈 Load Testing Results Report (Test #17)

## ⏱️ Overview
- **Total Test Duration**: 68.19 seconds
- **Total Assertions**: 100.00% Check Success
- **Total HTTP Requests**: 300
- **Requests per Second**: 4.49
- **Failure Rate**: 0.00%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 71.11 MB
- **P95 RAM Usage**: 71.11 MB
- **Average RAM Usage**: 71.11 MB
- **Max Database Connections**: 3
- **Average Database Connections**: 3.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Student Analysis API (0.00 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 3289.23 ms
- **P90 Response Time**: 8147.89 ms
- **P95 Response Time**: 14006.92 ms
- **Max Response Time**: 31221.57 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 29297.31 ms | 18110.33 ms | 0.00 MB |
| Staff Semester Result API | 14369.69 ms | 7726.05 ms | 0.00 MB |
| Chart Generation API | 4518.24 ms | 2436.66 ms | 0.00 MB |
| PDF Report API | 4474.21 ms | 1663.25 ms | 0.00 MB |
| Student Analysis API | 2827.26 ms | 1805.35 ms | 0.00 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 67.28 ms | 18.83 ms | 0.00 MB |
| List Batches API | 125.38 ms | 61.10 ms | 0.00 MB |
| Mentor Meetings API | 339.54 ms | 108.01 ms | 0.00 MB |
| Mentor Students List API | 345.16 ms | 150.79 ms | 0.00 MB |
| Parent Student Details API | 392.75 ms | 85.41 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 360.67 ms | 0.00 MB | 0.00 MB |
| Chart Generation API | 420.95 ms | 0.00 MB | 0.00 MB |
| PDF Report API | 87.33 ms | 0.00 MB | 0.00 MB |
| Overall Res API | 27.38 ms | 0.00 MB | 0.00 MB |
| Staff PDF Report API | 1281.26 ms | 0.00 MB | 0.00 MB |
| Staff Semester Result API | 2562.55 ms | 0.00 MB | 0.00 MB |
| Mentor Students List API | 12.24 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 5.93 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 5.83 ms | 0.00 MB | 0.00 MB |
| Parent Student Details API | 14.39 ms | 0.00 MB | 0.00 MB |
| Health Check | 1.48 ms | 0.00 MB | 0.00 MB |
| List Batches API | 5.21 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
