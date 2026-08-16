import { areas, components, machines } from './facilityData';
import { SYSTEM_KINDS, componentsInSystem, machinesInSystem } from './lib/systemKinds';
import StatusMark from './StatusMark';
import type { ComponentRecord, FacilityAsset, SystemKind } from './types/facility';

const statusLabel: Record<string, string> = {
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

const familyLabel = (type: string) => {
  if (type === 'VFD') return 'VFD';
  if (type === 'PLC') return 'PLC';
  if (type === 'SERVO_DRIVE') return 'Servo';
  if (type.includes('INPUT') || type.includes('OUTPUT') || type === 'REMOTE_IO') return 'I/O';
  if (type === 'POWER_SUPPLY' || type === 'DISCONNECT') return 'Power';
  return type.replaceAll('_', ' ').toLowerCase();
};

function deviceSummary(devices: ComponentRecord[]) {
  const counts = new Map<string, number>();
  devices.forEach((device) => counts.set(familyLabel(device.type), (counts.get(familyLabel(device.type)) ?? 0) + 1));
  return [...counts].map(([label, count]) => `${label} ${count}`).join(' · ');
}

export default function AssetDirectory({
  systemKind,
  onSystemKind,
  query,
  onQuery,
  onAsset,
  onDevice,
}: {
  systemKind: SystemKind;
  onSystemKind: (kind: SystemKind) => void;
  query: string;
  onQuery: (query: string) => void;
  onAsset: (asset: FacilityAsset) => void;
  onDevice: (device: ComponentRecord, parent: FacilityAsset) => void;
}) {
  const needle = query.trim().toLowerCase();
  const allowedDevices = componentsInSystem(systemKind);
  const allowedIds = new Set(allowedDevices.map((device) => device.id));
  const allowedParents = new Set(machinesInSystem(systemKind).map((asset) => asset.id));
  const parentMatches = (asset: FacilityAsset) => `${asset.id} ${asset.name} ${asset.line}`.toLowerCase().includes(needle);
  const deviceMatches = (device: ComponentRecord) => `${device.id} ${device.label} ${device.type}`.toLowerCase().includes(needle);
  const visibleAssets = machines.filter((asset) => {
    if (!allowedParents.has(asset.id)) return false;
    if (!needle || parentMatches(asset)) return true;
    return components.some((device) => device.parentId === asset.id && allowedIds.has(device.id) && deviceMatches(device));
  });

  return (
    <section className="asset-directory panel enter" data-guide-target="asset-workspace">
      <header className="asset-directory-head">
        <div><p className="panel-title">Assets</p><h1>By area and production line</h1><p>Start with plant location. Equipment type is a secondary filter.</p></div>
        <div className="asset-directory-tools"><label><span className="sr-only">Search assets</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search this directory…" /></label><span><b>{visibleAssets.length}</b> parent assets · <b>{allowedDevices.filter((device) => visibleAssets.some((asset) => asset.id === device.parentId)).length}</b> devices</span></div>
      </header>
      <div className="system-chips asset-type-filters" data-testid="systems-filter" aria-label="Filter devices by equipment type">
        <small>Equipment type</small>
        {SYSTEM_KINDS.map((kind) => <button key={kind} type="button" className={systemKind === kind ? 'selected' : ''} onClick={() => onSystemKind(kind)}>{kind === 'ALL' ? 'All types' : kind}</button>)}
      </div>

      <div className="area-groups">
        {areas.map((area) => {
          const areaAssets = visibleAssets.filter((asset) => asset.areaId === area.id);
          if (!areaAssets.length) return null;
          const lines = [...new Set(areaAssets.map((asset) => asset.line))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
          const areaRecordCount = areaAssets.reduce((total, asset) => total + 1 + allowedDevices.filter((device) => device.parentId === asset.id).length, 0);
          return (
            <section className="area-group" key={area.id}>
              <header><div><StatusMark status={area.status} /><h2>{area.name}</h2></div><span>{areaRecordCount} records</span></header>
              {lines.map((line) => {
                const lineAssets = areaAssets.filter((asset) => asset.line === line);
                const lineRecordCount = lineAssets.reduce((total, asset) => total + 1 + allowedDevices.filter((device) => device.parentId === asset.id).length, 0);
                return (
                  <section className="line-group" key={line}>
                    <header><div><small>Production line</small><h3>{line}</h3></div><span>{lineRecordCount} records</span></header>
                    <div className="line-assets">
                      {lineAssets.map((asset) => {
                        const devices = allowedDevices.filter((device) => device.parentId === asset.id && (!needle || parentMatches(asset) || deviceMatches(device)));
                        return (
                          <article className="asset-card" key={asset.id}>
                            <div className="asset-card-main">
                              <div className="asset-card-title"><StatusMark status={asset.verificationStatus} /><div><small>{asset.type}</small><h4>{asset.name}</h4><code>{asset.id}</code></div></div>
                              <div className="asset-card-status"><StatusMark status={asset.verificationStatus} /><span>{statusLabel[asset.verificationStatus]}</span></div>
                            </div>
                            <p className="device-summary">{devices.length ? deviceSummary(devices) : 'No matching contained devices'}</p>
                            <div className="asset-card-actions"><button className="primary" onClick={() => onAsset(asset)}>Open asset record</button></div>
                            {devices.length > 0 && <details className="device-disclosure"><summary>View {devices.length} contained devices</summary><div className="device-list">{devices.map((device) => <button key={device.id} onClick={() => onDevice(device, asset)}><span><StatusMark status={device.verificationStatus} /><b>{device.label}</b><small>{familyLabel(device.type)}</small></span><code>{device.id}</code></button>)}</div></details>}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </section>
          );
        })}
        {!visibleAssets.length && <div className="asset-empty"><h2>No matching assets</h2><p>Clear the search or equipment-type filter.</p></div>}
      </div>
    </section>
  );
}
