"""Photo-first inventory workflow on desktop, tablet, and phone."""
from pathlib import Path
import json
import os
import socket
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture, sign_in
from large_print_visual import assert_large_print
from inventory_visual import exercise_inventory

def geometry(page):
    assert_large_print(page)
    assert not page.locator(".page-scroll").evaluate("el => el.scrollWidth > el.clientWidth + 1")

def screenshot(page, name):
    page.screenshot(path=f"artifacts/{name}.png")


with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
server = subprocess.Popen(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', str(port), '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
base = f'http://127.0.0.1:{port}/industrial-asset-graph/'
try:
    for attempt in range(60):
        try:
            urllib.request.urlopen(base, timeout=1).close()
            break
        except OSError:
            time.sleep(.5)
    with sync_playwright() as p:
        args = {'headless': True}
        if os.name == 'nt':
            args['executable_path'] = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser = p.chromium.launch(**args)
        failures = []
        for width, height in [(1366,768), (768,1024), (390,844)]:
            page = browser.new_page(viewport={'width':width,'height':height}, service_workers='block')
            install_auth_fixture(page)
            page.goto(base, wait_until='networkidle')
            sign_in(page)
            try:
                exercise_inventory(page, base, str(width), screenshot, geometry)
            except Exception:
                page.screenshot(path=f"artifacts/FAIL-inventory-{width}.png")
                Path(f"artifacts/FAIL-inventory-{width}.txt").write_text(page.locator("body").inner_text(),encoding="utf-8")
                raise
            page.close()
            print(f"Inventory workflow passed at {width}x{height}", flush=True)
        browser.close()
        Path('artifacts/inventory-results.json').write_text(json.dumps(failures, indent=2), encoding='utf-8')
        assert not failures, json.dumps(failures, indent=2)
        print('Inventory workflow passed.', flush=True)
finally:
    server.terminate()
    server.wait(timeout=10)
