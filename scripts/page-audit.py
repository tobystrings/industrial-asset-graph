"""Evidence inventory: every registered page and explicit substate, with real link clicks.
All service mutations are confined to install_auth_fixture's disposable browser data.
This does not turn a successful navigation into a successful business transaction.
"""
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import json,sys,time,traceback
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture,sign_in
from large_print_visual import assert_large_print
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path('artifacts/page-audit');OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:4176/industrial-asset-graph/'
manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
results=json.loads((OUT/'results.json').read_text(encoding='utf-8'))['results'] if '--resume' in sys.argv and (OUT/'results.json').exists() else []

def save():
    (OUT/'results.json').write_text(json.dumps({'manifest':manifest,'results':results},indent=2),encoding='utf-8')

def inspect(page):
    return page.evaluate('''() => {
      const visible=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
      const name=e=>e.getAttribute('aria-label')||[...(e.labels||[])].map(l=>l.textContent).join(' ')||e.innerText||e.getAttribute('title')||e.getAttribute('placeholder')||e.name||'';
      const links=[...document.querySelectorAll('a[href]')].filter(visible).map(e=>({label:name(e).trim(),href:e.getAttribute('href'),resolved:e.href,target:e.target,download:e.hasAttribute('download')}));
      const controls=[...document.querySelectorAll('button,summary,input,select,textarea')].filter(visible).map(e=>({tag:e.tagName,label:name(e).trim().slice(0,180),type:e.type,disabled:e.disabled||false,value:e.matches('select')?e.value:undefined}));
      const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({level:e.tagName,text:e.innerText}));
      const pane=document.querySelector('.page-scroll');
      const root=document.documentElement;
      const brokenImages=[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth).map(e=>e.getAttribute('src'));
      return {links,controls,headings,brokenImages,text:(document.querySelector('.page-workspace')||document.body).innerText,overflow:root.scrollWidth>innerWidth+1||!!(pane&&pane.scrollWidth>pane.clientWidth+1),title:document.title,contentHeight:pane?.scrollHeight,viewportHeight:pane?.clientHeight};
    }''')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    for viewport,w,h in [('desktop',1366,768),('phone',390,844)]:
        context=browser.new_context(viewport={'width':w,'height':h},service_workers='block')
        page=context.new_page();page.set_default_timeout(10000)
        fixture=install_auth_fixture(page)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE,wait_until='networkidle');sign_in(page)
        for screen in manifest['screens']:
            if any(r['screen']==screen['id'] and r['viewport']==viewport for r in results):continue
            print(viewport,screen['id'],screen['title'],flush=True)
            row={'screen':screen['id'],'viewport':viewport,'issues':[],'screenshots':[],'clicks':[],'runtimeErrors':[]}
            start=len(errors)
            url=BASE+(screen.get('path') or '?'+screen['query'])
            try:
                response=page.goto(url,wait_until='networkidle',timeout=30000)
                row['httpStatus']=response.status if response else None
                if screen['kind']=='route':page.locator('.page-workspace').wait_for()
                page.wait_for_timeout(150)
                row.update(inspect(page));row['url']=page.url
                url=page.url  # Keep the generated work ID when revisiting a saved draft.
                if screen['kind']=='route':
                    try:assert_large_print(page)
                    except Exception as e:row['issues'].append(str(e))
                if row['overflow']:row['issues'].append('Horizontal page overflow')
                if row['brokenImages']:row['issues'].append('Broken visible images: '+str(row['brokenImages']))
                pane=page.locator('.page-scroll')
                positions=[0]
                if pane.count():
                    distance=pane.evaluate('e=>e.scrollHeight-e.clientHeight')
                    if distance>h:positions.append(round(distance/2))
                    if distance>100:positions.append(distance)
                for number,y in enumerate(positions):
                    if pane.count():pane.evaluate('(e,y)=>e.scrollTop=y',y)
                    page.wait_for_timeout(80)
                    file=f'{viewport}-{screen["id"]}-{number}.png';page.screenshot(path=str(OUT/file),timeout=15000);row['screenshots'].append(file)
                # Inspect all rendered destinations, click one representative of each
                # distinct destination page/section/tab. Other links remain rendered-only.
                if viewport=='desktop' and screen['kind']=='route':
                    seen=set()
                    for link in row['links']:
                        target=urlparse(link['resolved']);query=parse_qs(target.query)
                        if link['href'].startswith('#') or not query.get('page') or target.netloc!=urlparse(BASE).netloc or link['download']:continue
                        key=tuple((k,tuple(query.get(k,[]))) for k in ['page','section','tab','tools'])
                        if key in seen:continue
                        seen.add(key)
                        click={'label':link['label'],'href':link['href'],'expected':query['page'][0]}
                        try:
                            page.goto(url,wait_until='networkidle');page.locator('.page-workspace').wait_for()
                            loc=page.locator('a[href]')
                            match=loc.evaluate_all('(els,href)=>els.findIndex(e=>e.getAttribute("href")===href)',link['href'])
                            assert match>=0,'Link disappeared on reload'
                            loc.nth(match).click()
                            page.wait_for_timeout(160)
                            page.locator('.page-workspace').wait_for()
                            actual=parse_qs(urlparse(page.url).query).get('page',['home'])[0]
                            click.update(actual=actual,landed=page.url,status='pass' if actual==click['expected'] else 'fail')
                            if actual!=click['expected']:click['error']='Unexpected destination'
                        except Exception as e:click.update(status='fail',error=str(e)[:700])
                        row['clicks'].append(click)
                row['runtimeErrors']=errors[start:]
            except Exception as e:
                row['issues'].append('Page audit could not complete: '+str(e)[:1000]);row['trace']=traceback.format_exc()
            results.append(row);save()
        context.close()
    browser.close()
print(f'Captured {len(results)} screen/viewport states; '+str(sum(bool(r['issues']) for r in results))+' have automated findings. See results.json.',flush=True)
