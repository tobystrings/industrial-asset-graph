from pathlib import Path
import os
import subprocess
import time
import socket
from playwright.sync_api import sync_playwright, expect
from auth_test_fixture import install_auth_fixture, sign_in

npm = 'npm.cmd' if os.name == 'nt' else 'npm'
with socket.socket() as available_port:
    available_port.bind(('127.0.0.1', 0))
    preview_port = available_port.getsockname()[1]
server = subprocess.Popen([npm, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', str(preview_port), '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
base = f'http://127.0.0.1:{preview_port}/industrial-asset-graph/?facilityId=test-facility&map=2d'

def drag_percent(page, selector: str, start: tuple[float, float], end: tuple[float, float]):
    page.locator(selector).scroll_into_view_if_needed()
    box = page.locator(selector).bounding_box()
    assert box, f'No bounds for {selector}'
    sx, sy = box['x'] + box['width'] * start[0], box['y'] + box['height'] * start[1]
    ex, ey = box['x'] + box['width'] * end[0], box['y'] + box['height'] * end[1]
    page.mouse.move(sx, sy); page.mouse.down(); page.mouse.move(ex, ey, steps=8); page.mouse.up()

def enter_editor(page):
    page.get_by_role('button', name='Edit map', exact=True).click()
    page.locator('.map-editor-shell').wait_for(state='visible', timeout=10000)
    page.get_by_role('button', name='Select', exact=True).click()


def tool(page, name):
    drawing = {'Wall / Line','Freehand','Text / Label','Freehand Eraser'}
    button = page.get_by_role('button', name=name, exact=True)
    if not button.is_visible():
        page.get_by_role('button', name=('Drawing & notes' if name in drawing else 'Areas & shapes'), exact=False).click()
    button.click()

def save(page):
    page.get_by_role('button', name='Save Changes', exact=True).click()
    page.get_by_role('button',name='Save Changes',exact=True).wait_for(state='visible')
    page.wait_for_function("() => [...document.querySelectorAll('button')].some(b=>b.textContent==='Save Changes' && b.disabled)")

try:
    time.sleep(1.5)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, service_workers='block')
        page = context.new_page()
        install_auth_fixture(page)
        console_issues = []
        # The harness blocks workers so Auth requests cannot escape its network fixture.
        # Ignore only Playwright's notice about that explicit test setting.
        page.on('console', lambda message: console_issues.append(f'{message.type}: {message.text}') if message.type in ('error', 'warning') and message.text != 'Service Worker registration blocked by Playwright' else None)
        page.goto(base, wait_until='networkidle')
        sign_in(page)

        # Scenario 1: rename and durable reload.
        enter_editor(page)
        page.locator('[aria-label="Edit area Synthetic Test Area"]').click()
        page.get_by_label('Area name').fill('Browser Renamed Test Area')
        save(page)
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('Browser Renamed Test Area', exact=True).first).to_be_attached()

        # Scenario 2/3: add an area, create then remove a wall, merge, and preserve the asset.
        enter_editor(page)
        dialogs = iter(['Browser Added Area', 'browser-added-area'])
        def accept_add_area(dialog): dialog.accept(next(dialogs))
        page.on('dialog', accept_add_area)
        tool(page, 'Add Rectangle')
        drag_percent(page, '.map-editor-svg', (.251, .05), (.42, .25))
        page.wait_for_timeout(200)
        page.remove_listener('dialog', accept_add_area)
        assert page.locator('[aria-label="Edit area Browser Added Area"]').count() == 1
        tool(page, 'Wall / Line')
        drag_percent(page, '.map-editor-svg', (.251, .05), (.251, .25))
        wall = page.locator('.map-editor-walls polyline').last
        tool(page, 'Select')
        wall.click(force=True)
        tool(page, 'Delete')
        assert page.locator('.map-editor-walls polyline').count() == 0
        tool(page, 'Multi-select')
        page.locator('[aria-label="Edit area Browser Renamed Test Area"]').click()
        page.locator('[aria-label="Edit area Browser Added Area"]').click()
        page.once('dialog', lambda dialog: dialog.accept('Browser Combined Area'))
        tool(page, 'Merge Areas')
        save(page)
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('Browser Combined Area', exact=True).first).to_be_attached()
        assert page.get_by_text('SYNTH-ASSET-001', exact=True).count() == 0  # map view does not manufacture asset labels
        page.goto(f'{base}&view=assets', wait_until='networkidle')
        assert page.get_by_text('SYNTH-ASSET-001', exact=True).count() > 0

        # Scenario 4: undo, redo, and Cancel discard a draft geometry change.
        page.goto(base, wait_until='networkidle')
        enter_editor(page)
        page.locator('[aria-label="Edit area Browser Combined Area"]').click()
        page.locator('.map-editor-selection-actions').get_by_role('button', name='→').click()
        page.get_by_role('button', name='Undo', exact=True).click()
        page.get_by_role('button', name='Redo', exact=True).click()
        page.once('dialog', lambda dialog: dialog.accept())
        page.get_by_role('button', name='Cancel / Exit', exact=True).click()
        assert page.locator('.map-editor-shell').count() == 0
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('Browser Combined Area', exact=True).first).to_be_attached()

        # Scenario 5: non-authoritative freehand + text markup, erasure, and persisted markup.
        enter_editor(page)
        tool(page, 'Freehand')
        drag_percent(page, '.map-editor-svg', (.58, .18), (.68, .28))
        tool(page, 'Text / Label')
        page.once('dialog', lambda dialog: dialog.accept('Synthetic markup only'))
        page.locator('.map-editor-svg').scroll_into_view_if_needed()
        box = page.locator('.map-editor-svg').bounding_box(); assert box
        page.mouse.click(box['x'] + box['width'] * .65, box['y'] + box['height'] * .35)
        tool(page, 'Select')
        page.get_by_text('Synthetic markup only', exact=True).click()
        tool(page, 'Freehand Eraser')
        assert page.get_by_text('Synthetic markup only', exact=True).count() == 0
        save(page)
        page.reload(wait_until='networkidle')
        enter_editor(page)
        assert page.locator('.map-editor-annotations polyline').count() == 1
        assert page.get_by_text('SYNTH-ASSET-001', exact=True).count() == 0

        # Scenario 6: tablet and phone controls remain reachable with no page-level overflow.
        for width, height in [(1024, 768), (390, 844)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.wait_for_timeout(150)
            metrics = page.evaluate("""() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, save: !![...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Save Changes' && b.getBoundingClientRect().right <= innerWidth + 1), toolbar: getComputedStyle(document.querySelector('.map-studio-tabs')).display })""")
            assert metrics['overflow'] <= 1, metrics
            assert metrics['save'], metrics
            assert metrics['toolbar'] in ('flex', 'grid'), metrics

        # Remove only this script's synthetic browser data and identity.
        page.evaluate("""() => new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase('industrial-asset-graph-runtime--facility-synthetic-test'); request.onsuccess = () => resolve(true); request.onerror = () => reject(request.error); request.onblocked = () => resolve(false); })""")
        page.evaluate("() => localStorage.removeItem('iag-change-control-user')")
        assert not console_issues, console_issues
        context.close(); browser.close()
        print('Map editor browser check passed: rename, add, wall removal, merge, asset preservation, undo/redo/cancel, markup isolation, reload persistence, tablet, and phone.')
finally:
    server.terminate()
    try: server.wait(timeout=5)
    except subprocess.TimeoutExpired: server.kill()
