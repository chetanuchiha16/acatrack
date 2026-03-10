import subprocess
import threading
import time
import json
import psutil
from urllib.parse import urlparse
import psycopg2
import sys
import os
import re

# DATABASE_URL = "postgresql://chetan:4myHina!@10.49.58.115:5432/gp_normalised"
DATABASE_URL = "postgresql://chetan:4myHina!@localhost:5432/gp_normalised"

ram_usage = []
db_connections = []
keep_running = True

def get_backend_processes():
    # Because uvicorn/flask might spawn workers, we collect all python processes running app.py
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = p.info['cmdline']
            if cmdline and 'app.py' in " ".join(cmdline):
                procs.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return procs

def monitor_resources():
    processes = get_backend_processes()
    if not processes:
        print("⚠️ Backend process 'app.py' not found! RAM will not be tracked.")
    else:
        print(f"✅ Found {len(processes)} backend process(es) for RAM tracking.")
    
    # Connect to DB
    parsed = urlparse(DATABASE_URL)
    db_name = parsed.path.lstrip('/')
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port
        )
        print("✅ Connected to PostgreSQL for DB Connection tracking.")
    except Exception as e:
        print(f"⚠️ Failed to connect to DB: {e}")
        conn = None

    while keep_running:
        mem_total = 0
        for process in processes:
            try:
                # Get memory in MB
                mem_total += process.memory_info().rss / (1024 * 1024)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        if processes:
            ram_usage.append(mem_total)
        
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT count(*) FROM pg_stat_activity WHERE datname = '{db_name}';")
                    count = cur.fetchone()[0]
                    db_connections.append(count)
            except Exception as e:
                pass
                
        time.sleep(1)

    if conn:
        conn.close()

def get_next_test_number(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        return 1
    
    files = os.listdir(directory)
    numbers = []
    for f in files:
        match = re.search(r'test(\d+)', f)
        if match:
            numbers.append(int(match.group(1)))
    
    return max(numbers) + 1 if numbers else 1

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    OUTPUT_DIR = os.path.join(BASE_DIR, "test_outputs")
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    next_test_num = get_next_test_number(OUTPUT_DIR)
    summary_filename = f"summaryv2-test{next_test_num}.json"
    report_filename = f"load_test_reportv2-test{next_test_num}.md"
    summary_path = os.path.join(OUTPUT_DIR, summary_filename)
    report_path = os.path.join(OUTPUT_DIR, report_filename)

    print(f"🚀 Starting Resource Benchmark Monitor (Test #{next_test_num})...")
    monitor_thread = threading.Thread(target=monitor_resources)
    monitor_thread.start()

    # Give it a second to connect
    time.sleep(1)

    print(f"\n🏃 Running k6 load test (Results: {summary_filename})...\n")
    # Execute k6
    start_time = time.time()
    try:
        subprocess.run(
            ["k6", "run", "load_testv2.js", f"--summary-export={summary_path}"],
            cwd=BASE_DIR,
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"❌ k6 run failed: {e}")
    run_time_seconds = time.time() - start_time
    
    # Stop monitor
    keep_running = False
    monitor_thread.join()

    # Calculate metrics
    avg_ram = sum(ram_usage) / len(ram_usage) if ram_usage else 0
    max_ram = max(ram_usage) if ram_usage else 0
    avg_conn = sum(db_connections) / len(db_connections) if db_connections else 0
    max_conn = max(db_connections) if db_connections else 0
    
    # Read k6 summary
    summary_data = {}
    try:
        with open(summary_path, "r") as f:
            summary_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ {summary_filename} not found! Unable to generate full report.")
        sys.exit(1)

    metrics = summary_data.get("metrics", {})
    http_reqs = metrics.get("http_reqs", {})
    http_req_duration = metrics.get("http_req_duration", {})
    http_req_failed = metrics.get("http_req_failed", {})
    checks = metrics.get("checks", {})
    check_rate = (checks.get("passes", 0) / (checks.get("passes", 1) + checks.get("fails", 0))) if checks else 0
    
    total_time = run_time_seconds

    md_content = f"""# 📈 Load Testing Results Report (Test #{next_test_num})

## ⏱️ Overview
- **Total Test Duration**: {total_time:.2f} seconds
- **Total Assertions**: {check_rate*100:.2f}% Check Success
- **Total HTTP Requests**: {http_reqs.get('count', 0)}
- **Requests per Second**: {http_reqs.get('rate', 0):.2f}
- **Failure Rate**: {(http_req_failed.get('passes', 0) / max(1, http_reqs.get('count', 1)) * 100):.2f}%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: {max_ram:.2f} MB
- **Average RAM Usage**: {avg_ram:.2f} MB
- **Max Database Connections**: {max_conn}
- **Average Database Connections**: {avg_conn:.2f}

## ⚡ HTTP Metrics
- **Average Response Time**: {http_req_duration.get('avg', 0):.2f} ms
- **P90 Response Time**: {http_req_duration.get('p(90)', 0):.2f} ms
- **P95 Response Time**: {http_req_duration.get('p(95)', 0):.2f} ms
- **Max Response Time**: {http_req_duration.get('max', 0):.2f} ms

---
*Generated automatically by benchmarking monitor.*
"""
    with open(report_path, "w") as f:
        f.write(md_content)
    
    print(f"\n🎉 Report generated successfully as {report_path}")
