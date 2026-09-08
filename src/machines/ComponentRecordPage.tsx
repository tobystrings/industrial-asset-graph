import { useFacility } from '../facility';
import { PageLink } from '../navigation/AppShell';
import LocalDocumentPreview from '../dashboard/LocalDocumentPreview';
import WulftecRecordLink from './WulftecRecordLink';
import { componentAssembly, componentDocuments, modelDetails, readModelState } from './wulftecGraph';
import './wulftec-graph.css';

export default function ComponentRecordPage() {
  const plant = useFacility();
  const p = new URLSearchParams(location.search);
  const asset = plant.assets.find(a => a.id === p.get('asset') && a.facilityId === plant.facility.id);
  const component = plant.components.find(c => c.id === p.get('component') && c.parentId === asset?.id && asset?.componentIds.includes(c.id));
  if (!asset || !component) return <main className="component-record"><h2>Component unavailable</h2><p>This component is not part of the selected equipment in the current facility.</p><PageLink page="assets">Browse equipment</PageLink></main>;
  const sources = plant.evidence.filter(e => component.evidenceIds.includes(e.id));
  const docs = componentDocuments(plant, asset, component);
  const model = readModelState(location.search);
  const assembly = model.selected || componentAssembly(asset, component) || '';
  const details = modelDetails(asset.id, assembly, model.scope, model.explosion);
  const relations = plant.relationships.filter(r => r.source === component.id || r.target === component.id);
  const label = (id: string) => plant.components.find(c => c.id === id)?.label ?? plant.assets.find(a => a.id === id)?.name ?? plant.documents.find(d => d.id === id)?.title ?? plant.evidence.find(e => e.id === id)?.title ?? id;
  return <main className="component-record">
    <div className="model-record-actions"><PageLink page="asset" details={{ asset: asset.id, tab: 'record' }}>Equipment record</PageLink><WulftecRecordLink asset={asset} assembly={model.selected ? undefined : assembly}>Return to 3D model</WulftecRecordLink></div>
    <h2>{component.label}</h2><p className="model-record-id">{component.id}</p>
    <dl><dt>Equipment</dt><dd>{asset.name}</dd><dt>Verification</dt><dd>{component.verificationStatus.replaceAll('_', ' ')}</dd><dt>Type</dt><dd>{component.type}</dd>{component.manufacturer && <><dt>Manufacturer</dt><dd>{component.manufacturer}</dd></>}{component.model && <><dt>Model</dt><dd>{component.model}</dd></>}</dl>
    <section aria-label="Component evidence"><h3>Supporting evidence</h3>{!sources.length && <p>No supporting evidence records are loaded.</p>}{sources.map(source => <details key={source.id} open={p.get('evidence') === source.id}><summary>{source.title} · {source.access.replaceAll('_', ' ')}</summary><p>{source.type} · {source.id}</p>{source.pathOrUrl.startsWith('indexeddb://attachment/') ? <LocalDocumentPreview expectedAssetId={asset.id} attachmentId={source.pathOrUrl.slice('indexeddb://attachment/'.length)}/> : /^https?:\/\//i.test(source.pathOrUrl) ? <a href={source.pathOrUrl} target="_blank" rel="noreferrer">Open source</a> : <p>The original file is not available through this source link.</p>}</details>)}</section>
    <section><h3>Linked documents</h3>{!docs.length && <p>No documents explicitly reference this component or its evidence.</p>}<ul>{docs.map(doc => <li key={doc.id}><PageLink page="documents" details={{ ...details, doc: doc.id }}>{doc.title}</PageLink><small>{doc.verificationStatus.replaceAll('_', ' ')}</small></li>)}</ul></section>
    <section><h3>Recorded relationships</h3><p>Source assertions retain their verification status.</p>{!relations.length && <p>No relationships are recorded for this component.</p>}<ul>{relations.map(r => <li key={r.id}>{label(r.source)} → {r.type.replaceAll('_', ' ')} → {label(r.target)}<small>{r.verificationStatus.replaceAll('_', ' ')}</small></li>)}</ul></section>
    <section><h3>Record revisions</h3><ul>{plant.revisions.filter(r => r.entityId === component.id).map(r => <li key={r.id}>{r.changedAt} · {r.reason}<small>{r.reviewState}</small></li>)}</ul>{!plant.revisions.some(r => r.entityId === component.id) && <p>No revisions are recorded for this component.</p>}</section>
  </main>;
}
