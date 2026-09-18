"""End-to-end UI journeys across isolated technician/admin sessions.
The fixture tests the client contract; live SQL transaction checks are separate.
"""
import os,socket,subprocess,time,urllib.request,json
from pathlib import Path
from copy import deepcopy
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture,sign_in
from browser_test_server import stop_preview
from repair_visual import exercise_repair_pages
from large_print_visual import assert_large_print,enlarge_text

with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=subprocess.Popen(['npm.cmd' if os.name=='nt' else 'npm','run','preview','--','--host','127.0.0.1','--port',str(port),'--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
base=f'http://127.0.0.1:{port}/industrial-asset-graph/'
cloud={'publication':None,'publication_requests':{},'files':{},'submissions':{}}
Path('artifacts').mkdir(exist_ok=True)
def open_page(page,route):
    page.goto(base+'?page='+route,wait_until='networkidle');page.locator('.app-pages').wait_for()
def screenshot(page,label):
    assert_large_print(page);page.screenshot(path='artifacts/'+label+'.png')
def geometry(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    fits = page.locator('.page-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    if not fits:
        page.screenshot(path='artifacts/FAIL-repair-text-overflow.png')
    assert fits, str({'url':page.url,'viewport':page.viewport_size,'overflow':page.locator('.page-scroll').evaluate('e=>({width:e.clientWidth,scrollWidth:e.scrollWidth})')})
    assert page.evaluate('''()=>{
      const content=document.querySelector('.page-scroll').getBoundingClientRect();
      const header=document.querySelector('.page-header').getBoundingClientRect();
      const nav=document.querySelector('.page-navigation').getBoundingClientRect();
      return content.top>=header.bottom-1&&(content.bottom<=nav.top+1||content.top>=nav.bottom-1);
    }'''),'Chrome overlaps workspace content'
try:
    deadline=time.monotonic()+30
    while True:
        try:urllib.request.urlopen(base,timeout=1).close();break
        except OSError:
            if time.monotonic()>deadline:raise
            time.sleep(.2)
    with sync_playwright() as pw:
        launch={'headless':True}
        if os.name=='nt':launch['executable_path']=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser=pw.chromium.launch(**launch)
        admin=browser.new_page(viewport={'width':1366,'height':900},service_workers='block')
        admin_state=install_auth_fixture(admin,cloud);admin.goto(base+'?page=admin',wait_until='networkidle');sign_in(admin)
        admin.get_by_text('Shared save status',exact=True).click()
        admin.locator('.publication-status.phase-saved').wait_for(timeout=30000)
        tech=browser.new_page(viewport={'width':390,'height':844},service_workers='block')
        tech_state=install_auth_fixture(tech,cloud);tech_state['role']='technician';tech_state['user_id']='00000000-0000-4000-8000-000000000043'
        tech.goto(base,wait_until='networkidle');sign_in(tech)
        exercise_repair_pages(tech,'journey-phone',open_page,screenshot,geometry)
        receipt_id=parse_qs(urlparse(tech.url).query)['submission'][0];original=deepcopy(cloud['reviews'][receipt_id]['original'])
        assert tech.get_by_role('button',name='Approve proposal',exact=True).count()==0
        open_page(admin,'submission&submission='+receipt_id)
        admin.get_by_role('heading',name='Original submission',exact=True).wait_for()
        admin.get_by_label('Question for the author',exact=True).fill('What result did you observe?')
        admin.get_by_role('button',name='Ask for clarification',exact=True).click()
        admin.get_by_text('clarification',exact=True).first.wait_for()
        tech.reload(wait_until='networkidle')
        tech.get_by_label('Reply to the reviewer',exact=True).fill('No result was checked. Keep outcome unknown.')
        tech.get_by_role('button',name='Send reply',exact=True).click()
        tech.get_by_text('No result was checked. Keep outcome unknown.',exact=True).wait_for()
        admin.reload(wait_until='networkidle')
        admin.get_by_label('Machine repair history',exact=True).fill('Reviewed synthetic observation; no operation verified.')
        admin.get_by_label('Proposed problem',exact=True).fill('Reviewed synthetic observation')
        admin.get_by_role('button',name='Save proposed changes',exact=True).click()
        admin.get_by_role('button',name='Approve proposal',exact=True).wait_for()
        before=deepcopy(cloud['publication'])
        admin.get_by_role('button',name='Approve proposal',exact=True).click()
        admin.locator('.slate-status').filter(has_text='approved').wait_for()
        assert cloud['publication']==before,'Approval applied prematurely'
        # Simulate a competing destination edit after approval.
        target=next(a for a in cloud['publication']['payload']['plant']['assets'] if a['id']=='L2-CC-001')
        target['description']+=' Synthetic competing edit.';cloud['publication']['revision']+=1
        admin.get_by_role('button',name='Apply approved changes',exact=True).click()
        admin.get_by_role('alert').filter(has_text='Destination changed during review').wait_for()
        assert cloud['reviews'][receipt_id]['state']=='approved'
        admin.get_by_role('button',name='Save proposed changes',exact=True).click()
        admin.get_by_role('button',name='Approve proposal',exact=True).click()
        admin.locator('.slate-status').filter(has_text='approved').wait_for()
        admin.get_by_role('button',name='Apply approved changes',exact=True).click()
        admin.get_by_role('link',name='Open updated record',exact=True).wait_for()
        assert cloud['reviews'][receipt_id]['original']==original
        assert cloud['reviews'][receipt_id]['approved_by']==admin_state['user_id']
        assert cloud['reviews'][receipt_id]['applied_by']==admin_state['user_id']
        service=next(a for a in cloud['publication']['payload']['plant']['assets'] if a['id']=='L2-CC-001')['production']['service']
        assert len([s for s in service if s['id']=='repair-'+receipt_id])==1
        screenshot(admin,'journey-admin-applied')
        admin.get_by_role('link',name='Open updated record',exact=True).click()
        admin.get_by_role('heading',name='Reviewed synthetic observation',exact=True).wait_for()
        tech.reload(wait_until='networkidle');tech.get_by_role('link',name='Open updated record',exact=True).wait_for()
        assert cloud['reviews'][receipt_id]['original']['files']==original['files']
        open_page(tech,'admin');assert tech.get_by_role('link',name='Review Inbox',exact=True).count()==0
        for width in [320,390,1366]:
            tech.set_viewport_size({'width':width,'height':900})
            for route in ['home','machine&asset=L2-CC-001','repair&asset=L2-CC-001']:
                open_page(tech,route)
                if route.startswith('repair&'):tech.get_by_label('What’s happening?',exact=True).wait_for()
                enlarge_text(tech)
                geometry(tech);screenshot(tech,f'text-scale-150-{width}-{route.split("&")[0]}')
        # The existing tour link must resolve in the built app, including original media.
        for width in [390,1366]:
            tech.set_viewport_size({'width':width,'height':900})
            tech.goto(base+'presentation/',wait_until='networkidle')
            tech.locator('#startBtn').wait_for()
            assert tech.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert tech.evaluate("document.querySelector('.controls').getBoundingClientRect().top>=document.querySelector('.film').getBoundingClientRect().bottom")
            tech.locator('#startBtn').click()
            tech.wait_for_function("document.querySelector('#completeFilm').currentTime>0",timeout=30000)
            tech.locator('#nextBtn').click()
            tech.locator('#playBtn').click()
            assert tech.locator('#completeFilm').evaluate('e=>e.paused')
            tech.screenshot(path=f'artifacts/project-tour-{width}.png')
        for width in [320,390,1366]:
            tech.set_viewport_size({'width':width,'height':900})
            for route in ['assets/evidence/index.html','facility-content/lieb-foods/browse.html']:
                tech.goto(base+route,wait_until='networkidle')
                assert tech.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert tech.locator('body').evaluate("e=>getComputedStyle(e).backgroundColor")=='rgb(27, 48, 60)'
                assert tech.locator('a').evaluate_all("els=>els.every(e=>e.getBoundingClientRect().height>=56)")
                tech.screenshot(path=f'artifacts/slate-archive-{width}-{route.split("/")[0]}.png')
        browser.close()
        print('PASS: technician capture/photo/resume, unknown outcome, shared receipt, clarification, admin correction, approval, conflict, apply, source retention, updated history and role separation.')
finally:
    stop_preview(server)
