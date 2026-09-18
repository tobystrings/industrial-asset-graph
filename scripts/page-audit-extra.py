"""Additional navigation, production-record and visual failure probes (fixture only)."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture,sign_in
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path('artifacts/page-audit');BASE='http://127.0.0.1:4176/industrial-asset-graph/'
rows=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={'width':1366,'height':768},service_workers='block');page.set_default_timeout(10000)
    install_auth_fixture(page);page.goto(BASE,wait_until='networkidle');sign_in(page)
    def go(q):page.goto(BASE+'?page='+q,wait_until='networkidle');page.locator('.page-workspace').wait_for()
    def run(name,pages,fn):
        row={'name':name,'pages':pages}
        try:fn();row['status']='pass'
        except Exception as e:row.update(status='fail',error=str(e)[:1500])
        row['url']=page.url
        try:
            file=f'extra-{len(rows)}.png';page.screenshot(path=str(OUT/file),timeout=15000);row['screenshot']=file
        except Exception as e:row['captureError']=str(e)[:300]
        rows.append(row);(OUT/'extra-actions.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print(name,row['status'],flush=True)
    def save_reload(label,value):
        page.get_by_label(label,exact=True).fill(value);page.get_by_role('button',name='Save changes',exact=True).click()
        page.get_by_role('status').filter(has_text='Saved').wait_for();page.reload(wait_until='networkidle');assert page.get_by_label(label,exact=True).input_value()==value
    def line():
        go('lines');page.get_by_text('Edit line priorities',exact=True).click();page.locator('.production-form textarea').first.fill('Synthetic audit line rationale')
        page.get_by_role('button',name='Save changes',exact=True).click();page.get_by_role('status').filter(has_text='Saved').wait_for();page.reload(wait_until='networkidle')
        page.get_by_text('Edit line priorities',exact=True).click();assert page.locator('.production-form textarea').first.input_value()=='Synthetic audit line rationale'
    def queue():
        go('documentation');page.get_by_label('Next field action',exact=True).fill('Synthetic audit survey task');page.get_by_role('button',name='Add survey task',exact=True).click()
        page.get_by_role('button',name='Save changes',exact=True).click();page.get_by_role('status').filter(has_text='Saved').wait_for();page.reload(wait_until='networkidle')
        assert 'Synthetic audit survey task' in page.get_by_label('Action',exact=True).evaluate_all('es=>es.map(e=>e.value)')
    def maintenance():
        go('maintenance&asset=L2-CC-001');save_reload('Actual process stage / purpose','Synthetic audit stage')
    def dependencies():
        go('connection');count=page.locator('.iag-relationship-list article').count()
        go('dependencies');page.locator('.production-form select').nth(1).select_option('L2-CC-001');page.get_by_label('Source reference',exact=True).fill('Synthetic audit dependency')
        page.get_by_role('button',name='Save connection',exact=True).click();page.get_by_role('status').filter(has_text='Saved').wait_for()
        go('connection');assert page.locator('.iag-relationship-list article').count()==count+1
        page.locator('.iag-relationship-main').last.click();assert page.locator('.iag-relationship-form select').nth(1).input_value()=='UPSTREAM_OF'
    for name,pages,fn in [('Line rationale save/reload',['lines'],line),('Survey task save/reload',['documentation'],queue),('Field sheet stage save/reload',['maintenance'],maintenance),('Dependency create/readback',['dependencies','connection'],dependencies)]:run(name,pages,fn)
    for width in [1366,390]:
        page.set_viewport_size({'width':width,'height':844})
        def back():
            go('machine&asset=L2-CC-001');page.get_by_role('link',name='Manuals',exact=False).click();page.get_by_role('link',name='Line 2 cabinet overview',exact=False).click()
            page.locator('.page-back').click() if page.locator('.page-back').count() else page.get_by_role('link',name='← Manuals',exact=True).click()
            page.wait_for_function('new URLSearchParams(location.search).get("section")==="manuals"&&!new URLSearchParams(location.search).has("doc")')
            page.get_by_role('link',name='← Machine',exact=True).click();page.wait_for_function('new URLSearchParams(location.search).get("page")==="machine"&&!new URLSearchParams(location.search).has("section")')
        run('Nested Back returns one level '+str(width),['machine','documents'],back)
    def overlap():
        go('manage');measure=page.locator('.iag-manage-list > button').evaluate_all('''es=>es.map(e=>{let r=e.getBoundingClientRect(),s=e.querySelector('span').getBoundingClientRect();return {name:e.innerText,buttonHeight:r.height,textHeight:s.height,overhang:Math.max(0,s.bottom-r.bottom,r.top-s.top)}})''')
        (OUT/'manage-overlap.json').write_text(json.dumps(measure,indent=2),encoding='utf-8');assert not [r for r in measure if r['overhang']>1],str(measure)
    run('Manage asset row content stays inside its button at 390px',['manage'],overlap)
    browser.close()
