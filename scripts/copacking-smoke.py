"""Focused diagnostic runner using synthetic auth and disposable browser state."""
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture, sign_in
from copacking_visual import exercise_copacking
from pathlib import Path
import sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:4175/industrial-asset-graph/'
def open_page(page, route):
    page.goto(f'{BASE}?page={route}', wait_until='networkidle')
    page.locator('.page-navigation').wait_for()
def screenshot(page, name):
    Path('artifacts').mkdir(exist_ok=True)
    page.screenshot(path=f'artifacts/{name}.png')
def geometry(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert page.locator('.page-scroll').evaluate('el => el.scrollWidth <= el.clientWidth + 1')

with sync_playwright() as p:
    browser = p.chromium.launch()
    for label,width,height in [('copacking-laptop',1366,768),('copacking-phone',390,844)]:
        context = browser.new_context(viewport={'width':width,'height':height}, service_workers='block')
        page = context.new_page()
        auth_state = install_auth_fixture(page)
        page.goto(BASE+'?page=lines&line=line-2', wait_until='networkidle')
        try:
            sign_in(page)
            exercise_copacking(page,label,open_page,screenshot,geometry,auth_state)
            print(label + ': passed', flush=True)
        except Exception:
            screenshot(page, 'FAIL-' + label)
            print(page.locator('body').inner_text()[:1800], flush=True)
            raise
        finally:
            context.close()
    browser.close()
