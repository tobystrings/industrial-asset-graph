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

BASE = 'http://127.0.0.1:4174/industrial-asset-graph/'
VIEWPORTS = (
    ('desktop-1920x1080', 1920, 1080),
    ('laptop-1366x768', 1366, 768),
    ('tablet-landscape-1024x768', 1024, 768),
    ('tablet-portrait-768x1024', 768, 1024),
    ('phone-large-430x932', 430, 932),
    ('phone-390x844', 390, 844),
    ('phone-landscape-844x390', 844, 390),
)
REPRESENTATIVE_STATES = {'laptop-1366x768', 'phone-390x844'}


def verify_pixels(path: Path) -> None:
    variation = max(ImageStat.Stat(Image.open(path).convert('RGB')).var)
    assert variation > 25, f'Rendered screenshot appears blank: variance={variation}'


def screenshot(page, name: str) -> Path:
    path = output / f'{name}.png'
    page.screenshot(path=str(path), full_page=False)
    verify_pixels(path)
    return path


def assert_manager_geometry(page) -> None:
    metrics = page.evaluate('''() => {
      const bar = document.querySelector('.iag-manager-bar');
      const shell = document.querySelector('.app-shell');
      if (!bar || !shell) return null;
      const rect = bar.getBoundingClientRect();
      const style = getComputedStyle(bar);
      const mapPanel = document.querySelector('.dashboard.workspace-map.view-dashboard > .map-panel');
      const mapRect = mapPanel?.getBoundingClientRect();
      const launcher = document.querySelector('.guide-launcher');
      const guideRect = launcher && getComputedStyle(launcher).display !== 'none' ? launcher.getBoundingClientRect() : null;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottomEdge: rect.bottom,
        height: rect.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        cssReserve: parseFloat(getComputedStyle(shell).getPropertyValue('--manager-bar-height')) || 0,
        cssBottom: parseFloat(style.bottom) || 0,
        overflowX: style.overflowX,
        maskImage: style.maskImage,
        mapBottom: mapRect?.bottom ?? null,
        guideBottom: guideRect?.bottom ?? null,
      };
    }''')
    assert metrics, 'Plant Manager toolbar did not render.'
    assert metrics['left'] >= -1, f"Manager bar starts outside viewport: {metrics}"
    assert metrics['right'] <= metrics['viewportWidth'] + 1, f"Manager bar extends outside viewport: {metrics}"
    assert metrics['top'] >= 0, f"Manager bar starts above viewport: {metrics}"
    assert metrics['bottomEdge'] <= metrics['viewportHeight'] + 1, f"Manager bar extends below viewport: {metrics}"
    minimum_reserve = metrics['height'] + max(0, metrics['cssBottom']) + 8
    assert metrics['cssReserve'] + 3 >= minimum_reserve, (
        f"Reserved manager-bar space is too small. reserve={metrics['cssReserve']} "
        f"required>={minimum_reserve}; metrics={metrics}"
    )
    if metrics['mapBottom'] is not None:
        assert metrics['mapBottom'] <= metrics['top'] + 2, f"Map workspace is hidden behind manager toolbar: {metrics}"
    if metrics['guideBottom'] is not None:
        assert metrics['guideBottom'] <= metrics['top'] + 2, f"Facility Guide overlaps manager toolbar: {metrics}"
    if metrics['viewportWidth'] <= 900:
        assert metrics['overflowX'] in ('auto', 'scroll'), f"Mobile toolbar should scroll horizontally: {metrics}"
        assert metrics['maskImage'] in ('none', ''), f"Mobile toolbar must not hide controls behind a mask: {metrics}"


def wait_for_dashboard(page) -> None:
    page.locator('section.reference-layout[aria-label="Building Layout"]').wait_for(state='visible', timeout=30000)
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    page.wait_for_timeout(250)


def close_editor(page) -> None:
    panel = page.locator('.iag-editor-panel')
    if panel.count() and panel.is_visible():
        panel.locator('header button[aria-label="Close"]').click()
        panel.wait_for(state='hidden')


def exercise_manager_states(page, label: str) -> None:
    manager = page.locator('.iag-manager-bar')

    manager.get_by_role('button', name='Users', exact=True).click()
    page.locator('.iag-editor-panel').wait_for(state='visible')
    screenshot(page, f'{label}-users')
    close_editor(page)

    manager.get_by_role('button', name='Manage', exact=True).click()
    page.locator('.iag-editor-panel').wait_for(state='visible')
    screenshot(page, f'{label}-manage-assets')
    close_editor(page)

    manager.get_by_role('button', name='Map Edit', exact=True).click()
    page.locator('.iag-map-edit-banner').wait_for(state='visible')
    screenshot(page, f'{label}-map-edit')
    manager.get_by_role('button', name='Map Edit', exact=True).click()
    page.locator('.iag-map-edit-banner').wait_for(state='hidden')


def exercise_workspace_states(page, label: str) -> None:
    page.goto(f'{BASE}?view=assets', wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-assets')
    assert_manager_geometry(page)

    page.goto(f'{BASE}?view=documents', wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-documents')
    assert_manager_geometry(page)

    page.goto(f'{BASE}?view=cabinet', wait_until='networkidle')
    page.get_by_role('heading', name='Line 2 Conveyor Control Cabinet').wait_for(state='visible', timeout=30000)
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-control-cabinet')
    assert_manager_geometry(page)


def diagnostic(page, label: str) -> None:
    try:
        screenshot(page, f'FAIL-{label}')
    except Exception:
        pass


try:
    time.sleep(2)
    with sync_playwright() as p:
        launch_args = {'headless': True}
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        if os.name == 'nt' and Path(chrome_path).exists():
            launch_args['executable_path'] = chrome_path
        browser = p.chromium.launch(**launch_args)
        failures = []

        for label, width, height in VIEWPORTS:
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
            console_errors = []
            page.on(
                'console',
                lambda message, errors=console_errors: errors.append(message.text)
                if message.type == 'error' and '404 (Not Found)' not in message.text
                else None,
            )
            try:
                page.goto(f'{BASE}?area=area-warehouse-f&asset=L2-CC-001&map=2d&tab=intel', wait_until='networkidle')
                wait_for_dashboard(page)
                assert_manager_geometry(page)
                screenshot(page, f'{label}-dashboard')

                if label in REPRESENTATIVE_STATES:
                    page.goto(f'{BASE}?area=area-building-c&map=2d&tab=overview', wait_until='networkidle')
                    wait_for_dashboard(page)
                    if label == 'phone-390x844':
                        page.get_by_role('button', name='Close map inspector').click()
                    layer_button = page.locator('.map-layer-control > button')
                    layer_metrics = layer_button.evaluate("el => { const r = el.getBoundingClientRect(); return { display: getComputedStyle(el).display, width: r.width, height: r.height }; }")
                    minimum_target = 40 if label == 'phone-390x844' else 36
                    assert layer_metrics['display'] != 'none' and layer_metrics['width'] >= minimum_target and layer_metrics['height'] >= minimum_target, f'Layer control is not usable: {layer_metrics}'
                    layer_button.evaluate('el => el.click()')
                    page.get_by_text('Reference symbols', exact=True).click()
                    assert page.locator('.svg-asset-marker.reference-only').count() == 13, 'Reference layer did not reveal all supplied map tags'
                    page.locator('.map-toolbar-search input').fill('Warehouse E')
                    page.locator('.map-search-results button').first.click()
                    page.wait_for_timeout(250)
                    assert 'area=area-warehouse-e' in page.url, 'Room search did not select the canonical Warehouse E state'
                    screenshot(page, f'{label}-room-inspector')

                    if label == 'phone-390x844':
                        page.goto(f'{BASE}?area=area-warehouse-e&map=2d&tab=capture', wait_until='networkidle')
                        wait_for_dashboard(page)
                        screenshot(page, f'{label}-walkthrough')

                    exercise_manager_states(page, label)
                    exercise_workspace_states(page, label)

                assert not console_errors, f'Browser console errors: {console_errors}'
            except Exception as exc:
                diagnostic(page, label)
                failures.append(f'{label}: {exc}')
            finally:
                page.close()

        browser.close()
        assert not failures, 'Visual audit failures:\n' + '\n'.join(failures)
        print(
            'Responsive visual audit passed at 7 desktop/tablet/phone viewports; '
            'representative room/asset inspector, mobile walkthrough, manager, document, map-edit, and cabinet states were captured.'
        )
finally:
    server.terminate()
    server.wait(timeout=10)
