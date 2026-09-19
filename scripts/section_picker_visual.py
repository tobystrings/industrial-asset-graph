"""Use the visible desktop buttons or native phone section selector."""
def choose_section(page,label,value):
    picker=page.get_by_role('group',name=label,exact=True)
    select=picker.get_by_role('combobox')
    if select.is_visible():select.select_option(label=value)
    else:picker.get_by_role('button',name=value,exact=True).click()

def selected_section(page,label,value):
    picker=page.get_by_role('group',name=label,exact=True)
    select=picker.get_by_role('combobox')
    return select.locator('option:checked').inner_text()==value if select.is_visible() else picker.get_by_role('button',name=value,exact=True).get_attribute('aria-pressed')=='true'
