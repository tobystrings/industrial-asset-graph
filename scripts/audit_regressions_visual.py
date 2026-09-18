"""Prevent the functional and phone-layout failures found by the page audit."""
def exercise_audit_regressions(page,label,open_page,screenshot,geometry):
    open_page(page,'health')
    page.locator('.iag-target-row').first.click()
    page.wait_for_function('new URLSearchParams(location.search).get("page")==="area"')
    geometry(page);screenshot(page,label+'-health-open-area')
    open_page(page,'health')
    page.locator('.iag-target-row').filter(has_text='Open →').filter(has_text='L2-CC-001').first.click()
    page.wait_for_function('new URLSearchParams(location.search).get("page")==="asset"&&new URLSearchParams(location.search).get("asset")==="L2-CC-001"')
    geometry(page)
    open_page(page,'health')
    page.locator('.iag-target-row').filter(has_text='Trace →').first.click()
    page.wait_for_function('new URLSearchParams(location.search).get("page")==="relationships"&&new URLSearchParams(location.search).has("asset")')
    geometry(page);screenshot(page,label+'-health-trace')
    open_page(page,'manage')
    page.locator('.iag-manage-list').scroll_into_view_if_needed()
    assert page.locator('.iag-manage-list>button').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('span').getBoundingClientRect();return s.top>=r.top-1&&s.bottom<=r.bottom+1})'''),'Asset text overlaps its row'
    geometry(page);screenshot(page,label+'-manage-rows')
    open_page(page,'database');geometry(page);screenshot(page,label+'-database')
    open_page(page,'asset&asset=L2-CC-001&tab=docs')
    selector=page.get_by_label('Asset section',exact=True)
    if selector.is_visible():
        assert selector.input_value()=='docs'
        selector.select_option('capture')
        page.wait_for_function('new URLSearchParams(location.search).get("tab")==="capture"')
    geometry(page);screenshot(page,label+'-asset-section')
