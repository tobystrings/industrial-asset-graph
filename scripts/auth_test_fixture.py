"""Network-only Auth fixtures for isolated browser tests. No application bypass exists."""
import base64
import json
import time
from email.parser import BytesParser
from email.policy import default as email_policy
from urllib.parse import urlparse, parse_qs

EMAIL = 'visual-reviewer@example.test'
PASSWORD = 'Synthetic-password-only-42!'

def install_auth_fixture(page, cloud=None):
    cloud = cloud if cloud is not None else {'publication':None, 'publication_requests':{}, 'files':{}, 'submissions':{}}
    state = {'authenticated': False, 'role': 'admin', 'recoveries': [], 'password_updates': [], 'username': 'visual-reviewer', 'logouts': 0, 'publication': None, 'publication_requests': {}, 'files': {}}
    def user():
        return {'id': '00000000-0000-4000-8000-000000000042', 'aud': 'authenticated', 'role': 'authenticated', 'email': EMAIL, 'email_confirmed_at': '2026-09-07T00:00:00Z', 'created_at': '2026-09-07T00:00:00Z', 'app_metadata': {'provider': 'email', 'providers': ['email'], 'iag_role': state['role']}, 'user_metadata': {'full_name': 'Visual Test Reviewer'}}
    def session():
        enc = lambda data: base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
        token = enc({'alg': 'HS256', 'typ': 'JWT'})+'.'+enc({'sub': user()['id'], 'aud': 'authenticated', 'exp': int(time.time())+3600})+'.synthetic-signature'
        return {'access_token': token, 'refresh_token': 'synthetic-refresh-token', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time())+3600, 'user': user()}
    def handler(route):
        request = route.request
        url = urlparse(request.url)
        headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'}
        def reply(data, status=200): route.fulfill(status=status, content_type='application/json', headers=headers, body=json.dumps(data))
        if request.method == 'OPTIONS': return reply({})
        if '/storage/v1/object/' in url.path:
            path = url.path.split('/iag-public/', 1)[-1]
            if request.method == 'POST':
                content=request.post_data_buffer
                content_type=request.headers.get('content-type','')
                if content_type.startswith('multipart/form-data'):
                    message=BytesParser(policy=email_policy).parsebytes(('Content-Type: '+content_type+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+content)
                    content=next(part.get_payload(decode=True) for part in message.iter_parts() if part.get_filename())
                cloud['files'][path] = content
                return reply({'Key':path})
            if path in cloud['files']:
                return route.fulfill(status=200,headers=headers,body=cloud['files'][path])
            return reply({'error':'missing synthetic file'},404)
        body = request.post_data_json if request.post_data else {}
        if url.path.endswith('/iag_publications'): return reply(cloud['publication'])
        if url.path.endswith('/iag_submissions'):
            if 'submitted_by' in parse_qs(url.query): return reply(cloud['submissions'].get(user()['id']))
            return reply(list(cloud['submissions'].values()))
        if url.path.endswith('/iag_submit'):
            old=cloud['submissions'].get(user()['id']); revision=(old or {}).get('revision',0)
            if body['p_base_revision']!=revision:return reply(dict(status='conflict',revision=revision))
            cloud['submissions'][user()['id']]=dict(facility_id=body['p_facility_id'],submitted_by=user()['id'],revision=revision+1,payload=body['p_payload'])
            return reply(dict(status='saved',revision=revision+1))
        if url.path.endswith('/iag_publish'):
            if state['role'] != 'admin': return reply({'message':'Administrator required'},403)
            rid = body['p_request_id']
            if rid in cloud['publication_requests']: return reply(dict(status='duplicate',revision=cloud['publication_requests'][rid]))
            revision = (cloud['publication'] or {}).get('revision',0)
            if body['p_base_revision'] != revision: return reply(dict(status='conflict',revision=revision,payload=cloud['publication']['payload']))
            revision += 1
            cloud['publication'] = dict(facility_id=body['p_facility_id'],revision=revision,payload=body['p_payload'],updated_at='2026-09-09T00:00:00Z')
            cloud['publication_requests'][rid] = revision
            return reply(dict(status='saved',revision=revision))
        if '/api/facilities/' in url.path:
            if request.method == 'GET': return reply({'entities': []})
            if body.get('conflict'):
                return reply(dict(status='conflict', mutationId=body['mutationId'], entityId=body['entityId'], **body['conflict']), 409)
            return reply(dict(status='accepted', mutationId=body['mutationId'], entityId=body['entityId'], version=body['baseVersion']+1))
        if url.path.endswith('/token'):
            if parse_qs(url.query).get('grant_type') == ['refresh_token'] or body.get('email') == EMAIL and body.get('password') == PASSWORD:
                state['authenticated'] = True; return reply(session())
            return reply({'code': 'invalid_credentials', 'msg': 'Invalid login credentials'}, 400)
        if url.path.endswith('/user'):
            if not state['authenticated']: return reply({'msg': 'Session not found'}, 401)
            if request.method == 'PUT': state['password_updates'].append(body.get('password'))
            return reply(user())
        if url.path.endswith('/recover'):
            state['recoveries'].append({'email': body.get('email'), 'redirect': parse_qs(url.query).get('redirect_to', [''])[0]}); return reply({})
        if url.path.endswith('/logout'):
            state['authenticated'] = False; state['logouts'] += 1; return reply({})
        if '/passkeys' in url.path:
            if request.method == 'GET': return reply([])
            return reply({'code': 'passkey_disabled', 'msg': 'Passkeys disabled in synthetic fixture'}, 400)
        if url.path.endswith('/get_my_username'): return reply(state['username'])
        if url.path.endswith('/set_my_username'): state['username'] = body['new_username']; return reply(None)
        if url.path.endswith('/username-login'):
            if body.get('username') == state['username'] and body.get('password') == PASSWORD:
                state['authenticated'] = True; return reply(session())
            return reply({'error': 'Invalid credentials'}, 400)
        return reply({'error': 'Unhandled synthetic Auth request'}, 400)
    page.route('**/auth/v1/**', handler)
    page.route('**/rest/v1/**', handler)
    page.route('**/storage/v1/object/**', handler)
    page.route('**/functions/v1/username-login', handler)
    page.route('**/api/facilities/**', handler)
    return state

def sign_in(page, username=False):
    page.get_by_label('Username or email', exact=True).fill('visual-reviewer' if username else EMAIL)
    page.get_by_label('Password', exact=True).fill(PASSWORD)
    page.get_by_role('button', name='Sign in', exact=True).click()
    page.locator('.app-pages').wait_for(state='visible', timeout=30000)

def exercise_login(page, label, base, screenshot, state):
    # A legacy local admin record must NOT grant access, even on a deep link.
    print(f'{label}: verifying local identity cannot bypass login', flush=True)
    page.evaluate("() => localStorage.setItem('iag-change-control-user', JSON.stringify({id:'forged',name:'Forged admin',role:'admin'}))")
    print(f'{label}: reload signed-out page', flush=True)
    page.reload(wait_until='networkidle')
    print(f'{label}: waiting for login heading', flush=True)
    page.get_by_role('heading', name='Welcome back').wait_for(state='visible')
    assert page.locator('.app-pages').count() == 0
    assert page.locator('.dashboard').count() == 0
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    screenshot(page, f'{label}-login')
    page.get_by_role('button', name='Forgot password?', exact=True).click()
    page.get_by_label('Email address', exact=True).fill(EMAIL)
    page.get_by_role('button', name='Send reset link', exact=True).click()
    page.get_by_role('status').filter(has_text='If an account exists').wait_for()
    assert state['recoveries'][-1]['redirect'] == base+'?auth=reset'
    screenshot(page, f'{label}-forgot-password')
    page.get_by_role('button', name='Back to sign in', exact=False).click()
    sign_in(page, username=True)
    page.reload(wait_until='networkidle')
    page.locator('.app-pages').wait_for(state='visible')
    if label in {'laptop-1366x768', 'phone-390x844'}:
        page.goto(base+'?auth=reset', wait_until='networkidle')
        page.get_by_role('heading', name='Set a new password').wait_for()
        assert page.locator('.app-pages').count()==0
        page.locator('input#auth-password').fill(PASSWORD)
        page.get_by_label('Confirm new password', exact=True).fill(PASSWORD+'mismatch')
        page.get_by_role('button', name='Save new password').click()
        page.get_by_role('alert').filter(has_text='do not match').wait_for()
        assert len(state['password_updates'])==0
        screenshot(page, f'{label}-password-reset')
        page.get_by_label('Confirm new password', exact=True).fill(PASSWORD)
        page.get_by_role('button', name='Save new password').click()
        page.locator('.app-pages').wait_for(state='visible')
        assert state['password_updates']==[PASSWORD]
        assert 'auth=reset' not in page.url
        page.goto(base+'?page=account', wait_until='networkidle')
        page.get_by_role('region',name='Account security').get_by_role('button',name='Sign out',exact=True).click()
        page.get_by_role('heading',name='Welcome back').wait_for()
        assert state['logouts']==1
        page.reload(wait_until='networkidle')
        page.get_by_role('heading',name='Welcome back').wait_for()
        sign_in(page)

def exercise_rejected_auth(browser, base, screenshot):
    """Expected HTTP failures are isolated from the clean-workspace console audit."""
    page = browser.new_page(viewport={'width': 390, 'height': 844}, service_workers='block')
    try:
        state = install_auth_fixture(page)
        page.goto(base+'?view=cabinet', wait_until='networkidle')
        page.get_by_label('Username or email', exact=True).fill(EMAIL)
        page.get_by_label('Password', exact=True).fill('wrong-password')
        page.get_by_role('button', name='Sign in', exact=True).click()
        page.get_by_role('alert').filter(has_text='Unable to sign in').wait_for()
        assert page.locator('.app-pages').count()==0
        screenshot(page, 'phone-auth-rejected-password')
        page.get_by_role('button', name='Use a passkey').click()
        page.get_by_role('alert').filter(has_text='Passkey sign-in').wait_for()
        assert page.locator('.app-pages').count()==0
        state['role']='technician'
        sign_in(page)
        page.evaluate("() => localStorage.setItem('iag-change-control-user', JSON.stringify({id:'forged',name:'Forged admin',role:'admin'}))")
        page.reload(wait_until='networkidle')
        page.locator('.app-pages').wait_for(state='visible')
        page.goto(base+'?page=review', wait_until='networkidle')
        page.locator('.iag-user-card').get_by_text('Technician — proposed changes require approval', exact=True).wait_for()
        assert page.get_by_label('Administrator PIN').count()==0
        state['authenticated']=False
        page.reload(wait_until='networkidle')
        page.get_by_role('heading', name='Welcome back').wait_for()
        assert page.locator('.app-pages').count()==0
        screenshot(page, 'phone-auth-revoked-session')
    finally:
        page.close()
