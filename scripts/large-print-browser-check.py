from browser_test_server import stop_preview
"""Readability sweep of all routes before the longer mutation/visual audit."""
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
from large_print_workflows import exercise_asset_forms

with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
server = subprocess.Popen(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', str(port), '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
base = f'http://127.0.0.1:{port}/industrial-asset-graph/'
routes = ['home','more','more&tools=records','more&tools=admin','more&tools=advanced','map','assets','asset&asset=L2-CC-001&tab=record','asset&asset=L2-CC-001&tab=intel','asset&asset=L2-CC-001&tab=docs','asset&asset=L2-CC-001&tab=capture','area&area=area-warehouse-e','documents','cabinet','wulftec','field','relationships','lines','documentation','maintenance&asset=L2-CC-001','dependencies','history','review','assetAdd','manage','connection','evidence','observation','setup','database','settings','conflicts','health','import','account','help']
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
            for route in routes:
                page.goto(base+'?page='+route, wait_until='networkidle')
                page.locator('.page-workspace').wait_for()
                try:
                    assert_large_print(page)
                    overflow = page.locator('.page-scroll').evaluate('el => el.scrollWidth > el.clientWidth + 1')
                    assert not overflow, 'Page has horizontal overflow'
                except Exception as error:
                    failures.append({'viewport':f'{width}x{height}', 'route':route, 'error':str(error)})
                    page.screenshot(path=f'artifacts/large-print-{width}-{route.split("&")[0]}.png')
            exercise_asset_forms(page, base, width)
            page.close()
            print(f'Checked {len(routes)} routes at {width}x{height}', flush=True)
        browser.close()
        Path('artifacts/large-print-results.json').write_text(json.dumps(failures, indent=2), encoding='utf-8')
        assert not failures, json.dumps(failures, indent=2)
        print('Large-print route sweep passed.', flush=True)
finally:
    stop_preview(server)
    server.wait(timeout=10)
