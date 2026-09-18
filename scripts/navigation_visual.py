"""Exercise Back through real clicks; services use the suite's isolated fixtures."""
import re
from urllib.parse import urlparse, parse_qs


def exercise_navigation(page, label, open_page, screenshot, geometry):
    def query():
        return parse_qs(urlparse(page.url).query)

    def back():
        page.locator('.page-back').click()
        page.wait_for_timeout(150)

    open_page(page, 'assets')
    page.get_by_role('textbox', name='Search equipment', exact=True).fill('conveyor')
    page.locator('.slate-list a').filter(has_text='Line 2 Conveyor Control Cabinet').click()
    page.get_by_role('link', name='Manuals', exact=False).filter(has_text=re.compile('^Manuals')).click()
    page.get_by_role('heading', name='Manuals', exact=True).wait_for()
    page.locator('.slate-list a').first.click()
    page.get_by_role('link', name='Open original document & attachments', exact=True).wait_for()
    page.reload(wait_until='networkidle')
    assert 'manuals' in page.locator('.page-back').get_attribute('href')
    screenshot(page, label+'-navigation-manual')
    back()
    assert query().get('section') == ['manuals'] and 'doc' not in query()
    back()
    assert query().get('page') == ['machine'] and 'section' not in query()
    back()
    assert query().get('q') == ['conveyor']
    assert page.get_by_role('textbox', name='Search equipment', exact=True).input_value() == 'conveyor'
    geometry(page)

    open_page(page, 'documents')
    page.locator('.document-state-filters button').filter(has_text='Draft').click()
    page.locator('.doc-cards button').first.click()
    page.locator('.document-preview').wait_for()
    page.get_by_role('button',name='Close documentation detail',exact=True).click()
    page.locator('.document-browser').wait_for(state='visible')
    assert page.locator('.document-state-filters button[aria-pressed=true]').inner_text().startswith('Draft')
    assert query().get('docState') == ['DRAFT']

    # Back also restores the position in a long list, rather than its top.
    page.locator('.doc-cards button').last.scroll_into_view_if_needed()
    position=page.locator('.page-scroll').evaluate('e=>e.scrollTop')
    page.locator('.doc-cards button').last.click()
    back()
    page.wait_for_timeout(250)
    restored=page.locator('.page-scroll').evaluate('e=>e.scrollTop')
    assert abs(restored-position)<5, (position,restored)
    screenshot(page,label+'-navigation-documents')

    open_page(page,'machine&asset=L2-CC-001')
    page.get_by_role('link', name=re.compile('^Controls')).click()
    page.locator('.slate-list a[href*="page=component"]').first.click()
    page.locator('.component-record').wait_for()
    back()
    assert query().get('section') == ['controls']
    back()
    assert query().get('page') == ['machine'] and 'section' not in query()

    open_page(page, 'admin')
    page.get_by_role('link', name='Review Inbox', exact=True).click()
    back()
    assert query().get('page') == ['admin']

    open_page(page, 'inventory')
    page.get_by_role('button',name='Locations',exact=True).click()
    assert query().get('section') == ['Locations']
    page.get_by_role('button',name='Low Stock',exact=True).click()
    back()
    assert query().get('section') == ['Locations']
    assert page.get_by_role('button',name='Locations',exact=True).get_attribute('aria-pressed') == 'true'

    open_page(page, 'map&asset=L2-CC-001')
    page.get_by_role('button', name='Open details →', exact=True).click()
    back()
    assert query().get('page') == ['map'] and query().get('asset') == ['L2-CC-001']
    geometry(page)

    # Opening the nested URL without in-app history must still go up, not home.
    open_page(page, 'machine&asset=L2-CC-001&section=manuals&doc=l2-cc-overview')
    back()
    assert query().get('page') == ['machine'] and query().get('section') == ['manuals']
    assert 'doc' not in query()
    back()
    assert query().get('page') == ['machine'] and 'section' not in query()
    screenshot(page, label+'-navigation-parent')

    open_page(page,'map')
    page.get_by_label('Find an area',exact=True).select_option(value='area-maintenance')
    page.wait_for_timeout(250)
    zone=page.locator('.svg-zone.selected text')
    assert 'maintenance' in zone.text_content().lower()
    size=zone.evaluate('e=>{const m=e.getScreenCTM();return parseFloat(getComputedStyle(e).fontSize)*Math.hypot(m.a,m.b)}')
    assert size>=20, f'Selected map label still shrinks below reading size: {size}'
    geometry(page)
    screenshot(page,label+'-map-readable-selection')
