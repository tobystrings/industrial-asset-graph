from pathlib import Path
import os
import subprocess
import time
import json
import io
import zipfile
import hashlib
import socket
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright
from auth_test_fixture import install_auth_fixture, exercise_login, exercise_rejected_auth

output = Path('artifacts')
output.mkdir(exist_ok=True)

npm = 'npm.cmd' if os.name == 'nt' else 'npm'
with socket.socket() as available_port:
    available_port.bind(('127.0.0.1', 0))
    preview_port = available_port.getsockname()[1]
server = subprocess.Popen(
    [npm, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', str(preview_port), '--strictPort'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.STDOUT,
)

BASE = f'http://127.0.0.1:{preview_port}/industrial-asset-graph/'
VIEWPORTS = (
    ('desktop-1920x1080', 1920, 1080),
    ('laptop-1366x768', 1366, 768),
    ('tablet-landscape-1024x768', 1024, 768),
    ('tablet-portrait-768x1024', 768, 1024),
    ('phone-large-430x932', 430, 932),
    ('phone-390x844', 390, 844),
    ('phone-landscape-844x390', 844, 390),
)
REPRESENTATIVE_STATES = {'laptop-1366x768', 'phone-390x844'}


def verify_pixels(path: Path) -> None:
    variation = max(ImageStat.Stat(Image.open(path).convert('RGB')).var)
    assert variation > 25, f'Rendered screenshot appears blank: variance={variation}'


def screenshot(page, name: str) -> Path:
    path = output / f'{name}.png'
    page.screenshot(path=str(path), full_page=False)
    verify_pixels(path)
    return path


def assert_manager_geometry(page) -> None:
    metrics = page.evaluate('''() => {
      const bar = document.querySelector('.iag-manager-bar');
      const shell = document.querySelector('.app-shell');
      if (!bar || !shell) return null;
      const rect = bar.getBoundingClientRect();
      const style = getComputedStyle(bar);
      const mapPanel = document.querySelector('.dashboard.workspace-map.view-dashboard > .map-panel');
      const mapRect = mapPanel?.getBoundingClientRect();
      const launcher = document.querySelector('.guide-launcher');
      const guideRect = launcher && getComputedStyle(launcher).display !== 'none' ? launcher.getBoundingClientRect() : null;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottomEdge: rect.bottom,
        height: rect.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        cssReserve: parseFloat(getComputedStyle(shell).getPropertyValue('--manager-bar-height')) || 0,
        cssBottom: parseFloat(style.bottom) || 0,
        overflowX: style.overflowX,
        maskImage: style.maskImage,
        mapBottom: mapRect?.bottom ?? null,
        guideBottom: guideRect?.bottom ?? null,
      };
    }''')
    assert metrics, 'Plant Manager toolbar did not render.'
    assert metrics['left'] >= -1, f"Manager bar starts outside viewport: {metrics}"
    assert metrics['right'] <= metrics['viewportWidth'] + 1, f"Manager bar extends outside viewport: {metrics}"
    assert metrics['top'] >= 0, f"Manager bar starts above viewport: {metrics}"
    assert metrics['bottomEdge'] <= metrics['viewportHeight'] + 1, f"Manager bar extends below viewport: {metrics}"
    minimum_reserve = metrics['height'] + max(0, metrics['cssBottom']) + 8
    assert metrics['cssReserve'] + 3 >= minimum_reserve, (
        f"Reserved manager-bar space is too small. reserve={metrics['cssReserve']} "
        f"required>={minimum_reserve}; metrics={metrics}"
    )
    if metrics['mapBottom'] is not None:
        assert metrics['mapBottom'] <= metrics['top'] + 2, f"Map workspace is hidden behind manager toolbar: {metrics}"
    if metrics['guideBottom'] is not None:
        assert metrics['guideBottom'] <= metrics['top'] + 2, f"Facility Guide overlaps manager toolbar: {metrics}"
    if metrics['viewportWidth'] <= 900:
        assert metrics['overflowX'] in ('auto', 'scroll'), f"Mobile toolbar should scroll horizontally: {metrics}"
        assert metrics['maskImage'] in ('none', ''), f"Mobile toolbar must not hide controls behind a mask: {metrics}"


def wait_for_dashboard(page) -> None:
    page.locator('section.reference-layout[aria-label="Building Layout"]').wait_for(state='visible', timeout=30000)
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    page.wait_for_timeout(250)


def close_editor(page) -> None:
    panel = page.locator('.iag-editor-panel')
    if panel.count() and panel.is_visible():
        panel.locator('header button[aria-label="Close"]').click()
        panel.wait_for(state='hidden')


def exercise_manager_states(page, label: str) -> None:
    page.evaluate('''() => {
      localStorage.setItem('iag-change-control-user', JSON.stringify({ id: 'visual-reviewer', name: 'Visual Test Reviewer', role: 'admin' }));
      localStorage.setItem('iag-change-control-pending-changes', JSON.stringify([{
        id: 'visual-test-review', entityId: 'L2-CC-001', reason: 'Synthetic visual diff fixture',
        proposedBy: 'Visual Test Technician', proposedAt: '2026-08-27T00:00:00Z', basePackageRevision: 1,
        entityType: 'asset', operation: 'UPSERT',
        value: { id: 'L2-CC-001', name: 'Synthetic proposed visual test', verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
        next: {}
      }]));
    }''')
    page.reload(wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    manager = page.locator('.iag-manager-bar')

    manager.get_by_role('button', name='Open Genie command center').click()
    page.get_by_role('heading', name='Command Center').wait_for(state='visible')
    screenshot(page, f'{label}-command-center')
    close_editor(page)

    manager.get_by_role('button', name='Users', exact=True).click()
    page.locator('.iag-editor-panel').wait_for(state='visible')
    account_label_color = page.locator('.account-security label').evaluate('el => getComputedStyle(el).color')
    assert account_label_color == 'rgb(22, 51, 62)', f'Account label loses contrast: {account_label_color}'
    screenshot(page, f'{label}-users')
    close_editor(page)
    page.evaluate("() => { localStorage.removeItem('iag-change-control-user'); localStorage.removeItem('iag-change-control-pending-changes'); }")
    page.reload(wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    manager = page.locator('.iag-manager-bar')

    manager.get_by_role('button', name='Manage', exact=True).click()
    page.locator('.iag-editor-panel').wait_for(state='visible')
    page.get_by_role('button', name='Return to Command Center', exact=True).wait_for(state='visible')
    screenshot(page, f'{label}-manage-assets')
    close_editor(page)

    manager.get_by_role('button', name='Data Health', exact=True).click()
    page.get_by_role('heading', name='Data & Graph Health').wait_for(state='visible')
    screenshot(page, f'{label}-data-health')
    close_editor(page)

    manager.get_by_role('button', name='Bulk Import', exact=True).click()
    page.get_by_role('heading', name='Structured Import').wait_for(state='visible')
    csv = 'recordType,id,name,type,areaId,source,target,relationshipType,verificationStatus\nasset,SYNTHETIC-IMPORT-TEST,Synthetic Import Test,Motor,area-warehouse-f,,,,VERIFIED\nrelationship,SYNTHETIC-REL-TEST,,,,L2-CC-001,SYNTHETIC-IMPORT-TEST,CONTROLS,VERIFIED'
    page.locator('.iag-import-panel input[type="file"]').set_input_files(files=[{'name': 'synthetic-visual-test.csv', 'mimeType': 'text/csv', 'buffer': csv.encode('utf-8')}])
    page.get_by_text('Validated records', exact=True).wait_for(state='visible')
    screenshot(page, f'{label}-bulk-import-preview')
    close_editor(page)

    manager.get_by_role('button', name='Connect', exact=True).click()
    page.get_by_role('heading', name='Connections').wait_for(state='visible')
    screenshot(page, f'{label}-relationship-authoring')
    close_editor(page)

    page.evaluate("() => localStorage.setItem('iag-change-control-user', JSON.stringify({ id: 'visual-map-admin', name: 'Visual Map Admin', role: 'admin' }))")
    page.reload(wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    manager = page.locator('.iag-manager-bar')
    manager.get_by_role('button', name='Map Edit', exact=True).click()
    # The authenticated network fixture supplies the admin role. Local PINs never grant access.
    page.locator('.iag-map-edit-banner').wait_for(state='visible')
    page.locator('.map-editor-shell').wait_for(state='visible')
    screenshot(page, f'{label}-map-edit')
    manager.get_by_role('button', name='Map Edit', exact=True).click()
    page.locator('.iag-map-edit-banner').wait_for(state='hidden')
    page.evaluate("() => localStorage.removeItem('iag-change-control-user')")

    page.evaluate('''() => new Promise((resolve, reject) => {
      const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('mutation-outbox', 'readwrite');
        tx.objectStore('mutation-outbox').put({
          mutationId: 'visual-test-conflict', entityId: 'SYNTHETIC-VISUAL-TEST', entityType: 'asset',
          actorId: 'visual-test', clientId: 'visual-test', baseVersion: 1, operation: 'UPSERT',
          createdAt: '2026-08-27T00:00:00Z', reviewState: 'CONFLICT',
          value: { name: 'Proposed test value', verificationStatus: 'FIELD_VERIFY' },
          conflict: { baseVersion: 1, currentVersion: 2, attemptedValue: { name: 'Proposed test value', verificationStatus: 'FIELD_VERIFY' }, currentValue: { name: 'Canonical test value', verificationStatus: 'VERIFIED' } }
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    })''')
    page.reload(wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)
    conflict_button = page.locator('.iag-manager-bar button:visible').filter(has_text='CONFLICT').first
    conflict_button.wait_for(state='visible', timeout=10000)
    conflict_button.click()
    page.get_by_role('heading', name='Resolve Sync Conflict').wait_for(state='visible')
    screenshot(page, f'{label}-sync-conflict')
    close_editor(page)
    page.evaluate('''() => new Promise((resolve, reject) => {
      const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('mutation-outbox', 'readwrite'); tx.objectStore('mutation-outbox').delete('visual-test-conflict'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    })''')
    page.reload(wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible', timeout=10000)


def exercise_workspace_states(page, label: str) -> None:
    page.goto(f'{BASE}?view=assets', wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-assets')
    assert_manager_geometry(page)

    page.goto(f'{BASE}?view=documents', wait_until='networkidle')
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-documents')
    assert_manager_geometry(page)
    recent_assets = page.locator('.recent-workspace-trail .recent-workspace-tab').filter(has_text='Assets').first
    if recent_assets.is_visible():
        recent_assets.locator('button').first.click()
        page.wait_for_function("() => new URLSearchParams(location.search).get('view') === 'assets'")
        page.locator('.iag-manager-bar').wait_for(state='visible')
        assert 'view=assets' in page.url, f'Recent workspace did not restore assets state: {page.url}'

    page.goto(f'{BASE}?view=cabinet', wait_until='networkidle')
    page.get_by_role('heading', name='Line 2 Conveyor Control Cabinet').wait_for(state='visible', timeout=30000)
    page.locator('.iag-manager-bar').wait_for(state='visible')
    screenshot(page, f'{label}-control-cabinet')
    assert_manager_geometry(page)


def diagnostic(page, label: str) -> None:
    try:
        screenshot(page, f'FAIL-{label}')
    except Exception:
        pass


def exercise_private_asset_package(page, label: str) -> None:
    """Always cover additive equipment/evidence UI; optionally validate a real private bundle."""
    global output
    private_path = os.environ.get('IAG_PRIVATE_VISUAL_BUNDLE')
    if private_path:
        archive = Path(private_path).read_bytes()
    else:
        plant = page.evaluate('''() => new Promise((resolve, reject) => {
          const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb', 2);
          request.onsuccess = () => { const db = request.result; const read = db.transaction('plant').objectStore('plant').get('active'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error); };
          request.onerror = () => reject(request.error);
        })''')
        asset = dict(plant['assets'][0], id='visual-private-machine', name='Private evidence test machine', componentIds=['visual-private-component'])
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#123f54"/><text x="60" y="300" fill="white" font-size="40">Synthetic evidence fixture</text></svg>'
        patch = dict(facilityId=plant['facility']['id'], entityVersions={}, areas=[], assets=[asset], components=[dict(id='visual-private-component',label='Private test component',type='VFD',parentId=asset['id'],verificationStatus='FIELD_VERIFY',evidenceIds=['visual-private-evidence'])], evidence=[dict(id='visual-private-evidence',type='PHOTO',title='Synthetic local evidence',access='LOCAL_ONLY',pathOrUrl='indexeddb://attachment/visual-private-file')], documents=[dict(id='visual-private-doc',assetId=asset['id'],category='Photos',title='Synthetic local evidence',path='indexeddb://attachment/visual-private-file',state='REVIEW',required=False,verificationStatus='FIELD_VERIFY',evidenceIds=['visual-private-evidence'])],relationships=[],revisions=[],assetSerialSources=[])
        manifest = dict(format='industrial-asset-graph-private',version=1,patch=patch,observations=[],attachments=[dict(id='visual-private-file',assetId=asset['id'],name='fixture.svg',mimeType='image/svg+xml',size=len(svg),category='PHOTO',verificationStatus='FIELD_VERIFY',access='LOCAL_ONLY',createdAt='2026-09-07T00:00:00Z',filePath='files/fixture.svg',sha256=hashlib.sha256(svg).hexdigest())])
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as z:
            z.writestr('private-manifest.json',json.dumps(manifest)); z.writestr('files/fixture.svg',svg)
        archive = stream.getvalue()
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        manifest = json.loads(z.read('private-manifest.json'))
    asset = manifest['patch']['assets'][0]
    upload = private_path if private_path else dict(name='private-package.zip',mimeType='application/zip',buffer=archive)
    old_output = output
    if private_path:
        output = Path(os.environ['IAG_PRIVATE_VISUAL_OUTPUT'])
        output.mkdir(parents=True,exist_ok=True)
    try:
        page.locator('.iag-manager-bar').get_by_role('button',name='Plant Database',exact=True).click()
        section = page.get_by_role('region',name='Private asset package')
        with page.expect_download() as backup:
            section.locator('input[type=file]').first.set_input_files(upload)
        if private_path:
            backup.value.save_as(str(output/f'{label}-before-import.zip'))
        section.get_by_role('status').filter(has_text='conflicts retained for review').wait_for(timeout=120000)
        assert '0 conflicts' in section.get_by_role('status').inner_text()
        screenshot(page,f'{label}-private-import')
        close_editor(page)
        page.goto(f'{BASE}?view=assets&asset={asset["id"]}',wait_until='networkidle')
        page.get_by_text(asset['name'],exact=True).first.wait_for(state='visible')
        assert page.locator('.deep-link-warning').count()==0, 'Imported asset deep link failed after reload'
        page.get_by_placeholder('Search this directory…').fill(asset['name'])
        assert_manager_geometry(page); screenshot(page,f'{label}-private-machine')
        page.get_by_role('button',name='Open asset record',exact=True).click()
        page.locator('.asset-panel').get_by_text(asset['name'],exact=True).wait_for(state='visible')
        record_width = page.get_by_test_id('inspector-rail').bounding_box()['width']
        assert record_width >= min(300, page.viewport_size['width']-20), 'Asset record collapsed into an unreadable narrow column'
        screenshot(page,f'{label}-private-asset-record')
        operational = next((r for r in manifest['patch']['relationships'] if r['type'] in ['SUPPLIES','FEEDS','CONTROLS','MECHANICALLY_DRIVES']),None)
        focus = '&device='+operational['source'] if operational else ''
        page.goto(f'{BASE}?asset={asset["id"]}&trace=full{focus}',wait_until='networkidle')
        page.get_by_test_id('troubleshoot-mode').wait_for(state='visible')
        if private_path:
            assert page.locator('.dependency-card').count()>0, 'Imported machine relationships did not resolve'
        assert_manager_geometry(page); screenshot(page,f'{label}-private-relationships')
        page.goto(f'{BASE}?view=documents',wait_until='networkidle')
        doc = next((d for d in manifest['patch']['documents'] if d['title']=='Wulftec-machine-dossier.pdf'),manifest['patch']['documents'][0])
        page.locator('.doc-cards button').filter(has_text=doc['title']).first.click()
        local = page.locator('.local-document-preview')
        local.get_by_role('link',name='Download original',exact=True).wait_for(state='visible')
        assert local.locator('iframe,img,video,pre').count()>0, 'Local evidence has no preview'
        if local.locator('img').count():
            page.wait_for_function("() => [...document.querySelectorAll('.local-document-preview img')].every(img => img.complete && img.naturalWidth > 0)")
        screenshot(page,f'{label}-private-document')
        assert_manager_geometry(page)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Private workspace overflows horizontally'
        page.get_by_role('button',name='Close documentation detail').click()
        if private_path:
            for prefix, element in [('image/', 'img'), ('video/', 'video')]:
                attachment = next(a for a in manifest['attachments'] if a['mimeType'].startswith(prefix))
                media_doc = next(d for d in manifest['patch']['documents'] if d['path']=='indexeddb://attachment/'+attachment['id'])
                page.locator('.doc-cards button').filter(has_text=media_doc['title']).first.click()
                page.locator('.local-document-preview '+element).wait_for(state='visible')
                page.wait_for_function("kind => { const e=document.querySelector('.local-document-preview '+kind); return kind==='img' ? e.complete && e.naturalWidth>0 : e.readyState>=1; }",arg=element,timeout=30000)
                screenshot(page,f'{label}-private-{element}')
                page.get_by_role('button',name='Close documentation detail').click()
        page.locator('.iag-manager-bar').get_by_role('button',name='Plant Database',exact=True).click()
        section = page.get_by_role('region',name='Private asset package')
        with page.expect_download():
            section.locator('input[type=file]').first.set_input_files(upload)
        section.get_by_role('status').filter(has_text='Added 0 records and 0 attachments').wait_for(timeout=120000)
        close_editor(page)
    finally:
        output=old_output


try:
    time.sleep(2)
    with sync_playwright() as p:
        launch_args = {'headless': True}
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        if os.name == 'nt' and Path(chrome_path).exists():
            launch_args['executable_path'] = chrome_path
        browser = p.chromium.launch(**launch_args)
        failures = []
        exercise_rejected_auth(browser, BASE, screenshot)

        for label, width, height in VIEWPORTS:
            print(f'Checking {label}: login and workspace', flush=True)
            # Route Auth at the network boundary; service workers can bypass Playwright routes.
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1, service_workers='block')
            auth_state = install_auth_fixture(page)
            console_errors = []
            page.on(
                'console',
                lambda message, errors=console_errors: errors.append(message.text)
                if message.type == 'error' and '404 (Not Found)' not in message.text
                else None,
            )
            try:
                page.goto(f'{BASE}?area=area-warehouse-f&asset=L2-CC-001&map=2d&tab=intel', wait_until='networkidle')
                print(f'{label}: initial page loaded', flush=True)
                exercise_login(page, label, BASE, screenshot, auth_state)
                page.goto(f'{BASE}?area=area-warehouse-f&asset=L2-CC-001&map=2d&tab=intel', wait_until='networkidle')
                wait_for_dashboard(page)
                assert_manager_geometry(page)
                screenshot(page, f'{label}-dashboard')

                if label in REPRESENTATIVE_STATES:
                    page.goto(f'{BASE}?area=area-building-c&map=2d&tab=overview', wait_until='networkidle')
                    wait_for_dashboard(page)
                    if label == 'phone-390x844':
                        page.get_by_role('button', name='Close map inspector').click()
                    layer_button = page.locator('.map-layer-control > button')
                    layer_metrics = layer_button.evaluate("el => { const r = el.getBoundingClientRect(); return { display: getComputedStyle(el).display, width: r.width, height: r.height }; }")
                    minimum_target = 40 if label == 'phone-390x844' else 36
                    assert layer_metrics['display'] != 'none' and layer_metrics['width'] >= minimum_target and layer_metrics['height'] >= minimum_target, f'Layer control is not usable: {layer_metrics}'
                    layer_button.evaluate('el => el.click()')
                    page.get_by_text('Reference symbols', exact=True).click()
                    assert page.locator('.svg-asset-marker.reference-only').count() == 13, 'Reference layer did not reveal all supplied map tags'
                    page.locator('.map-toolbar-search input').fill('Warehouse E')
                    page.locator('.map-search-results button').first.click()
                    page.wait_for_timeout(250)
                    assert 'area=area-warehouse-e' in page.url, 'Room search did not select the canonical Warehouse E state'
                    screenshot(page, f'{label}-room-inspector')

                    if label == 'phone-390x844':
                        page.goto(f'{BASE}?area=area-warehouse-e&map=2d&tab=capture', wait_until='networkidle')
                        wait_for_dashboard(page)
                        field_workspace = page.locator('[data-testid="inspector-rail"]')
                        field_workspace.wait_for(state='visible')
                        walkdown = page.locator('[data-testid="walkdown-form"]').first
                        walkdown.wait_for(state='visible')
                        walkdown.get_by_label('Typed value').fill('Observed during production-readiness walkthrough')
                        walkdown.locator('input[placeholder="Initials"]').first.fill('VTT')
                        walkdown.get_by_role('button', name='Save capture', exact=True).click()
                        walkdown.get_by_text('Saved locally. Not in the graph yet.', exact=True).wait_for(state='visible')
                        screenshot(page, f'{label}-walkthrough')

                    exercise_manager_states(page, label)
                    exercise_workspace_states(page, label)
                    exercise_private_asset_package(page, label)

                assert not console_errors, f'Browser console errors: {console_errors}'
            except Exception as exc:
                print(f'{label}: {exc}', flush=True)
                diagnostic(page, label)
                failures.append(f'{label}: {exc}')
            finally:
                page.close()

        browser.close()
        assert not failures, 'Visual audit failures:\n' + '\n'.join(failures)
        print(
            'Responsive visual audit passed at 7 desktop/tablet/phone viewports; '
            'representative room/asset inspector, mobile walkthrough, manager, document, map-edit, and cabinet states were captured.'
        )
finally:
    server.terminate()
    server.wait(timeout=10)
