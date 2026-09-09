"""Real Map Studio interactions, shared by the permanent seven-viewport audit."""
def studio_pane(page, name):
    nav=page.get_by_role('navigation',name='Map Studio sections')
    if nav.is_visible():
        nav.get_by_role('button',name=name,exact=True).click()


def exercise_map_studio(page,label,open_page,screenshot,assert_geometry):
    open_page(page,'map')
    page.get_by_role('button',name='Edit map',exact=True).click()
    page.locator('.map-studio').wait_for()
    page.wait_for_timeout(250)
    print(label+' studio geometry: '+str(page.locator('.map-studio').evaluate('e => {const r=e.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height,viewport:innerHeight}}')),flush=True)
    assert_geometry(page)
    screenshot(page,label+'-map-studio-canvas')
    studio_pane(page,'Text / objects / layers')
    panel=page.get_by_role('complementary',name='Map Studio assistant and properties')
    panel.get_by_role('tab',name='Objects',exact=True).click()
    panel.get_by_role('button',name='Choose stairs',exact=True).click()
    panel.get_by_role('button',name='Replace reference symbol',exact=True).click()
    canvas=page.get_by_label('Editable facility geometry',exact=True)
    canvas.scroll_into_view_if_needed()
    box=canvas.bounding_box()
    # Work near the center of the fitted source rectangle, inside the contained canvas.
    x=box['x']+box['width']*.48
    y=box['y']+box['height']*.42
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+box['width']*.04,y+box['height']*.08,steps=8)
    page.mouse.up()
    page.locator('.studio-symbols [aria-label="Edit symbol stairs"]').wait_for()
    assert page.locator('[data-mask-id]').count()==1,'Replacement did not create its source cleanup'
    panel.get_by_label('Symbol name',exact=True).fill('Audit stairs')
    panel.get_by_label('Step count',exact=True).fill('9')
    screenshot(page,label+'-map-studio-before-direction')
    panel.get_by_label('Stair direction',exact=True).select_option('down')
    panel.get_by_label('Rotation (degrees)',exact=True).fill('90')
    assert_geometry(page)
    screenshot(page,label+'-map-studio-symbol-properties')
    panel.get_by_role('tab',name='Text edits',exact=True).click()
    panel.get_by_label('Edit instructions',exact=True).fill('move this right 2')
    panel.get_by_role('button',name='Preview edit',exact=True).click()
    panel.get_by_role('button',name='Apply preview',exact=True).wait_for()
    assert page.locator('.studio-preview').count()==1
    assert_geometry(page)
    screenshot(page,label+'-map-studio-text-preview')
    panel.get_by_role('button',name='Apply preview',exact=True).click()
    assert page.locator('.studio-preview').count()==0
    # Reject an unknown compound request without a partial rename.
    panel.get_by_label('Edit instructions',exact=True).fill('rename this to Wrong; do something unsupported')
    panel.get_by_role('button',name='Preview edit',exact=True).click()
    assert panel.get_by_role('button',name='Apply preview',exact=True).count()==0
    assert page.locator('[aria-label="Edit symbol Audit stairs"]').count()==1
    panel.get_by_label('Edit instructions',exact=True).fill('delete this')
    panel.get_by_role('button',name='Preview edit',exact=True).click()
    panel.get_by_role('button',name='Apply preview',exact=True).click()
    assert page.locator('.studio-symbols>g').count()==0
    assert page.locator('[data-mask-id]').count()==1,'Deleting replacement revealed original pixels'
    studio_pane(page,'Drawing tools')
    tools=page.locator('.map-editor-shell')
    tools.get_by_role('button',name='Undo',exact=True).click()
    assert page.locator('[aria-label="Edit symbol Audit stairs"]').count()==1
    tools.get_by_role('button',name='Redo',exact=True).click()
    assert page.locator('.studio-symbols>g').count()==0
    tools.get_by_role('button',name='Undo',exact=True).click()
    tools.get_by_role('button',name='Save Changes',exact=True).click()
    page.wait_for_function("() => [...document.querySelectorAll('button')].some(b=>b.textContent==='Save Changes' && b.disabled)")
    tools.get_by_role('button',name='Done',exact=True).click()
    page.reload(wait_until='networkidle')
    assert page.locator('[aria-label="Saved editable symbols"]>g').count()==1
    assert page.locator('[data-mask-id]').count()==1
    assert_geometry(page)
    screenshot(page,label+'-map-studio-saved')
