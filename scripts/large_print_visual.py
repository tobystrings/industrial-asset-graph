"""Regression coverage for the large-print system and relocated navigation."""
import re

def assert_large_print(page):
    failures = page.evaluate('''() => {
      const nodes = [...document.querySelectorAll('.page-scroll :is(p,small,label,button,input,select,textarea,summary,h1,h2,h3,h4,dt,dd,th,td), .page-navigation a')];
      return nodes.filter(el => el.getClientRects().length && !el.closest('svg,.sr-only') && getComputedStyle(el).visibility !== 'hidden')
        .filter(el => parseFloat(getComputedStyle(el).fontSize) < 18)
        .map(el => ({tag:el.tagName, cls:el.className, text:(el.textContent || '').slice(0,65), size:getComputedStyle(el).fontSize})).slice(0,20);
    }''')
    assert not failures, f'Large-print reading baseline regressed: {failures}'


def exercise_large_print(page, label, open_page, screenshot, geometry):
    open_page(page, 'home')
    assert_large_print(page)
    for name, route in [('Find an asset','assets'), ('Map','map'), ('Documents','documents'), ('Notes','observation'), ('Troubleshooting','relationships'), ('Field documentation','field')]:
        link = page.locator('.home-destinations').get_by_role('link', name=re.compile('^' + re.escape(name)))
        assert f'page={route}' in link.get_attribute('href')
    page.locator('.home-destinations').get_by_role('link', name=re.compile('^Notes')).click()
    page.get_by_role('heading', name='Record a finding', exact=True).wait_for()
    assert_large_print(page)
    page.go_back()
    page.get_by_role('heading', name='Home', exact=True).wait_for()
    open_page(page, 'more')
    groups = [
        ('Everyday tasks', 'everyday', 'Notes', 'observation'),
        ('Records & review', 'records', 'Manage assets', 'manage'),
        ('Admin', 'admin', 'Plant setup', 'setup'),
        ('Advanced Tools', 'advanced', 'Plant database', 'database'),
    ]
    for name, group, target, route in groups:
        page.get_by_role('button', name=name, exact=True).click()
        assert page.get_by_role('button', name=name, exact=True).get_attribute('aria-pressed') == 'true'
        geometry(page)
        assert_large_print(page)
        screenshot(page, f'{label}-tools-{group}')
        page.locator('.more-page').get_by_role('link').filter(has=page.get_by_text(target, exact=True)).click()
        page.wait_for_function('(route) => new URLSearchParams(location.search).get("page") === route', arg=route)
        page.get_by_role('link', name='← More', exact=True).click()
        assert page.get_by_role('button', name=name, exact=True).get_attribute('aria-pressed') == 'true'
        assert new_group(page) == group
    # Reload and history must retain the chosen group, including facility context.
    page.reload(wait_until='networkidle')
    assert new_group(page) == 'advanced'
    page.get_by_role('button', name='Everyday tasks', exact=True).focus()
    page.keyboard.press('Enter')
    assert new_group(page) == 'everyday'
    geometry(page)


def new_group(page):
    return page.evaluate('new URLSearchParams(location.search).get("tools")')
