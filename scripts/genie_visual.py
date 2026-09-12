def exercise_genie(page, label, open_page, screenshot, geometry, contrast):
    open_page(page, 'help&asset=L2-CC-001&from=maintenance')
    guide = page.get_by_role('region', name='Genie workbench', exact=True)
    guide.wait_for()
    if guide.locator('.genie-welcome').count():
        guide.get_by_role('button', name='Meet Genie', exact=True).click()
    page.get_by_label('Genie equipment').wait_for()
    assert page.get_by_label('Genie equipment').input_value() == 'L2-CC-001'
    page.wait_for_timeout(1200)
    geometry(page)
    contrast(guide.locator('.genie-answer p'))
    assert guide.locator('.genie-character svg').count() == 1
    screenshot(page, f'{label}-genie-context')

    if label not in {'laptop-1366x768', 'phone-390x844'}:
        return
    guide.get_by_role('button', name='Trace connections', exact=True).click()
    assert 'do not establish' in guide.locator('.genie-answer').inner_text()
    guide.get_by_role('button', name='Open troubleshooting', exact=True).click()
    assert 'page=relationships' in page.url and 'asset=L2-CC-001' in page.url
    assert page.locator('.genie-character').count() == 0, 'Character escaped Help'
    page.get_by_role('button', name='Ask Genie', exact=False).click()
    assert page.get_by_label('Genie equipment').input_value() == 'L2-CC-001'
    guide.get_by_role('button', name='Leave a field note', exact=False).click()
    note = f'Genie browser verification {label}: label needs field confirmation.'
    guide.get_by_label('What did you observe, and where?').fill(note)
    guide.get_by_role('button', name='Save observation', exact=True).click()
    guide.locator('.genie-answer').get_by_text('canonical asset facts have not changed.', exact=False).wait_for()
    guide.locator('summary').filter(has_text='Saved observations').click()
    assert note in guide.locator('.genie-record-panel').inner_text()
    assert 'FIELD_VERIFY' in guide.locator('.genie-observation').last.inner_text()
    guide.locator('.genie-answer').scroll_into_view_if_needed()
    screenshot(page, f'{label}-genie-saved')

    guide.get_by_role('button', name='Preferences', exact=True).click()
    guide.get_by_label('Personality', exact=True).select_option('full')
    guide.get_by_label('Motion', exact=True).select_option('reduced')
    guide.get_by_label('Remind me when leaving a record with gaps').check()
    guide.get_by_role('button', name='Done', exact=True).click()
    assert guide.locator('.genie-body').evaluate('el => getComputedStyle(el).animationName') == 'none'
    guide.get_by_role('button', name='Electrical facts', exact=True).click()
    guide.get_by_role('button', name='Open electrical field sheet', exact=True).click()
    assert 'asset=L2-CC-001' in page.url and 'section=electrical' in page.url
    assert page.locator('details').filter(has_text='Electrical, utility and control field sheet').get_attribute('open') is not None
    page.get_by_role('button', name='Ask Genie', exact=False).click()
    guide.get_by_role('button', name='Preferences', exact=True).click()
    assert guide.get_by_label('Personality', exact=True).input_value() == 'full'
    guide.get_by_label('Motion', exact=True).select_option('full')
    guide.get_by_role('button', name='Done', exact=True).click()
    page.emulate_media(reduced_motion='reduce')
    assert guide.locator('.genie-body').evaluate('el => getComputedStyle(el).animationName') == 'none'
    guide.locator('.genie-answer').scroll_into_view_if_needed()
    screenshot(page, f'{label}-genie-reduced-motion')
    guide.get_by_role('button', name='Hide Genie', exact=True).click()
    guide.get_by_role('button', name='Call Genie back', exact=True).wait_for()
    page.wait_for_function("document.activeElement?.textContent.includes('Call Genie back')")
    guide.get_by_role('button', name='Call Genie back', exact=True).click()
    assert guide.locator('.genie-answer').is_visible()
    page.emulate_media(reduced_motion='no-preference')

    # Use another actual asset: the saved finding intentionally suppresses L2 reminders.
    guide.get_by_role('button', name='All areas', exact=True).click()
    choices = page.get_by_label('Genie equipment').locator('option').evaluate_all('(rows) => rows.map(row => row.value).filter(Boolean)')
    other = next(value for value in choices if value != 'L2-CC-001')
    guide.get_by_role('button', name='Preferences', exact=True).click()
    guide.get_by_role('button', name='Reset Genie preferences', exact=True).click()
    guide.get_by_label('Remind me when leaving a record with gaps').check()
    guide.get_by_role('button', name='Done', exact=True).click()
    open_page(page, f'maintenance&asset={other}')
    page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Assets', exact=False).click()
    reminder = page.get_by_role('region', name='Documentation reminder', exact=True)
    reminder.wait_for()
    assert other in reminder.inner_text()
    geometry(page)
    screenshot(page, f'{label}-genie-reminder')
    reminder.get_by_role('button', name='Not now', exact=False).click()
    open_page(page, f'maintenance&asset={other}')
    page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Assets', exact=False).click()
    page.get_by_role('heading', name='Assets', exact=True).wait_for()
    assert reminder.count() == 0, 'Dismissed reminder returned after navigation/reload'
