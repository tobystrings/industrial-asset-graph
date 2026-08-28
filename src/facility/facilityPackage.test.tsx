import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { FacilityProvider, selectFacilityPackage, useFacility } from '.';
import type { FacilityPackage } from './types';

function validatePackage(pkg: FacilityPackage) {
  expect(pkg.areas.some((area) => area.id === pkg.featureConfig.defaultAreaId)).toBe(true);
  expect(pkg.assets.some((asset) => asset.id === pkg.featureConfig.featuredCabinetAssetId)).toBe(true);
  expect(pkg.assets.some((asset) => asset.id === pkg.featureConfig.featuredMachineAssetId)).toBe(true);
  for (const asset of pkg.assets) {
    expect(asset.facilityId).toBe(pkg.facility.id);
    expect(pkg.areas.some((area) => area.id === asset.areaId)).toBe(true);
  }
}

function FacilityName() {
  return <span>{useFacility().facility.name}</span>;
}

describe('facility package boundary', () => {
  it('accepts a non-Lieb facility package with valid runtime defaults', () => {
    validatePackage(demoFacilityPackage);
    const serialized = JSON.stringify(demoFacilityPackage);
    expect(serialized).not.toContain('J. Lieb');
    expect(serialized).not.toContain('L2-CC');
    expect(serialized).not.toContain('FG-L4');
    expect(serialized).not.toContain('Warehouse F');
  });

  it('selects a non-Lieb package through the canonical contract', () => {
    const selected = selectFacilityPackage('demo-plant');
    expect(selected.facility.name).toBe('Demo Plant');
    expect(selected.assets.map((asset) => asset.id)).toEqual(['DEMO-MCH-001', 'DEMO-CAB-001']);
    expect(selected.areas.map((area) => area.id)).toEqual(['area-demo-floor']);
    expect(selected.assetSerialSources).toEqual([]);
  });

  it('keeps Lieb as the default deployment package', () => {
    expect(selectFacilityPackage(undefined).facility.name).toBe('J. Lieb Foods');
  });

  it('lets the provider inject the demo facility without changing framework code', () => {
    const html = renderToStaticMarkup(
      <FacilityProvider value={demoFacilityPackage}>
        <FacilityName />
      </FacilityProvider>,
    );
    expect(html).toContain('Demo Plant');
  });
});
