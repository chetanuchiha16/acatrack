import subprocess
import time
import sys
import os

try:
    pid_out = subprocess.check_output(["pgrep", "-f", ".venv/bin/python3.*uvicorn"]).decode().strip()
    pids = [int(p) for p in pid_out.split('\n') if p.strip()]
    if not pids:
        raise ValueError()
    # Choose the actual python process executing the app
    pid = pids[0]
except Exception:
    print("Uvicorn server is not running!")
    sys.exit(1)

print(f"Monitoring Uvicorn PID: {pid}")
print(f"{'Time (s)':8s} | {'CPU (%)':7s} | {'MEM (%)':7s} | {'RSS (MB)':10s}")
print("-" * 45)
start_time = time.time()
while True:
    try:
        if not os.path.exists(f"/proc/{pid}"):
            print(f"Process {pid} terminated.")
            break
        # Query stats via ps
        stats = subprocess.check_output(["ps", "-p", str(pid), "-o", "%cpu,%mem,rss"]).decode().strip().split('\n')[-1]
        parts = stats.split()
        if len(parts) >= 3:
            cpu, mem, rss_kb = parts[0], parts[1], parts[2]
            rss_mb = float(rss_kb) / 1024.0
            elapsed = int(time.time() - start_time)
            print(f"{elapsed:8d} | {cpu:7s} | {mem:7s} | {rss_mb:8.2f} MB")
        time.sleep(1)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
        break
    except Exception as e:
        print(f"Error reading stats: {e}")
        time.sleep(1)
