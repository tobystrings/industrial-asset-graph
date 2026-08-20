import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useFacility, useFacilityEditor, type AttachmentRecord, type FacilityMapMarker, type PlantBackup } from '../facility';
import { getAttachment } from '../facility/runtimeDb';
import type { DocumentationState, FacilityArea, FacilityAsset, RelationshipRecord, RelationshipType, VerificationState } from '../types/facility';
import './plantManager.css';
import './changeControl.css';

type Panel = 'asset' | 'manage' | 'relationship' | 'evidence' | 'observation' | 'setup' | 'database' | 'users' | null;
type MapPoint = { x: number; y: number } | null;

const relationshipLabels: { value: RelationshipType; label: string }[] = [
  { value: 'FEEDS', label: 'Feeds Power To' },
  { value: 'CONTROLS', label: 'Controls' },
  { value: 'INTERLOCKS_WITH', label: 'Interlocks With' },
  { value: 'SENDS_DATA_TO', label: 'Sends Data To' },
  { value: 'MECHANICALLY_DRIVES', label: 'Mechanically Drives' },
  { value: 'SENSES', label: 'Senses' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'ISOLATES', label: 'Isolates' },
  { value: 'UPSTREAM_OF', label: 'Upstream Of' },
  { value: 'DOWNSTREAM_OF', label: 'Downstream Of' },
];

const documentationStates: DocumentationState[] = ['COMPLETE', 'REVIEW', 'IN_PROGRESS', 'DRAFT', 'NOT_STARTED'];

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safePlantFileName(name: string) {
  return (name || 'plant').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'plant';
}

function AssetForm({ point, asset, onDone }: { point: MapPoint; asset?: FacilityAsset; onDone: () => void }) {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [id, setId] = useState(asset?.id ?? '');
  const [name, setName] = useState(asset?.name ?? '');
  const [type, setType] = useState(asset?.type ?? 'MOTOR');
  const [areaId, setAreaId] = useState(asset?.areaId ?? facility.featureConfig.defaultAreaId ?? facility.areas[0]?.id ?? '');
  const [line, setLine] = useState(asset?.line ?? '');
  const [manufacturer, setManufacturer] = useState(String(asset?.manufacturer.value ?? ''));
  const [model, setModel] = useState(String(asset?.model.value ?? ''));
  const [serial, setSerial] = useState(String(asset?.serialNumber.value ?? ''));
  const [description, setDescription] = useState(asset?.description ?? '');
  const [verificationStatus, setVerificationStatus] = useState<VerificationState>(asset?.verificationStatus ?? 'FIELD_VERIFY');
  const [facts, setFacts] = useState<{ label: string; value: string }[]>(() => asset?.facts.map((fact) => ({ label: fact.label, value: String(fact.value.value ?? '') })) ?? []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const assetId = id.trim() || `AST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const next: FacilityAsset = {
      id: assetId,
      name: name.trim() || assetId,
      description,
      type,
      facilityId: asset?.facilityId ?? facility.facility.id,
      areaId,
      line,
      verificationStatus,
      manufacturer: { ...(asset?.manufacturer ?? {}), value: manufacturer || null, verificationStatus, evidenceIds: asset?.manufacturer.evidenceIds ?? [] },
      model: { ...(asset?.model ?? {}), value: model || null, verificationStatus, evidenceIds: asset?.model.evidenceIds ?? [] },
      serialNumber: { ...(asset?.serialNumber ?? {}), value: serial || null, verificationStatus, evidenceIds: asset?.serialNumber.evidenceIds ?? [] },
      facts: facts.filter((fact) => fact.label.trim()).map((fact, index) => ({
        label: fact.label.trim(),
        value: {
          ...(asset?.facts[index]?.value ?? {}),
          value: fact.value,
          verificationStatus,
          evidenceIds: asset?.facts[index]?.value.evidenceIds ?? [],
        },
      })),
      componentIds: asset?.componentIds ?? [],
      unknowns: asset?.unknowns ?? [],
    };
    await editor.saveAsset(next, point ?? undefined);
    onDone();
  };

  return <form className="iag-editor-form" onSubmit={save}>
    {point && <div className="iag-map-coordinate">Map pin: {point.x.toFixed(1)}%, {point.y.toFixed(1)}%</div>}
    <div className="iag-form-grid">
      <label>Asset ID<input disabled={Boolean(asset)} value={id} onChange={(event) => setId(event.target.value)} placeholder="Auto-generated if blank" /></label>
      <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Line 2 Conveyor Motor" /></label>
      <label>Asset Type<input list="iag-asset-types" value={type} onChange={(event) => setType(event.target.value)} /><datalist id="iag-asset-types"><option value="MOTOR"/><option value="VFD"/><option value="PLC"/><option value="PANEL"/><option value="BREAKER"/><option value="DISCONNECT"/><option value="CONTROL CABINET"/><option value="SENSOR"/><option value="CONVEYOR"/><option value="MACHINE"/></datalist></label>
      <label>Area<select value={areaId} onChange={(event) => setAreaId(event.target.value)}>{facility.areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
      <label>Line / System<input value={line} onChange={(event) => setLine(event.target.value)} /></label>
      <label>Status<select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value as VerificationState)}><option value="VERIFIED">Evidence Verified</option><option value="FIELD_VERIFY">Needs Field Verification</option><option value="INFERRED">Inferred</option><option value="DISPUTED">Disputed</option><option value="RETIRED">Retired</option></select></label>
      <label>Manufacturer<input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></label>
      <label>Model<input value={model} onChange={(event) => setModel(event.target.value)} /></label>
      <label>Serial Number<input value={serial} onChange={(event) => setSerial(event.target.value)} /></label>
    </div>
    <label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <section className="iag-custom-fields"><div className="iag-section-head"><strong>Custom Attributes</strong><button type="button" onClick={() => setFacts((current) => [...current, { label: '', value: '' }])}>+ Add Field</button></div>{facts.map((fact, index) => <div className="iag-attribute-row" key={`${index}-${fact.label}`}><input placeholder="FLA / IP Address / Fuse" value={fact.label} onChange={(event) => setFacts((rows) => rows.map((row, i) => i === index ? { ...row, label: event.target.value } : row))}/><input placeholder="14.2 A / 192.168.1.50" value={fact.value} onChange={(event) => setFacts((rows) => rows.map((row, i) => i === index ? { ...row, value: event.target.value } : row))}/><button type="button" aria-label="Remove field" onClick={() => setFacts((rows) => rows.filter((_, i) => i !== index))}>×</button></div>)}</section>
    <div className="iag-form-actions">{asset && <button className="danger" type="button" onClick={async () => { if (!confirm(`Delete ${asset.id} — ${asset.name}? Connected relationships, map pin, local evidence and asset documents will also be removed.`)) return; await editor.deleteAsset(asset.id); onDone(); }}>Delete Asset</button>}<span className="iag-action-spacer"/><button type="button" onClick={onDone}>Cancel</button><button className="primary" type="submit">{asset ? 'Save Changes' : 'Save Asset'}</button></div>
  </form>;
}

function ManageAssets({ onDone }: { onDone: () => void }) {
  const facility = useFacility();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const selected = facility.assets.find((asset) => asset.id === selectedId);
  if (selected) return <AssetForm asset={selected} point={null} onDone={onDone}/>;
  const needle = query.toLowerCase().trim();
  const rows = facility.assets.filter((asset) => !needle || `${asset.id} ${asset.name} ${asset.type} ${asset.line}`.toLowerCase().includes(needle));
  return <div className="iag-editor-form"><label>Find Asset<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Asset ID, name, type or line"/></label><div className="iag-manage-list">{rows.map((asset) => <button type="button" key={asset.id} onClick={() => setSelectedId(asset.id)}><span><strong>{asset.name}</strong><small>{asset.id} · {asset.type} · {asset.line || 'No line'}</small></span><b>Edit</b></button>)}</div></div>;
}

function RelationshipPanel() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = facility.relationships.find((item) => item.id === editingId);
  const [source, setSource] = useState(facility.assets[0]?.id ?? '');
  const [target, setTarget] = useState(facility.assets[1]?.id ?? facility.assets[0]?.id ?? '');
  const [type, setType] = useState<RelationshipType>('FEEDS');
  const [verificationStatus, setVerificationStatus] = useState<VerificationState>('FIELD_VERIFY');

  useEffect(() => {
    if (!editing) return;
    setSource(editing.source);
    setTarget(editing.target);
    setType(editing.type);
    setVerificationStatus(editing.verificationStatus);
  }, [editingId]);

  const reset = () => { setEditingId(null); setType('FEEDS'); setVerificationStatus('FIELD_VERIFY'); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!source || !target || source === target) return;
    await editor.saveRelationship({ id: editing?.id ?? crypto.randomUUID(), source, target, type, verificationStatus, evidenceIds: editing?.evidenceIds ?? [] });
    reset();
  };
  const name = (id: string) => facility.assets.find((asset) => asset.id === id)?.name ?? id;

  return <div className="iag-editor-form"><form className="iag-relationship-form" onSubmit={save}><label>Source Asset<select value={source} onChange={(event) => setSource(event.target.value)}>{facility.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} — {asset.name}</option>)}</select></label><div className="iag-relationship-arrow">↓</div><label>Relationship<select value={type} onChange={(event) => setType(event.target.value as RelationshipType)}>{relationshipLabels.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><div className="iag-relationship-arrow">↓</div><label>Destination Asset<select value={target} onChange={(event) => setTarget(event.target.value)}>{facility.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} — {asset.name}</option>)}</select></label><label>Verification<select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value as VerificationState)}><option value="VERIFIED">Evidence Verified</option><option value="FIELD_VERIFY">Needs Field Verification</option><option value="INFERRED">Inferred</option><option value="DISPUTED">Disputed</option></select></label><div className="iag-form-actions">{editing && <button type="button" onClick={reset}>Cancel Edit</button>}<button className="primary" type="submit">{editing ? 'Save Connection' : 'Create Connection'}</button></div></form><section><div className="iag-section-head"><strong>Existing Connections</strong><span>{facility.relationships.length}</span></div><div className="iag-relationship-list">{facility.relationships.map((row) => <article key={row.id}><button className="iag-relationship-main" type="button" onClick={() => setEditingId(row.id)}><strong>{name(row.source)}</strong><span>{relationshipLabels.find((item) => item.value === row.type)?.label ?? row.type}</span><strong>{name(row.target)}</strong><small>{row.verificationStatus.replace('_', ' ')}</small></button><button className="iag-row-delete" type="button" aria-label={`Delete relationship ${row.id}`} onClick={async () => { if (!confirm('Delete this connection?')) return; await editor.deleteRelationship(row.id); if (editingId === row.id) reset(); }}>×</button></article>)}</div></section></div>;
}

function EvidencePanel() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [assetId, setAssetId] = useState(facility.assets[0]?.id ?? '');
  const [rows, setRows] = useState<AttachmentRecord[]>([]);
  const [verifiedUpload, setVerifiedUpload] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string; mimeType: string } | null>(null);
  const refresh = () => editor.attachments(assetId).then(setRows);
  useEffect(() => { if (assetId) void refresh(); }, [assetId]);
  useEffect(() => () => { if (viewer) URL.revokeObjectURL(viewer.url); }, [viewer]);

  const open = async (id: string) => {
    const record = await getAttachment(id);
    if (!record) return;
    if (viewer) URL.revokeObjectURL(viewer.url);
    setViewer({ url: URL.createObjectURL(record.blob), name: record.name, mimeType: record.mimeType });
  };

  return <div className="iag-editor-form"><label>Asset<select value={assetId} onChange={(event) => setAssetId(event.target.value)}>{facility.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} — {asset.name}</option>)}</select></label><label className="iag-inline-check"><input type="checkbox" checked={verifiedUpload} onChange={(event) => setVerifiedUpload(event.target.checked)}/> Evidence verified in field</label><label className="iag-file-drop">Add photo, PDF, schematic or datasheet<input type="file" multiple accept="image/*,.pdf,.svg,.dxf,.dwg" onChange={async (event) => { const input = event.currentTarget; const files = [...(input.files ?? [])]; for (const file of files) await editor.addAttachment(assetId, file, verifiedUpload ? 'VERIFIED' : 'FIELD_VERIFY'); await refresh(); input.value = ''; }} /></label><div className="iag-evidence-list">{rows.length ? rows.map((row) => <div className="iag-evidence-row" key={row.id}><button className="iag-evidence-open" type="button" onClick={() => void open(row.id)}><strong>{row.name}</strong><span>{row.category} · {(row.size / 1024).toFixed(0)} KB · {row.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'FIELD VERIFY'}</span></button><button className="iag-row-delete" type="button" onClick={async () => { if (!confirm(`Remove ${row.name}?`)) return; await editor.deleteAttachment(row.id); await refresh(); }}>×</button></div>) : <p>No local evidence attached yet.</p>}</div>{viewer && <div className="iag-file-viewer"><header><strong>{viewer.name}</strong><button type="button" onClick={() => { URL.revokeObjectURL(viewer.url); setViewer(null); }}>Close</button></header>{viewer.mimeType === 'application/pdf' ? <iframe src={viewer.url} title={viewer.name}/> : <img src={viewer.url} alt={viewer.name}/>}</div>}</div>;
}

function ObservationPanel() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [assetId, setAssetId] = useState(facility.assets[0]?.id ?? '');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'VERIFIED' | 'FIELD_VERIFY' | 'INFERRED' | 'DISPUTED'>('FIELD_VERIFY');
  const [rows, setRows] = useState<Awaited<ReturnType<typeof editor.observations>>>([]);
  const refresh = () => editor.observations(assetId).then(setRows);
  useEffect(() => { if (assetId) void refresh(); }, [assetId]);
  return <div className="iag-editor-form"><label>Asset<select value={assetId} onChange={(event) => setAssetId(event.target.value)}>{facility.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} — {asset.name}</option>)}</select></label><label>Field Observation<textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Breaker appears to feed VFD-04; panel schedule does not match field label."/></label><label>Evidence State<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="VERIFIED">Evidence Verified</option><option value="FIELD_VERIFY">Needs Field Verification</option><option value="INFERRED">Inferred</option><option value="DISPUTED">Disputed</option></select></label><button className="primary" type="button" disabled={!text.trim() || !editor.currentUser} onClick={async () => { if (!editor.currentUser) return; await editor.addObservation({ assetId, text: text.trim(), verificationStatus: status, createdBy: editor.currentUser.name }); setText(''); await refresh(); }}>Log Observation</button>{!editor.currentUser && <p className="iag-db-note">Identify yourself in Users before logging an observation.</p>}<div className="iag-observation-list">{rows.map((row) => <article key={row.id}><strong>{row.verificationStatus.replace('_', ' ')}</strong><p>{row.text}</p><small>{new Date(row.createdAt).toLocaleString()} · {row.createdBy}</small></article>)}</div></div>;
}

function AreaEditor({ area, onClear }: { area?: FacilityArea; onClear: () => void }) {
  const editor = useFacilityEditor();
  const [message, setMessage] = useState('');
  const [id, setId] = useState(area?.id ?? '');
  const [name, setName] = useState(area?.name ?? '');
  const [shortName, setShortName] = useState(area?.shortName ?? '');
  const [status, setStatus] = useState<DocumentationState>(area?.status ?? 'NOT_STARTED');
  const [x, setX] = useState(area?.overlay.x ?? 0);
  const [y, setY] = useState(area?.overlay.y ?? 0);
  const [width, setWidth] = useState(area?.overlay.width ?? 10);
  const [height, setHeight] = useState(area?.overlay.height ?? 10);
  return <form className="iag-setup-card" onSubmit={async (event) => { event.preventDefault(); await editor.saveArea({ id: id.trim(), name: name.trim(), shortName: shortName.trim() || name.trim(), status, overlay: { x, y, width, height }, assetIds: area?.assetIds ?? [] }); onClear(); }}><div className="iag-form-grid"><label>Area ID<input required disabled={Boolean(area)} value={id} onChange={(event) => setId(event.target.value)}/></label><label>Name<input required value={name} onChange={(event) => setName(event.target.value)}/></label><label>Short Name<input value={shortName} onChange={(event) => setShortName(event.target.value)}/></label><label>Documentation Status<select value={status} onChange={(event) => setStatus(event.target.value as DocumentationState)}>{documentationStates.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label>Map X %<input type="number" min="0" max="100" step="0.1" value={x} onChange={(event) => setX(Number(event.target.value))}/></label><label>Map Y %<input type="number" min="0" max="100" step="0.1" value={y} onChange={(event) => setY(Number(event.target.value))}/></label><label>Width %<input type="number" min="0" max="100" step="0.1" value={width} onChange={(event) => setWidth(Number(event.target.value))}/></label><label>Height %<input type="number" min="0" max="100" step="0.1" value={height} onChange={(event) => setHeight(Number(event.target.value))}/></label></div>{message && <p className="iag-error">{message}</p>}<div className="iag-form-actions">{area && <button className="danger" type="button" onClick={async () => { if (!confirm(`Delete area ${area.name}?`)) return; try { await editor.deleteArea(area.id); onClear(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Area could not be deleted'); } }}>Delete Area</button>}<span className="iag-action-spacer"/><button type="button" onClick={onClear}>Cancel</button><button className="primary" type="submit">Save Area</button></div></form>;
}

function MapRecordEditor({ marker, onClear }: { marker?: FacilityMapMarker; onClear: () => void }) {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [id, setId] = useState(marker?.id ?? '');
  const [label, setLabel] = useState(marker?.label ?? '');
  const [x, setX] = useState(marker?.x ?? 50);
  const [y, setY] = useState(marker?.y ?? 50);
  const [tone, setTone] = useState<FacilityMapMarker['tone']>(marker?.tone ?? 'power');
  const [state, setState] = useState<FacilityMapMarker['state']>(marker?.state ?? 'REFERENCE');
  const [assetId, setAssetId] = useState(marker?.assetId ?? '');
  return <form className="iag-setup-card" onSubmit={async (event) => { event.preventDefault(); await editor.saveMarker({ id: id.trim() || `MAP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, label: label.trim() || id.trim(), x, y, tone, state, assetId: assetId || undefined }); onClear(); }}><div className="iag-form-grid"><label>Map Record ID<input disabled={Boolean(marker)} value={id} onChange={(event) => setId(event.target.value)} placeholder="Auto-generated if blank"/></label><label>Label<input required value={label} onChange={(event) => setLabel(event.target.value)}/></label><label>X %<input type="number" min="0" max="100" step="0.1" value={x} onChange={(event) => setX(Number(event.target.value))}/></label><label>Y %<input type="number" min="0" max="100" step="0.1" value={y} onChange={(event) => setY(Number(event.target.value))}/></label><label>Tone<select value={tone} onChange={(event) => setTone(event.target.value as FacilityMapMarker['tone'])}><option value="cabinet">Cabinet</option><option value="machine">Machine</option><option value="power">Power / Other</option></select></label><label>State<select value={state} onChange={(event) => setState(event.target.value as FacilityMapMarker['state'])}><option value="LIVE">Live</option><option value="FIELD_VERIFY">Field Verify</option><option value="REFERENCE">Reference Only</option></select></label><label>Linked Asset<select value={assetId} onChange={(event) => setAssetId(event.target.value)}><option value="">No linked asset</option>{facility.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} — {asset.name}</option>)}</select></label></div><div className="iag-form-actions">{marker && <button className="danger" type="button" onClick={async () => { if (!confirm(`Delete map record ${marker.label}?`)) return; await editor.deleteMarker(marker.id); onClear(); }}>Delete Record</button>}<span className="iag-action-spacer"/><button type="button" onClick={onClear}>Cancel</button><button className="primary" type="submit">Save Map Record</button></div></form>;
}

function PlantSetupPanel() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [tab, setTab] = useState<'facility' | 'areas' | 'map'>('facility');
  const [facilityName, setFacilityName] = useState(facility.facility.name);
  const [location, setLocation] = useState(facility.facility.location);
  const [facilityStatus, setFacilityStatus] = useState(facility.facility.status);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [newArea, setNewArea] = useState(false);
  const [markerId, setMarkerId] = useState<string | null>(null);
  const [newMarker, setNewMarker] = useState(false);
  const markers = (facility.mapConfig?.markers ?? []) as FacilityMapMarker[];
  const selectedArea = facility.areas.find((item) => item.id === areaId);
  const selectedMarker = markers.find((item) => item.id === markerId);
  return <div className="iag-editor-form"><div className="iag-setup-tabs"><button className={tab === 'facility' ? 'active' : ''} type="button" onClick={() => setTab('facility')}>Facility</button><button className={tab === 'areas' ? 'active' : ''} type="button" onClick={() => setTab('areas')}>Areas</button><button className={tab === 'map' ? 'active' : ''} type="button" onClick={() => setTab('map')}>Map Records</button></div>{tab === 'facility' && <form className="iag-setup-card" onSubmit={async (event) => { event.preventDefault(); await editor.saveFacility({ ...facility.facility, name: facilityName.trim(), location: location.trim(), status: facilityStatus.trim() }); }}><label>Facility ID<input disabled value={facility.facility.id}/></label><label>Facility Name<input required value={facilityName} onChange={(event) => setFacilityName(event.target.value)}/></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)}/></label><label>Status<input value={facilityStatus} onChange={(event) => setFacilityStatus(event.target.value)}/></label><button className="primary" type="submit">Save Facility</button></form>}{tab === 'areas' && <>{newArea || selectedArea ? <AreaEditor key={selectedArea?.id ?? 'new-area'} area={selectedArea} onClear={() => { setAreaId(null); setNewArea(false); }}/> : <><button className="primary" type="button" onClick={() => setNewArea(true)}>+ Add Area</button><div className="iag-manage-list">{facility.areas.map((area) => <button key={area.id} type="button" onClick={() => setAreaId(area.id)}><span><strong>{area.name}</strong><small>{area.id} · {area.status.replaceAll('_', ' ')}</small></span><b>Edit</b></button>)}</div></>}</>}{tab === 'map' && <>{newMarker || selectedMarker ? <MapRecordEditor key={selectedMarker?.id ?? 'new-marker'} marker={selectedMarker} onClear={() => { setMarkerId(null); setNewMarker(false); }}/> : <><button className="primary" type="button" onClick={() => setNewMarker(true)}>+ Add Map Record</button><div className="iag-manage-list">{markers.map((marker) => <button key={marker.id} type="button" onClick={() => setMarkerId(marker.id)}><span><strong>{marker.label}</strong><small>{marker.id} · {marker.state} · {marker.x.toFixed(1)}, {marker.y.toFixed(1)}</small></span><b>Edit</b></button>)}</div></>}</>}</div>;
}

function DatabasePanel({ onDone }: { onDone: () => void }) {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [message, setMessage] = useState('');
  const stats = useMemo(() => ({ assets: facility.assets.length, relationships: facility.relationships.length, documents: facility.documents.length }), [facility]);
  return <div className="iag-editor-form"><div className="iag-db-stats"><span><b>{stats.assets}</b> Assets</span><span><b>{stats.relationships}</b> Connections</span><span><b>{stats.documents}</b> Documents</span></div><button className="primary" type="button" onClick={async () => downloadFile(await editor.exportArchive(), `${safePlantFileName(facility.facility.name)}.iag`)}>Export Plant Database (.iag)</button><div className="iag-import-mode"><label><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')}/> Replace existing database</label><label><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')}/> Merge with current database</label></div><input ref={input} hidden type="file" accept=".iag,.json,.iag.json,application/json,application/zip" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { if (file.name.toLowerCase().endsWith('.iag')) await editor.importArchive(file, mode); else await editor.importBackup(JSON.parse(await file.text()) as PlantBackup, mode); onDone(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed'); } }}/><button type="button" onClick={() => input.current?.click()}>Import Plant Database</button>{message && <p className="iag-error">{message}</p>}<button className="danger" type="button" onClick={async () => { if (!confirm('Restore the bundled facility baseline and remove all local edits, attachments, and observations?')) return; await editor.resetToBaseline(); onDone(); }}>Restore Baseline</button><p className="iag-db-note">The .iag file is a portable ZIP-based plant package containing the graph, map configuration, observations, metadata, PDFs, photos and drawings. Legacy .iag.json backups remain importable.</p></div>;
}

function UsersPanel() {
  const editor = useFacilityEditor();
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [message, setMessage] = useState('');
  const isAdmin = editor.currentUser?.role === 'admin';
  const identify = () => {
    if (!name.trim()) { setMessage('Enter your name before proposing a change.'); return; }
    editor.identifyTechnician(name);
    setMessage('You are identified. Changes will be submitted for administrator approval.');
  };
  const admin = async () => {
    if (passphrase.length < 12) { setMessage('Use an administrator passphrase of at least 12 characters.'); return; }
    if (!editor.adminCredentialConfigured) { await editor.configureAdmin(passphrase); setMessage('Administrator credential created for this browser.'); }
    else if (await editor.signInAdmin(passphrase)) setMessage('Administrator signed in.');
    else setMessage('Administrator passphrase was not accepted.');
    setPassphrase('');
  };
  return <div className="iag-editor-form iag-users-panel">
    <section className="iag-user-card"><strong>{editor.currentUser ? editor.currentUser.name : 'No user identified'}</strong><span>{editor.currentUser ? editor.currentUser.role === 'admin' ? 'Administrator' : 'Technician — proposed changes require approval' : 'Identify yourself before editing plant or map records.'}</span>{editor.currentUser && <button type="button" onClick={() => editor.signOut()}>Sign out</button>}</section>
    {!editor.currentUser && <><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Technician name" autoComplete="name"/></label><button className="primary" type="button" onClick={identify}>Identify as technician</button></>}
    {!isAdmin && <section className="iag-admin-login"><strong>{editor.adminCredentialConfigured ? 'Administrator sign-in' : 'Create administrator credential'}</strong><p>{editor.adminCredentialConfigured ? 'Enter the local administrator passphrase to review pending changes.' : 'This is a first-run, browser-local setup. Choose a strong passphrase; it is not shared with GitHub Pages or other devices.'}</p><label>Administrator passphrase<input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password"/></label><button type="button" onClick={() => void admin()}>{editor.adminCredentialConfigured ? 'Sign in as administrator' : 'Create administrator credential'}</button></section>}
    {message && <p className="iag-db-note" role="status">{message}</p>}
    {isAdmin && <section className="iag-pending-changes"><div className="iag-section-head"><strong>Pending change requests</strong><span>{editor.pendingChanges.length}</span></div>{editor.pendingChanges.length === 0 ? <p>No changes are awaiting approval.</p> : editor.pendingChanges.map((change) => <article key={change.id}><strong>{change.reason}</strong><small>{change.entityId} · proposed by {change.proposedBy} · {new Date(change.proposedAt).toLocaleString()}</small><div><button className="primary" type="button" onClick={() => void editor.approveChange(change.id)}>Approve & apply</button><button className="danger" type="button" onClick={() => editor.rejectChange(change.id)}>Reject</button></div></article>)}</section>}
    <section className="iag-pending-changes"><div className="iag-section-head"><strong>Local activity log</strong><span>{editor.auditLog.length}</span></div>{editor.auditLog.length === 0 ? <p>No local activity has been recorded yet.</p> : editor.auditLog.slice(0, 12).map((event) => <article key={event.id}><strong>{event.action}</strong><small>{event.actor} · {new Date(event.at).toLocaleString()} · {event.detail}</small></article>)}</section>
    <p className="iag-db-note">This change queue and administrator credential are local to this browser. Export the plant database for a portable record; a shared, tamper-resistant audit log requires a backend.</p>
  </div>;
}

export default function PlantManager() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const [panel, setPanel] = useState<Panel>(null);
  const [mapPoint, setMapPoint] = useState<MapPoint>(null);
  const [mapEdit, setMapEdit] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (!detail) return;
      setMapPoint(detail);
      setPanel('asset');
    };
    addEventListener('iag-map-add-asset', handler);
    return () => removeEventListener('iag-map-add-asset', handler);
  }, []);

  useEffect(() => { window.dispatchEvent(new CustomEvent('iag-map-edit-mode', { detail: mapEdit })); }, [mapEdit]);

  useEffect(() => {
    const handler = () => setPanel('users');
    addEventListener('iag-open-users', handler);
    return () => removeEventListener('iag-open-users', handler);
  }, []);

  const title = panel === 'asset' ? 'Add Asset' : panel === 'manage' ? 'Manage Assets' : panel === 'relationship' ? 'Connections' : panel === 'evidence' ? 'Media & Evidence' : panel === 'observation' ? 'Field Observation' : panel === 'setup' ? 'Plant Setup' : panel === 'database' ? 'Plant Database' : panel === 'users' ? 'Users & Change Approval' : '';
  const close = () => { setPanel(null); setMapPoint(null); };

  return <>
    <div className="iag-manager-bar" aria-label="Plant editing tools"><span className={`iag-storage-status ${editor.ready ? 'ready' : ''}`}><i />{editor.ready ? editor.currentUser ? `${editor.currentUser.name.toUpperCase()} · ${editor.currentUser.role === 'admin' ? 'ADMIN' : `${editor.pendingChanges.length} PENDING`}` : 'IDENTIFY TO EDIT' : 'OPENING DATABASE…'}</span><button type="button" onClick={() => setPanel('users')}>Users</button><button type="button" onClick={() => { setMapPoint(null); setPanel('asset'); }}>+ Asset</button><button type="button" onClick={() => setPanel('manage')}>Manage</button><button type="button" onClick={() => setPanel('relationship')}>Connect</button><button type="button" onClick={() => setPanel('observation')}>Add Note</button><button type="button" onClick={() => setPanel('evidence')}>Add Photo / PDF</button><button className={mapEdit ? 'active' : ''} type="button" aria-pressed={mapEdit} onClick={() => setMapEdit((value) => !value)}>Map Edit</button><button type="button" onClick={() => setPanel('setup')}>Plant Setup</button><button type="button" onClick={() => setPanel('database')}>Plant Database</button></div>
    {mapEdit && <div className="iag-map-edit-banner">MAP EDIT MODE · Click the facility drawing to place a new asset <button type="button" onClick={() => setMapEdit(false)}>Done</button></div>}
    {panel && <div className="iag-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><aside className="iag-editor-panel" aria-label={title}><header><div><small>{facility.facility.name}</small><h2>{title}</h2></div><button type="button" aria-label="Close" onClick={close}>×</button></header>{panel === 'asset' && <AssetForm point={mapPoint} onDone={close}/>} {panel === 'manage' && <ManageAssets onDone={close}/>} {panel === 'relationship' && <RelationshipPanel/>} {panel === 'evidence' && <EvidencePanel/>} {panel === 'observation' && <ObservationPanel/>} {panel === 'setup' && <PlantSetupPanel/>} {panel === 'database' && <DatabasePanel onDone={close}/>} {panel === 'users' && <UsersPanel/>}</aside></div>}
  </>;
}
