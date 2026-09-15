"""Focused Slate routes and capture/resume against isolated network fixtures."""
import io
from urllib.parse import urlparse, parse_qs
from PIL import Image

def exercise_repair_pages(page,label,open_page,screenshot,geometry):
    for route in ['assets','machine&asset=L2-CC-001','machine&asset=L2-CC-001&section=history','machine&asset=L2-CC-001&section=manuals','repairs','inbox','admin','requests']:
        open_page(page,route)
        geometry(page)
        screenshot(page,label+'-slate-'+route.replace('&','-').replace('=','-'))
    open_page(page,'machine&asset=L2-CC-001&section=manuals')
    page.locator('.slate-list a').first.click()
    assert 'unavailable' not in page.locator('article.slate-card').inner_text().lower()
    assert len(page.locator('article.slate-card').inner_text())>50
    page.get_by_role('link',name='Open original document & attachments',exact=True).click()
    page.get_by_role('button',name='Close documentation detail',exact=True).wait_for()
    open_page(page,'repair&asset=L2-CC-001')
    note=page.get_by_label('What’s happening?',exact=True)
    note.fill('Synthetic visual capture: unclear label, outcome unknown.')
    page.get_by_role('button',name='Add to repair',exact=True).click()
    page.locator('.repair-timeline').get_by_text('Synthetic visual capture: unclear label, outcome unknown.',exact=True).wait_for()
    buffer=io.BytesIO();Image.new('RGB',(80,60),'teal').save(buffer,format='PNG')
    page.get_by_label('Add photos or files',exact=True).set_input_files({'name':'synthetic-repair-photo.png','mimeType':'image/png','buffer':buffer.getvalue()})
    page.get_by_role('link',name='Open synthetic-repair-photo.png',exact=True).wait_for()
    work_id=parse_qs(urlparse(page.url).query)['work'][0]
    geometry(page);screenshot(page,label+'-slate-repair')
    page.get_by_role('link',name='Manuals & drawings',exact=True).click()
    page.get_by_role('link',name='← Return to this repair',exact=True).click()
    page.get_by_role('link',name='Open synthetic-repair-photo.png',exact=True).wait_for()
    page.get_by_role('navigation',name='Main navigation').get_by_role('link',name='Directory',exact=True).click()
    page.get_by_role('navigation',name='Main navigation').get_by_role('link',name='My work',exact=True).click()
    page.locator('.slate-list a').filter(has_text='Synthetic visual capture').first.click()
    assert parse_qs(urlparse(page.url).query)['work'][0]==work_id
    page.reload(wait_until='networkidle')
    page.get_by_role('link',name='Open synthetic-repair-photo.png',exact=True).wait_for()
    page.get_by_role('button',name='Finish & review summary →',exact=True).click()
    page.get_by_label('Problem',exact=True).wait_for()
    assert page.get_by_label('Problem',exact=True).input_value()=='Synthetic visual capture: unclear label, outcome unknown.'
    assert page.get_by_label('Outcome',exact=True).input_value()==''
    geometry(page);screenshot(page,label+'-slate-summary')
    page.get_by_role('button',name='Submit for review',exact=True).click()
    page.get_by_role('heading',name='Original submission',exact=True).wait_for()
    page.get_by_role('link',name='Open synthetic-repair-photo.png',exact=True).wait_for()
    assert page.locator('.slate-status').first.inner_text()=='received'
    geometry(page);screenshot(page,label+'-slate-submission')
