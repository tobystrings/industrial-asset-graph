from pathlib import Path
import subprocess
import time
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

output = Path('artifacts')
output.mkdir(exist_ok=True)
server = subprocess.Popen(['npm.cmd', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)

def verify_pixels(path: Path) -> None:
    variation = max(ImageStat.Stat(Image.open(path).convert('RGB')).var)
    assert variation > 25, f'Rendered screenshot appears blank: variance={variation}'

try:
    time.sleep(2)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        errors = []
        for width, height in ((1366, 768), (1920, 1080)):
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' and '404 (Not Found)' not in message.text else None)
            page.goto('http://127.0.0.1:4174/industrial-asset-graph/', wait_until='networkidle')
            page.get_by_role('group', name='Interactive J. Lieb facility layout').wait_for()
            page.get_by_role('button', name='Warehouse F, In progress, 1 assets').click()
            page.get_by_role('button', name='FG-L4-MTN-001 L4 Meta Case Former').click()
            page.get_by_role('heading', name='FG-L4-MTN-001').wait_for()
            assert 'asset=FG-L4-MTN-001' in page.url
            assert page.get_by_text('MT081619A / tag 1619A').count() == 1
            screenshot = output / f'dashboard-{width}x{height}.png'
            page.screenshot(path=str(screenshot), full_page=False)
            verify_pixels(screenshot)
            page.get_by_role('button', name='Open 3D').click()
            page.locator('canvas').wait_for(timeout=20000)
            page.get_by_role('button', name='Facility dashboard').click()
            page.get_by_role('group', name='Interactive J. Lieb facility layout').wait_for()
            page.close()
        browser.close()
        assert not errors, f'Browser console errors: {errors}'
        print('Dashboard interaction and 2D/3D toggle passed at 1366x768 and 1920x1080.')
finally:
    server.terminate()
    server.wait(timeout=10)
