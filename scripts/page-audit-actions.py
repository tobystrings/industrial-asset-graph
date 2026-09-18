"""Focused action probes, isolated service fixtures, with per-action evidence."""
import json,time,io,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
from auth_test_fixture import install_auth_fixture,sign_in
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path('artifacts/page-audit');BASE='http://127.0.0.1:4176/industrial-asset-graph/'
rows=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={'width':1366,'height':768},service_workers='block');page.set_default_timeout(8000)
    state=install_auth_fixture(page);page.goto(BASE,wait_until='networkidle');sign_in(page)
    def go(route):page.goto(BASE+'?page='+route,wait_until='networkidle');page.locator('.page-workspace').wait_for()
    def run(name,pages,fn):
        row={'name':name,'pages':pages}
        try:fn();row['status']='pass'
        except Exception as error:row.update(status='fail',error=str(error)[:1600])
        row['url']=page.url;file=f'action-{len(rows)}.png'
        try:page.screenshot(path=str(OUT/file),timeout=15000);row['screenshot']=file
        except Exception as error:row['captureError']=str(error)[:500]
        rows.append(row);(OUT/'actions.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print(name,row['status'],flush=True)
    def health_verify():
        go('health');page.get_by_role('button',name='Run verification',exact=True).click();assert 'Valid' in page.locator('.iag-health-panel').inner_text()
    def health_target():
        go('health');before=page.url;page.locator('.iag-target-row').first.click();page.wait_for_timeout(500)
        assert page.url!=before,'Open target did not leave Data health or change the URL.'
    def health_trace():
        go('health');before=page.url;page.locator('.iag-target-row').filter(has_text='Trace →').first.click();page.wait_for_timeout(500)
        assert page.url!=before,'Trace target did not leave Data health or change the URL.'
    def observation():
        go('observation&asset=L2-CC-001');page.get_by_label('Field Observation',exact=True).fill('Synthetic page audit observation; no physical claim.')
        page.get_by_role('button',name='Log Observation',exact=True).click();page.get_by_text('Synthetic page audit observation; no physical claim.',exact=True).wait_for()
        page.reload(wait_until='networkidle');page.get_by_text('Synthetic page audit observation; no physical claim.',exact=True).wait_for()
    def evidence():
        go('evidence&asset=L2-CC-001');b=io.BytesIO();Image.new('RGB',(32,32),'teal').save(b,format='PNG')
        page.locator('input[type=file]').set_input_files({'name':'synthetic-page-audit.png','mimeType':'image/png','buffer':b.getvalue()})
        page.get_by_role('button').filter(has_text='synthetic-page-audit.png').click();page.locator('.iag-file-viewer img').wait_for();assert page.locator('.iag-file-viewer img').evaluate('e=>e.complete&&e.naturalWidth>0')
        page.get_by_role('button',name='Close',exact=True).click();page.reload(wait_until='networkidle');page.get_by_role('button').filter(has_text='synthetic-page-audit.png').wait_for()
    def connection():
        go('connection');count=page.locator('.iag-relationship-list article').count()
        page.locator('.iag-relationship-form select').nth(3).select_option('VERIFIED');page.get_by_role('button',name='Create Connection',exact=True).click()
        page.get_by_role('alert').filter(has_text='require an evidence reference').wait_for()
        page.locator('.iag-relationship-form select').nth(3).select_option('FIELD_VERIFY');page.get_by_role('button',name='Create Connection',exact=True).click()
        page.wait_for_function('(count)=>document.querySelectorAll(".iag-relationship-list article").length===count+1',arg=count)
        page.reload(wait_until='networkidle');assert page.locator('.iag-relationship-list article').count()==count+1
    def setup():
        go('setup');page.get_by_label('Facility Name',exact=True).fill('Synthetic audit facility name');page.get_by_role('button',name='Save Facility',exact=True).click()
        page.wait_for_timeout(500);page.reload(wait_until='networkidle');assert page.get_by_label('Facility Name',exact=True).input_value()=='Synthetic audit facility name'
        page.get_by_role('button',name='Areas',exact=True).click();page.get_by_role('button',name='+ Add Area',exact=True).click()
        page.get_by_label('Area ID',exact=True).fill('area-synthetic-page-audit');page.get_by_label('Name',exact=True).fill('Synthetic page audit area');page.get_by_role('button',name='Save Area',exact=True).click()
        page.get_by_role('button').filter(has_text='Synthetic page audit area').wait_for()
    def settings():
        go('settings');page.locator('.iag-settings-panel select').nth(1).select_option('reduced');page.locator('.iag-settings-panel select').nth(0).select_option('high')
        page.reload(wait_until='networkidle');assert page.locator('.iag-settings-panel select').nth(1).input_value()=='reduced';assert page.locator('.iag-settings-panel select').nth(0).input_value()=='high'
    def csv_import():
        go('import');data='recordType,id,name,type,areaId\nasset,PAGE-AUDIT-CSV,Synthetic page audit CSV,Motor,area-warehouse-f'
        page.locator('input[type=file]').set_input_files({'name':'synthetic-page-audit.csv','mimeType':'text/csv','buffer':data.encode()})
        page.get_by_role('button',name='Approve import and queue canonical changes',exact=True).click();page.get_by_role('status').filter(has_text='1 record').wait_for()
        go('manage');page.get_by_label('Find Asset',exact=True).fill('PAGE-AUDIT-CSV');page.locator('.iag-manage-list button').click();assert page.get_by_label('Name',exact=True).input_value()=='Synthetic page audit CSV'
    def account():
        go('account');page.get_by_role('button',name='Refresh permissions',exact=True).click();page.get_by_role('status').filter(has_text='Permissions refreshed').wait_for()
        page.get_by_label('Sign-in username',exact=True).fill('synthetic-audit-user');page.get_by_role('button',name='Save username',exact=True).click();page.get_by_role('status').filter(has_text='Username saved').wait_for()
        page.reload(wait_until='networkidle');assert page.get_by_label('Sign-in username',exact=True).input_value()=='synthetic-audit-user'
    for name,pages,fn in [('Health verification',['health'],health_verify),('Health Open target',['health'],health_target),('Health Trace target',['health'],health_trace),('Observation save and reload',['observation'],observation),('Evidence upload, open and reload',['evidence'],evidence),('Connection guard, create and reload',['connection'],connection),('Facility and area save',['setup'],setup),('Settings persist',['settings'],settings),('CSV preview, import and read back',['import','manage'],csv_import),('Account refresh and username',['account'],account)]:run(name,pages,fn)
    for width in [390,1366]:
        page.set_viewport_size({'width':width,'height':900})
        def tour():
            page.goto(BASE+'presentation/',wait_until='networkidle');page.locator('#startBtn').click();page.wait_for_function('document.querySelector("#completeFilm").currentTime>0',timeout=30000)
            page.locator('#nextBtn').click();page.locator('#playBtn').click();assert page.locator('#completeFilm').evaluate('e=>e.paused')
        run('Tour play, next and pause '+str(width),['help','external'],tour)
    browser.close()
