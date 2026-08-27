import DeviceIntel from '../DeviceIntel';
import PlcRackView from '../PlcRackView';
import WalkdownForm from '../WalkdownForm';
import { activeFacilityPackage } from '../facility';
import { useFacility } from '../facility';
import { areas, documentationPercent, documents } from '../facilityData';
import { captureKitForArea } from '../lib/areaKit';
import type { InspectorTab } from '../lib/boardChrome';
import { documentSource } from '../lib/documentCatalog';
import { filmHonestyForAsset } from '../lib/filmBridge';
import { standalonePresentationHref } from '../lib/filmGenie';
import { renderMarkdown } from '../lib/markdown';
import { exportAreaWalkPack } from '../lib/plantPacks';
import { serialSourcesDisagree, serialSourcesFor } from '../lib/serialSources';
import { markerClass } from '../lib/statusMark';
import { visiblePartsFor } from '../lib/visibleParts';
import { todayItemState, todayProgress } from '../lib/floorPass';
import { todayChipTarget, todayWalkdownItems } from '../lib/walkdownPrompts';
import { markUnknownCaptured, unknownQueueState } from '../lib/walkdown';
import { writeDeviceQuery } from '../lib/deviceQuery';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';

const stateLabel: Record<string, string> = {
  COMPLETE: 'Complete', REVIEW: 'Review', IN_PROGRESS: 'In progress', DRAFT: 'Draft', NOT_STARTED: 'Not started',
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

const featuredCabinetAssetId = activeFacilityPackage.featureConfig.featuredCabinetAssetId;

function StatusI({ status }: { status: string }) {
  return <i className={markerClass(status as VerificationState)} aria-hidden="true" />;
}

function DocumentBody({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const record = documents.find((item) => item.id === documentId);
  if (!record) return null;
  const source = documentSource(record.path) ?? `# ${record.title}\n\nDocument file is not in this build.`;
  return (
    <section className="document-detail">
      <button type="button" onClick={onClose} aria-label="Close documentation detail">×</button>
      <p className="panel-title">{record.category}</p>
      <h3>{record.title}</h3>
      <p>Status: <strong>{stateLabel[record.state]}</strong> · <span className={markerClass(record.verificationStatus)} /> {stateLabel[record.verificationStatus]}</p>
      <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
    </section>
  );
}

export type SelectedAssetPanelProps = {
  asset: FacilityAsset | null;
  area: FacilityArea | null;
  activeDocument: string | null;
  onDocument: (id: string | null) => void;
  onOpenCabinet: () => void;
  onPacket: (assetId: string) => void;
  onFocusCabinet: () => void;
  onDoorSheet: () => void;
  focusCabinet: boolean;
  tab: InspectorTab;
  onCapture: () => void;
  onTrace: () => void;
  openUnknown: string | null;
  onOpenUnknown: (id: string | null) => void;
  onTodayJump: (jump: ReturnType<typeof todayChipTarget>) => void;
  focusDevice: string | null;
  todayIndex: number;
  onTodayIndex: (index: number) => void;
  onAsset: (asset: FacilityAsset) => void;
};

export default function SelectedAssetPanel({
  asset, area, activeDocument, onDocument, onOpenCabinet, onPacket, onFocusCabinet, onDoorSheet, focusCabinet, tab, onCapture, onTrace, openUnknown, onOpenUnknown, onTodayJump, focusDevice, todayIndex, onTodayIndex, onAsset,
}: SelectedAssetPanelProps) {
  const facility = useFacility();
  if (!asset) {
    const kit = area ? captureKitForArea(area.id) : null;
    const areaAssets = area ? facility.assets.filter((item) => item.areaId === area.id) : [];
    const mappedIds = new Set(((facility.mapConfig?.markers ?? []) as { assetId?: string; state?: string }[]).filter((item) => item.assetId && item.state !== 'REFERENCE').map((item) => item.assetId));
    return (
      <aside className="asset-panel panel empty-state">
        <p className="panel-title">Asset record</p>
        {kit?.kind === 'empty' && (tab === 'capture' || tab === 'record') ? (
          <div data-testid="area-kit">
            <h2>{kit.areaName} · not started</h2>
            <p>No assets in the graph. Capture kit only — this does not create a machine.</p>
            <button type="button" data-testid="export-area-pack" onClick={() => {
              const pack = exportAreaWalkPack(kit.areaId);
              if (!pack || pack.createsMachine !== false) return;
              const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
              const href = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = href;
              link.download = `iag-area-walk-${kit.areaId}.json`;
              link.click();
              URL.revokeObjectURL(href);
            }}>Export area walk pack</button>
            {tab === 'capture' && (
              <>
                <ol className="area-kit-list">{kit.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol>
                <WalkdownForm targetId={kit.areaId} defaultField="note" onSaved={onCapture} />
                <section className="today-sheet" data-testid="today-sheet">
                  <p className="panel-title">Today’s walkdown · {todayProgress().open} open</p>
                  <div className="today-chips">{todayWalkdownItems().map((item, index) => (
                    <button key={item.id} type="button" data-state={todayItemState(item)} className={todayIndex === index ? 'is-current' : ''} onClick={() => { onTodayIndex(index); onTodayJump(todayChipTarget(item)); }}>
                      {item.label}<small>{todayItemState(item)}</small>
                    </button>
                  ))}</div>
                </section>
              </>
            )}
          </div>
        ) : (
          <>
            <h2>{area ? area.name : 'Select an asset'}</h2>
            <p>{area ? `${areaAssets.length} database asset${areaAssets.length === 1 ? '' : 's'} · ${areaAssets.filter((item) => mappedIds.has(item.id)).length} mapped · ${areaAssets.filter((item) => !mappedIds.has(item.id)).length} unmapped` : 'Choose an area, then select an asset marker to open its evidence-aware documentation package.'}</p>
            {areaAssets.length > 0 && <div className="room-asset-list" aria-label={`${area?.name ?? 'Area'} asset list`}>{areaAssets.map((item) => <button key={item.id} type="button" onClick={() => onAsset(item)}><span><b>{item.id}</b><small>{item.name} · {item.type} · {item.line || 'No line'}</small></span><em>{item.verificationStatus.replace('_', ' ')} · {mappedIds.has(item.id) ? 'Mapped' : 'Unmapped'}</em></button>)}</div>}
            <div className="empty-chips"><span>Nameplate</span><span>Documents</span><span>Spare parts</span><span>Evidence</span></div>
          </>
        )}
      </aside>
    );
  }

  const assetDocs = documents.filter((item) => item.assetId === asset.id);
  const active = assetDocs.find((item) => item.id === activeDocument);
  const film = filmHonestyForAsset(asset.id);
  const parts = visiblePartsFor(asset.id);
  const isFeaturedCabinet = asset.id === featuredCabinetAssetId;

  return (
    <aside className="asset-panel panel">
      <div className="asset-banner"><div><p>Selected asset</p><h2>{asset.id}</h2><span>{asset.name}</span></div><span className="verification-badge"><StatusI status={asset.verificationStatus} /> {stateLabel[asset.verificationStatus]}</span></div>
      <div className="asset-actions">
        {isFeaturedCabinet && <button className="open-cabinet-cta" type="button" onClick={onOpenCabinet}>Cabinet</button>}
        {isFeaturedCabinet && <button className="packet-btn" type="button" onClick={onFocusCabinet}>{focusCabinet ? 'Board' : 'At panel'}</button>}
        <a className="film-chapter is-ghost" href={standalonePresentationHref()} target="_blank" rel="noopener noreferrer">{film.kind === 'chapter' ? 'Presentation ↗' : 'Presentation ↗'}</a>
        <button className="packet-btn" type="button" onClick={() => onPacket(asset.id)}>Packet</button>
        {isFeaturedCabinet && <button className="packet-btn" type="button" onClick={onDoorSheet}>Door</button>}
      </div>
      {tab === 'capture' && (
        <>
          <WalkdownForm targetId={asset.id} defaultField="unknown" onSaved={onCapture} />
          <section className="today-sheet" data-testid="today-sheet"><p className="panel-title">Today’s walkdown · {todayProgress().open} open</p><div className="today-chips" data-testid="today-chips">{todayWalkdownItems().map((item, index) => (
            <button key={item.id} type="button" data-state={todayItemState(item)} className={todayIndex === index ? 'is-current' : ''} onClick={() => { onTodayIndex(index); onTodayJump(todayChipTarget(item)); }}>{item.label}<small>{todayItemState(item)}</small></button>
          ))}</div></section>
          <section className="unknowns"><p className="panel-title">Field verification queue</p>{asset.unknowns.map((item) => {
            const state = unknownQueueState(asset.id, item);
            const open = openUnknown === item;
            return <div key={item} className={open ? 'unknown-open' : ''}><p><StatusI status="FIELD_VERIFY" /><span>{item}</span><button type="button" onClick={() => onOpenUnknown(open ? null : item)}>{open ? 'hide' : 'capture'}</button><button type="button" onClick={() => { if (state === 'open') markUnknownCaptured(asset.id, item); onCapture(); }}>{state === 'captured' ? 'captured' : 'mark'}</button></p>{open && <WalkdownForm targetId={`${asset.id}:${item}`} promptSource={item} onSaved={onCapture} />}</div>;
          })}</section>
        </>
      )}
      {tab === 'intel' && <><button className="ghost-trace" type="button" onClick={onTrace}>Trace path</button>{isFeaturedCabinet && <PlcRackView />}{asset.componentIds.some((id) => id.includes('VFD') || id.includes('SD')) && <DeviceIntel deviceOrComponentId={focusDevice ?? asset.componentIds.find((id) => id.includes('VFD')) ?? asset.id} onSelectDrive={(_, cabinetDeviceId) => { writeDeviceQuery(cabinetDeviceId); onOpenCabinet(); }} />}</>}
      {tab === 'record' && <>{serialSourcesDisagree(asset.id) && <section className="serial-dispute" data-testid="serial-dispute"><p className="panel-title">Conflicting identifiers</p>{serialSourcesFor(asset.id).map((source) => <p key={source.id}><b>{source.label}</b> · {source.value} · {source.verificationStatus}</p>)}<small>Both sources are DISPUTED. The graph does not pick a winner.</small></section>}<dl className="identity-grid"><FactRow label="Location" value={`${areas.find((item) => item.id === asset.areaId)?.name} / ${asset.line}`} status={isFeaturedCabinet ? 'INFERRED' : 'VERIFIED'} note={isFeaturedCabinet ? 'Area association is provisional.' : undefined} /><FactRow label="Asset type" value={asset.type} status="VERIFIED" /><FactRow label="Manufacturer" value={asset.manufacturer.value} status={asset.manufacturer.verificationStatus} note={asset.manufacturer.note} /><FactRow label="Model" value={asset.model.value} status={asset.model.verificationStatus} note={asset.model.note} /><FactRow label="Serial" value={asset.serialNumber.value} status={asset.serialNumber.verificationStatus} note={asset.serialNumber.note} />{asset.facts.map((item) => <FactRow key={item.label} label={item.label} value={item.value.value} status={item.value.verificationStatus} note={item.value.note} unit={item.value.unit} />)}</dl><div className="progress-header"><span>Documentation progress</span><b>{documentationPercent(asset.id)}%</b></div><progress value={documentationPercent(asset.id)} max="100" />{parts.length > 0 && <section className="visible-parts" data-testid="visible-parts"><p className="panel-title">Visible on drawing</p><ul>{parts.map((part) => <li key={part.id}>{part.label} · {part.id}</li>)}</ul></section>}</>}
      {tab === 'docs' && (active ? <DocumentBody documentId={active.id} onClose={() => onDocument(null)} /> : <div className="document-grid">{assetDocs.map((item) => <button key={item.id} onClick={() => onDocument(item.id)}><b>{item.category}</b><small>{stateLabel[item.state]}</small></button>)}</div>)}
    </aside>
  );
}

function FactRow({ label, value, status, note, unit }: { label: string; value: string | number | null | undefined; status: VerificationState; note?: string; unit?: string }) {
  return <div className="fact-row"><dt>{label}</dt><dd>{value ?? 'Unknown'}{unit ? ` ${unit}` : ''}<span className="fact-state">{stateLabel[status]}</span>{note && <span className="fact-state">{note}</span>}</dd></div>;
}
