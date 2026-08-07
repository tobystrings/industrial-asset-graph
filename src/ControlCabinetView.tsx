import { useEffect, useMemo, useRef, useState } from 'react';

type CabinetDevice = { id: string; label: string; type: string; verificationStatus: string; source: string; manufacturer?: string; model?: string; designation?: string; loadLabel?: string; voltage?: string; output?: string; rating?: string };
type CabinetMetadata = { cabinet: { id: string; name: string; drawingNumber: string; revision: string; voltage: { value: string }; controlVoltage: { value: string }; assetId: { value: string | null; verificationStatus: string }; location: { value: string | null; verificationStatus: string }; panelSource: { value: string | null; verificationStatus: string }; notes: string[] }; devices: CabinetDevice[] };

const assetUrl = (file: string) => new URL(`assets/line2/control-cabinet/${file}`, document.baseURI).href;
const pretty = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ControlCabinetView({ onBack }: { onBack: () => void }) {
  const [metadata, setMetadata] = useState<CabinetMetadata | null>(null);
  const [svg, setSvg] = useState('');
  const [selectedId, setSelectedId] = useState('plc-micrologix-1400');
  const [query, setQuery] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetch(assetUrl('metadata.json')).then((response) => response.json()), fetch(assetUrl('cabinet.svg')).then((response) => response.text())]).then(([data, drawing]) => { setMetadata(data); setSvg(drawing); });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.querySelectorAll('.is-selected').forEach((node) => node.classList.remove('is-selected'));
    canvas.querySelector(`[data-device-id="${CSS.escape(selectedId)}"]`)?.classList.add('is-selected');
  }, [selectedId, svg]);

  const filtered = useMemo(() => metadata?.devices.filter((device) => `${device.id} ${device.label} ${device.type} ${device.manufacturer ?? ''} ${device.model ?? ''}`.toLowerCase().includes(query.toLowerCase())) ?? [], [metadata, query]);
  const selected = metadata?.devices.find((device) => device.id === selectedId) ?? null;
  const selectFromDrawing = (event: React.MouseEvent<HTMLDivElement>) => { const group = (event.target as Element).closest<SVGGElement>('[data-device-id]'); if (group?.dataset.deviceId) setSelectedId(group.dataset.deviceId); };

  return <main className="cabinet-page">
    <header className="cabinet-header"><div><button onClick={onBack}>← Facility dashboard</button><div><span>Control cabinet documentation</span><h1>{metadata?.cabinet.name ?? 'Line 2 Conveyor Control Cabinet'}</h1></div></div><nav aria-label="Cabinet downloads"><a href={assetUrl('cabinet.svg')} download>SVG</a><a href={assetUrl('cabinet.pdf')} download>PDF</a><a href={assetUrl('cabinet.png')} download>PNG</a><a href={assetUrl('metadata.json')} download>Metadata</a></nav></header>
    <section className="cabinet-workspace">
      <aside className="cabinet-device-list panel"><p className="panel-title">Cabinet devices</p><label><span className="sr-only">Search cabinet devices</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices…" /></label><div>{filtered.map((device) => <button key={device.id} className={selectedId === device.id ? 'selected' : ''} onClick={() => setSelectedId(device.id)}><span>{device.label}</span><small>{pretty(device.type)}</small></button>)}</div><footer>{filtered.length} of {metadata?.devices.length ?? 0} devices</footer></aside>
      <section className="cabinet-drawing panel"><div className="panel-heading"><div><p className="panel-title">Interior layout</p><small>Drawing L2-CC-INT-001 · Rev A · Click any device</small></div><span className="verified-reference">Verified reference geometry</span></div>{svg ? <div ref={canvasRef} className="cabinet-svg" onClick={selectFromDrawing} dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="cabinet-loading">Loading cabinet geometry…</div>}</section>
      <aside className="cabinet-detail panel">{selected ? <><div className="cabinet-detail-heading"><span>{pretty(selected.type)}</span><h2>{selected.label}</h2><code>{selected.id}</code></div><dl><div><dt>Verification</dt><dd className="verified-reference">Verified reference drawing</dd></div>{selected.manufacturer && <div><dt>Manufacturer</dt><dd>{selected.manufacturer}</dd></div>}{selected.model && <div><dt>Model</dt><dd>{selected.model}</dd></div>}{selected.designation && <div><dt>Designation</dt><dd>{selected.designation}</dd></div>}{selected.loadLabel && <div><dt>Drawing label</dt><dd>{selected.loadLabel}</dd></div>}{selected.voltage && <div><dt>Voltage</dt><dd>{selected.voltage}</dd></div>}{selected.output && <div><dt>Output</dt><dd>{selected.output}</dd></div>}{selected.rating && <div><dt>Rating</dt><dd>{selected.rating}</dd></div>}<div><dt>Source</dt><dd>{selected.source}</dd></div></dl><p className="cabinet-caution">Placement and visible labels follow the approved render. Wiring, load assignment, network topology, and hidden components are not inferred.</p></> : <p>Select a cabinet device.</p>}
      <section className="cabinet-summary"><p className="panel-title">Cabinet information</p><div><span>Power</span><b>{metadata?.cabinet.voltage.value}</b></div><div><span>Controls</span><b>{metadata?.cabinet.controlVoltage.value}</b></div><div><span>Asset ID</span><b className="field-verify">Field verify</b></div><div><span>Location</span><b className="field-verify">Field verify</b></div></section></aside>
    </section>
  </main>;
}
