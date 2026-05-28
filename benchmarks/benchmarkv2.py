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
    # Identify the master processes
    masters = []
    for p in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = p.info["cmdline"]
            if cmdline and "uvicorn" in " ".join(cmdline) and "main:app" in " ".join(cmdline):
                masters.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    # Collect all masters and their children (the actual workers)
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
        print("⚠️ Backend process 'uvicorn main:app' not found! RAM will not be tracked.")
    else:
        print(f"✅ Found {len(processes)} backend process(es) for RAM tracking.")

    # Connect to DB
    parsed = urlparse(DATABASE_URL)
    db_name = parsed.path.lstrip("/")
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port,
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
        match = re.search(r"test(\d+)", f)
        if match:
            numbers.append(int(match.group(1)))

    return max(numbers) + 1 if numbers else 1


def calculate_p95(data):
    if not data:
        return 0
    sorted_data = sorted(data)
    index = int(len(sorted_data) * 0.95)
    return sorted_data[min(index, len(sorted_data) - 1)]


def run_single_user_baseline(base_dir):
    print(
        "📋 Running Single User Baseline (1 VU, 10 Iterations with P95 RAM tracking)..."
    )

    routes = [
        "Student Analysis API",
        "Chart Generation API",
        "PDF Report API",
        "Overall Res API",
        "Staff PDF Report API",
        "Staff Semester Result API",
        "Mentor Students List API",
        "Mentor Meetings API",
        "Mentor PDFs File Tree API",
        "Parent Student Details API",
        "Health Check",
        "List Batches API",
    ]

    results = []

    for route in routes:
        print(f"  - Testing: {route}...")
        baseline_summary_path = os.path.join(
            base_dir, "test_outputs", f"baseline_{route.replace(' ', '_')}.json"
        )

        # Local monitor for high-frequency sampling
        route_ram_samples = []
        route_stop = False

        def route_monitor():
            while not route_stop:
                route_ram_samples.append(get_current_ram())
                time.sleep(0.2)

        # Measure baseline before starting
        ram_baseline = get_current_ram()

        monitor_thread = threading.Thread(target=route_monitor)
        monitor_thread.start()

        try:
            # Running 10 iterations to get a stable P95
            # --no-thresholds: Prevents exit code 99 from routes that weren't executed
            # in this filter run having zero-data threshold failures
            subprocess.run(
                [
                    "k6",
                    "run",
                    os.path.join(base_dir, "load_tests", "load_testv2.js"),
                    "--vus",
                    "1",
                    "--iterations",
                    "10",
                    "--no-thresholds",
                    f"--summary-export={baseline_summary_path}",
                    "-e",
                    f"ROUTE_FILTER={route}",
                ],
                cwd=base_dir,
                check=True,
                capture_output=True,
            )

            time.sleep(0.5)
            route_stop = True
            monitor_thread.join()

            p95_ram = calculate_p95(route_ram_samples)
            p95_impact = max(0, p95_ram - ram_baseline)
            avg_impact = (
                max(0, (sum(route_ram_samples) / len(route_ram_samples)) - ram_baseline)
                if route_ram_samples
                else 0
            )

            with open(baseline_summary_path, "r") as f:
                data = json.load(f)
                b_metrics = parse_k6_metrics(data)
                if b_metrics:
                    metric = next((m for m in b_metrics if m["name"] == route), None)
                    if not metric:
                        metric = b_metrics[0]

                    metric["ram_impact"] = avg_impact
                    metric["p95_ram_impact"] = p95_impact
                    results.append(metric)

            if os.path.exists(baseline_summary_path):
                os.remove(baseline_summary_path)

        except Exception as e:
            print(f"    ⚠️ Baseline run failed for {route}: {e}")
            route_stop = True
            if monitor_thread.is_alive():
                monitor_thread.join()

    return results


def parse_k6_metrics(summary_data):
    metrics = summary_data.get("metrics", {})
    route_metrics = []

    # Look through the metrics for anything starting with 'route_'
    for key, value in metrics.items():
        if key.startswith("route_"):
            # Format: route_student_analysis_api
            name_part = key.replace("route_", "")
            route_name = (
                name_part.replace("_", " ")
                .title()
                .replace("Api", "API")
                .replace("Pdf", "PDF")
            )

            # k6 summary structure: { "avg": ..., "p(95)": ... }
            # Use avg > 0 to detect if the route was actually executed
            avg_val = value.get("avg", 0)
            if avg_val > 0:
                route_metrics.append(
                    {
                        "name": route_name,
                        "avg": avg_val,
                        "p95": value.get("p(95)", 0),
                        "max": value.get("max", 0),
                        "count": value.get(
                            "count", 0
                        ),  # Still try to get count if available
                    }
                )
    return route_metrics


if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ROOT_DIR = os.path.dirname(BASE_DIR)
    OUTPUT_DIR = os.path.join(ROOT_DIR, "test_outputs")

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    next_test_num = get_next_test_number(OUTPUT_DIR)
    summary_filename = f"summaryv2-test{next_test_num}.json"
    report_filename = f"load_test_reportv2-test{next_test_num}.md"
    summary_path = os.path.join(OUTPUT_DIR, summary_filename)
    report_path = os.path.join(OUTPUT_DIR, report_filename)

    # 1. Baseline
    baseline_data = run_single_user_baseline(ROOT_DIR)

    # 2. Start Load Test Monitor
    print(f"🚀 Starting Resource Benchmark Monitor (Test #{next_test_num})...")
    monitor_thread = threading.Thread(target=monitor_resources)
    monitor_thread.start()

    time.sleep(1)

    print(f"\n🏃 Running k6 load test (Results: {summary_filename})...\n")
    start_time = time.time()
    try:
        load_test_file = os.path.join(ROOT_DIR, "load_tests", "load_testv2.js")
        subprocess.run(
            ["k6", "run", load_test_file, f"--summary-export={summary_path}"],
            cwd=ROOT_DIR,
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
    p95_ram = calculate_p95(ram_usage)
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

    # Map baseline info for table columns
    baseline_map = {r["name"]: r for r in (baseline_data or [])}

    # Sort by P95
    route_metrics.sort(key=lambda x: x["p95"], reverse=True)
    slowest = route_metrics[:5]
    fastest = sorted(route_metrics, key=lambda x: x["p95"])[:5]

    # Baseline table
    baseline_table = ""
    if baseline_data:
        baseline_table = "| Route | Latency (avg) | Avg RAM Impact | P95 RAM Impact |\n|-------|---------------|----------------|----------------|\n"
        for r in baseline_data:
            baseline_table += f"| {r['name']} | {r['avg']:.2f} ms | {r['ram_impact']:.2f} MB | {r['p95_ram_impact']:.2f} MB |\n"

    md_content = f"""# 📈 Load Testing Results Report (Test #{next_test_num})

## ⏱️ Overview
- **Total Test Duration**: {run_time_seconds:.2f} seconds
- **Total Assertions**: {check_rate * 100:.2f}% Check Success
- **Total HTTP Requests**: {http_reqs_total.get("count", 0)}
- **Requests per Second**: {http_reqs_total.get("rate", 0):.2f}
- **Failure Rate**: {(http_req_failed.get("passes", 0) / max(1, http_reqs_total.get("count", 1)) * 100):.2f}%

## 💻 Resource Utilization (Backend)
- **Max RAM Usage**: {max_ram:.2f} MB
- **P95 RAM Usage**: {p95_ram:.2f} MB
- **Average RAM Usage**: {avg_ram:.2f} MB
- **Max Database Connections**: {max_conn}
- **Average Database Connections**: {avg_conn:.2f}
"""

    if baseline_data:
        # Sort by P95 RAM impact for highlights
        ram_sorted = sorted(
            baseline_data, key=lambda x: x["p95_ram_impact"], reverse=True
        )
        md_content += f"""
### 🧠 RAM Highlights (Per Route Baseline)
- **Maximum P95 RAM Impact**: {ram_sorted[0]["name"]} ({ram_sorted[0]["p95_ram_impact"]:.2f} MB)
- **Minimum P95 RAM Impact**: {ram_sorted[-1]["name"]} ({ram_sorted[-1]["p95_ram_impact"]:.2f} MB)
"""

    md_content += f"""
## ⚡ HTTP Metrics
- **Average Response Time**: {http_req_duration.get("avg", 0):.2f} ms
- **P90 Response Time**: {http_req_duration.get("p(90)", 0):.2f} ms
- **P95 Response Time**: {http_req_duration.get("p(95)", 0):.2f} ms
- **Max Response Time**: {http_req_duration.get("max", 0):.2f} ms

## 🐢 Slowest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
"""
    for r in slowest:
        ram_impact = baseline_map.get(r["name"], {}).get("p95_ram_impact", 0)
        md_content += f"| {r['name']} | {r['p95']:.2f} ms | {r['avg']:.2f} ms | {ram_impact:.2f} MB |\n"

    md_content += """
## 🚀 Fastest Routes (by P95)
| Route | P95 Latency | Avg Latency | P95 RAM Impact |
|-------|-------------|-------------|----------------|
"""
    for r in fastest:
        ram_impact = baseline_map.get(r["name"], {}).get("p95_ram_impact", 0)
        md_content += f"| {r['name']} | {r['p95']:.2f} ms | {r['avg']:.2f} ms | {ram_impact:.2f} MB |\n"

    if baseline_table:
        md_content += f"""
## 👤 Single User Baseline (10 Iterations)
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
