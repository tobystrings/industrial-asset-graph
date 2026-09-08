import { describe, expect, it } from 'vitest';
import buildLiebFoodsPackage from '../../facilities/lieb-foods';
import { componentAssembly, componentDocuments, linkedComponents, modelAsset, modelAssets, publicGraphHref, readModelState } from './wulftecGraph';

function fixture() {
  const plant = structuredClone(buildLiebFoodsPackage());
  const asset = { ...plant.assets[0], id: 'test-wrapper', name: 'Test wrapper', manufacturer: { value: 'Wulftec', verificationStatus: 'FIELD_VERIFY' as const, evidenceIds: [] }, model: { value: 'WCRT-200', verificationStatus: 'FIELD_VERIFY' as const, evidenceIds: [] }, componentIds: ['test-wrapper-CABINET', 'test-wrapper-PRESTRETCH'] };
  const component = { id: 'test-wrapper-PRESTRETCH', parentId: asset.id, label: 'Carriage', type: 'MECHANICAL_ASSEMBLY', verificationStatus: 'DISPUTED' as const, evidenceIds: ['source'] };
  plant.assets.push(asset); plant.components.push(component);
  plant.documents.push({ id: 'component-doc', assetId: asset.id, title: 'Carriage drawing', path: 'indexeddb://attachment/test', evidenceIds: ['source'], verificationStatus: 'FIELD_VERIFY', state: 'REVIEW', required: false, category: 'Drawing' });
  return { plant, asset, component };
}
describe('Wulftec graph associations', () => {
  it('uses existing records, retains uncertainty, and does not mutate the graph', () => {
    const { plant, asset, component } = fixture(); const before = JSON.stringify(plant);
    expect(modelAsset(plant, null)?.id).toBe(asset.id);
    expect(linkedComponents(plant, asset, 'carriage')).toEqual([component]);
    expect(linkedComponents(plant, asset, 'rollers')).toEqual([component]);
    expect(componentAssembly(asset, component)).toBe('carriage');
    expect(linkedComponents(plant, asset, 'frame')).toEqual([]);
    expect(linkedComponents(plant, asset, '__proto__')).toEqual([]);
    expect(componentDocuments(plant, asset, component).map(d => d.id)).toEqual(['component-doc']);
    expect(JSON.stringify(plant)).toBe(before);
  });
  it('does not substitute a different asset, cross facility boundaries, or guess an ambiguous machine', () => {
    const { plant, asset, component } = fixture();
    expect(modelAsset(plant, 'missing')).toBeUndefined();
    plant.assets.push({ ...asset, id: 'second-wrapper', componentIds: [] });
    expect(modelAsset(plant, null)).toBeUndefined();
    expect(linkedComponents(plant, plant.assets.at(-1)!, 'carriage')).toEqual([]);
    plant.facility.id = 'another-facility';
    expect(modelAssets(plant)).toEqual([]);
    expect(linkedComponents(plant, asset, 'carriage')).toEqual([]);
    expect(componentDocuments(plant, asset, { ...component, parentId: 'another-asset' })).toEqual([]);
  });
  it('only links matching documents owned by the selected equipment', () => {
    const { plant, asset, component } = fixture();
    const doc = plant.documents.at(-1)!;
    plant.documents.push({ ...doc, id: 'other-equipment-doc', assetId: 'other' });
    plant.documents.push({ ...doc, id: 'machine-only', evidenceIds: [] });
    expect(componentDocuments(plant, asset, component).map(d => d.id)).toEqual(['component-doc']);
  });
  it('carries model selection into the app and bounds malformed URL state', () => {
    expect(readModelState('?assembly=__proto__&explode=NaN')).toEqual({ selected: '', scope: 'machine', explosion: 0 });
    expect(readModelState('?assembly=cabinet&scope=carriage&explode=900')).toEqual({ selected: '', scope: 'carriage', explosion: 100 });
    const state = readModelState('?assembly=rollers&scope=carriage&explode=70');
    const url = new URL(publicGraphHref('?asset=test-wrapper&facilityId=site-two&password=omit', state, 'https:', 'https://example.com'));
    expect(url.pathname).toBe('/industrial-asset-graph/');
    expect(url.searchParams.get('assembly')).toBe('rollers');
    expect(url.searchParams.get('facilityId')).toBe('site-two');
    expect(url.searchParams.has('password')).toBe(false);
  });
});
