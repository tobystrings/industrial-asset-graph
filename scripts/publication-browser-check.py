"""Two isolated browsers share only a mocked authenticated publication service."""
import os,subprocess,time,socket,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture,sign_in

with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=subprocess.Popen(['npm.cmd' if os.name=='nt' else 'npm','run','preview','--','--host','127.0.0.1','--port',str(port),'--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
base=f'http://127.0.0.1:{port}/industrial-asset-graph/'
cloud={'publication':None,'publication_requests':{},'files':{},'submissions':{}}
def saved(page):
    page.locator('.publication-status.phase-saved').wait_for(timeout=30000)
def edit(page,old,new):
    page.get_by_role('button',name='Edit map',exact=True).click()
    page.get_by_role('button',name='Select',exact=True).click()
    page.locator(f'[aria-label="Edit area {old}"]').click(force=True)
    page.get_by_label('Area name',exact=True).fill(new)
def submit(page, conflict=False):
    page.get_by_role('button',name='Save Changes',exact=True).click()
    if conflict: page.locator('.publication-status.phase-conflict').wait_for()
    else: page.get_by_text('Map saved across devices. GitHub publication is queued.',exact=True).wait_for()
try:
    time.sleep(1.5)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        contexts=[browser.new_context(viewport={'width':1366,'height':900},service_workers='block') for _ in range(2)]
        pages=[]
        for context in contexts:
            page=context.new_page();install_auth_fixture(page,cloud);page.goto(base+'?page=map',wait_until='networkidle');sign_in(page);saved(page);pages.append(page)
        first,second=pages
        edit(first,'Warehouse E','Shared receiving');submit(first);saved(first)
        revision=cloud['publication']['revision']
        second.reload(wait_until='networkidle');saved(second)
        second.locator('.svg-zone[aria-label="Select Shared receiving"]').wait_for()
        second.get_by_role('button',name='Save & publish now',exact=True).click();saved(second)
        assert cloud['publication']['revision']==revision,'Unchanged snapshot created a duplicate revision'
        # A local working draft survives an ordinary reload before Save Changes.
        first.get_by_label('Area name',exact=True).fill('Local concurrent name')
        first.wait_for_timeout(550)
        first.reload(wait_until='networkidle');saved(first)
        if first.locator('.map-editor-shell').count()==0: first.get_by_role('button',name='Edit map',exact=True).click()
        first.get_by_role('button',name='Select',exact=True).click()
        first.locator('[aria-label="Edit area Local concurrent name"]').click(force=True)
        assert first.get_by_label('Area name',exact=True).input_value()=='Local concurrent name'
        edit(second,'Shared receiving','Remote concurrent name');submit(second);saved(second)
        submit(first, conflict=True)
        first.locator('.publication-status.phase-conflict').wait_for()
        assert cloud['publication']['payload']['plant']['areas'] != []
        first.get_by_text('conflicting fields — compare before choosing',exact=False).click()
        assert 'Local concurrent name' in first.locator('.publication-compare').all_text_contents()[0]
        assert 'Remote concurrent name' in first.locator('.publication-compare').all_text_contents()[0]
        first.get_by_role('button',name='Keep this device’s conflicting values',exact=True).click();saved(first)
        second.reload(wait_until='networkidle');saved(second)
        second.locator('.svg-zone[aria-label="Select Local concurrent name"]').wait_for()
        Path('artifacts').mkdir(exist_ok=True)
        second.screenshot(path='artifacts/publication-second-device.png')
        print('PASS: cross-device rename, duplicate prevention, draft recovery, concurrent conflict, explicit resolution, and reload.')
        browser.close()
finally:
    server.terminate()
