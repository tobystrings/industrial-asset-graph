from pathlib import Path
import os
import subprocess
import time
import json
import io
import zipfile
import hashlib
import socket
import urllib.request
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
    metrics = page.evaluate("""() => {
      const nav = document.querySelector('.page-navigation').getBoundingClientRect();
      const header = document.querySelector('.page-header').getBoundingClientRect();
      const content = document.querySelector('.page-scroll').getBoundingClientRect();
      return {nav: {top:nav.top,bottom:nav.bottom,left:nav.left,right:nav.right},headerBottom:header.bottom,
        content:{top:content.top,bottom:content.bottom},width:innerWidth,height:innerHeight,
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
        contentOverflow:document.querySelector('.page-scroll').scrollWidth>document.querySelector('.page-scroll').clientWidth+1,
        targets:[...document.querySelectorAll('.page-navigation a')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}),
        legacy:document.querySelectorAll('.iag-manager-bar,.reference-topbar,.bottom-nav').length};
    }""")
    assert metrics['legacy']==0, f'Obsolete stacked navigation returned: {metrics}'
    assert not metrics['horizontalOverflow'] and not metrics['contentOverflow'], f'Page has horizontal overflow: {metrics}'
    assert metrics['nav']['left']>=0 and metrics['nav']['right']<=metrics['width']+1, f'Navigation extends outside viewport: {metrics}'
    assert metrics['nav']['top']>=0 and metrics['nav']['bottom']<=metrics['height']+1, f'Navigation is clipped: {metrics}'
    assert metrics['content']['top']>=metrics['headerBottom']-1, f'Header covers workspace content: {metrics}'
    assert metrics['content']['bottom']<=metrics['nav']['top']+1 or metrics['content']['top']>=metrics['nav']['bottom']-1, f'Navigation covers workspace content: {metrics}'
    assert all(t['width']>=44 and t['height']>=44 for t in metrics['targets']), f'Navigation touch targets are too small: {metrics}'


def open_page(page, route):
    page.goto(f'{BASE}?page={route}', wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible')


def wait_for_dashboard(page) -> None:
    page.locator('section.reference-layout[aria-label="Building Layout"]').wait_for(state='visible', timeout=30000)
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)
    page.wait_for_timeout(250)


def close_editor(page) -> None:
    open_page(page, 'map')


def exercise_area_rename(page, label):
    open_page(page, 'account')
    page.get_by_text('Application role: Administrator', exact=True).wait_for()
    page.get_by_role('button', name='Refresh permissions', exact=True).click()
    page.get_by_text('Permissions refreshed from your account.', exact=True).wait_for()
    open_page(page, 'map')
    page.get_by_role('button', name='Edit map', exact=True).click()
    studio = page.locator('.map-editor-shell')
    collapsed_height = studio.bounding_box()['height']
    page.get_by_role('button', name='Areas & shapes', exact=False).click()
    assert studio.bounding_box()['height'] > collapsed_height
    page.get_by_role('button', name='Collapse tools', exact=True).click()
    assert page.locator('#map-studio-panel').count() == 0
    page.get_by_role('button', name='Cursor / Pan', exact=True).click()
    surface = page.locator('.reference-plan-wrap')
    surface.scroll_into_view_if_needed()
    box = surface.bounding_box()
    content = page.locator('.page-scroll').bounding_box()
    x = max(box['x'],0) + min(box['width'],page.viewport_size['width']) * .5
    top = max(box['y'],content['y']); bottom = min(box['y']+box['height'],content['y']+content['height'])
    y = (top+bottom)/2
    transform = page.locator('.reference-plan-transform').get_attribute('style')
    page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x+65,y+35,steps=8); page.mouse.up()
    assert page.locator('.reference-plan-transform').get_attribute('style') != transform, 'Cursor/Pan did not move the map'
    assert studio.count() == 1 and 'page=map' in page.url, 'Pan activated a room or asset'
    screenshot(page, f'{label}-map-studio-collapsed-pan')
    page.locator('.map-floating-controls').get_by_role('button', name='Fit', exact=True).click()
    page.get_by_role('button', name='Select', exact=True).click()
    page.locator('[aria-label="Edit area Warehouse E"]').click(force=True)
    props = page.get_by_role('complementary', name='Area Properties')
    props.get_by_label('Area name', exact=True).fill('Renamed receiving room')
    assert props.get_by_label('Display label', exact=True).input_value() == 'Renamed receiving room'
    assert_manager_geometry(page)
    screenshot(page, f'{label}-map-rename-edit')
    page.get_by_role('button', name='Done', exact=True).click()
    page.locator('.map-editor-shell').wait_for(state='detached')
    page.reload(wait_until='networkidle')
    zone = page.locator('.svg-zone[aria-label="Select Renamed receiving room"]')
    zone.wait_for()
    assert zone.locator('text').text_content() == 'Renamed receiving room'
    assert zone.locator('text').evaluate('e => getComputedStyle(e).fill') != 'rgba(0, 0, 0, 0)'
    assert_manager_geometry(page)
    screenshot(page, f'{label}-map-rename-saved')


def exercise_historical_evidence(page, label):
    open_page(page, 'history')
    private_path = os.environ.get('IAG_HISTORY_BUNDLE')
    if private_path:
        payload = Path(private_path).read_bytes()
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            manifest = json.loads(archive.read('history.json'))
    else:
        source = b'Synthetic historical source, not plant evidence.'
        manifest = {'format':'industrial-asset-graph-history','version':1,'id':'synthetic-history','facilityId':'facility-j-lieb','title':'Synthetic historical evidence','access':'LOCAL_ONLY',
            'subjects':[{'id':'subject','name':'Synthetic candidate','candidateAssetId':'L2-CC-001','priority':1,'lineContext':'Unknown; field verification required'}],
            'files':[{'path':'source.txt','size':len(source),'sha256':hashlib.sha256(source).hexdigest(),'mimeType':'text/plain','incomplete':False}],
            'sources':[{'id':'source','name':'Synthetic source','paths':['source.txt'],'coverage':'Synthetic fixture only'}],
            'assertions':[{'id':'SYNTHETIC-01','subject':'subject','kind':'HISTORICAL_SNAPSHOT','text':'Historical display with unknown observation time','values':{'raw_value':'00001'},'verification':'FIELD_VERIFY','citations':[{'sourceId':'source','locator':'row 1'}]}],
            'tasks':[{'id':'VERIFY-01','subject':'subject','priority':1,'action':'Verify synthetic observation','assertionIds':['SYNTHETIC-01']}]}
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_STORED) as archive:
            archive.writestr('history.json', json.dumps(manifest))
            archive.writestr('source.txt', source)
        payload = buffer.getvalue()
    page.get_by_label('Prepared evidence bundle').set_input_files({'name':'history.iag','mimeType':'application/zip','buffer':payload})
    page.get_by_test_id('history-preview').wait_for()
    assert_manager_geometry(page)
    assert page.locator('.history-card').first.evaluate('e => getComputedStyle(e).color') == 'rgb(23, 44, 59)', 'Historical source text lost contrast'
    screenshot(page, f'{label}-history-preview')
    with page.expect_download():
        page.get_by_role('button', name='Stage local evidence', exact=True).click()
    page.get_by_role('status').filter(has_text='Staged on this device').wait_for(timeout=60000)
    page.reload(wait_until='networkidle')
    page.get_by_role('heading',name=manifest['title'],exact=True).wait_for()
    assertion_id = manifest['assertions'][0]['id']
    page.get_by_label('Search assertions').fill(assertion_id)
    detail = page.locator('.history-assertions details').filter(has=page.locator('summary',has_text=assertion_id)).first
    detail.locator('summary').click()
    detail.get_by_label('Review state').select_option('REVIEWED')
    detail.get_by_label('Review rationale').fill('Synthetic browser review only; no field verification or equipment change.')
    detail.get_by_role('button',name='Save historical review').click()
    page.get_by_role('status').filter(has_text='Review saved').wait_for()
    assert_manager_geometry(page)
    detail.scroll_into_view_if_needed()
    screenshot(page, f'{label}-history-review')
    page.get_by_label('Prepared evidence bundle').set_input_files({'name':'history.iag','mimeType':'application/zip','buffer':payload})
    page.get_by_text('Already staged. Re-import will preserve all reviews.',exact=True).wait_for()
    with page.expect_download():
        page.get_by_role('button',name='Stage local evidence',exact=True).click()
    page.get_by_role('status').filter(has_text='Already staged;').wait_for(timeout=60000)
    page.reload(wait_until='networkidle')
    page.get_by_text('1 review events',exact=False).wait_for()
    page.get_by_text(f'Source coverage ({len(manifest["sources"])})',exact=True).click()
    source_name = manifest['sources'][0]['paths'][0].split('/')[-1]
    with page.expect_download() as source_download:
        page.get_by_role('button',name=source_name,exact=True).first.click()
    metadata = next(f for f in manifest['files'] if f['path'] == manifest['sources'][0]['paths'][0])
    assert hashlib.sha256(Path(source_download.value.path()).read_bytes()).hexdigest() == metadata['sha256']


def exercise_production_records(page, label):
    open_page(page, 'maintenance&asset=L2-CC-001')
    form = page.locator('.production-form').last
    line4 = form.locator('fieldset').filter(has=page.locator('legend', has_text='Line 4'))
    line4.get_by_label('Supports this line').check()
    line4.get_by_label('Source / original line designation').fill('Synthetic browser survey; unverified shared membership')
    form.get_by_label('Actual process stage / purpose').fill('Synthetic documented stage')
    form.get_by_role('button', name='Add service / maintenance record').click()
    form.get_by_label('Fault / symptom').fill('Synthetic observation for persistence check')
    form.get_by_role('button', name='Save changes', exact=True).click()
    form.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    page.reload(wait_until='networkidle')
    form = page.locator('.production-form').last
    assert form.get_by_label('Actual process stage / purpose').input_value() == 'Synthetic documented stage'
    assert form.get_by_label('Fault / symptom').input_value() == 'Synthetic observation for persistence check'
    assert form.locator('fieldset').filter(has=page.locator('legend', has_text='Line 4')).get_by_label('Supports this line').is_checked()
    assert_manager_geometry(page)
    form.get_by_label('Actual process stage / purpose').scroll_into_view_if_needed()
    screenshot(page, f'{label}-production-field-capture')
    page.get_by_role('link', name='Attach evidence', exact=True).click()
    assert page.locator('.iag-editor-form select').first.input_value() == 'L2-CC-001'
    page.locator('input[type=file]').first.set_input_files({'name':'production-survey.txt','mimeType':'text/plain','buffer':b'Synthetic field evidence'})
    page.get_by_text('production-survey.txt', exact=True).first.wait_for()
    page.reload(wait_until='networkidle')
    page.get_by_text('production-survey.txt', exact=True).first.wait_for()
    open_page(page, 'documentation')
    page.get_by_label('Next field action').fill('Synthetic survey backlog test')
    page.get_by_role('button', name='Add survey task', exact=True).click()
    page.get_by_role('button', name='Save changes', exact=True).click()
    page.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    page.reload(wait_until='networkidle')
    assert page.get_by_label('Action', exact=True).last.input_value() == 'Synthetic survey backlog test'
    open_page(page, 'lines&line=shared')
    assert page.get_by_role('link',name='Line 2 Conveyor Control Cabinet',exact=True).count() == 1
    assert_manager_geometry(page)
    screenshot(page, f'{label}-production-shared')
    open_page(page, 'dependencies')
    page.get_by_label('Source / upstream / supporting entity').select_option('FG-L4-MTN-001')
    page.get_by_label('Target / downstream / supported entity').select_option('L2-CC-001')
    page.get_by_label('Route / alternative').select_option('BYPASS')
    page.get_by_label('Original markers, bypass conditions, conflicts and unresolved questions').fill('Synthetic conditional bypass; field verification required')
    page.get_by_role('button', name='Save connection', exact=True).click()
    page.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    page.reload(wait_until='networkidle')
    page.get_by_text('Synthetic conditional bypass; field verification required', exact=True).wait_for()
    assert_manager_geometry(page)
    open_page(page, 'maintenance&asset=L2-CC-001')
    page.get_by_text('Record components and assemblies', exact=True).click()
    component_form = page.locator('.production-form').first
    component_form.get_by_label('Original label / wire marker').fill('Synthetic component persistence test')
    component_form.get_by_role('button', name='Save component', exact=True).click()
    component_form.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    page.reload(wait_until='networkidle')
    page.get_by_text('Record components and assemblies', exact=True).click()
    assert page.get_by_label('Existing component').locator('option').filter(has_text='Synthetic component persistence test').count() == 1
    assert_manager_geometry(page)
    page.get_by_label('Existing component').scroll_into_view_if_needed()
    screenshot(page, f'{label}-production-component')
    page.evaluate("dispatchEvent(new Event('beforeprint'))")
    page.emulate_media(media='print')
    assert page.locator('.page-navigation').evaluate("e => getComputedStyle(e).display") == 'none'
    assert page.locator('.app-shell').evaluate('e => e.getBoundingClientRect().height > innerHeight'), 'Print frame clips the field sheet'
    assert page.locator('.production-workspace details:not([open])').count() == 0
    screenshot(page, f'{label}-production-print')
    page.emulate_media(media='screen')
    page.evaluate("dispatchEvent(new Event('afterprint'))")


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
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)


    open_page(page, 'more')
    page.get_by_role('heading', name='More', exact=True).wait_for(state='visible')
    screenshot(page, f'{label}-command-center')
    close_editor(page)

    open_page(page, 'account')
    page.locator('.page-workspace').wait_for(state='visible')
    account_label_color = page.locator('.account-security label').evaluate('el => getComputedStyle(el).color')
    assert account_label_color == 'rgb(22, 51, 62)', f'Account label loses contrast: {account_label_color}'
    screenshot(page, f'{label}-users')
    close_editor(page)
    page.evaluate("() => { localStorage.removeItem('iag-change-control-user'); localStorage.removeItem('iag-change-control-pending-changes'); }")
    page.reload(wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)


    open_page(page, 'manage')
    page.locator('.page-workspace').wait_for(state='visible')
    page.get_by_role('link', name='← More', exact=True).wait_for(state='visible')
    screenshot(page, f'{label}-manage-assets')
    close_editor(page)

    open_page(page, 'health')
    page.get_by_role('heading', name='Data health').wait_for(state='visible')
    screenshot(page, f'{label}-data-health')
    close_editor(page)

    open_page(page, 'import')
    page.get_by_role('heading', name='Import records').wait_for(state='visible')
    csv = 'recordType,id,name,type,areaId,source,target,relationshipType,verificationStatus\nasset,SYNTHETIC-IMPORT-TEST,Synthetic Import Test,Motor,area-warehouse-f,,,,VERIFIED\nrelationship,SYNTHETIC-REL-TEST,,,,L2-CC-001,SYNTHETIC-IMPORT-TEST,CONTROLS,VERIFIED'
    page.locator('.iag-import-panel input[type="file"]').set_input_files(files=[{'name': 'synthetic-visual-test.csv', 'mimeType': 'text/csv', 'buffer': csv.encode('utf-8')}])
    page.get_by_text('Validated records', exact=True).wait_for(state='visible')
    screenshot(page, f'{label}-bulk-import-preview')
    close_editor(page)

    open_page(page, 'connection')
    page.get_by_role('heading', name='Connections').wait_for(state='visible')
    screenshot(page, f'{label}-relationship-authoring')
    close_editor(page)

    page.evaluate("() => localStorage.setItem('iag-change-control-user', JSON.stringify({ id: 'visual-map-admin', name: 'Visual Map Admin', role: 'admin' }))")
    page.reload(wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)

    page.get_by_role('button', name='Edit map', exact=True).click()
    # The authenticated network fixture supplies the admin role. Local PINs never grant access.
    page.locator('.map-editor-shell').wait_for(state='visible')
    page.locator('.map-editor-shell').wait_for(state='visible')
    screenshot(page, f'{label}-map-edit')
    page.get_by_role('button', name='Cancel / Exit', exact=True).click()
    page.locator('.map-editor-shell').wait_for(state='hidden')
    page.evaluate("() => localStorage.removeItem('iag-change-control-user')")

    page.evaluate('''() => new Promise((resolve, reject) => {
      const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb');
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
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)
    open_page(page, 'conflicts')
    page.get_by_role('heading', name='Resolve sync conflicts').wait_for(state='visible')
    screenshot(page, f'{label}-sync-conflict')
    close_editor(page)
    page.evaluate('''() => new Promise((resolve, reject) => {
      const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('mutation-outbox', 'readwrite'); tx.objectStore('mutation-outbox').delete('visual-test-conflict'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    })''')
    page.reload(wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible', timeout=10000)


def exercise_workspace_states(page, label: str) -> None:
    page.goto(f'{BASE}?view=assets', wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible')
    screenshot(page, f'{label}-assets')
    assert_manager_geometry(page)

    page.goto(f'{BASE}?view=documents', wait_until='networkidle')
    page.locator('.page-navigation').wait_for(state='visible')
    screenshot(page, f'{label}-documents')
    assert_manager_geometry(page)
    page.get_by_role('navigation', name='Main navigation').get_by_role('link',name='Assets',exact=True).click()
    page.wait_for_url('**page=assets*')
    page.go_back(wait_until='networkidle')
    assert 'view=documents' in page.url, f'Back did not restore documents: {page.url}'
    assert_manager_geometry(page)

    page.goto(f'{BASE}?view=cabinet', wait_until='networkidle')
    page.get_by_role('heading', name='Line 2 Conveyor Control Cabinet').wait_for(state='visible', timeout=30000)
    page.locator('.page-navigation').wait_for(state='visible')
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
          const request = indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb');
          request.onsuccess = () => { const db = request.result; const read = db.transaction('plant').objectStore('plant').get('active'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error); };
          request.onerror = () => reject(request.error);
        })''')
        asset = dict(plant['assets'][0], id='visual-private-machine', name='Private evidence test machine', componentIds=['visual-private-component'])
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#123f54"/><text x="60" y="300" fill="white" font-size="40">Synthetic evidence fixture</text></svg>'
        patch = dict(facilityId=plant['facility']['id'], entityVersions={}, areas=[], assets=[asset], components=[dict(id='visual-private-component',label='Private test component',type='VFD',parentId=asset['id'],verificationStatus='FIELD_VERIFY',evidenceIds=['visual-private-evidence'])], evidence=[dict(id='visual-private-evidence',type='PHOTO',title='Synthetic local evidence',access='LOCAL_ONLY',pathOrUrl='indexeddb://attachment/visual-private-file')], documents=[dict(id='visual-private-doc',assetId=asset['id'],category='Photos',title='Synthetic local evidence',path='indexeddb://attachment/visual-private-file',state='REVIEW',required=False,verificationStatus='FIELD_VERIFY',evidenceIds=['visual-private-evidence'])],relationships=[],revisions=[],assetSerialSources=[])
        register = dict(patch['documents'][0], id='visual-private-register', title='Wiring register', register=dict(kind='wiring-all', entries=[dict(id='visual-wire-6',label='Wire 6 · terminal 04',entityIds=[asset['id']],evidenceIds=['visual-private-evidence'],verificationStatus='FIELD_VERIFY',values=dict(wireId='6',sourceTerminal='04',destinationEquipment=None,state='PROPOSED'),provenance=dict(filename='synthetic.json',section='5',review='INHERITED',sourceId=None,locator=None))]))
        patch['documents'].append(register)
        asset['manufacturer'] = dict(value='Wulftec', verificationStatus='FIELD_VERIFY', evidenceIds=['visual-private-evidence'])
        asset['model'] = dict(value='WCRT-200', verificationStatus='FIELD_VERIFY', evidenceIds=['visual-private-evidence'])
        for suffix, title in [('CABINET', 'Synthetic wrapper cabinet'), ('PRESTRETCH', 'Synthetic prestretch carriage')]:
            component_id = asset['id']+'-'+suffix
            asset['componentIds'].append(component_id)
            patch['components'].append(dict(id=component_id,label=title,type='MECHANICAL_ASSEMBLY',parentId=asset['id'],verificationStatus='FIELD_VERIFY',evidenceIds=['visual-private-evidence']))
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
        open_page(page, 'database')
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
        page.get_by_role('link', name='Open 3D model', exact=True).click()
        panel = page.get_by_role('region', name='Asset graph connection')
        panel.get_by_text(asset['id'], exact=True).wait_for(state='visible')
        page.get_by_label('Inspect assembly', exact=True).select_option('cabinet')
        page.get_by_role('button', name='Explode', exact=True).click()
        assert 'assembly=cabinet' in page.url and 'explode=100' in page.url
        page.reload(wait_until='networkidle')
        assert page.get_by_label('Inspect assembly', exact=True).input_value() == 'cabinet'
        assert page.locator('#explosion').input_value() == '100'
        assert_manager_geometry(page)
        screenshot(page, f'{label}-connected-model')
        panel.get_by_role('link', name='Open component record', exact=True).click()
        page.locator('.component-record').wait_for(state='visible')
        page.get_by_role('region', name='Component evidence').locator('summary').first.click()
        page.locator('.local-document-preview').get_by_role('link', name='Download original', exact=True).wait_for(state='visible')
        assert_manager_geometry(page)
        screenshot(page, f'{label}-model-component-evidence')
        page.locator('.component-record section').filter(has=page.get_by_role('heading',name='Linked documents',exact=True)).get_by_role('link').first.click()
        page.get_by_role('link', name='Return to 3D model', exact=True).click()
        page.locator('.wulftec-canvas[data-ready=true]').wait_for()
        assert page.get_by_label('Inspect assembly', exact=True).input_value() == 'cabinet'
        assert page.locator('#explosion').input_value() == '100'
        page.get_by_label('View',exact=True).select_option('carriage')
        page.get_by_label('Inspect assembly',exact=True).select_option('rollers')
        panel.get_by_text('Carriage record context',exact=True).wait_for(state='visible')
        panel.get_by_role('link',name='Open component record',exact=True).wait_for(state='visible')
        screenshot(page,f'{label}-model-carriage-context')
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
        register_doc = next((d for d in manifest['patch']['documents'] if d.get('register')), None)
        if register_doc:
            page.goto(f'{BASE}?page=documents&doc={register_doc["id"]}', wait_until='networkidle')
            register_view = page.locator('.machine-register')
            register_view.get_by_role('button', name='Add review note', exact=True).first.click()
            register_view.get_by_label('Review note', exact=True).fill('Disposable audit note: retain source uncertainty.')
            register_view.get_by_role('button', name='Save review note', exact=True).click()
            register_view.get_by_text('Review note saved locally. Source values retained.', exact=True).wait_for(state='visible')
            page.reload(wait_until='networkidle')
            page.locator('.machine-register').get_by_text('Review note: Disposable audit note:', exact=False).wait_for(state='visible')
            page.locator('.machine-register').wait_for(state='visible')
            page.locator('.machine-register summary').first.click()
            assert_manager_geometry(page)
            screenshot(page, f'{label}-private-register')
            for native_doc in (d for d in manifest['patch']['documents'] if d.get('register')):
                page.goto(f'{BASE}?page=documents&doc={native_doc["id"]}', wait_until='networkidle')
                register_view = page.locator('.machine-register')
                register_view.wait_for(state='visible')
                count = len(native_doc['register']['entries'])
                assert f'{count} of {count} entries' in register_view.inner_text(), 'Native register count is not visible'
                if count:
                    contrast = register_view.locator('article p').first.evaluate('''element => {
                      const luminance = color => { const rgb = color.match(/[\\d.]+/g).slice(0,3).map(Number).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]; };
                      const foreground = luminance(getComputedStyle(element).color);
                      const background = luminance(getComputedStyle(element.closest('article')).backgroundColor);
                      return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
                    }''')
                    assert contrast >= 4.5, f'Register text contrast is too low: {contrast}'
                assert_manager_geometry(page)
                if native_doc['register']['kind'] in ['parameters-all', 'wiring-all', 'missing-sources']:
                    screenshot(page, f'{label}-private-{native_doc["register"]["kind"]}')
                if count:
                    query = native_doc['register']['entries'][0]['label']
                    register_view.get_by_label('Search register', exact=True).fill(query)
                    assert register_view.locator('article').count() >= 1, 'Register search lost a known row'
            page.goto(f'{BASE}?page=documents&doc={register_doc["id"]}', wait_until='networkidle')
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
        open_page(page, 'database')
        section = page.get_by_role('region',name='Private asset package')
        with page.expect_download():
            section.locator('input[type=file]').first.set_input_files(upload)
        section.get_by_role('status').filter(has_text='Added 0 records and 0 attachments').wait_for(timeout=120000)
        close_editor(page)
    finally:
        output=old_output


try:
    deadline = time.monotonic() + 30
    while True:
        try:
            with urllib.request.urlopen(BASE, timeout=1) as response:
                assert response.status == 200
            break
        except OSError:
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Preview server failed to become ready')
            time.sleep(.2)
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
            page.on('requestfailed', lambda request: print(f'Request failed: {request.url} ({request.failure})', flush=True))
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
                for route in ['home','more','account','wulftec','lines','documentation','maintenance&asset=L2-CC-001','dependencies']:
                    open_page(page, route)
                    if route == 'wulftec':
                        page.locator('.wulftec-canvas[data-ready="true"]').wait_for(timeout=30000)
                    assert_manager_geometry(page)
                    screenshot(page, f'{label}-page-{route}')

                if label in REPRESENTATIVE_STATES:
                    open_page(page, 'wulftec')
                    canvas = page.locator('.wulftec-canvas canvas')
                    page.locator('.wulftec-canvas[data-ready="true"]').wait_for(timeout=30000)
                    before = canvas.screenshot()
                    canvas.focus()
                    page.keyboard.press('ArrowRight')
                    page.wait_for_timeout(250)
                    assert before != canvas.screenshot(), 'Orbit control did not change rendered model'
                    page.get_by_role('button', name='Auto-rotate', exact=True).click()
                    page.get_by_role('button', name='Pause rotation', exact=True).click()
                    page.get_by_role('button', name='Explode', exact=True).click()
                    assert page.locator('#explosion').input_value() == '100'
                    screenshot(page, f'{label}-wulftec-exploded')
                    page.get_by_label('View', exact=True).select_option('carriage')
                    page.get_by_label('Inspect assembly').select_option('rollers')
                    page.wait_for_timeout(300)
                    assert_manager_geometry(page)
                    screenshot(page, f'{label}-wulftec-carriage')
                    with page.expect_download() as download_info:
                        page.get_by_role('button', name='Download current view (.glb)').click()
                    exported = download_info.value.path()
                    assert Path(exported).read_bytes()[:4] == b'glTF', 'Export is not a binary glTF model'
                    page.get_by_role('button', name='Assemble', exact=True).click()
                    assert page.locator('#explosion').input_value() == '0'
                    page.goto(f'{BASE}?area=area-building-c&map=2d&tab=overview', wait_until='networkidle')
                    wait_for_dashboard(page)
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
                    page.get_by_role('button', name='Open details →').click()
                    page.locator('[data-testid=inspector-rail]').wait_for(state='visible')
                    assert_manager_geometry(page)
                    screenshot(page, f'{label}-room-inspector')

                    if label == 'phone-390x844':
                        page.goto(f'{BASE}?page=area&area=area-warehouse-e&tab=capture', wait_until='networkidle')
                        page.locator('.page-navigation').wait_for(state='visible')
                        field_workspace = page.locator('[data-testid="inspector-rail"]')
                        field_workspace.wait_for(state='visible')
                        walkdown = page.locator('[data-testid="walkdown-form"]').first
                        walkdown.wait_for(state='visible')
                        walkdown.get_by_label('Typed value').fill('Observed during production-readiness walkthrough')
                        walkdown.locator('input[placeholder="Initials"]').first.fill('VTT')
                        walkdown.get_by_role('button', name='Save capture', exact=True).click()
                        walkdown.get_by_text('Capture and photo saved for public publication. Not in the graph yet.', exact=True).wait_for(state='visible')
                        screenshot(page, f'{label}-walkthrough')

                    for route in ['home','more','field','observation','evidence','assetAdd','setup','settings','review','help']:
                        open_page(page, route)
                        assert_manager_geometry(page)
                        screenshot(page, f'{label}-page-{route}')
                        if route == 'field':
                            for section in ['Connections','Evidence','Checklist']:
                                page.get_by_role('navigation',name='Field sections').get_by_role('button',name=section,exact=True).click()
                                assert_manager_geometry(page)
                                screenshot(page,f'{label}-field-{section.lower()}')
                    exercise_manager_states(page, label)
                    exercise_workspace_states(page, label)
                    exercise_private_asset_package(page, label)
                    exercise_production_records(page, label)
                    exercise_historical_evidence(page, label)
                    exercise_area_rename(page, label)

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
