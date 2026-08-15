import { useEffect, useMemo, useRef, useState } from 'react';
import DeviceIntel from './DeviceIntel';
import FloorPacket from './FloorPacket';
import PlcRackView from './PlcRackView';
import WalkdownForm from './WalkdownForm';
import { destUnknownHighlight } from './lib/boardChrome';
import { chipCountLabel } from './lib/hrefMatrix';
import { intelFocusTitle, panToDeviceFromRects } from './lib/floorPass';
import { subscribeViewport } from './lib/viewport';
import { parseDeviceQuery, writeDeviceQuery } from './lib/deviceQuery';
import { line2DriveInstances } from './lib/driveInstances';
import { cabinetPackageFor } from './lib/plantPacks';
import { cabinetDeviceToComponent } from './productCatalog';

type CabinetDevice = { id: string; label: string; type: string; verificationStatus: string; source: string; manufacturer?: string; model?: string; designation?: string; loadLabel?: string; voltage?: string; output?: string; rating?: string };
type CabinetMetadata = { cabinet: { id: string; name: string; drawingNumber: string; revision: string; voltage: { value: string }; controlVoltage: { value: string }; assetId: { value: string | null; verificationStatus: string }; location: { value: string | null; verificationStatus: string }; panelSource: { value: string | null; verificationStatus: string }; notes: string[] }; devices: CabinetDevice[] };

const LINE2_PACKAGE = cabinetPackageFor('L2-CC-001');
const packageHref = (rel: string) => new URL(rel, document.baseURI).href;
const assetUrl = (file: string) => {
  if (LINE2_PACKAGE) {
    if (file === 'cabinet.svg') return packageHref(LINE2_PACKAGE.drawing);
    if (file === 'cabinet.png') return packageHref(LINE2_PACKAGE.raster);
    if (file === 'metadata.json') return packageHref(LINE2_PACKAGE.metadata);
  }
  return packageHref(`assets/line2/control-cabinet/${file}`);
};
const pretty = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ControlCabinetView({ onBack, onOpenFilm }: { onBack: () => void; onOpenFilm?: () => void }) {
  const [metadata, setMetadata] = useState<CabinetMetadata | null>(null);
  const [svg, setSvg] = useState('');
  const requested = parseDeviceQuery(new URLSearchParams(location.search).get('device'));
  const [selectedId, setSelectedId] = useState(requested?.deviceId ?? 'plc-micrologix-1400');
  const [query, setQuery] = useState('');
  const [packetOpen, setPacketOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const fittedRef = useRef(false);

  const applyTransform = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const { x, y, scale } = viewRef.current;
    stage.style.transformOrigin = '0 0';
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  const fitDrawing = () => {
    viewRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  };

  const panToSelected = () => {
    const canvas = canvasRef.current;
    const target = canvas?.querySelector<SVGGElement>(`[data-device-id="${CSS.escape(selectedId)}"]`);
    if (!canvas || !target) return;
    try {
      const canvasBox = canvas.getBoundingClientRect();
      const deviceBox = target.getBoundingClientRect();
      viewRef.current = panToDeviceFromRects(deviceBox, canvasBox, viewRef.current);
      applyTransform();
    } catch {
      /* drawing not ready */
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(assetUrl('metadata.json')).then((response) => response.json()),
      fetch(assetUrl('cabinet.svg')).then((response) => response.text()),
    ]).then(([data, drawing]) => {
      setMetadata(data);
      setSvg(drawing);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !svg) return;
    canvas.querySelectorAll('.is-selected').forEach((node) => node.classList.remove('is-selected'));
    canvas.querySelector(`[data-device-id="${CSS.escape(selectedId)}"]`)?.classList.add('is-selected');
    canvas.querySelectorAll('.is-dest-unknown').forEach((node) => node.classList.remove('is-dest-unknown'));
    for (const slot of line2DriveInstances()) {
      const mark = destUnknownHighlight(slot.cabinetDeviceId, slot.destId);
      if (mark) canvas.querySelector(`[data-device-id="${CSS.escape(slot.cabinetDeviceId)}"]`)?.classList.add(mark);
    }
  }, [selectedId, svg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { x, y, scale } = viewRef.current;
      const next = Math.min(4.5, Math.max(0.2, scale * (event.deltaY < 0 ? 1.1 : 0.9)));
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      viewRef.current.x = cx - ((cx - x) / scale) * next;
      viewRef.current.y = cy - ((cy - y) / scale) * next;
      viewRef.current.scale = next;
      applyTransform();
    };
    const onDown = (event: PointerEvent) => {
      if ((event.target as Element).closest('[data-device-id]')) return;
      dragRef.current = { x: event.clientX - viewRef.current.x, y: event.clientY - viewRef.current.y };
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      viewRef.current.x = event.clientX - dragRef.current.x;
      viewRef.current.y = event.clientY - dragRef.current.y;
      applyTransform();
    };
    const onUp = () => { dragRef.current = null; };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    const stopViewport = subscribeViewport(() => undefined);
    if (!fittedRef.current) {
      fittedRef.current = true;
      requestAnimationFrame(() => fitDrawing());
    }
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      stopViewport();
    };
  }, [svg]);

  useEffect(() => {
    document.querySelector<HTMLElement>('.device-chips button.selected')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' as ScrollBehavior });
    if (svg && selectedId) requestAnimationFrame(() => panToSelected());
  }, [selectedId, svg]);

  useEffect(() => {
    if (selectedId) writeDeviceQuery(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'j' && event.key !== 'k') || !metadata) return;
      const ids = metadata.devices.map((item) => item.id);
      const index = ids.indexOf(selectedId);
      const next = event.key === 'j' ? Math.min(ids.length - 1, index + 1) : Math.max(0, index - 1);
      setSelectedId(ids[next]);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [metadata, selectedId]);

  const filtered = useMemo(() => metadata?.devices.filter((device) => `${device.id} ${device.label} ${device.type} ${device.manufacturer ?? ''} ${device.model ?? ''}`.toLowerCase().includes(query.toLowerCase())) ?? [], [metadata, query]);
  const chipIndex = metadata ? metadata.devices.findIndex((item) => item.id === selectedId) + 1 : 0;
  const chipTotal = metadata?.devices.length ?? 0;
  const selected = metadata?.devices.find((device) => device.id === selectedId) ?? null;
  const selectDevice = (id: string) => {
    setSelectedId(id);
    writeDeviceQuery(id);
  };
  const selectFromDrawing = (event: React.MouseEvent<HTMLDivElement>) => {
    const group = (event.target as Element).closest<SVGGElement>('[data-device-id]');
    if (group?.dataset.deviceId) selectDevice(group.dataset.deviceId);
  };

  return (
    <main className="cabinet-page" data-guide-target="cabinet" data-testid="cabinet-package" data-cabinet-package={LINE2_PACKAGE?.id} data-dest-unknown={LINE2_PACKAGE?.destUnknown ? 'true' : 'false'}>
      <header className="cabinet-header">
        <div>
          <button type="button" className="cabinet-back" onClick={onBack} aria-label="Facility dashboard">
            <span aria-hidden="true">←</span>
            <span className="cabinet-back-label">Facility dashboard</span>
          </button>
          <div>
            <span>Control cabinet documentation</span>
            <h1>{metadata?.cabinet.name ?? 'Line 2 Conveyor Control Cabinet'}</h1>
          </div>
        </div>
        <nav aria-label="Cabinet downloads">
          {onOpenFilm && <button type="button" className="film-ghost" onClick={onOpenFilm}>Film</button>}
          <button type="button" onClick={() => setPacketOpen((value) => !value)}>Packet</button>
          <a href={assetUrl('cabinet.svg')} download>SVG</a>
          <a href={assetUrl('cabinet.pdf')} download>PDF</a>
          <a href={assetUrl('cabinet.png')} download>PNG</a>
          <a href={assetUrl('metadata.json')} download>Metadata</a>
        </nav>
      </header>
      {packetOpen && <FloorPacket onClose={() => setPacketOpen(false)} />}
      <section className="cabinet-workspace phone-intel">
        <aside className="cabinet-device-list panel scroll-pane">
          <p className="panel-title">Cabinet devices · <span data-testid="chip-count">{chipCountLabel(chipIndex, chipTotal)}</span></p>
          <label>
            <span className="sr-only">Search cabinet devices</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices…" />
          </label>
          <div className="device-chips scroll-pane" data-testid="device-chips">
            {filtered.map((device) => (
              <button key={`chip-${device.id}`} className={selectedId === device.id ? 'selected' : ''} onClick={() => selectDevice(device.id)}>{device.label}</button>
            ))}
          </div>
          <div>
            {filtered.map((device) => (
              <button key={device.id} className={selectedId === device.id ? 'selected' : ''} onClick={() => selectDevice(device.id)}>
                <span>{device.label}</span>
                <small>{pretty(device.type)}</small>
              </button>
            ))}
          </div>
          <footer>{filtered.length} of {metadata?.devices.length ?? 0} devices</footer>
        </aside>
        <section className="cabinet-drawing panel">
          <div className="panel-heading">
            <div>
              <p className="panel-title">Interior layout</p>
              <small>Drawing L2-CC-INT-001 · Rev A · Click any device · drag to pan · scroll to zoom</small>
            </div>
            <div className="cabinet-zoom">
              <button type="button" onClick={() => fitDrawing()} aria-label="Fit drawing">Fit</button>
              <span className="verified-reference">Verified reference geometry</span>
            </div>
          </div>
          {svg ? (
            <div ref={canvasRef} className="cabinet-svg" onClick={selectFromDrawing} role="img" aria-label="Line 2 cabinet interior layout">
              <div ref={stageRef} className="cabinet-svg-stage">
                <img className="cabinet-raster" src={assetUrl('cabinet.png')} alt="Line 2 cabinet interior layout" draggable={false} />
                <div className="cabinet-hit" dangerouslySetInnerHTML={{ __html: svg.replace(/<rect width="1600" height="1050" fill="#fff"\s*\/>/, '') }} />
              </div>
            </div>
          ) : (
            <div className="cabinet-loading">Loading cabinet geometry…</div>
          )}
        </section>
        <aside className="cabinet-detail panel scroll-pane">
          {selected ? (
            <>
              <div className="cabinet-detail-heading">
                <span className="device-sticky" data-testid="device-sticky">{intelFocusTitle(selected.id)}</span>
                <span>{pretty(selected.type)}</span>
                <h2>{selected.label}</h2>
                <code>{selected.id}</code>
              </div>
              <dl>
                <div><dt>Verification</dt><dd className="verified-reference">Verified reference drawing</dd></div>
                {selected.manufacturer && <div><dt>Manufacturer</dt><dd>{selected.manufacturer}</dd></div>}
                {selected.model && <div><dt>Model</dt><dd>{selected.model}</dd></div>}
                {selected.designation && <div><dt>Designation</dt><dd>{selected.designation}</dd></div>}
                {selected.loadLabel && <div><dt>Drawing label</dt><dd>{selected.loadLabel}</dd></div>}
                {selected.voltage && <div><dt>Voltage</dt><dd>{selected.voltage}</dd></div>}
                {selected.output && <div><dt>Output</dt><dd>{selected.output}</dd></div>}
                {selected.rating && <div><dt>Rating</dt><dd>{selected.rating}</dd></div>}
                <div><dt>Source</dt><dd>{selected.source}</dd></div>
              </dl>
              {cabinetDeviceToComponent[selected.id] && (
                <DeviceIntel deviceOrComponentId={selected.id} onSelectDrive={(_, cabinetDeviceId) => selectDevice(cabinetDeviceId)} />
              )}
              <WalkdownForm targetId={cabinetDeviceToComponent[selected.id] ?? selected.id} promptSource={selected.loadLabel ?? selected.label} defaultField="note" />
              {selected.id === 'plc-micrologix-1400' && <PlcRackView />}
              <p className="cabinet-caution">Placement and visible labels follow the approved render. Wiring, load assignment, network topology, and hidden components are not inferred.</p>
            </>
          ) : <p>Select a cabinet device.</p>}
          <section className="cabinet-summary">
            <p className="panel-title">Cabinet information</p>
            <div><span>Power</span><b>{metadata?.cabinet.voltage.value}</b></div>
            <div><span>Controls</span><b>{metadata?.cabinet.controlVoltage.value}</b></div>
            <div><span>Asset ID</span><b className="field-verify">Field verify</b></div>
            <div><span>Location</span><b className="field-verify">Field verify</b></div>
          </section>
        </aside>
      </section>
    </main>
  );
}
