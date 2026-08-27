import { useEffect, useMemo, useState } from 'react';
import WalkdownForm from '../WalkdownForm';
import { useFacilityEditor } from '../facility';
import { areas, machines } from '../facilityData';
import { useFacility } from '../facility';
import { relationshipSemantics, type RelationshipDomain } from '../lib/relationshipSemantics';
import type { RelationshipType } from '../types/facility';
import { fieldDocumentationProgress, fieldDocumentationTasks, taskCaptureCount, type FieldDocumentationCategory } from '../lib/fieldDocumentation';
import { loadLastWho, loadWalkdownCaptures, saveLastWho } from '../lib/walkdown';
import type { FacilityAsset } from '../types/facility';

const categoryLabel: Record<FieldDocumentationCategory, string> = { identity: 'Identity', electrical: 'Electrical', controls: 'Controls', safety: 'Safety', process: 'Process', condition: 'Condition', evidence: 'Evidence' };

export default function FieldDocumentationWorkspace({ selectedAsset, onAsset, onChanged, onExit }: { selectedAsset: FacilityAsset | null; onAsset: (asset: FacilityAsset) => void; onChanged: () => void; onExit: () => void }) {
  const editor = useFacilityEditor();
  const facility = useFacility();
  const [technician, setTechnician] = useState(editor.currentUser?.name ?? loadLastWho());
  const [captureVersion, setCaptureVersion] = useState(0);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [attachments, setAttachments] = useState(0);
  const [observations, setObservations] = useState(0);
  const [message, setMessage] = useState('');
  const [domain, setDomain] = useState<RelationshipDomain>('power');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('FEEDS');
  const [connectedId, setConnectedId] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const relationshipOptions = Object.values(relationshipSemantics).filter((item) => item.domain === domain && item.type !== 'LOCATED_IN' && item.type !== 'CONTAINS');
  const candidates = facility.assets.filter((asset) => asset.id !== selectedAsset?.id && `${asset.id} ${asset.name}`.toLowerCase().includes(assetSearch.toLowerCase()));
  const saveConnection = async () => {
    if (!selectedAsset || !connectedId) return;
    await editor.saveRelationship({ id: crypto.randomUUID(), source: selectedAsset.id, target: connectedId, type: relationshipType, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] });
    setConnectedId(''); setAssetSearch(''); setMessage('Relationship saved as FIELD_VERIFY. Add another connection.'); onChanged();
  };
  const createAndConnect = async () => {
    if (!selectedAsset || !newAssetName.trim()) return;
    const id = `FIELD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const created: FacilityAsset = { id, name: newAssetName.trim(), description: '', type: 'Field asset', facilityId: selectedAsset.facilityId, areaId: selectedAsset.areaId, line: selectedAsset.line, verificationStatus: 'FIELD_VERIFY', manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, facts: [], componentIds: [], unknowns: [] };
    await editor.saveAsset(created); await editor.saveRelationship({ id: crypto.randomUUID(), source: selectedAsset.id, target: id, type: relationshipType, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] });
    setNewAssetName(''); setMessage(`${created.name} created and connected as FIELD_VERIFY.`); onChanged();
  };
  const tasks = useMemo(() => selectedAsset ? fieldDocumentationTasks(selectedAsset) : [], [selectedAsset]);
  const captures = useMemo(() => loadWalkdownCaptures(), [captureVersion]);
  const progress = fieldDocumentationProgress(tasks, captures);

  useEffect(() => {
    if (!selectedAsset) { setAttachments(0); setObservations(0); return; }
    void Promise.all([editor.attachments(selectedAsset.id), editor.observations(selectedAsset.id)]).then(([files, notes]) => { setAttachments(files.length); setObservations(notes.length); });
  }, [editor, selectedAsset, captureVersion]);

  const identify = () => {
    const name = technician.trim();
    if (!name) { setMessage('Enter technician initials or name before capturing field evidence.'); return false; }
    if (!editor.currentUser || editor.currentUser.name !== name) editor.identifyTechnician(name);
    saveLastWho(name); setMessage(`Recording locally as ${name}.`); return true;
  };

  return <section className="field-doc-workspace panel" data-testid="field-documentation-mode">
    <header className="field-doc-head"><div><small>Industrial Field Documentation Mode</small><h1>{selectedAsset?.name ?? 'Choose an asset'}</h1><code>{selectedAsset?.id ?? 'No asset selected'}</code></div><button type="button" onClick={onExit}>Exit field mode</button></header>
    <div className="field-doc-toolbar">
      <label>Technician<input value={technician} onChange={(event) => setTechnician(event.target.value)} placeholder="Initials or name" /></label><button type="button" onClick={identify}>Identify</button>
      <label>Asset<select value={selectedAsset?.id ?? ''} onChange={(event) => { const asset = machines.find((item) => item.id === event.target.value); if (asset) onAsset(asset); }}><option value="">Select asset…</option>{areas.map((area) => <optgroup key={area.id} label={area.name}>{machines.filter((asset) => asset.areaId === area.id).map((asset) => <option key={asset.id} value={asset.id}>{asset.id} · {asset.name}</option>)}</optgroup>)}</select></label>
    </div>
    {message && <p className="field-doc-message" role="status">{message}</p>}
    {!selectedAsset ? <div className="field-doc-empty"><b>Select the asset physically in front of you.</b><span>Field notes remain local and reviewable; they do not silently become verified plant facts.</span></div> : <>
      <section className="field-doc-progress"><div><b>{progress.percent}%</b><span>{progress.captured} captured · {progress.reviewed} reviewed · {progress.open} open</span></div><progress value={progress.captured} max={progress.total || 1}/><div><span>{attachments} evidence files</span><span>{observations} observations</span><span>{tasks.length} checklist items</span></div></section>
      <div className="field-doc-layout"><section className="field-doc-checklist"><header><h2>Field checklist</h2><span>Generated from documented gaps</span></header>{tasks.map((task) => { const count = taskCaptureCount(task, captures); const open = activeTask === task.id; return <article key={task.id} className={`${count ? 'is-captured' : ''} priority-${task.priority}`}><button type="button" aria-expanded={open} onClick={() => setActiveTask(open ? null : task.id)}><span><small>{categoryLabel[task.category]} · {task.source.replace('-', ' ')}</small><b>{task.title}</b><em>{task.prompt}</em></span><strong>{count ? `${count} captured` : 'Open'}</strong></button>{open && <div className="field-doc-capture"><WalkdownForm targetId={task.id} defaultField="note" compact={false} onSaved={() => { identify(); setCaptureVersion((value) => value + 1); onChanged(); setMessage('Capture saved locally and queued for review.'); }} /></div>}</article>; })}</section>
      <section className="field-doc-relations"><h2>Build the graph</h2><p>Fast connections become useful Troubleshoot / Impact dependencies immediately.</p><div className="field-relation-grid"><label>Domain<select value={domain} onChange={(e) => { const next = e.target.value as RelationshipDomain; setDomain(next); setRelationshipType((Object.values(relationshipSemantics).find((item) => item.domain === next)?.type ?? 'FEEDS') as RelationshipType); }}>{['power','control','safety','instrumentation','mechanical','utility','process','network'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Relationship<select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}>{relationshipOptions.map((item) => <option key={item.type} value={item.type}>{item.type} · {item.label}</option>)}</select></label></div><label>Search connected asset<input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search by ID or name" /></label><select value={connectedId} onChange={(e) => setConnectedId(e.target.value)}><option value="">Choose an existing asset…</option>{candidates.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} · {asset.name}</option>)}</select><button type="button" className="field-primary" onClick={saveConnection}>Save relationship · add another</button><div className="field-inline-create"><b>Missing asset?</b><input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} placeholder="Minimal name, e.g. Filler disconnect" /><button type="button" onClick={createAndConnect}>+ Create & connect</button></div></section>
      <aside className="field-doc-evidence"><h2>Evidence & observations</h2><p>Photos and files remain local in this browser and enter the existing review/change-control workflow.</p><label className="field-file-drop">Add photo / PDF<input type="file" accept="image/*,application/pdf" capture="environment" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !selectedAsset || !identify()) return; try { await editor.addAttachment(selectedAsset.id, file, 'FIELD_VERIFY'); setCaptureVersion((value) => value + 1); setMessage(`${file.name} saved locally as field-verification evidence.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save evidence.'); } event.currentTarget.value = ''; }} /></label>
        <form onSubmit={async (event) => { event.preventDefault(); if (!selectedAsset || !identify()) return; const form = new FormData(event.currentTarget); const text = String(form.get('observation') ?? '').trim(); if (!text) return; await editor.addObservation({ assetId: selectedAsset.id, text, verificationStatus: 'FIELD_VERIFY', createdBy: technician.trim() }); event.currentTarget.reset(); setCaptureVersion((value) => value + 1); setMessage('Observation saved locally for review.'); }}><label>Field observation<textarea name="observation" rows={5} placeholder="What did you observe? Separate observation from interpretation." /></label><button type="submit">Save observation</button></form>
        <div className="field-doc-honesty"><b>Field evidence is not verified truth</b><span>New captures start as FIELD_VERIFY and require review before use as plant facts.</span></div></aside></div>
    </>}
  </section>;
}
