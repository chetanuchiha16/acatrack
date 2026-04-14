# 📈 Load Testing Results Report (Test #16)

## ⏱️ Overview
- **Total Test Duration**: 73.08 seconds
- **Total Assertions**: 90.94% Check Success
- **Total HTTP Requests**: 333
- **Requests per Second**: 4.76
- **Failure Rate**: 8.11%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: 0.00 MB
- **P95 RAM Usage**: 0.00 MB
- **Average RAM Usage**: 0.00 MB
- **Max Database Connections**: 26
- **Average Database Connections**: 26.00

### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: Student Analysis API (0.00 MB)
- **Minimum P95 RAM Impact**: List Batches API (0.00 MB)

## ⚡ HTTP Metrics
- **Average Response Time**: 3432.72 ms
- **P90 Response Time**: 12578.09 ms
- **P95 Response Time**: 22334.33 ms
- **Max Response Time**: 30780.06 ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Staff PDF Report API | 26066.95 ms | 19185.81 ms | 0.00 MB |
| Staff Semester Result API | 22527.03 ms | 16308.04 ms | 0.00 MB |
| Chart Generation API | 4718.91 ms | 1585.79 ms | 0.00 MB |
| Student Analysis API | 2258.65 ms | 1115.71 ms | 0.00 MB |
| PDF Report API | 1970.68 ms | 1064.70 ms | 0.00 MB |

## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
| Health Check | 101.52 ms | 28.57 ms | 0.00 MB |
| Mentor PDFs File Tree API | 506.83 ms | 221.79 ms | 0.00 MB |
| Mentor Students List API | 734.63 ms | 342.89 ms | 0.00 MB |
| Mentor Meetings API | 776.01 ms | 312.51 ms | 0.00 MB |
| List Batches API | 860.99 ms | 269.54 ms | 0.00 MB |

## 👤 Single User Baseline (10 Iterations)
| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |
|-------|---------------|----------------|----------------|
| Student Analysis API | 44.87 ms | 0.00 MB | 0.00 MB |
| Chart Generation API | 216.42 ms | 0.00 MB | 0.00 MB |
| PDF Report API | 37.96 ms | 0.00 MB | 0.00 MB |
| Overall Res API | 13.69 ms | 0.00 MB | 0.00 MB |
| Staff PDF Report API | 662.65 ms | 0.00 MB | 0.00 MB |
| Staff Semester Result API | 1437.68 ms | 0.00 MB | 0.00 MB |
| Mentor Students List API | 6.10 ms | 0.00 MB | 0.00 MB |
| Mentor Meetings API | 2.98 ms | 0.00 MB | 0.00 MB |
| Mentor PDFs File Tree API | 3.24 ms | 0.00 MB | 0.00 MB |
| Health Check | 0.82 ms | 0.00 MB | 0.00 MB |
| List Batches API | 2.53 ms | 0.00 MB | 0.00 MB |


---
*Generated automatically by benchmarking monitor.*
