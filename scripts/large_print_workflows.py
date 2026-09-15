"""Synthetic form/persistence checks; used only with install_auth_fixture."""
from pathlib import Path


def exercise_asset_forms(page, base, width):
    asset_id = f'LARGE-PRINT-TEST-{width}'
    page.goto(base+'?page=assetAdd', wait_until='networkidle')
    page.get_by_label('Asset ID', exact=True).fill(asset_id)
    page.get_by_label('Name', exact=True).fill('Synthetic large-print form test')
    page.get_by_label('Description', exact=True).fill('Isolated browser fixture. No physical equipment is asserted.')
    page.get_by_role('button', name='Save Asset', exact=True).click()
    page.get_by_role('heading', name='More', exact=True).wait_for()

    def edit():
        page.goto(base+'?page=manage', wait_until='networkidle')
        page.get_by_label('Find Asset', exact=True).fill(asset_id)
        page.locator('.iag-manage-list button').click()
        assert page.get_by_label('Asset ID', exact=True).input_value() == asset_id
        assert page.get_by_label('Asset ID', exact=True).is_disabled()

    edit()
    page.get_by_label('Name', exact=True).fill('Updated synthetic large-print form test')
    page.get_by_role('button', name='Save Changes', exact=True).click()
    page.get_by_role('heading', name='More', exact=True).wait_for()
    edit()
    assert page.get_by_label('Name', exact=True).input_value() == 'Updated synthetic large-print form test'

    # A cancelled destructive confirmation must leave the record intact.
    page.once('dialog', lambda dialog: dialog.dismiss())
    page.get_by_role('button', name='Delete Asset', exact=True).click()
    assert page.get_by_label('Asset ID', exact=True).input_value() == asset_id
    page.screenshot(path=f'artifacts/{width}-large-print-asset-form.png')
    page.goto(base+'?page=database', wait_until='networkidle')
    with page.expect_download() as result:
        page.get_by_role('button', name='Export Plant Database (.iag)', exact=True).click()
    assert Path(result.value.path()).stat().st_size > 100

    # A full facility switch reloads the package; primary links retain its ID.
    page.goto(base+'?facilityId=test-facility&page=assets', wait_until='networkidle')
    page.get_by_role('heading', name='Equipment', exact=True).wait_for()
    assert asset_id not in page.locator('.page-workspace').inner_text()
    page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Directory', exact=False).click()
    assert 'facilityId=test-facility' in page.url
    edit()
    assert page.get_by_label('Name', exact=True).input_value() == 'Updated synthetic large-print form test'
