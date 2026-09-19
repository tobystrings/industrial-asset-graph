from section_picker_visual import choose_section, selected_section
"""Regression coverage for the large-print system and relocated navigation."""
import re

def enlarge_text(page, factor=1.5):
    """Simulate enlarged browser text without changing the viewport or hiding content."""
    page.evaluate('''factor => {
      const rows=[...document.querySelectorAll('.app-pages :is(p,small,label,button,input,select,textarea,summary,h1,h2,h3,h4,dt,dd,th,td,a,span,strong,b,figcaption,time,li,option)')]
        .filter(e=>!e.closest('svg,.sr-only')).map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize)}));
      rows.forEach(({e,size})=>e.style.setProperty('font-size',(size*factor)+'px','important'));
    }''',factor)

def assert_large_print(page):
    # Measure the settled UI, not a frame midway through its entrance scale.
    # Keep the same size thresholds; finite animations must finish first.
    page.evaluate('''async () => {
      await Promise.race([Promise.all(document.getAnimations()
        .filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect.getComputedTiming().endTime))
        .map(animation => animation.finished.catch(() => {}))),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Finite UI animations did not settle within 5 seconds')), 5000))]);
    }''')
    failures = page.evaluate('''() => {
      const nodes = [...document.querySelectorAll('.app-pages *')];
      return nodes.filter(el => el.getClientRects().length && !el.closest('svg,.sr-only') && getComputedStyle(el).visibility !== 'hidden')
        .filter(el => [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) || el.matches('input,select,textarea'))
        .filter(el => parseFloat(getComputedStyle(el).fontSize) < 24)
        .map(el => ({tag:el.tagName, cls:el.className, text:(el.textContent || '').slice(0,65), size:getComputedStyle(el).fontSize})).slice(0,20);
    }''')
    assert not failures, f'Large-print reading baseline regressed: {failures}'
    controls = page.evaluate('''() => [...document.querySelectorAll('.app-pages button, .app-pages summary, .page-header a, .page-navigation a')]
      .filter(el => el.getClientRects().length && !el.closest('svg,.sr-only') && getComputedStyle(el).visibility !== 'hidden')
      .map(el => { const r=el.getBoundingClientRect(); return {text:el.textContent.slice(0,60),cls:el.className,width:r.width,height:r.height}; })
      .filter(r => r.width < 71.9 || r.height < 71.9).slice(0,20)''')
    assert not controls, f'Large-print control target regressed: {controls}'
    clipped = page.evaluate('''() => [...document.querySelectorAll('.page-navigation a')].filter(link => {
      const box=link.getBoundingClientRect(), walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);
      let node; while(node=walker.nextNode()) { if(!node.textContent.trim())continue;
        const range=document.createRange();range.selectNodeContents(node);
        if([...range.getClientRects()].some(r=>r.width && (r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)))return true;
      } return false;
    }).map(link=>link.textContent)''')
    assert not clipped, f'Navigation text escapes its button: {clipped}'
    assert page.locator('.page-skip').evaluate('e=>e.matches(":focus")||e.getBoundingClientRect().bottom<=0'), 'Unfocused skip link covers the header'


def exercise_large_print(page, label, open_page, screenshot, geometry):
    open_page(page, 'home')
    assert_large_print(page)
    for name, route in [('Equipment','assets'), ('Repairs','repairs'), ('Inventory','inventory'), ('Documents','documents'), ('Facility Map','map'), ('Administration','admin')]:
        link = page.locator('.home-destinations').get_by_role('link', name=re.compile('^' + re.escape(name)))
        assert f'page={route}' in link.get_attribute('href')
    page.locator('.home-destinations').get_by_role('link', name=re.compile('^Repairs')).click()
    page.get_by_role('heading', name='My work', exact=True).wait_for()
    assert_large_print(page)
    page.go_back()
    page.get_by_role('heading', name='Directory', exact=True).wait_for()
    open_page(page, 'more')
    groups = [
        ('Everyday tasks', 'everyday', 'Notes', 'observation'),
        ('Records & review', 'records', 'Manage assets', 'manage'),
        ('Admin', 'admin', 'Plant setup', 'setup'),
        ('Advanced Tools', 'advanced', 'Plant database', 'database'),
    ]
    for name, group, target, route in groups:
        choose_section(page, 'Choose a tool group', name)
        assert selected_section(page, 'Choose a tool group', name)
        geometry(page)
        assert_large_print(page)
        screenshot(page, f'{label}-tools-{group}')
        page.locator('.more-page').get_by_role('link').filter(has=page.get_by_text(target, exact=True)).click()
        page.wait_for_function('(route) => new URLSearchParams(location.search).get("page") === route', arg=route)
        page.get_by_role('link', name='← More', exact=True).click()
        assert selected_section(page, 'Choose a tool group', name)
        assert new_group(page) == group
    # Reload and history must retain the chosen group, including facility context.
    page.reload(wait_until='networkidle')
    assert new_group(page) == 'advanced'
    selector = page.get_by_role('combobox',name='Choose a tool group',exact=True)
    if selector.is_visible():
        selector.focus()
        page.keyboard.press('Home')
        page.keyboard.press('Tab')
    else:
        page.get_by_role('button',name='Everyday tasks',exact=True).focus()
        page.keyboard.press('Enter')
    assert new_group(page) == 'everyday'
    geometry(page)


def new_group(page):
    return page.evaluate('new URLSearchParams(location.search).get("tools")')
