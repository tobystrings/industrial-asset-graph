import { useCallback, useState } from 'react';
import { useFacility } from '../facility';
import { PageLink } from '../navigation/AppShell';
import { navigate } from '../navigation/pages';
import WulftecViewer, { type Settings } from './WulftecViewer';
import { carriageAssemblies, componentDocuments, linkedComponents, modelAsset, modelAssets, modelDetails, readModelState } from './wulftecGraph';
import './wulftec-graph.css';

export default function WulftecWorkspace() {
  const plant = useFacility();
  const [state, setState] = useState(() => readModelState(location.search));
  const requested = new URLSearchParams(location.search).get('asset');
  const candidates = modelAssets(plant);
  const asset = modelAsset(plant, requested);
  const update = useCallback((next: Settings) => {
    setState({ selected: next.selected, scope: next.scope, explosion: next.explosion });
    const query = new URLSearchParams(location.search);
    query.set('assembly', next.selected); query.set('scope', next.scope); query.set('explode', String(next.explosion));
    if (asset) query.set('asset', asset.id);
    history.replaceState(null, '', `${location.pathname}?${query}`);
  }, [asset?.id]);
  const parts = asset ? linkedComponents(plant, asset, state.selected) : [];
  const details = asset ? modelDetails(asset.id, state.selected, state.scope, state.explosion) : {};
  const docs = asset ? plant.documents.filter(d => d.assetId === asset.id) : [];
  const contextual = carriageAssemblies.includes(state.selected) && state.selected !== 'carriage';
  return <WulftecViewer initialState={state} onStateChange={update} graphPanel={<section className="model-graph-panel" aria-label="Asset graph connection">
    <h3>Asset graph connection</h3>
    {candidates.length > 1 && <label>Equipment record<select aria-label="Equipment record" value={asset?.id ?? ''} onChange={e => navigate('wulftec', modelDetails(e.target.value, state.selected, state.scope, state.explosion))}><option value="">Choose the wrapper</option>{candidates.map(a => <option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}</select></label>}
    {!asset ? <><p role="status">{requested ? 'This equipment record is not available in the current facility.' : candidates.length > 1 ? 'Choose which wrapper this model represents.' : 'The WCRT-200 record is not loaded in this facility on this device.'}</p><p>The private dossier supplies the equipment, component, and source records used here.</p><PageLink page="database">Open private package import</PageLink><PageLink page="assets">Browse equipment records</PageLink></> : <>
      <p className="model-record-id">{asset.id}</p><p>{asset.name} · {asset.verificationStatus.replaceAll('_', ' ')}</p>
      <PageLink page="asset" details={{ asset: asset.id, tab: 'record' }}>Open equipment record</PageLink>
      {state.selected && <><h4>{contextual ? 'Carriage record context' : 'Linked component records'}</h4>
        {contextual && <p>This modeled subpart has no separate component record. The links below describe the documented carriage assembly.</p>}
        {!parts.length && <p>No individual component record is linked to this assembly. Machine-level documents remain available below.</p>}
        {parts.map(part => <article key={part.id}>
          <strong>{part.label}</strong><small>{part.verificationStatus.replaceAll('_', ' ')}</small>
          <PageLink page="component" details={{ ...details, component: part.id }}>Open component record</PageLink>
          <ul>{componentDocuments(plant, asset, part).map(doc => <li key={doc.id}><PageLink page="documents" details={{ ...details, doc: doc.id }}>{doc.title}</PageLink></li>)}</ul>
          {part.evidenceIds.length > 0 && <PageLink page="component" details={{ ...details, component: part.id, evidence: part.evidenceIds[0] }}>View supporting evidence ({part.evidenceIds.length})</PageLink>}
        </article>)}
      </>}
      <details><summary>Machine documents & history ({docs.length})</summary><p>These records describe the machine as a whole; a link here does not establish a connection to the selected subpart.</p><ul>{docs.map(doc => <li key={doc.id}><PageLink page="documents" details={{ ...details, doc: doc.id }}>{doc.title}</PageLink><small>{doc.verificationStatus.replaceAll('_', ' ')}</small></li>)}</ul>{!docs.length && <p>No documents have been loaded for this equipment.</p>}</details>
    </>}
  </section>}/>;
}
