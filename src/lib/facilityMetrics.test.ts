import { describe, expect, it, beforeEach } from 'vitest';
import { areas, machines } from '../facilityData';
import { documentedAreaCount, documentedAssetCount, documentationCoveragePercent, factSources, filterAssets, isDimmed, graphFieldItemCount, openFieldItemCount, recordCount, totalTrackedFacts, verificationCounts } from './facilityMetrics';
import { resetWalkdownStore } from './walkdown';

describe('facilityMetrics', () => {
  beforeEach(() => resetWalkdownStore());

  it('reports facility-wide KPI counts from live data with no selection', () => {
    expect(machines.length).toBe(2);
    expect(areas.length).toBe(15);
    expect(documentedAssetCount()).toBe(2);
    expect(documentedAreaCount()).toBe(areas.filter((area) => area.assetIds.length > 0).length);
    expect(documentationCoveragePercent()).toBe(Math.round((documentedAreaCount() / areas.length) * 100));
    expect(graphFieldItemCount(null)).toBe(machines.reduce((sum, item) => sum + item.unknowns.length, 0));
    expect(openFieldItemCount(null)).toBe(graphFieldItemCount(null));
    expect(recordCount()).toBe(24);
    expect(totalTrackedFacts(null)).toBeGreaterThan(0);
    const counts = verificationCounts(null);
    expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(totalTrackedFacts(null));
    expect(factSources(null).length).toBe(totalTrackedFacts(null));
  });

  it('dims a verification state when its filter is off', () => {
    const filters = new Set(['VERIFIED', 'INFERRED', 'DISPUTED', 'RETIRED'] as const);
    expect(isDimmed('FIELD_VERIFY', new Set(filters))).toBe(true);
    expect(isDimmed('VERIFIED', new Set(filters))).toBe(false);
    expect(filterAssets(new Set(filters)).every((asset) => asset.verificationStatus !== 'FIELD_VERIFY')).toBe(true);
    expect(filterAssets(new Set(['FIELD_VERIFY'] as const)).length).toBe(2);
  });
});
