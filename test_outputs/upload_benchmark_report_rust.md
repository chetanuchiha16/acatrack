# 📈 PDF-to-Excel Upload Benchmark Report

## ⏱️ Overview
- **ZIP File Audited**: `2023_SEM5.zip`
- **PDFs Per ZIP Archive**: `327` PDFs
- **Total PDFs Processed**: `1308` PDFs (across all requests)
- **Upload Phase Duration**: 17.96 seconds
- **Background Parsing Duration**: 140.29 seconds (~2.34 minutes)
- **Average Background Parsing Speed**: 0.1073 seconds per PDF
- **Total Upload Requests**: 4
- **Throughput Rate**: 0.25 reqs/sec
- **Failure Rate**: 0.00%

## ⚡ Core Pipeline Metrics (Background Tasks)
- **Average Raw Rust Engine PDF Parsing Duration**: 28.98 seconds (~0.0886 seconds per PDF)
- **Average PostgreSQL Database Ingestion Duration**: 0.03 seconds

## ⚡ Latency Metrics (Upload Route)
- **p(95) Response Time**: 4836.72 ms (~4.84 seconds)
- **Average Response Time**: 2646.79 ms (~2.65 seconds)
- **Maximum Response Time**: 5303.91 ms

## 💻 Backend Resource Utilization
- **Baseline RAM Usage**: 411.80 MB
- **Peak RAM Usage**: 605.14 MB
- **Net RAM Impact (Peak - Baseline)**: 193.35 MB
- **Average RAM Usage**: 510.19 MB
- **Max Database Connections**: 2
- **Average Database Connections**: 2.00

---
*Report generated automatically by benchmark_upload.*
