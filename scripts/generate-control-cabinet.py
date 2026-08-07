from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "line2" / "control-cabinet"
OUT.mkdir(parents=True, exist_ok=True)

devices: list[dict] = []

def add(device_id: str, label: str, device_type: str, x: int, y: int, w: int, h: int, **details):
    record = {
        "id": device_id, "label": label, "type": device_type,
        "bounds": {"x": x, "y": y, "width": w, "height": h},
        "verificationStatus": "VERIFIED_REFERENCE_DRAWING",
        "source": "approved cabinet reference render",
        **details,
    }
    devices.append(record)
    return record

for index in range(3):
    add(f"main-protection-{index + 1}", f"ABB protection {index + 1}", "CIRCUIT_BREAKER", 120 + index * 34, 145, 30, 118, manufacturer="ABB")
add("control-fuse", "Control fuse", "FUSE", 235, 160, 34, 85)
add("control-transformer", "Control transformer", "CONTROL_TRANSFORMER", 300, 155, 95, 110)
add("plc-micrologix-1400", "MicroLogix 1400", "PLC", 425, 130, 250, 140, manufacturer="Allen-Bradley", model="MicroLogix 1400")

io_modules = [("1762-IA8", "DIGITAL_INPUT"), ("1762-IB16", "DIGITAL_INPUT"), ("1762-OB16", "DIGITAL_OUTPUT"), ("1762-IF4", "ANALOG_INPUT"), ("1762-OF4", "ANALOG_OUTPUT"), ("1762-OW8", "RELAY_OUTPUT")]
for index, (model, kind) in enumerate(io_modules):
    add(f"io-{model.lower()}", model, kind, 680 + index * 72, 130, 68, 140, manufacturer="Allen-Bradley", model=model)
add("door-disconnect", "Door disconnect", "DISCONNECT", 1120, 145, 72, 240, voltage="480 VAC 3 phase")

loads = ["SURGE TABLE", "LABELER BLOWER", "PADLOCKER OUTLET", "DUD BLOWER"] + [f"MTR{i}" for i in range(1, 11)]
for index, load in enumerate(loads):
    x = 95 + index * 72
    add(f"cb-{index + 1:02d}", f"CB{index + 1} - {load}", "MOTOR_PROTECTOR" if index >= 4 else "CIRCUIT_BREAKER", x, 355, 66, 105, designation=f"CB{index + 1}", loadLabel=load)

drive_labels = ["DRIVE #1", "DRIVE #2", "DRIVE #3", "DRIVE #4", "DRIVE #5", "CONV #6", "CONV #7", "DRIVE #8"]
for index, label in enumerate(drive_labels):
    add(f"vfd-{index + 1:02d}", label, "VFD", 105 + index * 135, 535, 95, 140, manufacturer="Allen-Bradley", model="PowerFlex 4")

add("power-supply-24vdc", "120W 24VDC power supply", "POWER_SUPPLY", 90, 735, 145, 115, output="24 VDC", rating="120 W")
add("distribution-terminals", "24VDC distribution terminals", "TERMINAL_BLOCK", 285, 750, 330, 70)
for index in range(2): add(f"fuse-fu{index + 1}", f"FU{index + 1}", "FUSE", 635 + index * 42, 745, 34, 82)
for index, label in enumerate(["MTR5", "MTR6", "K1", "K2", "K3", "K4", "D1", "K5"]):
    add(f"control-{label.lower()}", label, "CONTACTOR" if label.startswith("K") else "OVERLOAD_RELAY", 715 + index * 58, 740, 52, 90)

terminal_groups = ["24VDC COMMON", "DIGITAL INPUTS", "DIGITAL OUTPUTS", "ANALOG I/O", "DRIVE ENABLES", "INTERLOCKS", "E-STOPS", "SPARES", "PE / GROUND"]
for index, label in enumerate(terminal_groups):
    add(f"terminal-{index + 1:02d}", label, "TERMINAL_BLOCK", 80 + index * 120, 920, 112, 62)

def esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def device_svg(d: dict) -> str:
    x, y, w, h = d["bounds"].values()
    label = esc(d["label"])
    device_type = d["type"]
    common = f'id="{d["id"]}" data-device-id="{d["id"]}" class="device device-{device_type.lower()}"'
    if d["id"].startswith("main-protection-"):
        heading = '<text x="120" y="138" class="device-label left">ABB MAIN PROTECTION</text>' if d["id"].endswith('-1') else ''
        return f'''<g {common}>{heading}<rect x="{x}" y="{y}" width="{w}" height="{h}"/><rect x="{x+8}" y="{y+20}" width="{w-16}" height="{h-42}"/><circle cx="{x+w/2}" cy="{y+h*.45}" r="6"/></g>'''
    if d["id"].startswith("cb-"):
        designation = esc(d.get("designation", "")); load = esc(d.get("loadLabel", "")); words = load.split(); midpoint = max(1, (len(words) + 1) // 2); line1 = ' '.join(words[:midpoint]); line2 = ' '.join(words[midpoint:])
        return f'''<g {common}><text x="{x+w/2}" y="{y-20}" class="breaker-label">{line1}</text><text x="{x+w/2}" y="{y-8}" class="breaker-label">{line2}</text><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2"/><rect x="{x+w*.3}" y="{y+20}" width="{w*.4}" height="{h*.45}"/><circle cx="{x+w/2}" cy="{y+h*.42}" r="{min(w,h)*.16}"/><text x="{x+w/2}" y="{y+h-10}" class="device-label">{designation}</text></g>'''
    if device_type == "VFD":
        return f'''<g {common}><text x="{x+w/2}" y="{y-8}" class="device-label">{label}</text><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3"/><rect x="{x+23}" y="{y+18}" width="{w-46}" height="24"/><text x="{x+w/2}" y="{y+35}" class="display">8888</text><circle cx="{x+28}" cy="{y+60}" r="7"/><circle cx="{x+48}" cy="{y+60}" r="7"/><circle cx="{x+68}" cy="{y+60}" r="7"/><text x="{x+w/2}" y="{y+112}" class="brand-small">PowerFlex</text><text x="{x+w/2}" y="{y+130}" class="device-label">4</text></g>'''
    if device_type == "PLC":
        return f'''<g {common}><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3"/><text x="{x+12}" y="{y+22}" class="brand-small left">Allen-Bradley</text><text x="{x+18}" y="{y+70}" class="device-label left">MicroLogix 1400</text><rect x="{x+140}" y="{y+38}" width="58" height="36"/><circle cx="{x+218}" cy="{y+57}" r="15"/><rect x="{x+15}" y="{y+102}" width="20" height="22"/><text x="{x+54}" y="{y+120}" class="tiny">Ethernet</text><path d="M{x+92} {y+105}h145v22H{x+92}z" class="terminal-pattern"/></g>'''
    if device_type in {"DIGITAL_INPUT", "DIGITAL_OUTPUT", "ANALOG_INPUT", "ANALOG_OUTPUT", "RELAY_OUTPUT"}:
        return f'''<g {common}><rect x="{x}" y="{y}" width="{w}" height="{h}"/><text x="{x+w/2}" y="{y+20}" class="device-label">{label}</text><circle cx="{x+16}" cy="{y+110}" r="3"/><circle cx="{x+28}" cy="{y+110}" r="3"/><circle cx="{x+40}" cy="{y+110}" r="3"/><circle cx="{x+52}" cy="{y+110}" r="3"/><rect x="{x+12}" y="{y+120}" width="{w-24}" height="15" class="terminal-pattern"/></g>'''
    if device_type in {"TERMINAL_BLOCK"}:
        cells = ''.join(f'<rect x="{x + 4 + i*10}" y="{y+20}" width="9" height="18"/>' for i in range(max(1, min(30, (w-8)//10))))
        return f'''<g {common}><text x="{x+w/2}" y="{y+12}" class="device-label">{label}</text>{cells}<line x1="{x}" y1="{y+43}" x2="{x+w}" y2="{y+43}"/></g>'''
    if device_type == "POWER_SUPPLY":
        return f'''<g {common}><rect x="{x}" y="{y}" width="{w}" height="{h}"/><text x="{x+14}" y="{y+28}" class="section-label">MW</text><text x="{x+w/2}" y="{y+66}" class="device-label">120W</text><text x="{x+w/2}" y="{y+88}" class="device-label">24VDC</text><circle cx="{x+18}" cy="{y+104}" r="4"/><circle cx="{x+w-18}" cy="{y+104}" r="4"/></g>'''
    if device_type == "CONTROL_TRANSFORMER":
        return f'''<g {common}><text x="{x+w/2}" y="{y-10}" class="device-label">CONTROL</text><text x="{x+w/2}" y="{y+4}" class="device-label">TRANSFORMER</text><rect x="{x}" y="{y+12}" width="{w}" height="{h-12}"/><rect x="{x+20}" y="{y+22}" width="{w-40}" height="{h-42}"/><path d="M{x+15} {y+15}v-10m15 10v-10m15 10v-10m15 10v-10m15 10v-10"/></g>'''
    if device_type == "DISCONNECT":
        return f'''<g {common}><text x="{x+w/2}" y="{y-18}" class="device-label">DOOR</text><text x="{x+w/2}" y="{y-4}" class="device-label">DISCONNECT</text><rect x="{x}" y="{y}" width="{w}" height="{h}"/><circle cx="{x+w/2}" cy="{y+35}" r="24"/><path d="M{x+20} {y+75}h{w-40}v95H{x+20}zM{x+10} {y+185}h{w-20}v38H{x+10}z"/></g>'''
    symbol = "M" if device_type in {"MOTOR_PROTECTOR", "OVERLOAD_RELAY"} else ""
    return f'''<g {common}><text x="{x+w/2}" y="{y-8}" class="device-label">{label}</text><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2"/><rect x="{x+w*.3}" y="{y+20}" width="{w*.4}" height="{h*.45}"/><circle cx="{x+w/2}" cy="{y+h*.42}" r="{min(w,h)*.16}"/><text x="{x+w/2}" y="{y+h*.47}" class="device-label">{symbol}</text></g>'''

device_markup = "\n".join(device_svg(d) for d in devices)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1050" role="img" aria-labelledby="title desc">
<title id="title">Line 2 Conveyor Control Cabinet Interior Layout</title><desc id="desc">Engineering cabinet layout based on the approved reference render. No conductors or inferred wiring are shown.</desc>
<style>text{{font-family:Arial,sans-serif;fill:#111}}.drawing{{fill:#fff;stroke:#111;stroke-width:2}}.device{{fill:#fff;stroke:#111;stroke-width:1.6;cursor:pointer}}.device:hover{{fill:#dfeeff;stroke:#0878cf;stroke-width:3}}.device-label{{font-size:12px;font-weight:700;text-anchor:middle}}.device-label.left{{text-anchor:start}}.breaker-label{{font-size:8px;font-weight:700;text-anchor:middle}}.section-label{{font-size:24px;font-weight:700}}.brand-small{{font-size:13px;font-style:italic;text-anchor:middle}}.brand-small.left{{text-anchor:start}}.tiny{{font-size:9px}}.display{{font-family:monospace;font-size:17px;font-weight:700;text-anchor:middle}}.terminal-pattern{{fill:none;stroke:#111}}.rail{{fill:#f7f7f7;stroke:#111;stroke-width:2}}.duct{{fill:#fafafa;stroke:#111;stroke-width:2}}.info{{fill:#fff;stroke:#111;stroke-width:1.5}}.info-label{{font-size:13px;font-weight:700}}.info-text{{font-size:12px}}</style>
<rect width="1600" height="1050" fill="#fff"/><text x="28" y="35" class="section-label">LINE 2 CONVEYOR CONTROL CABINET</text><text x="28" y="58" font-size="18">INTERIOR LAYOUT</text>
<g id="cabinet-enclosure"><rect x="55" y="75" width="1190" height="925" rx="14" class="drawing"/><rect x="75" y="95" width="1150" height="885" class="drawing"/>
<rect x="90" y="290" width="1085" height="32" class="duct"/><rect x="90" y="475" width="1085" height="30" class="duct"/><rect x="90" y="690" width="1085" height="30" class="duct"/><rect x="90" y="855" width="1085" height="30" class="duct"/>
<rect x="100" y="275" width="1040" height="10" class="rail"/><rect x="100" y="465" width="1040" height="10" class="rail"/><rect x="100" y="680" width="1040" height="10" class="rail"/><rect x="100" y="845" width="1040" height="10" class="rail"/>{device_markup}</g>
<g id="cabinet-information"><rect x="1290" y="95" width="285" height="170" class="info"/><text x="1305" y="120" class="info-label">CABINET INFORMATION</text><text x="1305" y="147" class="info-text">ASSET ID: FIELD VERIFY</text><text x="1305" y="172" class="info-text">LOCATION: FIELD VERIFY</text><text x="1305" y="197" class="info-text">PANEL SOURCE: FIELD VERIFY</text><text x="1305" y="222" class="info-text">VOLTAGE: 480VAC 3 PHASE</text><text x="1305" y="247" class="info-text">CONTROL VOLTAGE: 24VDC</text>
<rect x="1290" y="280" width="285" height="285" class="info"/><text x="1305" y="307" class="info-label">LEGEND</text><text x="1305" y="338" class="info-text">SQUARE - CIRCUIT BREAKER</text><text x="1305" y="370" class="info-text">CIRCLE - MOTOR PROTECTOR</text><text x="1305" y="402" class="info-text">DRIVE - VFD</text><text x="1305" y="434" class="info-text">CONTACTOR / OVERLOAD</text><text x="1305" y="466" class="info-text">POWER SUPPLY</text><text x="1305" y="498" class="info-text">TERMINAL BLOCK</text>
<rect x="1290" y="580" width="285" height="190" class="info"/><text x="1305" y="607" class="info-label">NOTES</text><text x="1305" y="638" class="info-text">1. NO CONDUCTORS SHOWN.</text><text x="1305" y="670" class="info-text">2. DEVICE PLACEMENT FROM</text><text x="1322" y="690" class="info-text">APPROVED REFERENCE RENDER.</text><text x="1305" y="722" class="info-text">3. VERIFY FIELD IDENTIFIERS.</text>
<rect x="1290" y="785" width="285" height="195" class="info"/><text x="1305" y="812" class="info-label">DRAWING INFO</text><text x="1305" y="844" class="info-text">STATUS: WORKING DOCUMENT</text><text x="1305" y="876" class="info-text">REV: A</text><text x="1305" y="908" class="info-text">DWG NO: L2-CC-INT-001</text><text x="1305" y="940" class="info-text">SHEET: 1 OF 1</text></g></svg>'''

metadata = {
    "schemaVersion": "1.0.0",
    "cabinet": {
        "id": "line2-control-cabinet", "name": "Line 2 Conveyor Control Cabinet",
        "assetId": {"value": None, "verificationStatus": "FIELD_VERIFY"},
        "location": {"value": None, "verificationStatus": "FIELD_VERIFY"},
        "panelSource": {"value": None, "verificationStatus": "FIELD_VERIFY"},
        "voltage": {"value": "480 VAC 3 phase", "verificationStatus": "VERIFIED_REFERENCE_DRAWING"},
        "controlVoltage": {"value": "24 VDC", "verificationStatus": "VERIFIED_REFERENCE_DRAWING"},
        "drawingNumber": "L2-CC-INT-001", "revision": "A",
        "notes": ["No conductors shown.", "Device placement follows the approved reference render.", "Field identifiers and assignments require verification."],
    },
    "devices": devices,
}

(OUT / "cabinet.svg").write_text(svg, encoding="utf-8")
(OUT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width": 1600, "height": 1050}, device_scale_factor=1)
    page.set_content(f"<style>html,body{{margin:0;width:1600px;height:1050px}}</style>{svg}", wait_until="load")
    page.locator("svg").screenshot(path=str(OUT / "cabinet.png"))
    page.pdf(path=str(OUT / "cabinet.pdf"), width="16in", height="10.5in", print_background=True, margin={"top":"0in","right":"0in","bottom":"0in","left":"0in"})
    browser.close()

print(f"Generated {len(devices)} device records: {OUT}")
