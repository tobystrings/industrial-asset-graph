import { publicEvidenceUrl } from './evidenceUrl';
import { useRef, useState } from 'react';
import { useFacility } from '../facility';
import { PageLink } from '../navigation/AppShell';
import { navigate } from '../navigation/pages';
import { connections, entityLabel, imageViews } from './model';
import './equipment-images.css';

function EvidenceLink({id}: {id:string}) {
  const pkg = useFacility(), evidence = pkg.evidence.find(e => e.id === id);
  const url = evidence?.access === 'PUBLIC_APP' ? publicEvidenceUrl(evidence.pathOrUrl) : null;
  return url ? <a href={url} target="_blank" rel="noreferrer">{evidence?.title}</a> : <span>{evidence?.title ?? id} · source not publicly available</span>;
}

export default function EquipmentImageWorkspace({assetId}: {assetId: string}) {
  const pkg = useFacility(), p = new URLSearchParams(location.search);
  const views = imageViews(pkg, assetId), asset = pkg.assets.find(a => a.id === assetId);
  const view = views.find(v => v.id === p.get('image')) ?? views[0];
  const selectedId = p.get('component') || assetId;
  const component = pkg.components.find(c => c.id === selectedId && c.parentId === assetId);
  const validSelection = selectedId === assetId || !!component;
  const section = ['overview','parameters','in','out','documents'].includes(p.get('section') ?? '') ? p.get('section')! : 'overview';
  const [query,setQuery] = useState(''), [zoom,setZoom] = useState(1), [failed,setFailed] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{x:number;y:number;left:number;top:number} | null>(null);
  const select = (id: string, image = view?.id, tab = section) => navigate('cabinet',{asset:assetId,component:id === assetId ? '' : id,image:image ?? '',section:tab});
  if (!asset || !view) return <main className="slate-workspace"><h2>Cabinet unavailable</h2><PageLink page="assets">Choose equipment</PageLink></main>;
  const photo = pkg.evidence.find(e => e.id === view.evidenceId), photoUrl = photo?.access === 'PUBLIC_APP' ? publicEvidenceUrl(photo.pathOrUrl) : null;
  const area = pkg.areas.find(a => a.id === asset.areaId);
  const devices = pkg.components.filter(c => c.parentId === assetId);
  const sources = component?.evidenceIds ?? views.map(v => v.evidenceId);
  const documents = pkg.documents.filter(d => d.assetId === assetId && (!component || d.evidenceIds.some(id => sources.includes(id)) || d.register?.entries.some(e => e.entityIds.includes(selectedId)) || component.savedParameters?.some(r => r.sourceDocumentId === d.id)));
  const locate = views.find(v => v.regions.some(r => r.entityId === selectedId));
  const linkTo = (id: string) => {
    const c = pkg.components.find(c => c.id === id), owner = c?.parentId ?? id;
    const targetViews = imageViews(pkg,owner), target = targetViews.find(v => v.regions.some(r => r.entityId === id)) ?? targetViews[0];
    return target ? <PageLink page="cabinet" details={{asset:owner,component:c?.id ?? '',image:target.id,section:'overview'}}>{entityLabel(pkg,id)}</PageLink> : c ? <PageLink page="component" details={{asset:owner,component:id}}>{c.label}</PageLink> : <PageLink page="machine" details={{asset:id,section:'overview'}}>{entityLabel(pkg,id)}</PageLink>;
  };
  const renderConnections = (direction: 'in'|'out') => {
    const rows = connections(pkg,selectedId,direction);
    return <section><h3>{direction === 'in' ? 'Fed by' : 'Feeds'}</h3>{!rows.length && <p>Not documented. No {direction === 'in' ? 'upstream' : 'downstream'} connection is recorded for this item.</p>}{rows.map(({relationship:r,otherId,kind}) => <article className="equipment-connection" key={r.id}><strong>{kind} · {r.type.replaceAll('_',' ').toLowerCase()}</strong><p>{linkTo(otherId)}</p><p>{r.verificationStatus.replaceAll('_',' ')}{r.verifiedAt ? ' · '+r.verifiedAt : ''}</p>{r.note && <p>{r.note}</p>}{r.sourceReference && <p>Source: {r.sourceReference}</p>}<ul>{r.evidenceIds.map(id => <li key={id}><EvidenceLink id={id}/></li>)}</ul>{!r.evidenceIds.length && <p>No supporting evidence attached.</p>}</article>)}<PageLink page="connection" details={{asset:assetId}}>Document a connection for review</PageLink></section>;
  };
  return <main className="equipment-images" data-testid="equipment-images">
    <nav className="equipment-breadcrumbs" aria-label="Equipment location"><PageLink page="map">Facility map</PageLink><span>›</span><PageLink page="area" details={{area:asset.areaId}}>{area?.name ?? 'Area'}</PageLink><span>›</span><button onClick={() => select(assetId,views[0].id,'overview')}>{asset.name}</button></nav>
    <div className="equipment-layout">
      <section className="equipment-device-list" aria-label="Cabinet components"><h3>Components</h3><select className="equipment-phone-selector" aria-label="Choose component" value={validSelection ? selectedId : ''} onChange={e => {const id=e.target.value;select(id,view.regions.some(r=>r.entityId===id)?view.id:views.find(v=>v.regions.some(r=>r.entityId===id))?.id);}}><option value="" disabled>Choose a component</option><option value={assetId}>Cabinet record</option>{devices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select><label>Find a component<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Position, name, or ID"/></label><button onClick={() => select(assetId)}>Cabinet record</button>{devices.filter(c => (c.label+' '+c.id).toLowerCase().includes(query.toLowerCase())).map(c => <button key={c.id} aria-pressed={selectedId === c.id} onClick={() => select(c.id,view.regions.some(r => r.entityId === c.id) ? view.id : views.find(v => v.regions.some(r => r.entityId === c.id))?.id)}>{c.label}</button>)}{!devices.some(c => (c.label+' '+c.id).toLowerCase().includes(query.toLowerCase())) && <p>No matching components.</p>}</section>
      <section className="equipment-visual" aria-label="Cabinet image">
        <div className="equipment-view-controls">{views.map(v => <button key={v.id} aria-pressed={v.id === view.id} onClick={() => select(selectedId,v.id)}>{v.label}</button>)}</div>
        <div className="equipment-zoom"><button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(1,z-.5))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(5,z+.5))}>+</button><button onClick={() => {setZoom(1);surface.current?.scrollTo(0,0);}}>Fit</button></div>
        <div className="equipment-image-surface" ref={surface} onPointerDown={e => {if ((e.target as Element).closest('[data-region]') || zoom === 1 || e.pointerType !== 'mouse') return; const el=e.currentTarget; drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop};el.setPointerCapture(e.pointerId);}} onPointerMove={e => {const d=drag.current;if(d){e.currentTarget.scrollLeft=d.left-(e.clientX-d.x);e.currentTarget.scrollTop=d.top-(e.clientY-d.y);}}} onPointerUp={() => {drag.current=null;}} onPointerCancel={() => {drag.current=null;}}>
          {photoUrl && !failed ? <svg viewBox={`0 0 ${view.width} ${view.height}`} style={{width:`${zoom*100}%`}} role="group" aria-label={view.label}>
            <image href={photoUrl} width={view.width} height={view.height} onError={() => setFailed(true)}/>
            {view.regions.map(r => <g key={r.entityId} data-region={r.entityId} role="button" tabIndex={0} aria-label={`Select ${entityLabel(pkg,r.entityId)}`} aria-pressed={selectedId === r.entityId} onClick={() => select(r.entityId,r.entityId === assetId ? views.find(v => v.regions.some(r => r.entityId !== assetId))?.id : view.id)} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' '){e.preventDefault();select(r.entityId,r.entityId === assetId ? views.find(v => v.regions.some(r => r.entityId !== assetId))?.id : view.id);}}}>
              <title>{entityLabel(pkg,r.entityId)}</title><rect x={r.x*view.width} y={r.y*view.height} width={r.width*view.width} height={r.height*view.height} className={selectedId === r.entityId ? 'selected' : ''}/>
            </g>)}
          </svg> : <p>Image unavailable. Use the component list to open records.</p>}
        </div><p className="equipment-caption">{view.label}. Outlines identify approximate visible positions; they do not establish wiring. Sketch dimensions and details are reference only.</p>
      </section>
      <aside className="equipment-information" aria-label="Selected equipment" aria-live="polite">
        <h3>{validSelection ? entityLabel(pkg,selectedId) : 'Component unavailable'}</h3>
        {!validSelection ? <p>This component does not belong to this cabinet. Choose an item from the component list.</p> : <>
          <p className="equipment-id">{selectedId}</p><p>{(component?.verificationStatus ?? asset.verificationStatus).replaceAll('_',' ')}</p>
          <nav className="equipment-tabs" aria-label="Equipment information">{[['overview','Overview'],['parameters','Parameters'],['in','Fed by'],['out','Feeds'],['documents','Documents']].map(([key,label]) => <button key={key} aria-pressed={section === key} onClick={() => select(selectedId,view.id,key)}>{label}</button>)}</nav>
          {locate && <button onClick={() => select(selectedId,locate.id)}>Locate in image</button>}
          {section === 'overview' && <><p>{component ? 'Position-based photo record. Installed designation and its match to saved control-project entries need confirmation.' : asset.description}</p>{component?.manufacturer && <p>Manufacturer: {component.manufacturer}</p>}{component?.model && <p>Model: {component.model}</p>}{component ? <PageLink page="component" details={{asset:assetId,component:selectedId,image:view.id}}>Full component record</PageLink> : <PageLink page="machine" details={{asset:assetId,section:'overview'}}>Full cabinet record</PageLink>}{view.machineId && <p><PageLink page="machine" details={{asset:view.machineId}}>Open associated machine</PageLink></p>}</>}
          {section === 'parameters' && <section><h3>Saved parameters</h3><p>Saved records, not current drive values.</p>{!component?.savedParameters?.length && <p>No saved parameter record is stored for this item. Manufacturer defaults are not installed settings.</p>}{component?.savedParameters?.map(record => <article className="equipment-connection" key={record.id}><p>Captured: {record.capturedAt ?? 'Date not recorded'} · {record.verificationStatus.replaceAll('_',' ')}</p><PageLink page="documents" details={{asset:assetId,doc:record.sourceDocumentId}}>Source: {pkg.documents.find(d => d.id === record.sourceDocumentId)?.title ?? record.sourceDocumentId}</PageLink>{!record.values.length && <p>No parameter values have been transcribed. Open the source record.</p>}<dl>{record.values.map(value => <div key={value.code}><dt>{value.code} · {value.name}</dt><dd>{value.value}{value.unit ? ' '+value.unit : ''}</dd></div>)}</dl></article>)}<PageLink page="evidence" details={{asset:assetId}}>Attach a parameter backup for review</PageLink></section>}
          {section === 'in' && renderConnections('in')}{section === 'out' && renderConnections('out')}
          {section === 'documents' && <section><h3>Supporting records</h3>{documents.map(d => <p key={d.id}><PageLink page="documents" details={{asset:assetId,doc:d.id}}>{d.title}</PageLink></p>)}{!documents.length && <p>No linked documents are recorded.</p>}{pkg.evidence.filter(e => sources.includes(e.id)).map(e => {const url = e.access === 'PUBLIC_APP' ? publicEvidenceUrl(e.pathOrUrl) : null;return <p key={e.id}>{url ? <a href={url} target="_blank" rel="noreferrer">{e.title}</a> : <span>{e.title} · {e.access.replaceAll('_',' ')}</span>}</p>;})}</section>}
        </>}
      </aside>
    </div>
  </main>;
}
