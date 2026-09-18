"""Regression checks for the failures found by the page audit, with screenshots."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture,sign_in
from large_print_visual import assert_large_print,enlarge_text
from section_picker_visual import choose_section
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path('artifacts/audit-fixes');OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:4176/industrial-asset-graph/'
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    for width,height in [(1366,768),(390,844),(320,900)]:
        page=browser.new_page(viewport={'width':width,'height':height},service_workers='block');page.set_default_timeout(15000)
        install_auth_fixture(page);page.goto(BASE,wait_until='networkidle');sign_in(page)
        def go(route):page.goto(BASE+'?page='+route,wait_until='networkidle');page.locator('.page-workspace').wait_for()
        def record(name):
            assert_large_print(page)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert page.locator('.page-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),name
            file=f'{width}-{name}.png';page.screenshot(path=str(OUT/file))
            results.append({'width':width,'name':name,'url':page.url,'screenshot':file});print(width,name,'pass',flush=True)
        go('health');page.locator('.iag-target-row').first.click();page.wait_for_function('new URLSearchParams(location.search).get("page")==="area"');record('health-open')
        go('health');page.locator('.iag-target-row').filter(has_text='Trace →').first.click();page.wait_for_function('new URLSearchParams(location.search).get("page")==="relationships"&&new URLSearchParams(location.search).has("asset")');record('health-trace')
        go('relationships');page.get_by_label('Equipment to troubleshoot',exact=True).select_option('L2-CC-001');page.wait_for_function('new URLSearchParams(location.search).get("asset")==="L2-CC-001"');record('trace-picker')
        go('manage');page.locator('.iag-manage-list').scroll_into_view_if_needed()
        assert page.locator('.iag-manage-list>button').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('span').getBoundingClientRect();return s.top>=r.top-1&&s.bottom<=r.bottom+1})''')
        record('manage-rows')
        go('database');record('database')
        go('inventory');choose_section(page,'Inventory sections','Add Part');page.get_by_label('Name / description',exact=True).wait_for();record('inventory-add')
        go('more');choose_section(page,'Choose a tool group','Records & review');record('more-records')
        go('asset&asset=L2-CC-001&tab=docs')
        if width<701:
            assert page.get_by_label('Asset section',exact=True).input_value()=='docs'
            page.get_by_label('Asset section',exact=True).select_option('capture')
            page.wait_for_function('new URLSearchParams(location.search).get("tab")==="capture"')
        record('asset-section')
        for route in ['home','map','admin','maintenance&asset=L2-CC-001']:
            go(route);record(route.split('&')[0])
        go('home');enlarge_text(page);record('home-text-150')
        page.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print('PASS: audit failures, selectors, geometry and large-print checks at all three sizes.')
