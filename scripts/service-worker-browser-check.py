"""Exercise real worker installation/update; no service-worker blocking or network mocks."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os,re,time,sys,subprocess,signal
from playwright.sync_api import sync_playwright

# An activation deadlock can also wedge browser teardown. Bound the entire
# browser process tree so this regression fails CI rather than hanging it.
if '--worker' not in sys.argv:
    child=subprocess.Popen([sys.executable,__file__,'--worker'],start_new_session=os.name!='nt')
    try:code=child.wait(timeout=90)
    except subprocess.TimeoutExpired:
        if os.name=='nt':subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        else:os.killpg(child.pid,signal.SIGKILL)
        raise SystemExit('Service-worker browser check timed out: installation/update did not settle')
    raise SystemExit(code)

DIST=Path('dist').resolve()
CURRENT_CACHE=re.search(r"const CACHE = '([^']+)'",(DIST/'sw.js').read_text()).group(1)
SCOPE='/industrial-asset-graph/'
LEGACY="""const CACHE='iag-static-v5-slate';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE));});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
"""
state={'legacy':False,'documents':0}
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(DIST),**kwargs)
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store');super().end_headers()
    def do_GET(self):
        path=self.path.split('?',1)[0]
        if path==SCOPE+'sw.js':
            body=LEGACY.encode() if state['legacy'] else (DIST/'sw.js').read_bytes()
            self.send_response(200);self.send_header('Content-Type','text/javascript')
            self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        if path in [SCOPE,SCOPE+'index.html']:state['documents']+=1
        if self.path.startswith(SCOPE):self.path='/'+self.path[len(SCOPE):]
        super().do_GET()

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'+SCOPE
try:
    with sync_playwright() as pw:
        args={'headless':True}
        if os.name=='nt':args['executable_path']=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser=pw.chromium.launch(**args)
        for upgrade in [False,True]:
            print('Checking', 'installed-app upgrade' if upgrade else 'fresh install',flush=True)
            state['legacy']=upgrade
            context=browser.new_context(viewport={'width':390,'height':844},service_workers='allow')
            page=context.new_page();page.set_default_timeout(15000)
            page.goto(base,wait_until='domcontentloaded')
            print('Initial document loaded',flush=True)
            page.wait_for_function("navigator.serviceWorker.controller?.state === 'activated'")
            page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
            if upgrade:
                assert page.evaluate("caches.keys().then(keys=>keys.includes('iag-static-v5-slate'))")
                before=state['documents'];state['legacy']=False
                page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())")
                deadline=time.monotonic()+15
                while state['documents']<=before and time.monotonic()<deadline:page.wait_for_timeout(100)
                assert state['documents']>before,'Worker update never completed its document reload'
                page.wait_for_function("navigator.serviceWorker.controller?.state === 'activated'")
                page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
            page.wait_for_function("cache=>caches.keys().then(keys=>keys.includes(cache)&&!keys.includes('iag-static-v5-slate'))",arg=CURRENT_CACHE)
            page.reload(wait_until='networkidle')
            page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
            Path('artifacts').mkdir(exist_ok=True)
            page.screenshot(path=f'artifacts/worker-{ "upgrade" if upgrade else "fresh" }.png')
            print('PASS:', 'upgrade reload and stale-cache removal' if upgrade else 'fresh install and reload',flush=True)
            context.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
