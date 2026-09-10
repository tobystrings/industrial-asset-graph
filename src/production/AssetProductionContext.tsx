import { useFacility } from '../facility';
import { PageLink } from '../navigation/AppShell';
import { copackingGraph } from '../facility/copacking';

export default function AssetProductionContext({ assetId }: { assetId: string }) {
  const pkg = useFacility(); const c = pkg.facility.production?.copacking;
  if (!c) return null;
  const stages = c.stages.filter(s => s.assetId === assetId);
  const parts = c.changeParts.filter(p => p.assetId === assetId);
  const runs = c.runs.filter(r => r.assetIds.includes(assetId));
  const graph = copackingGraph(pkg);
  return <section className="production-context"><h3>Production context</h3>{stages.length ? stages.map(s => <p key={s.id}><PageLink page="lines" details={{line:s.lineId}}>{pkg.facility.production?.lines.find(l => l.id === s.lineId)?.name} · {s.name}</PageLink> · Assignment {s.assignment.status}</p>) : <p>No process-stage assignment confirmed. Candidate aliases do not establish a relationship.</p>}{parts.map(p => <p key={p.id}>{p.name} · {c.formats.find(f => f.id === p.formatId)?.name} · Compatibility {p.compatibility.status}</p>)}{runs.map(r => <p key={r.id}><PageLink page="lines" details={{line:r.lineId}}>{r.name}</PageLink> · {r.status} · {r.snapshot.recipe.name} r{r.snapshot.recipe.revision}</p>)}<small>{graph.edges.filter(e => e.source===assetId || e.target===assetId).length} production record links · record containment does not establish physical dependency.</small></section>;
}
