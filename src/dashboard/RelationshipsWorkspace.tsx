import { domainLabels } from '../lib/relationshipSemantics';
import type { TroubleshootMode, TroubleshootReport } from '../lib/troubleshootGraph';
import type { FacilityAsset } from '../types/facility';

const modes: { id: TroubleshootMode; label: string; help: string }[] = [
  { id: 'direct', label: 'Directly connected', help: 'One documented connection away' },
  { id: 'upstream', label: 'What feeds this?', help: 'Documented upstream dependencies' },
  { id: 'downstream', label: 'Show downstream', help: 'Equipment that follows or depends on this' },
  { id: 'impact', label: 'Failure impact', help: 'What may be affected if this fails' },
  { id: 'full', label: 'Full trace', help: 'All supported dependency domains' },
];

function confidenceText(status: string) {
  if (status === 'VERIFIED') return 'Verified';
  if (status === 'INFERRED') return 'Possible · inferred';
  if (status === 'FIELD_VERIFY') return 'Needs field verification';
  if (status === 'DISPUTED') return 'Disputed';
  return status.toLowerCase().replaceAll('_', ' ');
}

export default function RelationshipsWorkspace({ report, mode, selectedAsset, onMode, onAsset, onMap, onExit }: {
  report: TroubleshootReport;
  mode: TroubleshootMode;
  selectedAsset: FacilityAsset | null;
  onMode: (mode: TroubleshootMode) => void;
  onAsset: (assetId: string) => void;
  onMap: () => void;
  onExit: () => void;
}) {
  return (
    <section className="relationship-panel troubleshoot-panel panel enter" data-guide-target="relationships" data-testid="troubleshoot-mode">
      <header className="troubleshoot-head">
        <div><small>Troubleshoot / Impact Mode</small><h1>{selectedAsset?.name ?? 'Select an asset'}</h1><code>{selectedAsset?.id ?? 'No asset selected'}</code></div>
        <div className="troubleshoot-head-actions"><button type="button" onClick={onMap}>View on map</button><button className="troubleshoot-exit" type="button" onClick={onExit}>Clear / Exit</button></div>
      </header>
      {!selectedAsset ? <div className="relationship-empty" role="status"><b>Select an asset to troubleshoot.</b><span>Only documented plant relationships will be shown.</span></div> : <>
        <nav className="trace-mode-picker" aria-label="Troubleshooting question">
          {modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} aria-pressed={mode === item.id} title={item.help} onClick={() => onMode(item.id)}>{item.label}</button>)}
        </nav>
        <div className="troubleshoot-summary" role="status"><b>{report.results.length}</b> documented {report.results.length === 1 ? 'dependency' : 'dependencies'}<span>{report.highlightedRelationshipIds.size} relationships in trace</span><span>No undocumented connection is implied.</span></div>
        <div className="troubleshoot-results">
          {report.groups.map((group) => <section className="dependency-group" key={group.domain}>
            <header><div><small>{domainLabels[group.domain]}</small><h2>{group.label}</h2></div><b>{group.results.length}</b></header>
            <div className="dependency-cards">
              {group.results.map((result) => <article key={`${group.domain}:${result.entity.id}`} className={`dependency-card confidence-${result.confidence.toLowerCase()}`}>
                <button type="button" disabled={result.entity.kind !== 'asset'} onClick={() => onAsset(result.entity.id)}><span><small>{result.entity.kind}</small><b>{result.entity.label}</b><code>{result.entity.id}</code></span><em>{confidenceText(result.confidence)}</em></button>
                <details><summary>Why is this included?</summary><ol>{result.path.map((step) => <li key={step.relationship.id}><code>{step.from}</code><span> {step.label} → </span><code>{step.to}</code><small>{confidenceText(step.relationship.verificationStatus)}</small></li>)}</ol></details>
              </article>)}
            </div>
          </section>)}
          {!report.results.length && <div className="relationship-empty" role="status"><b>No documented relationships match this question.</b><span>This is a documentation state, not proof that no dependency exists.</span></div>}
          <section className="documentation-gaps"><header><small>Documentation Gaps</small><h2>Where the known graph ends</h2></header><ul>{report.gaps.map((gap) => <li key={gap.message}><b>{gap.at}</b><span>{gap.message}</span></li>)}</ul></section>
        </div>
      </>}
    </section>
  );
}
