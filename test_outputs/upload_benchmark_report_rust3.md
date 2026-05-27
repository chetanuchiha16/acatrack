# 📈 PDF-to-Excel Upload Benchmark Report

## ⏱️ Overview
- **ZIP File Audited**: `2023_SEM5.zip`
- **PDFs Per ZIP Archive**: `327` PDFs
- **Total PDFs Processed**: `1308` PDFs (across all requests)
- **Upload Phase Duration**: 36.89 seconds
- **Background Parsing Duration**: 34.06 seconds (~0.57 minutes)
- **Average Background Parsing Speed**: 0.0260 seconds per PDF
- **Total Upload Requests**: 4
- **Throughput Rate**: 0.12 reqs/sec
- **Failure Rate**: 0.00%

## ⚡ Core Pipeline Metrics (Background Tasks)
- **Average Raw Rust Engine PDF Parsing Duration**: 7.26 seconds (~0.0222 seconds per PDF)
- **Average PostgreSQL Database Ingestion Duration**: 0.03 seconds

## ⚡ Latency Metrics (Upload Route)
- **p(95) Response Time**: 16747.44 ms (~16.75 seconds)
- **Average Response Time**: 7444.28 ms (~7.44 seconds)
- **Maximum Response Time**: 18077.52 ms

## 💻 Backend Resource Utilization
- **Baseline RAM Usage**: 522.16 MB
- **Peak RAM Usage**: 705.41 MB
- **Net RAM Impact (Peak - Baseline)**: 183.25 MB
- **Average RAM Usage**: 615.14 MB
- **Max Database Connections**: 4
- **Average Database Connections**: 4.00

---
*Report generated automatically by benchmark_upload.*
