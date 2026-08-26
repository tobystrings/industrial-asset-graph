from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    assert target.exists(), f'Required visual-contract file is missing: {path}'
    return target.read_text(encoding='utf-8')


def require(text: str, token: str, source: str) -> None:
    assert token in text, f'Visual contract regression: {source} must contain {token!r}'


contract = read('docs/VISUAL-LAYOUT-CONTRACT.md')
visual = read('scripts/dashboard-visual-check.py')
main = read('src/main.tsx')
map_view = read('src/map/DetailedBuildingLayout.tsx')
chrome = read('src/ui/chrome-clearance.css')

for section in (
    'One responsive system',
    'Required viewport coverage',
    'Fixed chrome may never cover content',
    'Responsive behavior must be deliberate',
    'Control cabinet layout rule',
    'Contrast and readability',
    'CI is a release gate',
    'New workspace rule',
):
    require(contract, section, 'docs/VISUAL-LAYOUT-CONTRACT.md')

for viewport in (
    'desktop-1920x1080',
    'laptop-1366x768',
    'tablet-landscape-1024x768',
    'tablet-portrait-768x1024',
    'phone-large-430x932',
    'phone-390x844',
    'phone-landscape-844x390',
):
    require(visual, viewport, 'scripts/dashboard-visual-check.py')

for state in (
    "name='Users'",
    "name='Manage'",
    "name='Map Edit'",
    "?view=assets",
    "?view=documents",
    "?view=cabinet",
):
    require(visual, state, 'scripts/dashboard-visual-check.py')

for guard in (
    'Reserved manager-bar space is too small',
    'Map workspace is hidden behind manager toolbar',
    'Facility Guide overlaps manager toolbar',
    'Mobile toolbar should scroll horizontally',
    'Mobile toolbar must not hide controls behind a mask',
):
    require(visual, guard, 'scripts/dashboard-visual-check.py')

require(chrome, '--manager-bar-height', 'src/ui/chrome-clearance.css')
require(chrome, 'padding-bottom:', 'src/ui/chrome-clearance.css')
require(chrome, '.facility-guide', 'src/ui/chrome-clearance.css')

css_imports = [
    line.strip()
    for line in main.splitlines()
    if line.strip().startswith('import ') and line.strip().endswith(".css';")
]
assert css_imports, 'Visual contract regression: src/main.tsx contains no CSS imports.'
assert css_imports[-1] == "import './ui/chrome-clearance.css';", (
    'Visual contract regression: chrome-clearance.css must remain the final CSS import in src/main.tsx.'
)

assert '>Fit to Screen<' not in map_view, (
    'Visual contract regression: the redundant large Fit to Screen map control was reintroduced. '
    'Automatic fit plus the compact local Fit control is the approved pattern.'
)
require(map_view, 'ResizeObserver(fitPlan)', 'src/map/DetailedBuildingLayout.tsx')
require(map_view, '>Fit</button>', 'src/map/DetailedBuildingLayout.tsx')

print('Permanent visual layout contract verified.')
