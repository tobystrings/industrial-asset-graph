import { useState } from 'react';
import { intelSectionsCollapsed } from './lib/hrefMatrix';
import DriveSlots from './DriveSlots';
import { documentSource } from './lib/documentCatalog';
import { faultCardFor } from './lib/faultCard';
import { renderMarkdown } from './lib/markdown';
import {
  familyById,
  familyForComponent,
  legendForFamily,
  manualForFamily,
  paramsForProduct,
  resolveComponentId,
} from './lib/productLookup';
import { isWireInstruction, silkEquivalents, silkMapText } from './lib/silkMap';
import { markerClass } from './lib/statusMark';
import { himBackupStatus } from './lib/himBackup';
import { productFamilies } from './productCatalog';
import { intelFocusTitle } from './lib/floorPass';

export default function DeviceIntel({
  deviceOrComponentId,
  onSelectDrive,
}: {
  deviceOrComponentId: string;
  onSelectDrive?: (componentId: string, cabinetDeviceId: string) => void;
}) {
  const componentId = resolveComponentId(deviceOrComponentId);
  const family = familyForComponent(componentId);
  const params = paramsForProduct(componentId);
  const card = faultCardFor(componentId);
  const collapsed = intelSectionsCollapsed();
  const [compareId, setCompareId] = useState(family?.id === 'family-powerflex-4' ? 'family-mitsubishi-d700' : family?.id ?? 'family-powerflex-4');
  const [manualOpen, setManualOpen] = useState(!collapsed.manual);
  const [paramsOpen, setParamsOpen] = useState(!collapsed.params);
  const [silkOpen, setSilkOpen] = useState(!collapsed.silk);
  const compare = familyById(compareId);
  const installedManual = family ? manualForFamily(family.id) : null;
  const source = installedManual ? documentSource(installedManual.path) : null;
  const map = family ? silkEquivalents(family.id, compareId) : null;
  const mapText = map ? silkMapText(map) : '';
  const showSlots = componentId.startsWith('L2-CC-VFD') || componentId === 'L2-CC-001';
  if (!family && !params.length && !card.signals.length && !showSlots) return null;
  return (
    <section className="device-intel" data-testid="device-intel">
      <p className="panel-title">Product · signalling</p>
      <p className="device-intel-focus" data-testid="intel-focus">{intelFocusTitle(componentId)}</p>
      {family && (
        <p className="device-intel-family">
          {family.brand} {family.model}
          {family.installStatus === 'CATALOG_EXAMPLE' ? ' · catalog example' : ''}
          {family.kind === 'SERVO' ? ' · FIELD_VERIFY stub' : ''}
        </p>
      )}
      {installedManual && (
        <p className="manual-path">Manual · {installedManual.path}{installedManual.excerpt.toLowerCase().includes('not in this build') ? ' · missing' : ''}</p>
      )}
      <p className="him-banner" data-testid="him-backup">{himBackupStatus(componentId).message}</p>
      <div className="reconnect-card fault-card" data-testid="fault-card" data-status={card.status}>
        <b>If this drive faults</b>
        <p>{card.message}</p>
        {card.signals.map((signal) => (
          <p key={signal.id}>
            <i className={markerClass(signal.verificationStatus)} /> {signal.sourceTerminal} · {signal.purpose}
            {signal.destId ? ` → ${signal.destId} ${signal.destTerminal ?? ''}` : ' → destination unknown'}
          </p>
        ))}
        {card.recoverySteps.length === 0 && (
          <p>No recovery sequence is stored. Troubleshooting is {card.troubleshootingState.replace('_', ' ').toLowerCase()}.</p>
        )}
        {card.recoverySteps.map((step) => <p key={step}>{step}</p>)}
      </div>
      {showSlots && <DriveSlots selectedId={componentId} onSelect={onSelectDrive} />}
      {params.length > 0 && (
        <details className="intel-collapse" data-testid="intel-params" open={paramsOpen} onToggle={(event) => setParamsOpen((event.target as HTMLDetailsElement).open)}>
          <summary>Catalog parameters · not field values</summary>
          <dl className="identity-grid">
            {params.map((item) => (
              <div className="fact-row" key={item.code}>
                <dt>{item.code}</dt>
                <dd>
                  {item.fieldValue ?? `catalog ${item.catalogDefault ?? '—'}${item.unit ? ` ${item.unit}` : ''}`}
                  <span className="fact-state">{item.verificationStatus.replace('_', ' ')}</span>
                  {item.note && <span className="fact-state">{item.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <details className="intel-collapse" data-testid="intel-silk" open={silkOpen} onToggle={(event) => setSilkOpen((event.target as HTMLDetailsElement).open)}>
        <summary>Terminal book · silk equivalents only</summary>
        <label className="compare-brand">
          <span>Brand swap</span>
          <select value={compareId} onChange={(event) => setCompareId(event.target.value)}>
            {productFamilies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brand} {item.model}
                {item.installStatus === 'CATALOG_EXAMPLE' ? ' · catalog' : ''}
              </option>
            ))}
          </select>
        </label>
        {map && map.pairs.length > 0 && (
          <ul className="terminal-legend silk-map" data-testid="silk-map">
            {map.pairs.map((item) => (
              <li key={`${item.fromSilk}-${item.toSilk}`}>
                <code>{item.fromSilk}</code> ≈ <code>{item.toSilk}</code> {item.note}
              </li>
            ))}
          </ul>
        )}
        {map && <p className="silk-disclaimer">{map.disclaimer}</p>}
        {mapText && isWireInstruction(mapText) ? <p className="silk-disclaimer">Invalid map language.</p> : null}
        {compare && (
          <ul className="terminal-legend">
            {legendForFamily(compare.id).map((item) => (
              <li key={item.silk}><code>{item.silk}</code> {item.meaning}</li>
            ))}
          </ul>
        )}
      </details>
      {source && (
        <details className="intel-collapse" data-testid="intel-manual" open={manualOpen} onToggle={(event) => setManualOpen((event.target as HTMLDetailsElement).open)}>
          <summary>Manual excerpt</summary>
          <div className="md-body manual-excerpt" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
        </details>
      )}
    </section>
  );
}
