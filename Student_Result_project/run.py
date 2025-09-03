import subprocess
import webbrowser
import time

# Start Flask (backend)
flask = subprocess.Popen(["flask", "run"], cwd="backend")

# Start Vite (frontend)
vite = subprocess.Popen([r"C:\Users\CHEKI\AppData\Roaming\npm\npm.cmd", "run", "dev"], cwd="frontend")


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
