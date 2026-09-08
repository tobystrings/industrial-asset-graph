from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path('artifacts/wulftec-3d').resolve()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    for name, width, height in [('desktop', 1440, 1000), ('phone', 390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto((output / 'Wulftec-360.html').as_uri())
        page.locator('.wulftec-canvas[data-ready=true]').wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
        page.screenshot(path=str(output / f'{name}-assembled.png'), full_page=True)
        canvas = page.locator('canvas')
        before = canvas.screenshot()
        canvas.focus()
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(200)
        assert before != canvas.screenshot(), 'Rotation failed'
        page.get_by_role('button', name='Explode', exact=True).click()
        page.wait_for_timeout(200)
        assert page.locator('#explosion').input_value() == '100'
        page.screenshot(path=str(output / f'{name}-exploded.png'), full_page=True)
        page.get_by_label('View', exact=True).select_option('carriage')
        page.wait_for_timeout(200)
        page.screenshot(path=str(output / f'{name}-carriage.png'), full_page=True)
        page.get_by_role('button', name='Assemble', exact=True).click()
        page.get_by_label('View', exact=True).select_option('machine')
        with page.expect_download() as download:
            page.get_by_role('button', name='Download current view (.glb)').click()
        download.value.save_as(str(output / 'Wulftec-WCRT-200.glb'))
        assert (output / 'Wulftec-WCRT-200.glb').read_bytes()[:4] == b'glTF'
        assert not errors, errors
        page.close()
    browser.close()
print('Standalone desktop/phone rotation, explosion, carriage and GLB export passed.')
