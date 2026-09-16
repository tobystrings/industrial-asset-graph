"""Isolated photo-navigation journey. All injected parameter/connection data is synthetic."""
import os, socket, subprocess, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture, sign_in
from browser_test_server import stop_preview
from large_print_visual import assert_large_print

with socket.socket() as sock:
    sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
server=subprocess.Popen(['npm.cmd' if os.name=='nt' else 'npm','run','preview','--','--host','127.0.0.1','--port',str(port),'--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
base=f'http://127.0.0.1:{port}/industrial-asset-graph/'
cabinet='LIEB-L2-CLIMAX-6759-CABINET'
Path('artifacts').mkdir(exist_ok=True)
try:
    deadline=time.monotonic()+30
    while True:
        try: urllib.request.urlopen(base,timeout=1).close(); break
        except OSError:
            if time.monotonic()>deadline: raise
            time.sleep(.2)
    with sync_playwright() as pw:
        options={'headless':True}
        chrome=Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        if os.name=='nt' and chrome.exists(): options['executable_path']=str(chrome)
        browser=pw.chromium.launch(**options)
        for label,width,height in [('desktop',1366,768),('phone',390,844),('small-phone',320,740)]:
            page=browser.new_page(viewport={'width':width,'height':height},service_workers='block')
            install_auth_fixture(page)
            errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base,wait_until='networkidle'); sign_in(page)
            page.goto(base+'?page=map',wait_until='networkidle')
            if not page.locator('.page-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1'):
                page.screenshot(path=f'artifacts/FAIL-equipment-map-{label}.png')
                print(page.evaluate('''()=>[...document.querySelectorAll('.page-title,.page-title-actions,.map-unplaced-link')].map(e=>({cls:e.className,width:e.getBoundingClientRect().width,whiteSpace:getComputedStyle(e).whiteSpace,minWidth:getComputedStyle(e).minWidth,overflowWrap:getComputedStyle(e).overflowWrap,display:getComputedStyle(e).display}))'''),flush=True)
                raise AssertionError('Map page overflows')
            page.get_by_role('link',name='Location unconfirmed equipment',exact=True).click()
            page.locator('.room-asset-list button').filter(has_text=cabinet).click()
            page.get_by_role('link',name='Explore cabinet photos',exact=True).click()
            page.get_by_test_id('equipment-images').wait_for()
            page.get_by_role('button',name='Inside cabinet',exact=True).click()
            region=page.locator('[data-region="'+cabinet+'-upper-left"]')
            region.click()
            info=page.get_by_role('complementary',name='Selected equipment')
            assert 'Upper left drive' in info.inner_text()
            page.get_by_role('button',name='Parameters',exact=True).click()
            assert 'No saved parameter record' in info.inner_text()
            page.get_by_role('button',name='Interior sketch',exact=True).click()
            assert 'component='+cabinet+'-upper-left' in page.url
            assert page.locator('[data-region="'+cabinet+'-upper-left"] rect').get_attribute('class')=='selected'
            page.get_by_role('button',name='Inside cabinet',exact=True).click()
            page.get_by_role('button',name='Zoom in',exact=True).click()
            assert page.locator('.equipment-image-surface').evaluate('e=>e.scrollWidth>e.clientWidth')
            page.get_by_role('button',name='Fit',exact=True).click()
            page.get_by_role('button',name='Fed by',exact=True).click()
            assert 'Not documented' in info.inner_text()
            page.go_back(); page.get_by_test_id('equipment-images').wait_for()
            assert 'section=parameters' in page.url
            page.reload(wait_until='networkidle')
            assert 'No saved parameter record' in info.inner_text()
            assert_large_print(page)
            assert page.locator('.page-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
            page.locator('.equipment-information' if width<700 else '.equipment-visual').scroll_into_view_if_needed()
            page.screenshot(path=f'artifacts/equipment-images-{label}.png')
            page.locator('.equipment-image-surface').scroll_into_view_if_needed()
            page.screenshot(path=f'artifacts/equipment-images-{label}-photo.png')
            # Mutate ONLY this isolated browser's IndexedDB, not the real application or backend.
            page.evaluate('''async cabinet => {
              await new Promise((resolve,reject)=>{
                const req=indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb');
                req.onsuccess=()=>{const db=req.result,tx=db.transaction('plant','readwrite'),store=tx.objectStore('plant'),read=store.get('active');
                  read.onsuccess=()=>{const p=read.result,c=p.components.find(c=>c.id===cabinet+'-upper-left');
                    p.documents.push({id:'test-parameters',assetId:cabinet,category:'Parameters',title:'Synthetic parameter backup',path:'synthetic.json',state:'DRAFT',required:false,verificationStatus:'FIELD_VERIFY',evidenceIds:['climax-photo-interior']});
                    c.savedParameters=[{id:'test-save',sourceDocumentId:'test-parameters',capturedAt:'2026-09-16',verificationStatus:'FIELD_VERIFY',values:[{code:'TEST001',name:'Synthetic zero value',value:0,unit:'Hz'}]}];
                    p.relationships.push({id:'test-feed',source:cabinet+'-upper-right',target:c.id,type:'FEEDS',verificationStatus:'FIELD_VERIFY',evidenceIds:['climax-photo-interior'],note:'Synthetic browser test connection'});
                    store.put(p,'active');}; tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);
              });
            }''',cabinet)
            page.reload(wait_until='networkidle')
            assert '0 Hz' in info.inner_text()
            assert 'Synthetic parameter backup' in info.inner_text()
            page.get_by_role('button',name='Fed by',exact=True).click()
            info.get_by_role('link',name='Upper right drive',exact=True).click()
            page.get_by_role('button',name='Feeds',exact=True).click()
            info.get_by_role('link',name='Upper left drive',exact=True).click()
            assert 'component='+cabinet+'-upper-left' in page.url
            page.goto(base+'?page=cabinet&asset='+cabinet+'&component=missing',wait_until='networkidle')
            assert 'Component unavailable' in info.inner_text()
            assert not errors, errors
            print(label+': photo selection, source records, connection tracing, history, zoom and responsive checks passed',flush=True)
            page.close()
        browser.close()
finally:
    stop_preview(server)
    server.wait(timeout=10)
