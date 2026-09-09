import { useState } from 'react';
import { useFacilityEditor } from './FacilityProvider';
import './publication.css';
import { navigate } from '../navigation/pages';

export default function PublicationStatus() {
  const editor=useFacilityEditor();const p=editor.publication;const [error,setError]=useState('');
  if(p.phase==='DISABLED')return null;
  const resolve=async(choice:'local'|'shared')=>{try{setError('');await editor.resolvePublication(choice);}catch(e){setError(String(e));}};
  return <section className={`publication-status phase-${p.phase.toLowerCase()}`} aria-label="Save and publication status">
    <div><strong>{p.phase==='SAVED'?'Shared save complete':p.phase==='SAVING'?'Saving…':p.phase==='CONFLICT'?'Review concurrent edits':'Plant publication'}</strong><p role="status">{error||p.message}</p></div>
    <div className="publication-actions"><button disabled={p.phase==='SAVING'} onClick={()=>void editor.publishNow()}>Save &amp; publish now</button><a href="https://github.com/tobystrings/industrial-asset-graph/actions/workflows/publish-plant.yml" target="_blank" rel="noreferrer">GitHub publication status ↗</a>{editor.currentUser?.role==='admin'&&<button onClick={()=>void editor.receiveProposals().then(()=>navigate('review')).catch(e=>setError(String(e)))}>Receive shared proposals</button>}</div>
    {p.conflicts.length>0&&<details><summary>{p.conflicts.length} conflicting fields — compare before choosing</summary>{p.conflicts.map(c=><article key={c.path}><h3>{c.path}</h3><div className="publication-compare"><div><b>This device</b><pre>{JSON.stringify(c.local,null,2)}</pre></div><div><b>Shared</b><pre>{JSON.stringify(c.shared,null,2)}</pre></div></div></article>)}<p>Keep this device applies its conflicting values together with non-conflicting shared changes. Use shared replaces this device’s publication with the shared snapshot.</p><button onClick={()=>void resolve('local')}>Keep this device’s conflicting values</button><button onClick={()=>void resolve('shared')}>Use shared snapshot</button></details>}
  </section>;
}
