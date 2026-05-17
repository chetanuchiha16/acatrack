import subprocess
import threading
import time
import json
import psutil
from urllib.parse import urlparse
import psycopg2
import sys
import os

# Fallback DATABASE_URL
DATABASE_URL = os.environ.get("DATABASE_URL") or "postgresql://chetan:4myHina!@localhost:5432/acatrack?sslmode=disable"

ram_usage = []
db_connections = []
keep_running = True

def get_backend_processes():
    masters = []
    for p in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = p.info["cmdline"]
            if cmdline and "uvicorn" in " ".join(cmdline) and "main:app" in " ".join(cmdline):
                masters.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    all_procs = set()
    for m in masters:
        all_procs.add(m)
        try:
            for child in m.children(recursive=True):
                all_procs.add(child)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
            
    return list(all_procs)

def get_current_ram():
    processes = get_backend_processes()
    mem_total = 0
    for process in processes:
        try:
            mem_total += process.memory_info().rss / (1024 * 1024)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return mem_total

def monitor_resources():
    processes = get_backend_processes()
    if not processes:
        print("⚠️ Backend uvicorn process not found! RAM tracking will be disabled.")
    else:
        print(f"✅ Found {len(processes)} backend process(es) for RAM tracking.")

    # Clean up sslmode=disable for psycopg2
    clean_db_url = DATABASE_URL.split("?")[0]
    parsed = urlparse(clean_db_url)
    db_name = parsed.path.lstrip("/")
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
        )
        print("✅ Connected to PostgreSQL for DB Connection tracking.")
    except Exception as e:
        print(f"⚠️ Failed to connect to DB: {e}")
        conn = None

    while keep_running:
        mem_total = get_current_ram()
        if processes:
            ram_usage.append(mem_total)

        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        f"SELECT count(*) FROM pg_stat_activity WHERE datname = '{db_name}';"
                    )
                    count = cur.fetchone()[0]
                    db_connections.append(count)
            except Exception:
                pass

        time.sleep(0.5)

    if conn:
        conn.close()

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "test_outputs")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    summary_path = os.path.join(output_dir, "upload_k6_summary.json")
    report_path = os.path.join(output_dir, "upload_benchmark_report.md")

    # Measure RAM baseline before starting
    ram_baseline = get_current_ram()
    print("=" * 60)
    print("🚀 STARTING ISOLATED PDF-TO-EXCEL UPLOAD BENCHMARK")
    print(f"📊 Baseline Backend RAM: {ram_baseline:.2f} MB")
    print("=" * 60)

    # Start monitor thread
    monitor_thread = threading.Thread(target=monitor_resources)
    monitor_thread.start()

    time.sleep(1)

    print("\n🏃 Executing k6 isolated load test...")
    start_time = time.time()
    try:
        subprocess.run(
            ["k6", "run", "load_test_upload.js", f"--summary-export={summary_path}"],
            cwd=base_dir,
            check=True
        )
    except Exception as e:
        print(f"❌ k6 run failed: {e}")

    run_time = time.time() - start_time

    # Stop resource monitor
    global keep_running
    keep_running = False
    monitor_thread.join()

    # Analyze data
    max_ram = max(ram_usage) if ram_usage else ram_baseline
    avg_ram = sum(ram_usage) / len(ram_usage) if ram_usage else ram_baseline
    max_conn = max(db_connections) if db_connections else 0
    avg_conn = sum(db_connections) / len(db_connections) if db_connections else 0

    # Load k6 summary metrics
    try:
        with open(summary_path, "r") as f:
            k6_data = json.load(f)
    except FileNotFoundError:
        print("❌ Error: k6 summary export failed!")
        return

    metrics = k6_data.get("metrics", {})
    http_reqs = metrics.get("http_reqs", {})
    upload_trend = metrics.get("route_upload_api", {})
    http_req_failed = metrics.get("http_req_failed", {})

    p95_latency = upload_trend.get("p(95)", 0)
    avg_latency = upload_trend.get("avg", 0)

    # Count PDFs inside the target ZIP file
    import re
    import zipfile
    zip_path = None
    pdf_count = 0
    total_pdfs_processed = 0
    try:
        js_path = os.path.join(base_dir, "load_test_upload.js")
        if os.path.exists(js_path):
            with open(js_path, "r") as js_file:
                js_content = js_file.read()
                match = re.search(r"open\(['\"](.+?)['\"],", js_content)
                if match:
                    zip_path = match.group(1)
        if zip_path and os.path.exists(zip_path):
            with zipfile.ZipFile(zip_path, 'r') as zf:
                pdf_count = sum(1 for name in zf.namelist() if name.lower().endswith(".pdf"))
            total_pdfs_processed = pdf_count * int(http_reqs.get("count", 0))
    except Exception as zip_err:
        print(f"⚠️ Non-fatal: Failed to count PDFs in ZIP: {zip_err}")

    # Compile Markdown Report
    report = f"""# 📈 PDF-to-Excel Upload Benchmark Report

## ⏱️ Overview
- **ZIP File Audited**: `{os.path.basename(zip_path) if zip_path else 'Unknown'}`
- **PDFs Per ZIP Archive**: `{pdf_count}` PDFs
- **Total PDFs Processed**: `{total_pdfs_processed}` PDFs (across all requests)
- **Total Test Duration**: {run_time:.2f} seconds
- **Total Upload Requests**: {http_reqs.get("count", 0)}
- **Throughput Rate**: {http_reqs.get("rate", 0):.2f} reqs/sec
- **Failure Rate**: {http_req_failed.get("value", 0) * 100:.2f}%

## ⚡ Latency Metrics (Upload Route)
- **p(95) Response Time**: {p95_latency:.2f} ms (~{p95_latency/1000:.2f} seconds)
- **Average Response Time**: {avg_latency:.2f} ms (~{avg_latency/1000:.2f} seconds)
- **Maximum Response Time**: {upload_trend.get("max", 0):.2f} ms

## 💻 Backend Resource Utilization
- **Baseline RAM Usage**: {ram_baseline:.2f} MB
- **Peak RAM Usage**: {max_ram:.2f} MB
- **Net RAM Impact (Peak - Baseline)**: {max(0, max_ram - ram_baseline):.2f} MB
- **Average RAM Usage**: {avg_ram:.2f} MB
- **Max Database Connections**: {max_conn}
- **Average Database Connections**: {avg_conn:.2f}

---
*Report generated automatically by benchmark_upload.*
"""
    with open(report_path, "w") as f:
        f.write(report)

    print("\n" + "=" * 60)
    print("🎉 BENCHMARK RUN COMPLETED SUCCESSFULLY!")
    print(f"📄 Report written to: {report_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
