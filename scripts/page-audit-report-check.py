"""Verify the generated audit viewer itself, independently of app test outcomes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
OUT=Path('artifacts/page-audit')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for width in [1366,390]:
        page.set_viewport_size({'width':width,'height':900})
        page.goto('http://127.0.0.1:4180/artifacts/page-audit/index.html',wait_until='networkidle')
        assert page.locator('#page-list button').count()==44
        for node in json.loads((OUT/'audit-data.json').read_text(encoding='utf-8'))['nodes']:
            page.locator('#page-list button[data-page="'+node['id']+'"]').click()
            assert page.locator('#detail h2').inner_text()==node['title']
            assert page.locator('#state option').count()>0
            if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
                page.screenshot(path=str(OUT/'viewer-overflow.png'))
                raise AssertionError(str({'page':node['id'],'width':width,'elements':page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))')}))
        page.locator('#search').fill('Data health');assert page.locator('#page-list button').count()==1
        page.locator('#page-list button').click();page.locator('#shared').check()
        page.locator('#state').select_option(index=1)
        page.locator('#state-detail img').first.wait_for()
        page.locator('#state-detail img').first.scroll_into_view_if_needed()
        page.wait_for_function('Array.from(document.querySelectorAll("#state-detail img")).every(e=>e.complete&&e.naturalWidth>0)')
        page.screenshot(path=str(OUT/f'audit-viewer-{width}.png'))
    assert not errors,errors
    browser.close()
print('Audit viewer: all 44 catalogue pages, state selectors, search, images and desktop/phone width passed.')
