import { publicEvidenceUrl } from './evidenceUrl';
import { useFacility } from '../facility';
import { PageLink } from '../navigation/AppShell';
import { connections, entityLabel, imageViews } from './model';

/** Also used outside the image workspace so a trace can continue through any asset. */
export default function ConnectionLinks({entityId}: {entityId:string}) {
  const pkg = useFacility();
  return <>{(['in','out'] as const).map(direction => <section key={direction}><h3>{direction === 'in' ? 'Fed by' : 'Feeds'}</h3>{!connections(pkg,entityId,direction).length && <p>Not documented.</p>}{connections(pkg,entityId,direction).map(({relationship:r,otherId,kind}) => {
    const c = pkg.components.find(c => c.id === otherId), owner = c?.parentId ?? otherId;
    const view = imageViews(pkg,owner).find(v => v.regions.some(r => r.entityId === otherId));
    return <article key={r.id}><p>{kind} · {r.type.replaceAll('_',' ')} · {r.verificationStatus.replaceAll('_',' ')}</p><PageLink page={view ? 'cabinet' : c ? 'component' : 'machine'} details={{asset:owner,component:c?.id ?? '',image:view?.id ?? '',section:view || !c ? 'overview' : ''}}>{entityLabel(pkg,otherId)}</PageLink>{r.note && <p>{r.note}</p>}{r.sourceReference && <p>{r.sourceReference}</p>}{!r.evidenceIds.length && <p>No supporting evidence attached.</p>}<ul>{r.evidenceIds.map(id => {const e=pkg.evidence.find(e=>e.id===id),url=e?.access==='PUBLIC_APP'?publicEvidenceUrl(e.pathOrUrl):null;return <li key={id}>{url?<a href={url} target="_blank" rel="noreferrer">{e?.title}</a>:<span>{e?.title ?? id} · source not publicly available</span>}</li>;})}</ul></article>;
  })}</section>)}</>;
}
