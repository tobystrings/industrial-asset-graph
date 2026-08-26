from pathlib import Path
import json
import os
import subprocess
import time
from PIL import Image, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4174/industrial-asset-graph/'
OUTPUT = Path('artifacts')
OUTPUT.mkdir(exist_ok=True)

VIEWPORTS = [
    ('desktop-1366x768', 1366, 768),
    ('desktop-1920x1080', 1920, 1080),
    ('tablet-768x1024', 768, 1024),
    ('phone-390x844', 390, 844),
    ('phone-landscape-844x390', 844, 390),
]

STATES = [
    ('dashboard', 'area=area-b3&map=2d&tab=intel', '.dashboard'),
    ('asset', 'area=area-warehouse-f&map=2d&asset=L2-CC-001', '.dashboard'),
    ('cabinet', 'view=cabinet', '.cabinet-page'),
]

SELECTORS = {
    'top-nav': '.top-nav',
    'dashboard': '.dashboard',
    'map': '.map-panel',
    'rail': '.rail',
    'sidebar': '.facility-sidebar',
    'manager': '.iag-manager-bar',
    'film-genie': '.film-genie-root',
    'facility-guide': '.facility-guide',
    'bottom-nav': '.bottom-nav',
    'cabinet-page': '.cabinet-page',
    'cabinet-drawing': '.cabinet-drawing',
    'cabinet-detail': '.cabinet-detail',
}

BOX_COLORS = {
    'top-nav': '#4cc9f0', 'dashboard': '#4895ef', 'map': '#43aa8b',
    'rail': '#f9c74f', 'sidebar': '#90be6d', 'manager': '#f94144',
    'film-genie': '#f3722c', 'facility-guide': '#b5179e',
    'bottom-nav': '#577590', 'cabinet-page': '#277da1',
    'cabinet-drawing': '#43aa8b', 'cabinet-detail': '#f8961e',
}

npm = 'npm.cmd' if os.name == 'nt' else 'npm'
server = subprocess.Popen(
    [npm, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.STDOUT,
)


def verify_pixels(path: Path) -> None:
    variance = max(ImageStat.Stat(Image.open(path).convert('RGB')).var)
    assert variance > 25, f'Rendered screenshot appears blank: variance={variance}'


def visible_box(page, selector):
    locator = page.locator(selector).first
    if locator.count() == 0 or not locator.is_visible():
        return None
    return locator.bounding_box()


def collect_boxes(page):
    return {name: visible_box(page, selector) for name, selector in SELECTORS.items()}


def overlap(a, b) -> float:
    if not a or not b:
        return 0
    left = max(a['x'], b['x'])
    top = max(a['y'], b['y'])
    right = min(a['x'] + a['width'], b['x'] + b['width'])
    bottom = min(a['y'] + a['height'], b['y'] + b['height'])
    return max(0, right - left) * max(0, bottom - top)


def audit_layout(page, boxes, width, height):
    issues = []
    metrics = page.evaluate('''() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      bodyScrollHeight: document.body.scrollHeight,
    })''')

    if metrics['scrollWidth'] > width + 4 or metrics['bodyScrollWidth'] > width + 4:
        issues.append({
            'kind': 'horizontal-overflow',
            'detail': f"document={metrics['scrollWidth']} body={metrics['bodyScrollWidth']} viewport={width}",
        })

    for name, box in boxes.items():
        if not box:
            continue
        if box['x'] < -4 or box['x'] + box['width'] > width + 4:
            issues.append({'kind': 'offscreen-x', 'element': name, 'detail': box})
        if name in ('top-nav', 'manager', 'bottom-nav') and (
            box['y'] < -4 or box['y'] + box['height'] > height + 4
        ):
            issues.append({'kind': 'offscreen-y', 'element': name, 'detail': box})

    for left, right in [
        ('manager', 'film-genie'),
        ('manager', 'facility-guide'),
        ('manager', 'bottom-nav'),
        ('film-genie', 'bottom-nav'),
        ('facility-guide', 'bottom-nav'),
    ]:
        area = overlap(boxes.get(left), boxes.get(right))
        if area > 8:
            issues.append({'kind': 'overlap', 'elements': [left, right], 'area': round(area, 1)})

    touch_issues = page.evaluate('''() => {
      const selectors = [
        '.iag-manager-bar button', '.top-nav button', '.bottom-nav button',
        '.cabinet-header button', '.cabinet-header a'
      ];
      const bad = [];
      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          const style = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (style.visibility === 'hidden' || style.display === 'none' || r.width === 0 || r.height === 0) continue;
          if (r.width < 44 || r.height < 44) {
            bad.push({selector, text: (el.textContent || '').trim().slice(0, 40), width: r.width, height: r.height});
          }
        }
      }
      return bad;
    }''')
    issues.extend({'kind': 'touch-target-under-44', **item} for item in touch_issues)
    return issues, metrics


def annotate(source: Path, target: Path, boxes, issues):
    image = Image.open(source).convert('RGB')
    draw = ImageDraw.Draw(image)

    for name, box in boxes.items():
        if not box:
            continue
        raw_x1, raw_y1 = box['x'], box['y']
        raw_x2, raw_y2 = box['x'] + box['width'], box['y'] + box['height']
        if raw_x2 <= 0 or raw_y2 <= 0 or raw_x1 >= image.width or raw_y1 >= image.height:
            continue

        x1 = max(0, min(image.width - 1, int(raw_x1)))
        y1 = max(0, min(image.height - 1, int(raw_y1)))
        x2 = max(0, min(image.width - 1, int(raw_x2)))
        y2 = max(0, min(image.height - 1, int(raw_y2)))
        if x2 <= x1 or y2 <= y1:
            continue

        color = BOX_COLORS.get(name, '#ffffff')
        draw.rectangle((x1, y1, x2, y2), outline=color, width=3)
        label_right = min(x2, x1 + 145)
        label_bottom = min(y2, y1 + 16)
        if label_right > x1 and label_bottom > y1:
            draw.rectangle((x1, y1, label_right, label_bottom), fill='#091120')
            draw.text((x1 + 3, y1 + 2), name, fill=color)

    if issues:
        summary = '; '.join(
            f"{item['kind']}:{'/'.join(item.get('elements', [])) or item.get('element', '')}"
            for item in issues[:6]
        )
        draw.rectangle((0, 0, min(image.width - 1, 900), 22), fill='#5b1116')
        draw.text((5, 5), f'ISSUES {len(issues)}  {summary}', fill='#ffffff')
    else:
        draw.rectangle((0, 0, min(image.width - 1, 360), 22), fill='#0b5132')
        draw.text((5, 5), 'NO AUTOMATED OVERLAP/OVERFLOW FINDINGS', fill='#ffffff')
    image.save(target)


def snapshot(page, name, width, height, report):
    raw = OUTPUT / f'{name}.png'
    annotated = OUTPUT / f'{name}-annotated.png'
    page.screenshot(path=str(raw), full_page=False)
    verify_pixels(raw)
    boxes = collect_boxes(page)
    issues, metrics = audit_layout(page, boxes, width, height)
    annotate(raw, annotated, boxes, issues)
    report.append({
        'name': name, 'viewport': [width, height], 'url': page.url,
        'boxes': boxes, 'metrics': metrics, 'issues': issues,
    })
    print(json.dumps({'snapshot': name, 'issues': issues, 'metrics': metrics}, sort_keys=True))


report = []
console_errors = []

try:
    time.sleep(2)
    with sync_playwright() as p:
        launch_args = {'headless': True}
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        if os.name == 'nt' and Path(chrome_path).exists():
            launch_args['executable_path'] = chrome_path
        browser = p.chromium.launch(**launch_args)

        for label, width, height in VIEWPORTS:
            context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1)
            page = context.new_page()
            page.on(
                'console',
                lambda message: console_errors.append(message.text)
                if message.type == 'error' and '404 (Not Found)' not in message.text else None,
            )

            for state, query, ready_selector in STATES:
                page.goto(f'{BASE}?{query}', wait_until='networkidle', timeout=45000)
                page.locator(ready_selector).wait_for(state='visible', timeout=30000)
                page.wait_for_timeout(600)
                snapshot(page, f'{label}-{state}', width, height, report)

            context.close()

        browser.close()

    (OUTPUT / 'layout-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    serious = [
        issue for row in report for issue in row.get('issues', [])
        if issue.get('kind') in {'horizontal-overflow', 'offscreen-x', 'offscreen-y', 'overlap'}
    ]
    print(f'Visual audit completed: {len(report)} states, {len(serious)} serious layout findings, {len(console_errors)} console errors.')
    if console_errors:
        print('Browser console errors:', json.dumps(console_errors, indent=2))
    assert not console_errors, f'Browser console errors: {console_errors}'
finally:
    server.terminate()
    server.wait(timeout=10)
