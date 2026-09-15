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
from troubleshooting_test_fixture import exercise_troubleshooting
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
    assert page.locator('.page-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
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
        browser=pw.chromium.launch(headless=True)
        for label,width,height in [('laptop-1366x768',1366,768),('phone-390x844',390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height},service_workers='block')
            state=install_auth_fixture(page)
            try:
                page.goto(base,wait_until='networkidle');sign_in(page)
                exercise_troubleshooting(page,label,open_page,screenshot,geometry,state)
                print(label+': troubleshooting persistence, recovery, outcome and relief passed',flush=True)
            except Exception:
                page.screenshot(path='artifacts/FAIL-troubleshooting-'+label+'.png')
                print(page.locator('.troubleshooting').inner_text(),flush=True)
                raise
            finally:page.close()
        browser.close()
finally:
    stop_preview(server)
    server.wait(timeout=10)
