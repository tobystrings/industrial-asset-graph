from pathlib import Path
import os
import subprocess
import time
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

output = Path('artifacts')
output.mkdir(exist_ok=True)

npm = 'npm.cmd' if os.name == 'nt' else 'npm'
server = subprocess.Popen(
    [npm, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.STDOUT,
)

def verify_pixels(path: Path) -> None:
    variation = max(ImageStat.Stat(Image.open(path).convert('RGB')).var)
    assert variation > 25, f'Rendered screenshot appears blank: variance={variation}'

try:
    time.sleep(2)
    with sync_playwright() as p:
        launch_args = {'headless': True}
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        if os.name == 'nt' and Path(chrome_path).exists():
            launch_args['executable_path'] = chrome_path
        browser = p.chromium.launch(**launch_args)
        errors = []
        for width, height in ((1366, 768), (1920, 1080)):
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' and '404 (Not Found)' not in message.text else None)
            page.goto('http://127.0.0.1:4174/industrial-asset-graph/?area=area-warehouse-f&asset=L2-CC-001', wait_until='networkidle')
            page.get_by_role('region', name='Building Layout').wait_for()
            page.get_by_role('heading', name='Building Layout').wait_for()
            assert 'asset=L2-CC-001' in page.url
            screenshot = output / f'dashboard-{width}x{height}.png'
            page.screenshot(path=str(screenshot), full_page=False)
            verify_pixels(screenshot)
            assert page.get_by_role('button', name='Open 3D').count() == 0

            page.goto('http://127.0.0.1:4174/industrial-asset-graph/?asset=L2-CC-001&trace=impact', wait_until='networkidle')
            page.get_by_test_id('troubleshoot-mode').wait_for()
            page.get_by_role('heading', name='Line 2 Conveyor Control Cabinet').wait_for()
            assert 'trace=impact' in page.url
            assert page.get_by_role('button', name='Failure impact').get_attribute('aria-pressed') == 'true'
            assert page.get_by_role('button', name='Clear / Exit').count() == 1
            assert page.get_by_text('Where the known graph ends').count() == 1
            troubleshoot_screenshot = output / f'troubleshoot-{width}x{height}.png'
            page.screenshot(path=str(troubleshoot_screenshot), full_page=False)
            verify_pixels(troubleshoot_screenshot)
            page.close()
        browser.close()
        assert not errors, f'Browser console errors: {errors}'
        print('Dashboard map and Troubleshoot / Impact Mode passed at 1366x768 and 1920x1080; no legacy 3D entry point is present.')
finally:
    server.terminate()
    server.wait(timeout=10)
