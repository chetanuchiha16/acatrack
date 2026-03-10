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
        mem_total = get_current_ram()
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

def run_single_user_baseline(base_dir):
    print("📋 Running Single User Baseline (1 VU, Sequential Requests)...")
    baseline_summary_path = os.path.join(base_dir, "test_outputs", "baseline_summary.json")
    try:
        # We run for slightly longer to ensure metrics are captured
        subprocess.run(
            ["k6", "run", "load_testv2.js", "--vus", "1", "--iterations", "1", f"--summary-export={baseline_summary_path}"],
            cwd=base_dir,
            check=True,
            capture_output=True
        )
        with open(baseline_summary_path, "r") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"⚠️ Baseline run failed: {e}")
        return None

def parse_k6_metrics(summary_data):
    metrics = summary_data.get("metrics", {})
    route_metrics = []
    
    # Look through the metrics for anything starting with 'route_'
    for key, value in metrics.items():
        if key.startswith("route_"):
            # Format: route_student_analysis_api
            name_part = key.replace("route_", "")
            route_name = name_part.replace("_", " ").title().replace("Api", "API").replace("Pdf", "PDF")
            
            # k6 summary structure: { "avg": ..., "p(95)": ..., "count": ... }
            route_metrics.append({
                "name": route_name,
                "avg": value.get("avg", 0),
                "p95": value.get("p(95)", 0),
                "max": value.get("max", 0),
                "count": value.get("count", 0)  # Count might be missing in some k6 versions/configs
            })
    return route_metrics

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

    # 1. Baseline
    baseline_data = run_single_user_baseline(BASE_DIR)

    # 2. Start Load Test Monitor
    print(f"🚀 Starting Resource Benchmark Monitor (Test #{next_test_num})...")
    monitor_thread = threading.Thread(target=monitor_resources)
    monitor_thread.start()

    time.sleep(1)

    print(f"\n🏃 Running k6 load test (Results: {summary_filename})...\n")
    start_time = time.time()
    try:
        subprocess.run(
            ["k6", "run", "load_testv2.js", f"--summary-export={summary_path}"],
            cwd=BASE_DIR,
            # We don't check=True because thresholds might fail (expectedly)
        )
    except Exception as e:
        print(f"❌ k6 run failed: {e}")
    run_time_seconds = time.time() - start_time
    
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
        print(f"❌ {summary_filename} not found! Unable to generate report.")
        sys.exit(1)

    metrics = summary_data.get("metrics", {})
    print(f"DEBUG: Summary metric keys: {list(metrics.keys())}")
    
    http_reqs_total = metrics.get("http_reqs", {})
    http_req_duration = metrics.get("http_req_duration", {})
    http_req_failed = metrics.get("http_req_failed", {})
    checks = metrics.get("checks", {})
    check_passes = checks.get("passes", 0)
    check_fails = checks.get("fails", 0)
    check_total = check_passes + check_fails
    check_rate = (check_passes / check_total) if check_total > 0 else 0
    
    # Extract route metrics
    route_metrics = parse_k6_metrics(summary_data)
    
    # Sort by P95
    route_metrics.sort(key=lambda x: x["p95"], reverse=True)
    slowest = route_metrics[:5]
    fastest = sorted(route_metrics, key=lambda x: x["p95"])[:5]

    # Baseline table
    baseline_table = ""
    if baseline_data:
        baseline_routes = parse_k6_metrics(baseline_data)
        if baseline_routes:
            baseline_table = "| Route | Latency (avg) | Count |\n|-------|---------------|-------|\n"
            for r in baseline_routes:
                baseline_table += f"| {r['name']} | {r['avg']:.2f} ms | {int(r['count'])} |\n"

    md_content = f"""# 📈 Load Testing Results Report (Test #{next_test_num})

## ⏱️ Overview
- **Total Test Duration**: {run_time_seconds:.2f} seconds
- **Total Assertions**: {check_rate*100:.2f}% Check Success
- **Total HTTP Requests**: {http_reqs_total.get('count', 0)}
- **Requests per Second**: {http_reqs_total.get('rate', 0):.2f}
- **Failure Rate**: {(http_req_failed.get('passes', 0) / max(1, http_reqs_total.get('count', 1)) * 100):.2f}%

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

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | Requests |
|-------|-------------|-------------|----------|
"""
    for r in slowest:
        md_content += f"| {r['name']} | {r['p95']:.2f} ms | {r['avg']:.2f} ms | {int(r['count'])} |\n"

    md_content += """
## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | Requests |
|-------|-------------|-------------|----------|
"""
    for r in fastest:
        md_content += f"| {r['name']} | {r['p95']:.2f} ms | {r['avg']:.2f} ms | {int(r['count'])} |\n"

    if baseline_table:
        md_content += f"""
## 👤 Single User Baseline
{baseline_table}
"""
    else:
        md_content += "\n## 👤 Single User Baseline\n*No baseline data available (ensure Trends are recorded properly).*\n"

    md_content += """
---
*Generated automatically by benchmarking monitor.*
"""
    with open(report_path, "w") as f:
        f.write(md_content)
    
    print(f"\n🎉 Report generated successfully as {report_path}")
