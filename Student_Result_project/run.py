import subprocess
import webbrowser
import time
import sys

# Start Flask (backend)
flask = subprocess.Popen([sys.executable, "-m", "flask", "run"], cwd="backend")

# Start Vite (frontend) - fixed for Windows
vite = subprocess.Popen("npm run dev", cwd="frontend", shell=True)

# Give Vite a few seconds to start before opening the browser
time.sleep(5)

# Open the React app (Vite default port is 5173)
webbrowser.open("http://localhost:5173")

try:
    flask.wait()
    vite.wait()
except KeyboardInterrupt:
    print("\nShutting down gracefully...")
    flask.terminate()
    vite.terminate()
