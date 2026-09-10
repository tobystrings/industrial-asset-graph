import { useFacility } from '../facility';
import { memberships } from '../facility/production';
import { PageLink } from '../navigation/AppShell';
import './production.css';
export function LineCards() {
  const pkg = useFacility(); const lines = pkg.facility.production?.lines ?? [];
  return <section className="production-overview"><h2>Production lines</h2><div className="production-grid">
    {[...lines].sort((a,b) => b.importance-a.importance).map(line => <PageLink key={line.id} page="lines" details={{line:line.id}} className={`production-card ${line.importance === Math.max(...lines.map(l => l.importance)) ? 'production-priority' : ''}`}>
      <strong>{line.name}</strong><span className="production-status">Business priority {line.importance}</span><p>{line.rationale}</p>
      <span className="production-status">Container / routing: {pkg.facility.production?.copacking?.lineClaims[line.id]?.status ?? 'UNKNOWN'}</span>
      <small>{pkg.assets.filter(a => memberships(pkg,a).some(m => m.lineId===line.id)).length} documented equipment records · condition unrecorded</small>
    </PageLink>)}
    <PageLink page="lines" details={{line:'shared'}} className="production-card"><strong>Shared systems</strong><p>One equipment record can support several lines.</p><small>Review supported lines and evidence →</small></PageLink>
  </div></section>;
}
