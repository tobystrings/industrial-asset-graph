"""Release the preview server and its npm/Node children after browser tests."""
import os
import subprocess


def stop_preview(server):
    if server.poll() is not None:
        return
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(server.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    else:
        server.terminate()
