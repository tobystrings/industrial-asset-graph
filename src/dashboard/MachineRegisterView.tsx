import { useEffect, useState } from 'react';
import type { ObservationRecord } from '../facility/runtimeDb';
import type { DocumentRecord } from '../types/facility';
import { useFacility, useFacilityEditor } from '../facility';
import './machine-registers.css';

export default function MachineRegisterView({ document, onDocument }: { document: DocumentRecord; onDocument: (id: string) => void }) {
  const facility = useFacility(); const editor = useFacilityEditor();
  const [query, setQuery] = useState(''); const [state, setState] = useState('ALL');
  const [limit, setLimit] = useState(25); const [note, setNote] = useState(''); const [selected, setSelected] = useState(''); const [message, setMessage] = useState('');
  const [reviews, setReviews] = useState<ObservationRecord[]>([]);
  useEffect(() => { let active = true; void editor.observations(document.assetId).then(rows => { if (active) setReviews(rows); }).catch(() => { if (active) setMessage('Unable to load review notes.'); }); return () => { active = false; }; }, [document.assetId, facility.facility.id, editor]);
  const rows = document.register?.entries ?? [];
  const filtered = rows.filter(row => (state === 'ALL' || row.verificationStatus === state) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  return <section className="machine-register" aria-label={`${document.title} register`}>
    <p>Source review is inherited. Historical values and proposals remain separate from field verification.</p>
    <div className="register-controls"><label>Search register<input value={query} onChange={e => { setQuery(e.target.value); setLimit(25); }}/></label><label>Verification<select value={state} onChange={e => setState(e.target.value)}><option value="ALL">All states</option>{['FIELD_VERIFY', 'DISPUTED', 'VERIFIED', 'INFERRED', 'RETIRED'].map(s => <option key={s}>{s}</option>)}</select></label></div>
    <p role="status">{filtered.length} of {rows.length} entries{rows.length === 0 ? ' · Empty source register; no verified-current records supplied.' : ''}</p>
    <div className="register-entries">{filtered.slice(0, limit).map(row => <article key={row.id}>
      <h4>{row.label}</h4><p>{row.verificationStatus} · {String(row.values.state ?? row.values.lifecycle ?? row.values.availability ?? 'Source record')}</p>
      {row.values.sourceUtc != null && <p><time>{String(row.values.sourceUtc)}</time></p>}
      <p>{String(row.values.summary ?? row.values.finding ?? row.values.disposition ?? row.values.note ?? row.values.observation ?? '')}</p>
      {row.values.code != null && <p>{String(row.values.snapshotId ?? 'Snapshot unknown')} · {String(row.values.manufacturerDefinition ?? 'Definition unknown')}</p>}
      {row.values.wireId != null && <p>Wire {String(row.values.wireId)} · {String(row.values.sourceTerminal ?? 'Unknown')} → {String(row.values.destinationEquipment ?? 'Unknown destination')} / {String(row.values.destinationTerminal ?? 'Unknown terminal')}</p>}
      <p>{row.entityIds.map(id => facility.components.find(c => c.id === id)?.label ?? id).join(' · ')}</p>
      {String(row.values.availability ?? '').includes('NOT_RECOVERED') && <p className="register-missing">Missing evidence · {String(row.values.neededEvidence ?? 'Recover original bytes and reapply the private package.')}</p>}
      <details><summary>Values and source provenance</summary><dl>{Object.entries(row.values).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? 'Unknown (null)' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd></div>)}</dl><p>{row.provenance.filename} · dossier {row.provenance.section} · inherited review</p><p>{row.provenance.locator ?? 'Individual source locator unknown'}</p></details>
      <div className="register-sources">{row.evidenceIds.map(id => { const source = facility.documents.find(d => !d.register && d.assetId === document.assetId && d.evidenceIds.includes(id)); return source ? <button key={id} type="button" onClick={() => onDocument(source.id)}>{source.title}</button> : <span key={id}>{id}</span>; })}</div>
      <button type="button" onClick={() => { setSelected(row.id); setNote(''); setMessage(''); }}>Add review note</button>
      {reviews.filter(review => review.text.startsWith(`${row.id}\n`)).map(review => <p key={review.id}>Review note: {review.text.slice(row.id.length + 1)} · {review.createdBy} · {review.createdAt}</p>)}
      {selected === row.id && <form onSubmit={async e => { e.preventDefault(); try { const saved = await editor.addObservation({ assetId: document.assetId, text: `${row.id}\n${note}`, verificationStatus: 'FIELD_VERIFY', createdBy: editor.currentUser?.name ?? 'Local reviewer' }); setReviews(current => [saved, ...current]); setMessage('Review note saved locally. Source values retained.'); setSelected(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save note.'); } }}><label>Review note<textarea required value={note} onChange={e => setNote(e.target.value)}/></label><button type="submit">Save review note</button></form>}
    </article>)}</div>
    {filtered.length > limit && <button type="button" onClick={() => setLimit(limit + 25)}>Show next 25 entries</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
