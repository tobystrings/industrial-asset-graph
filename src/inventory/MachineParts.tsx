import { useFacility } from '../facility';
import { locationLabel, stock } from '../facility/inventory';
import { PageLink } from '../navigation/AppShell';

export default function MachineParts({ assetId }: { assetId?: string }) {
  const pkg = useFacility();
  const parts = (pkg.facility.inventory?.parts ?? []).filter(p => !p.archived && p.machines.some(m => m.id === assetId && m.status !== 'Not compatible'));
  return <section className="machine-parts-summary destination-card" aria-label="Parts That Fit This Machine">
    <h2>Parts That Fit This Machine</h2>
    <p>{parts.length ? `${parts.length} linked part records. Verify fit, ratings and condition before installation.` : 'No compatible parts recorded yet. Find or catalog a spare and document its fit.'}</p>
    {parts.slice(0, 3).map(part => <p key={part.id}><strong>{part.name}</strong> · {stock(part).available} {part.unit} available · {locationLabel(part)} · {part.machines.find(m => m.id === assetId)?.status}</p>)}
    <PageLink page="inventory" details={{ asset: assetId ?? '' }} className="page-primary">Find a part / compatible spares</PageLink>
  </section>;
}
