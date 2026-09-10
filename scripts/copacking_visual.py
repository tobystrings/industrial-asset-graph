"""Synthetic UI workflows; called only inside the visual audit's isolated browser contexts."""

def exercise_copacking(page, label, open_page, screenshot, geometry, auth_state=None):
    open_page(page, 'lines&line=line-2')
    root = page.locator('.copacking-workspace')
    root.get_by_role('heading', name='Reported process flow').wait_for()
    root.get_by_role('heading', name='Reported process flow').scroll_into_view_if_needed()
    geometry(page)
    screenshot(page, f'{label}-copacking-flow')
    stage = root.locator('.copacking-stage').first
    stage.locator('summary').first.click()
    stage.get_by_label('Physical equipment', exact=True).select_option('L2-CC-001')
    stage.get_by_label('Alternative route / conditions', exact=True).fill('SYNTHETIC link for navigation testing only')
    geometry(page)
    screenshot(page, f'{label}-copacking-stage-editor')
    root.get_by_role('button', name='Save process flow', exact=True).click()
    root.get_by_role('status').filter(has_text='Saved on this device').wait_for()

    root.get_by_role('button', name='Products & specifications', exact=True).click()
    product = root.locator('form').filter(has=page.get_by_role('button', name='Save product', exact=True))
    product.get_by_label('Product name', exact=True).fill('SYNTHETIC UI PRODUCT')
    product.get_by_label('SKU', exact=True).fill('SYNTHETIC-ONLY')
    product.get_by_role('button', name='Save product', exact=True).click()
    product.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    root.get_by_text('Packaging format revisions', exact=True).click()
    form = root.locator('form').filter(has=page.get_by_role('button', name='Save format revision', exact=True))
    form.get_by_label('Format name', exact=True).fill('SYNTHETIC UI FORMAT')
    form.get_by_label('Container material', exact=True).fill('Synthetic material')
    form.get_by_label('Container size', exact=True).fill('25')
    form.get_by_label('Size unit (mL, L, oz…)', exact=True).fill('mL')
    form.get_by_role('button', name='Save format revision', exact=True).click()
    form.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    root.get_by_text('Recipe / production specification revisions', exact=True).click()
    recipe = root.locator('form').filter(has=page.get_by_role('button', name='Save recipe revision', exact=True))
    recipe.get_by_label('Specification name', exact=True).fill('SYNTHETIC UI RECIPE')
    recipe.get_by_label('Recipe product', exact=True).select_option(label='SYNTHETIC UI PRODUCT')
    recipe.get_by_label('Recipe format revision', exact=True).select_option(label='SYNTHETIC UI FORMAT r1')
    recipe.get_by_label('Documented process requirements (include units; no inferred defaults)', exact=True).fill('Synthetic UI fixture; no machine settings')
    recipe.get_by_role('button', name='Save recipe revision', exact=True).click()
    recipe.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    geometry(page)
    screenshot(page, f'{label}-copacking-recipe')

    root.get_by_role('button', name='Runs', exact=True).click()
    root.get_by_label('Run name / batch reference', exact=True).fill('SYNTHETIC UI RUN')
    root.get_by_label('Run product', exact=True).select_option(label='SYNTHETIC UI PRODUCT')
    root.get_by_label('Run format revision', exact=True).select_option(label='SYNTHETIC UI FORMAT r1')
    root.get_by_label('Exact recipe revision', exact=True).select_option(label='SYNTHETIC UI RECIPE r1 · DRAFT')
    root.get_by_label('Applicable equipment', exact=True).select_option('L2-CC-001')
    root.get_by_label('Run status', exact=True).select_option('COMPLETED')
    root.get_by_label('Started at (local time)', exact=True).fill('2026-09-10T10:00')
    root.get_by_label('Ended at (local time)', exact=True).fill('2026-09-10T11:00')
    root.get_by_label('Actual rate', exact=True).fill('12')
    root.get_by_label('Rate units (containers/min, cases/hour…)', exact=True).fill('containers/min')
    root.get_by_label('Measurement source / observation reference', exact=True).fill('SYNTHETIC counter observation')
    root.get_by_role('button', name='Save production run', exact=True).click()
    root.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    page.reload(wait_until='networkidle')
    root.get_by_role('button', name='Runs', exact=True).click()
    root.get_by_text('SYNTHETIC UI RUN · COMPLETED', exact=True).wait_for()
    root.get_by_label('Edit recorded run', exact=True).select_option(label='SYNTHETIC UI RUN')
    assert root.get_by_label('Run product', exact=True).is_disabled()
    root.get_by_label('Run notes', exact=True).fill('Synthetic corrected note after reload')
    root.get_by_role('button', name='Save production run', exact=True).click()
    root.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    geometry(page)
    screenshot(page, f'{label}-copacking-run-reload')

    root.get_by_role('button', name='Changeover', exact=True).click()
    root.get_by_label('Change-part set name', exact=True).fill('SYNTHETIC UI PART SET')
    root.get_by_label('Changeover equipment', exact=True).select_option('L2-CC-001')
    root.get_by_label('Applicable format revision', exact=True).select_option(label='SYNTHETIC UI FORMAT r1')
    root.get_by_label('Documented parts and identifiers', exact=True).fill('Synthetic fixture only; applicability unknown')
    root.get_by_role('button', name='Save change-part set', exact=True).click()
    root.get_by_role('status').filter(has_text='Saved on this device').wait_for()
    geometry(page)
    screenshot(page, f'{label}-copacking-changeover')

    root.get_by_role('button', name='Process flow', exact=True).click()
    stage = root.locator('.copacking-stage').first
    stage.locator('summary').first.click()
    stage.get_by_role('link', name='Open asset details', exact=True).click()
    page.locator('.production-context').get_by_text('Assignment UNKNOWN', exact=False).wait_for()
    geometry(page)
    screenshot(page, f'{label}-copacking-asset-context')
    open_page(page, 'lines&line=line-2')
    stage = page.locator('.copacking-stage').first
    stage.locator('summary').first.click()
    # The real seed intentionally has no cabinet pin. Create a clearly synthetic
    # marker only in this disposable test context to exercise the mapped branch.
    if stage.get_by_text('Map location unassigned', exact=True).count():
        page.evaluate("""() => new Promise((resolve,reject) => {
          const request=indexedDB.open('industrial-asset-graph-runtime--facility-j-lieb');
          request.onerror=()=>reject(request.error);
          request.onsuccess=()=>{ const db=request.result; const tx=db.transaction('plant','readwrite');
            const store=tx.objectStore('plant'); const read=store.get('active');
            read.onsuccess=()=>{const plant=read.result; plant.mapConfig.markers.push({
              id:'SYNTHETIC-COPACKING-PIN',assetId:'L2-CC-001',areaId:'area-warehouse-f',
              label:'SYNTHETIC TEST PIN',x:35,y:55,tone:'cabinet',state:'FIELD_VERIFY',
              placementSource:'SYNTHETIC TEST ONLY'
            }); store.put(plant,'active');};
            tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
          };
        })""")
        page.reload(wait_until='networkidle')
        stage = page.locator('.copacking-stage').first
        stage.locator('summary').first.click()
    stage.get_by_role('link', name='Highlight on map', exact=True).click()
    assert 'asset=L2-CC-001' in page.url and 'page=map' in page.url
    page.locator('.svg-asset-marker.selected').wait_for(state='visible')
    geometry(page)
    screenshot(page, f'{label}-copacking-map-link')
    if auth_state is not None:
        auth_state['role'] = 'user'
        open_page(page, 'account')
        page.get_by_role('button', name='Refresh permissions', exact=True).click()
        page.get_by_text('Permissions refreshed from your account.', exact=True).wait_for()
        open_page(page, 'lines&line=line-2')
        root = page.locator('.copacking-workspace')
        root.get_by_role('button', name='Products & specifications', exact=True).click()
        root.get_by_label('Product name', exact=True).fill('SYNTHETIC UNAPPROVED PROPOSAL')
        root.get_by_role('button', name='Save product', exact=True).click()
        root.get_by_role('status').filter(has_text='Submitted for administrator review').wait_for()
        page.reload(wait_until='networkidle')
        root.get_by_role('button', name='Products & specifications', exact=True).click()
        assert 'SYNTHETIC UNAPPROVED PROPOSAL' not in root.get_by_label('Load product', exact=True).inner_text()
        screenshot(page, f'{label}-copacking-user-proposal')
        auth_state['role'] = 'admin'
        open_page(page, 'account')
        page.get_by_role('button', name='Refresh permissions', exact=True).click()
        page.get_by_text('Permissions refreshed from your account.', exact=True).wait_for()
