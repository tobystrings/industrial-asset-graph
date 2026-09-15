import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFacility, useFacilityEditor, type AttachmentRecord } from '../facility';
import { appendMovement, compatibilityStates, emptyInventory, findParts, locationLabel, movementTypes, newPart, partCategories, photoRoles, stock, type InventoryPart, type MovementType, type PartsInventory, type StockMovement } from '../facility/inventory';
import SectionPicker from '../navigation/SectionPicker';
import { PageLink } from '../navigation/AppShell';
import './inventory.css';
import { readLabel, labelSuggestions } from './labelReader';
import { exportPlantBackup } from '../facility/runtimeDb';
import { updateWork } from '../repairs/store';
import { editedWork } from '../repairs/model';

const sections = ['Parts', 'Add Part', 'Find for Machine', 'Locations', 'Low Stock', 'Activity', 'Advanced'] as const;
type Section = typeof sections[number];
function Photo({ record }: { record: AttachmentRecord }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(record.blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [record]);
  return <img src={url} alt={record.name} loading="lazy"/>;
}
export default function InventoryWorkspace() {
  const pkg = useFacility(), editor = useFacilityEditor();
  const inventory = pkg.facility.inventory ?? emptyInventory();
  const params = new URLSearchParams(location.search);
  const initialMachine = params.get('asset') ?? '', workId=params.get('work')??'';
  const routeValue=(key:string,value:string,push=false)=>{const next=new URLSearchParams(location.search);if(value)next.set(key,value);else next.delete(key);if(key==='section')next.delete('part');if(next.toString()===new URLSearchParams(location.search).toString())return;history[push?'pushState':'replaceState'](null,'','?'+next);};
  const initialSection=sections.includes(params.get('section') as Section)?params.get('section') as Section:initialMachine?'Find for Machine':'Parts';
  const [section, setSectionValue] = useState<Section>(initialSection);
  const setSection=(value:Section)=>{setSectionValue(value);setSelectedValue('');routeValue('section',value,true);};
  const [machine, setMachineValue] = useState(initialMachine), [query, setQueryValue] = useState(params.get('q')??'');
  const setMachine=(v:string)=>{setMachineValue(v);routeValue('asset',v);};
  const setQuery=(v:string)=>{setQueryValue(v);routeValue('q',v);};
  const [draft, setDraft] = useState<InventoryPart>(() => structuredClone(inventory.parts.find(p=>p.id===params.get('editPart'))??newPart(pkg.facility.id)));
  const [draftBase, setDraftBase] = useState<PartsInventory>(() => structuredClone(inventory));
  const [selected, setSelectedValue] = useState(params.get('part')??''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const setSelected=(v:string)=>{setSelectedValue(v);routeValue('part',v,true);};
  const [files, setFiles] = useState<AttachmentRecord[]>([]), [role, setRole] = useState<typeof photoRoles[number]>('Part');
  const [movement, setMovement] = useState<MovementType>('Receive'), [quantity, setQuantity] = useState('1'), [reason, setReason] = useState('');
  const [linkMachine, setLinkMachine] = useState(initialMachine), [linkStatus, setLinkStatus] = useState<typeof compatibilityStates[number]>('Needs confirmation'), [position, setPosition] = useState(''), [source, setSource] = useState('');
  const [alternate, setAlternate] = useState(''), [alternateReason, setAlternateReason] = useState(''), [approved, setApproved] = useState(false);
  const [request, setRequest] = useState('');
  const lock = useRef(false);
  const pendingMovement = useRef<StockMovement | null>(null);
  useEffect(() => { pendingMovement.current = null; }, [selected, movement]);
  useEffect(() => { let active = true; void editor.attachments().then(rows => { if (active) setFiles(rows); }); return () => { active = false; }; }, [pkg.packageRevision, draft.photos.length]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const save = async (next: PartsInventory, base = inventory) => {
    await editor.saveInventory(next, base);
    setMessage(editor.currentUser?.role === 'admin' ? 'Inventory saved. Sync before relying on availability on another device.' : 'Submitted for administrator review. Stock changes take effect after approval.');
  };
  const savePart = async (part: InventoryPart, base = inventory) => save({ ...base, parts: base.parts.some(p => p.id === part.id) ? base.parts.map(p => p.id === part.id ? part : p) : [...base.parts, part] }, base);
  const activePart = inventory.parts.find(p => p.id === selected);
  const machineOptions = <><option value="">Choose a machine</option>{pkg.assets.map(a => <option value={a.id} key={a.id}>{a.name} ({a.id})</option>)}</>;
  const edit = (part: InventoryPart) => { setDraftBase(structuredClone(inventory)); setDraft(structuredClone(part)); routeValue('editPart',part.id);setSection('Add Part'); setMessage(''); };
  const backup = () => run(async () => {
    const data = await exportPlantBackup(pkg.facility.id, true);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${pkg.facility.id}-inventory-photo-backup.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Backup downloaded with local inventory photos. Keep this file in your chosen secure storage.');
  });
  const add = () => { setDraftBase(structuredClone(inventory)); setDraft(newPart(pkg.facility.id));routeValue('editPart',''); setSection('Add Part'); setMessage(''); };
  const upload = (incoming: FileList | null) => run(async () => {
    if (!incoming?.length) return;
    const photos = [...draft.photos];
    for (const file of Array.from(incoming)) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Use JPEG, PNG, WebP, or GIF photos under 15 MB.');
      const record = await editor.addAttachment(draft.id, file);
      photos.push({ id: record.id, role, access: record.access });
      setFiles(old => [...old, record]);
    }
    setDraft(old => ({ ...old, photos }));
    setMessage('Photos attached. Review the label and identity fields before saving the part.');
  });
  const extract = () => run(async () => {
    const photo = files.find(f => draft.photos.some(p => p.id === f.id && p.role === 'Label')) ?? files.find(f => draft.photos.some(p => p.id === f.id));
    if (!photo) throw new Error('Attach a label photo first.');
    try {
      const text = await readLabel(photo.blob, setMessage);
      setDraft(old => ({ ...old, labelText: text, identityReviewed: false }));
      setMessage(text ? 'Extracted text is unverified. Compare it with the photo and review suggestions below.' : 'No readable text found. Try a clearer label photo or enter the text manually.');
    } catch { setMessage('Label reading is unavailable. Enter the visible text manually or retry when the OCR files are available.'); }
  });
  const scan = (incoming: FileList | null) => run(async () => {
    const detector = (window as unknown as { BarcodeDetector?: new () => { detect(image: ImageBitmap): Promise<Array<{rawValue: string}>> } }).BarcodeDetector;
    if (!detector) { setMessage('Barcode scanning is unavailable here. Type the printed code into search.'); return; }
    if (!incoming?.[0]) return;
    const bitmap = await createImageBitmap(incoming[0]);
    try { const rows = await new detector().detect(bitmap); if (!rows.length) throw new Error('No readable barcode found. Try a clearer photo or type the code.'); setQuery(rows[0].rawValue); setMessage('Barcode read. Check the code and search results.'); } finally { bitmap.close(); }
  });
  const textField = (key: keyof InventoryPart, label: string, required = false) => <label key={key}>{label}<input required={required} value={String(draft[key])} onChange={e => setDraft(old => ({ ...old, [key]: e.target.value }))}/></label>;
  const submitPart = (event: FormEvent) => { event.preventDefault(); void run(async () => { await savePart({ ...draft, updatedAt: new Date().toISOString() }, draftBase); setSection('Parts'); }); };
  const visible = findParts(inventory.parts, query, section === 'Find for Machine' ? machine : '').filter(p => section !== 'Low Stock' || stock(p).available <= p.minStock);
  const confirmedSpare = visible.some(p => stock(p).available > 0 && ['New', 'Used / tested'].includes(p.condition) && p.machines.some(m => m.id === machine && m.status === 'Verified spare'));
  return <main className="inventory-workspace">
    {workId&&<PageLink page="repair" details={{work:workId,asset:initialMachine}} className="slate-card">← Return to this repair</PageLink>}
    <div className="inventory-actions"><button disabled={busy} onClick={add}>Take photo / Add part</button><button disabled={busy} onClick={() => setSection('Find for Machine')}>Find part for a machine</button></div>
    <SectionPicker label="Inventory sections" options={sections.map(label => ({ id: label, label }))} value={section} onChange={value => { if (busy) return; if (value === 'Add Part') add(); else setSection(value as Section); setSelected(''); }}/>
    <p className="inventory-notice">{editor.currentUser?.role === 'admin' ? 'Administrator stock records' : 'Changes require administrator review'} · Balances reflect this device’s synchronized records.</p>
    {message && <p role="status" className="inventory-message">{message}</p>}
    {section === 'Add Part' ? <form onSubmit={submitPart} className="inventory-form">
      <h2>{inventory.parts.some(p => p.id === draft.id) ? 'Edit part' : 'Add a part'}</h2>
      <fieldset disabled={busy}><legend>1. Photograph the part</legend><label>Photo role<select aria-label="Photo role" value={role} onChange={e => setRole(e.target.value as typeof role)}>{photoRoles.map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="inventory-file">Take photo<input aria-label="Take part photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={e => void upload(e.target.files)}/></label>
      <label className="inventory-file">Upload photos<input aria-label="Upload part photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={e => void upload(e.target.files)}/></label>
      <div className="inventory-photos">{draft.photos.map(photo => <figure key={photo.id}>{files.find(f => f.id === photo.id) && <Photo record={files.find(f => f.id === photo.id)!}/>}<figcaption>{photo.role} · {photo.access === 'PUBLIC_APP' ? 'Shared' : 'Local photo'}</figcaption><button type="button" onClick={() => setDraft(old => ({ ...old, photos: old.photos.filter(p => p.id !== photo.id) }))}>Remove from part</button></figure>)}</div>
      <button type="button" onClick={() => void extract()}>Read label text</button>
      <label>Visible label text / unverified extraction<textarea aria-label="Visible label text / unverified extraction" value={draft.labelText} onChange={e => setDraft(old => ({ ...old, labelText: e.target.value, identityReviewed: false }))}/></label>
      <div aria-label="Unverified label suggestions">{Object.entries(labelSuggestions(draft.labelText)).map(([key, value]) => <button type="button" key={key} onClick={() => setDraft(old => ({ ...old, [key]: value, identityReviewed: false }))}>Use {key}: {String(value)}</button>)}</div>
      <p>Compare suggestions with the photo. Enter confirmed identity below. Compatibility is verified separately with a source.</p></fieldset>
      <fieldset disabled={busy}><legend>2. Review identity</legend><div className="inventory-grid">
      {textField('name', 'Name / description', true)}{textField('description', 'Detailed description')}{textField('manufacturer', 'Manufacturer')}{textField('partNumber', 'Manufacturer part number')}{textField('model', 'Model')}{textField('serialLot', 'Serial / lot')}
      <label>Category<select aria-label="Category" value={draft.category} onChange={e => setDraft(old => ({ ...old, category: e.target.value }))}>{partCategories.map(c => <option key={c}>{c}</option>)}</select></label>{textField('subcategory', 'Subcategory')}{textField('specifications', 'Ratings / specifications')}{textField('tags', 'Tags')}
      </div><label className="inventory-check"><input type="checkbox" checked={draft.identityReviewed} onChange={e => setDraft(old => ({ ...old, identityReviewed: e.target.checked }))}/>I compared the identity fields with the source</label></fieldset>
      <fieldset disabled={busy}><legend>3. Storage and purchasing</legend><div className="inventory-grid">
      {Object.keys(draft.location).map(key => <label key={key}>{key[0].toUpperCase() + key.slice(1)}<input value={draft.location[key as keyof typeof draft.location]} onChange={e => setDraft(old => ({ ...old, location: { ...old.location, [key]: e.target.value } }))}/></label>)}
      {textField('unit', 'Unit', true)}<label>Minimum stock<input type="number" min="0" step="any" required value={draft.minStock} onChange={e => setDraft(old => ({ ...old, minStock: e.target.valueAsNumber }))}/></label><label>Reorder quantity<input type="number" min="0" step="any" required value={draft.reorderQuantity} onChange={e => setDraft(old => ({ ...old, reorderQuantity: e.target.valueAsNumber }))}/></label>
      {textField('supplier', 'Supplier')}{textField('supplierSku', 'Supplier SKU')}{textField('supplierUrl', 'Supplier URL')}{textField('cost', 'Cost / currency')}{textField('leadTime', 'Lead time')}
      <label>Condition<select aria-label="Condition" value={draft.condition} onChange={e => setDraft(old => ({ ...old, condition: e.target.value as InventoryPart['condition'] }))}>{['New', 'Used / tested', 'Repairable', 'Reserved', 'Obsolete', 'Disposed'].map(c => <option key={c}>{c}</option>)}</select></label>
      </div><label>Notes<textarea aria-label="Notes" value={draft.notes} onChange={e => setDraft(old => ({ ...old, notes: e.target.value }))}/></label><label>Manuals, datasheets, document IDs and troubleshooting references<textarea aria-label="Manuals, datasheets, document IDs and troubleshooting references" value={draft.references} onChange={e => setDraft(old => ({ ...old, references: e.target.value }))}/></label></fieldset>
      <p>New parts start at zero. Use Receive after saving to record opening stock with a person and reason.</p><button disabled={busy} type="submit">{editor.currentUser?.role === 'admin' ? 'Save part' : 'Submit part for review'}</button>
    </form> : <>
      {!activePart && ['Parts', 'Find for Machine', 'Low Stock'].includes(section) && <>
        {section === 'Find for Machine' && <label>Machine<select aria-label="Machine" value={machine} onChange={e => setMachine(e.target.value)}>{machineOptions}</select></label>}
        <label>Search parts, label text, specifications or location<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Part number, failed component type, or location"/></label>
        <label className="inventory-file">Scan barcode / QR photo<input type="file" accept="image/*" capture="environment" onChange={e => void scan(e.target.files)}/></label>
        {section === 'Find for Machine' && <p>Verified spares appear first, followed by approved alternates and items needing confirmation. Check ratings, condition, and available quantity before use.</p>}
        {section === 'Find for Machine' && machine && !confirmedSpare && <p className="inventory-message">No available verified spare matches this search. Confirm the failed part number, ratings and machine position. Review alternates with their documented differences, or create a missing-spare / reorder request below.</p>}
        {!visible.length && <p>No parts match. Add a part or flag the missing spare below.</p>}
        <div className="inventory-cards">{visible.map(part => { const count = stock(part), compatibility = part.machines.find(m => m.id === machine); const photo = files.find(f => part.photos.some(p => p.id === f.id)); return <article key={part.id} className="inventory-card">
          {photo && <Photo record={photo}/>}<h2>{part.name}</h2><p>{part.manufacturer} {part.partNumber || 'Part number not recorded'}</p><strong>{count.available} {part.unit} available · {count.onHand} on hand</strong><p>{locationLabel(part)}</p>
          <p>{count.available === 0 ? 'Out of stock' : count.available <= part.minStock ? 'Low stock' : 'Stock available'} · {count.reserved} reserved · {part.condition} · {part.identityReviewed ? 'Identity reviewed' : 'Unverified identity'}</p>
          {section === 'Find for Machine' && <p>{compatibility?.status ?? (inventory.parts.some(p => p.machines.some(m => m.id === machine && m.status.startsWith('Verified')) && p.alternates.some(a => a.id === part.id && a.approved)) ? 'Approved alternate — check application' : 'Compatibility needs confirmation')}</p>}
          <button onClick={() => { setSelected(part.id); setMovement('Receive'); }}>Open part / stock actions</button><button onClick={() => edit(part)}>Edit record</button><button onClick={() => { setSelected(part.id); setMovement('Issue / install'); setLinkMachine(machine); }}>Issue to machine</button><button onClick={() => { setSelected(part.id); setMovement('Verify count'); setQuantity(String(count.onHand)); }}>Verify count</button>
        </article>; })}</div>
        <form onSubmit={e => { e.preventDefault(); void run(async () => { await save({ ...inventory, requests: [...inventory.requests, { id: crypto.randomUUID(), machineId: machine, description: request, actor: editor.currentUser?.name ?? '', at: new Date().toISOString(), status: 'Open' }] }); setRequest(''); }); }}><h2>Missing spare or purchasing request</h2><p>Record the failed component, required ratings, machine, and information still needed.</p><label>Request / review details<textarea aria-label="Request / review details" required value={request} onChange={e => setRequest(e.target.value)}/></label><button disabled={busy}>Flag for review / reorder</button></form>
      </>}
      {section === 'Locations' && <section><h2>Storage locations</h2>{[...new Set(inventory.parts.filter(p => !p.archived).map(locationLabel))].sort().map(label => <button key={label} onClick={() => { setQuery(label === 'Location not recorded' ? '' : label.replaceAll(' / ', ' ')); setSection('Parts'); }}>{label} · {inventory.parts.filter(p => locationLabel(p) === label).length} parts</button>)}<p>Edit a part’s storage fields to record its building, cabinet, rack, shelf and bin. Attach a Location photo to the part.</p></section>}
      {section === 'Activity' && <section><h2>Stock activity</h2>{inventory.parts.flatMap(p => p.ledger.map(event => ({ ...event, part: p }))).sort((a,b) => b.at.localeCompare(a.at)).map(event => <article className="inventory-card" key={event.id}><strong>{event.part.name} · {event.type} · {event.quantity} {event.part.unit}</strong><p>{event.actor} · {new Date(event.at).toLocaleString()} · {event.machineId || 'No machine'}</p><p>{event.reason}</p></article>)}<h2>Review / reorder requests</h2>{inventory.requests.map(r => <article className="inventory-card" key={r.id}><strong>{r.status} · {r.description}</strong><p>{r.machineId} · {r.actor} · {new Date(r.at).toLocaleString()}</p>{r.status === 'Open' && <button disabled={busy} onClick={() => void run(() => save({ ...inventory, requests: inventory.requests.map(row => row.id === r.id ? { ...row, status: 'Resolved' } : row) }))}>Mark resolved</button>}</article>)}</section>}
      {section === 'Advanced' && <section><h2>Inventory administration</h2><p>Administrator approval applies to technician changes. Archive records instead of deleting movement history. Facility backups include inventory records; portable exports omit local-only photo files.</p><button disabled={busy} onClick={() => void backup()}>Download backup with inventory photos</button><PageLink page="review">Review proposed changes</PageLink><PageLink page="database">Facility backups and imports</PageLink><h3>Archived parts</h3>{inventory.parts.filter(p => p.archived).map(p => <button disabled={busy || editor.currentUser?.role !== 'admin'} key={p.id} onClick={() => void run(() => savePart({ ...p, archived: false }))}>Restore {p.name}</button>)}</section>}
      {activePart && <section className="inventory-detail" aria-label="Selected part"><h2>{activePart.name}</h2><p><strong>{stock(activePart).available} {activePart.unit} available · {stock(activePart).onHand} on hand</strong></p><button onClick={() => setSelected('')}>Close part details</button><p>{activePart.description}</p><p>{activePart.specifications || 'Specifications not recorded'}</p><p>{activePart.references}</p><p>Added {new Date(activePart.addedAt).toLocaleDateString()} · Last count {stock(activePart).lastVerified ? new Date(stock(activePart).lastVerified).toLocaleString() : 'Not verified'}</p>
        <form onSubmit={e => { e.preventDefault(); void run(async () => { const at = new Date().toISOString(); const event = pendingMovement.current ?? { id: crypto.randomUUID(), sequence: activePart.ledger.length + 1, type: movement, quantity: Number(quantity), actor: editor.currentUser?.name ?? '', at, reason, machineId: linkMachine || undefined }; const updated = appendMovement(activePart, event); pendingMovement.current = event; await savePart(updated);
          if(workId&&event.type==='Issue / install')await updateWork(pkg.facility.id,workId,old=>{if(!old)throw new Error('The stock action was saved, but this repair is unavailable. Reopen My work to record the part.');const entryId='stock-'+event.id;if(old.entries.some(e=>e.id===entryId))return old;return editedWork(old,{entries:[...old.entries,{id:entryId,at:event.at,kind:'parts',text:activePart.name+' · '+event.quantity+' '+activePart.unit+' · '+event.reason+(editor.currentUser?.role==='admin'?' · Stock movement recorded.':' · Stock change submitted for administrator review.')}]});});
          pendingMovement.current = null; setReason(''); }); }}>
          <h3>Stock action / Verify count</h3><label>Action<select aria-label="Action" value={movement} onChange={e => { pendingMovement.current = null; setMovement(e.target.value as MovementType); }}>{movementTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>{['Adjust','Verify count'].includes(movement) ? 'Actual total count' : 'Quantity'}<input required type="number" min="0" step="any" value={quantity} onChange={e => { pendingMovement.current = null; setQuantity(e.target.value); }}/></label><label>Machine for movement<select aria-label="Machine for movement" required={['Issue / install','Reserve'].includes(movement)} value={linkMachine} onChange={e => { pendingMovement.current = null; setLinkMachine(e.target.value); }}>{machineOptions}</select></label><label>Work note / reason<textarea aria-label="Work note / reason" required value={reason} onChange={e => { pendingMovement.current = null; setReason(e.target.value); }}/></label><button disabled={busy}>Record stock movement</button>
        </form>
        <h3>Compatible machines</h3>{activePart.machines.map(m => <article key={m.id}><PageLink page="asset" details={{ asset: m.id }}>{pkg.assets.find(a => a.id === m.id)?.name ?? m.id}</PageLink><p>{m.status} · {m.position} · {m.source}</p></article>)}
        <form onSubmit={e => { e.preventDefault(); void run(() => savePart({ ...activePart, machines: [...activePart.machines.filter(m => m.id !== linkMachine), { id: linkMachine, status: linkStatus, position, source }] })); }}><h3>Link machine / update compatibility</h3><label>Machine to link<select aria-label="Machine to link" required value={linkMachine} onChange={e => { pendingMovement.current = null; setLinkMachine(e.target.value); }}>{machineOptions}</select></label><label>Compatibility status<select aria-label="Compatibility status" value={linkStatus} onChange={e => setLinkStatus(e.target.value as typeof linkStatus)}>{compatibilityStates.map(s => <option key={s}>{s}</option>)}</select></label><label>Position / use<input value={position} onChange={e => setPosition(e.target.value)}/></label><label>Source / verification reason<input required={linkStatus.startsWith('Verified')} value={source} onChange={e => setSource(e.target.value)}/></label><button disabled={busy}>Save machine compatibility</button></form>
        <h3>Alternates / cross references</h3>{activePart.alternates.map(a => <p key={a.id}>{inventory.parts.find(p => p.id === a.id)?.name} · {a.approved ? 'Approved alternate' : 'Unconfirmed substitute'} · {a.reason}</p>)}
        <form onSubmit={e => { e.preventDefault(); void run(() => savePart({ ...activePart, alternates: [...activePart.alternates.filter(a => a.id !== alternate), { id: alternate, approved, reason: alternateReason }] })); }}><label>Alternate part<select aria-label="Alternate part" required value={alternate} onChange={e => setAlternate(e.target.value)}><option value="">Choose another part</option>{inventory.parts.filter(p => p.id !== activePart.id).map(p => <option key={p.id} value={p.id}>{p.name} {p.partNumber}</option>)}</select></label><label>Application / source / differences<input required value={alternateReason} onChange={e => setAlternateReason(e.target.value)}/></label><label className="inventory-check"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)}/>Approved substitute for the documented application</label><button disabled={busy}>Save alternate</button></form>
        <h3>Movement history</h3>{activePart.ledger.map(e => <p key={e.id}>{new Date(e.at).toLocaleString()} · {e.type} {e.quantity} · {e.actor} · {e.reason}</p>)}
        <button disabled={busy || editor.currentUser?.role !== 'admin'} onClick={() => void run(async () => { if (stock(activePart).onHand || stock(activePart).reserved) throw new Error('Dispose or transfer remaining stock before archiving.'); await savePart({ ...activePart, archived: true }); setSelected(''); })}>Archive empty part</button>
      </section>}
    </>}
  </main>;
}
