import { ChangeEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { aerialImageUrl, terrainImageUrl } from './aerial';
import { emptyEvidenceData, EvidenceData, parseEvidenceManifest } from './evidence';
import { Asset, assets, colorFor, dependencies, mapListingsToAssets, parseGeographicExport } from './graph';
import { BuildingFootprint, loadOpenStreetMapContext, loadPortlandUtilityContext, StreetPath, UtilityPath } from './osm';
import { loadOregonDeqContext, loadPortlandPublicDocuments, loadPortlandPublicRecords, PublicRecord } from './publicRecords';
import { loadPortlandParcels, loadPortlandZoning, ParcelArea, ZoningArea } from './zoning';

const AssetScene = lazy(() => import('./AssetScene').then((module) => ({ default: module.AssetScene })));

type MapSelection = { kind: 'building'; record: BuildingFootprint } | { kind: 'street'; record: StreetPath } | null;

export default function App() {
  const [selected, setSelected] = useState<Asset | null>(assets[1]);
  const [importedAssets, setImportedAssets] = useState<Asset[]>([]);
  const [evidence, setEvidence] = useState<EvidenceData>(emptyEvidenceData);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('ALL');
  const [isolate, setIsolate] = useState(false);
  const [origin, setOrigin] = useState<[number, number]>([45.523064, -122.676483]);
  const [radius, setRadius] = useState(250);
  const [footprints, setFootprints] = useState<BuildingFootprint[]>([]);
  const [streets, setStreets] = useState<StreetPath[]>([]);
  const [utilities, setUtilities] = useState<UtilityPath[]>([]);
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [zones, setZones] = useState<ZoningArea[]>([]);
  const [parcels, setParcels] = useState<ParcelArea[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<UtilityPath | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PublicRecord | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoningArea | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<ParcelArea | null>(null);
  const [mapSelection, setMapSelection] = useState<MapSelection>(null);
  const [status, setStatus] = useState('Loading public context…');

  const displayAssets = [...assets, ...importedAssets];
  const displayDependencies = [...dependencies, ...evidence.dependencies];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return displayAssets.filter((asset) => (kind === 'ALL' || asset.kind === kind) && (!needle || `${asset.label} ${asset.id} ${asset.kind} ${asset.source}`.toLowerCase().includes(needle)));
  }, [displayAssets, kind, query]);

  useEffect(() => {
    let active = true;
    setStatus('Loading public map, utility, permit, document, DEQ, zoning, and parcel context…');
    Promise.allSettled([
      loadOpenStreetMapContext(...origin, radius),
      loadPortlandUtilityContext(...origin),
      loadPortlandPublicRecords(...origin),
      loadPortlandPublicDocuments(...origin),
      loadOregonDeqContext(...origin),
      loadPortlandZoning(...origin, radius),
      loadPortlandParcels(...origin, radius),
    ]).then((results) => {
      if (!active) return;
      const [map, utility, permits, documents, environmental, zoning, parcel] = results;
      if (map.status === 'fulfilled') { setFootprints(map.value.buildings); setStreets(map.value.streets); }
      if (utility.status === 'fulfilled') setUtilities(utility.value);
      setRecords([
        ...(permits.status === 'fulfilled' ? permits.value : []),
        ...(documents.status === 'fulfilled' ? documents.value : []),
        ...(environmental.status === 'fulfilled' ? environmental.value : []),
      ]);
      if (zoning.status === 'fulfilled') setZones(zoning.value);
      if (parcel.status === 'fulfilled') setParcels(parcel.value);
      const current = results.filter((result) => result.status === 'fulfilled').length;
      setStatus(`${current} of ${results.length} public context sources loaded. Public context does not verify plant assets.`);
    });
    return () => { active = false; };
  }, [origin, radius]);

  const importMap = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const listings = parseGeographicExport(await file.text());
      setImportedAssets(mapListingsToAssets(listings));
      setOrigin([listings[0].latitude, listings[0].longitude]);
      setStatus(`Imported ${listings.length} geographic context records.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Map import failed.'); }
    event.target.value = '';
  };

  const importEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseEvidenceManifest(await file.text(), new Set(displayAssets.map((asset) => asset.id)));
      setEvidence(parsed);
      setStatus(`Imported ${parsed.sources.length} evidence sources and ${parsed.dependencies.length} dependency claims.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Evidence import failed.'); }
    event.target.value = '';
  };

  const clearSelections = () => {
    setSelected(null); setSelectedUtility(null); setSelectedRecord(null); setSelectedZone(null); setSelectedParcel(null); setMapSelection(null); setIsolate(false);
  };

  return <main>
    <header>
      <div><p className="eyebrow">Industrial asset graph</p><h1>Plant Dependency Map</h1></div>
      <p className="header-note">Evidence-first asset dependencies with public spatial context.</p>
    </header>
    <section className="workspace">
      <aside className="asset-list">
        <h2>Assets</h2>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets" />
        <select value={kind} onChange={(event) => setKind(event.target.value)}><option>ALL</option>{Object.keys(colorFor).map((item) => <option key={item}>{item}</option>)}</select>
        <label className="file-button">Import geographic JSON<input type="file" accept="application/json,.json" onChange={importMap} /></label>
        <label className="file-button">Import evidence manifest<input type="file" accept="application/json,.json" onChange={importEvidence} /></label>
        <div className="asset-scroll">{filtered.map((asset) => <button key={asset.id} className={`asset-row ${selected?.id === asset.id ? 'selected' : ''}`} onClick={() => { clearSelections(); setSelected(asset); }}><i style={{ background: colorFor[asset.kind] }} /><span>{asset.label}<small>{asset.kind} · {asset.verificationStatus}</small></span></button>)}</div>
      </aside>
      <section className="map">
        <div className="map-toolbar"><button className={isolate ? 'active' : ''} disabled={!selected} onClick={() => setIsolate((value) => !value)}>Isolate dependencies</button><label>Radius <input type="range" min="100" max="1000" step="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></label><span>{radius} m</span></div>
        <Suspense fallback={<div className="map-loading">Loading 3D scene…</div>}><AssetScene assets={displayAssets} dependencies={displayDependencies} footprints={footprints} streets={streets} utilities={utilities} records={records} zones={zones} parcels={parcels} aerialUrl={aerialImageUrl(...origin, radius)} terrainUrl={terrainImageUrl(...origin, radius)} origin={origin} contextRadius={radius} contextOpacity={0.4} selectedId={selected?.id ?? null} selectedUtilityId={selectedUtility?.id ?? null} selectedRecordId={selectedRecord?.id ?? null} selectedZoneId={selectedZone?.id ?? null} selectedParcelId={selectedParcel?.id ?? null} isolate={isolate} onSelect={(asset) => { clearSelections(); setSelected(asset); }} onSelectUtility={(record) => { clearSelections(); setSelectedUtility(record); }} onSelectBuilding={(record) => { clearSelections(); setMapSelection({ kind: 'building', record }); }} onSelectStreet={(record) => { clearSelections(); setMapSelection({ kind: 'street', record }); }} onSelectRecord={(record) => { clearSelections(); setSelectedRecord(record); }} onSelectZone={(record) => { clearSelections(); setSelectedZone(record); }} onSelectParcel={(record) => { clearSelections(); setSelectedParcel(record); }} /></Suspense>
        <p className="map-note">{status}</p>
      </section>
      <aside className="detail-panel">
        {selected ? <><div className="detail-heading"><i style={{ background: colorFor[selected.kind] }} /><div><p className="eyebrow">{selected.kind}</p><h2>{selected.label}</h2></div></div><dl><div><dt>Status</dt><dd className={`status ${selected.status}`}>{selected.status}</dd></div><div><dt>Verification</dt><dd>{selected.verificationStatus} · {selected.reviewState}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>Source location</dt><dd>{selected.sourceLocation}</dd></div></dl><p className="details">{selected.details}</p><section className="relationships"><h3>Direct dependencies</h3>{displayDependencies.filter((edge) => edge.source === selected.id || edge.target === selected.id).map((edge) => <p key={edge.id}>{edge.relation.replaceAll('_', ' ')} · {edge.verificationStatus}</p>)}</section></> : selectedUtility ? <section className="tab-copy"><h3>Public utility context</h3><p>{selectedUtility.kind} · {selectedUtility.attributeSummary}</p><a href={selectedUtility.sourceUrl} target="_blank" rel="noreferrer">Open official record</a></section> : selectedRecord ? <section className="tab-copy"><h3>{selectedRecord.title}</h3><p>{selectedRecord.details}</p><p>{selectedRecord.status}</p><a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">Open official record</a></section> : selectedZone ? <section className="tab-copy"><h3>Public zoning</h3><p>{selectedZone.zone}</p><a href={selectedZone.sourceUrl} target="_blank" rel="noreferrer">Open official record</a></section> : selectedParcel ? <section className="tab-copy"><h3>Public parcel</h3><p>{selectedParcel.label}</p><a href={selectedParcel.sourceUrl} target="_blank" rel="noreferrer">Open official record</a></section> : mapSelection ? <section className="tab-copy"><h3>Public map context</h3><p>{mapSelection.record.name}</p><a href={mapSelection.record.sourceUrl} target="_blank" rel="noreferrer">Open source record</a></section> : <p>Select an asset or context feature.</p>}
      </aside>
    </section>
    <footer>Starter records are demonstrations only. Public GIS context never proves equipment location, ownership, specification, or isolation.</footer>
  </main>;
}
