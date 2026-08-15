import { describe, expect, it, beforeEach } from 'vitest';
import { areas, components, documentationPercent, machines } from '../facilityData';
import { productFamilies, productManuals } from '../productCatalog';
import { captureKitForArea } from './areaKit';
import { parseDeviceQuery } from './deviceQuery';
import { line2DriveInstances } from './driveInstances';
import { assetDocumentationCompleteness, documentationCoveragePercent, documentedAreaCount } from './facilityMetrics';
import { faultCardFor } from './faultCard';
import { filmChapterForAsset, filmEmbedSrc } from './filmBridge';
import { line2FloorPacket } from './floorPacket';
import { line2PlcRack } from './plcRack';
import { familyForComponent, manualForFamily, reconnectAfterFault } from './productLookup';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { searchCatalog } from './searchIndex';
import { serialSourcesDisagree, serialSourcesFor } from './serialSources';
import { isWireInstruction, silkEquivalents, silkMapText } from './silkMap';
import { capturedPlantFacts, recordWalkdownCapture, resetWalkdownStore } from './walkdown';

describe('field features on shipped helpers', () => {
  beforeEach(() => {
    resetWalkdownStore();
  });

  it('persists a walkdown capture without inventing dest, motor, or recovery', () => {
    const saved = recordWalkdownCapture({
      targetId: 'L2-CC-VFD-001',
      field: 'note',
      value: 'Nameplate photographed on walkdown',
      capturedBy: 'Don',
      photoRef: 'local/vfd01-nameplate.jpg',
    });
    expect(saved?.value).toBe('Nameplate photographed on walkdown');
    expect(saved?.photoRef).toBe('local/vfd01-nameplate.jpg');
    const invented = recordWalkdownCapture({
      targetId: 'L2-CC-VFD-001',
      field: 'dest',
      value: '   ',
      capturedBy: 'Don',
    });
    expect(invented).toBeNull();
    const facts = capturedPlantFacts('L2-CC-VFD-001');
    expect(facts.dest).toBeNull();
    expect(facts.motor).toBeNull();
    expect(facts.recovery).toBeNull();
  });

  it('keeps eight Line 2 VFD slots and only CONV labels on 6 and 7', () => {
    const slots = line2DriveInstances();
    expect(slots).toHaveLength(8);
    expect(slots.map((item) => item.componentId)).toEqual(components.filter((item) => item.id.startsWith('L2-CC-VFD-')).map((item) => item.id));
    expect(slots.find((item) => item.index === 6)?.loadLabel).toBe('CONV #6');
    expect(slots.find((item) => item.index === 7)?.loadLabel).toBe('CONV #7');
    expect(slots.filter((item) => item.loadLabel).map((item) => item.index)).toEqual([6, 7]);
    expect(slots.every((item) => item.motorHp === null && item.destId === null)).toBe(true);
  });

  it('shows L4 serial sources as two DISPUTED values that disagree', () => {
    const sources = serialSourcesFor('FG-L4-MTN-001');
    expect(sources).toHaveLength(2);
    expect(sources.map((item) => item.value).sort()).toEqual(['1619A', 'MT081619A']);
    expect(sources.every((item) => item.verificationStatus === 'DISPUTED')).toBe(true);
    expect(serialSourcesDisagree('FG-L4-MTN-001')).toBe(true);
    expect(machines.find((item) => item.id === 'FG-L4-MTN-001')?.serialNumber.verificationStatus).toBe('DISPUTED');
  });

  it('reports unused relationship types as 0 on live data', () => {
    const counts = unusedRelationshipCounts();
    expect(counts.FEEDS).toBe(0);
    expect(counts.CONTROLS).toBe(0);
    expect(counts.SENSES).toBe(0);
    expect(counts.INTERLOCKS_WITH).toBe(0);
  });

  it('maps A1 to 1 as equivalent language, not a wire instruction', () => {
    const map = silkEquivalents('family-powerflex-4', 'family-mitsubishi-d700');
    expect(map.pairs.some((item) => item.fromSilk === 'A1' && item.toSilk === '1')).toBe(true);
    const text = silkMapText(map);
    expect(text).toContain('A1 ≈ 1');
    expect(text.toLowerCase()).toContain('not a wiring instruction');
    expect(isWireInstruction(text)).toBe(false);
    expect(isWireInstruction('wire A1 to 1')).toBe(true);
  });

  it('keeps dest-null fault cards FIELD_VERIFY with no recovery steps', () => {
    const card = faultCardFor('L2-CC-VFD-001');
    expect(card.status).toBe('FIELD_VERIFY');
    expect(card.signals.every((item) => item.destId === null)).toBe(true);
    expect(card.recoverySteps).toEqual([]);
    expect(card.troubleshootingState).toBe('NOT_STARTED');
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
  });

  it('does not point PowerFlex 70 at the PowerFlex 4 manual path', () => {
    const family = familyForComponent('FG-L4-VFD-001');
    const manual = family ? manualForFamily(family.id) : null;
    expect(family?.model).toBe('PowerFlex 70');
    expect(manual?.path).toBe('docs/manuals/powerflex-70-terminals.md');
    expect(manual?.path).not.toBe('docs/manuals/powerflex-4-terminals.md');
    const pf4 = productManuals.find((item) => item.id === 'manual-pf4-terminals');
    expect(pf4?.path).toBe('docs/manuals/powerflex-4-terminals.md');
    expect(productFamilies.find((item) => item.id === 'family-powerflex-70')?.manualId).toBe('manual-pf70-terminals');
  });

  it('finds a phrase that exists only in a cabinet markdown body', () => {
    const hits = searchCatalog('searchable asset entry');
    expect(hits.some((hit) => hit.kind === 'document' && hit.documentId === 'doc-l2-overview')).toBe(true);
  });

  it('builds a Line 2 packet with device ids, dest-unknown, and FIELD_VERIFY', () => {
    const packet = line2FloorPacket();
    expect(packet.deviceIds).toContain('L2-CC-VFD-001');
    expect(packet.deviceIds).toContain('L2-CC-PLC-001');
    expect(packet.text).toContain('L2-CC-VFD-001');
    expect(packet.text.toLowerCase()).toContain('dest-unknown');
    expect(packet.text).toContain('FIELD_VERIFY');
    expect(packet.html).toContain('L2-CC-VFD-001');
    expect(packet.html.toLowerCase()).toContain('dest-unknown');
    expect(packet.html).toContain('FIELD_VERIFY');
    expect(packet.destUnknown.every((item) => item.sourceId.startsWith('L2-CC'))).toBe(true);
  });

  it('opens the Line 2 film chapter at scene 5 / path=line2', () => {
    const chapter = filmChapterForAsset('L2-CC-001');
    expect(chapter).toEqual({ scene: 5, path: 'line2' });
    expect(filmEmbedSrc(chapter?.scene, { path: chapter?.path })).toContain('scene=5');
    expect(filmEmbedSrc(chapter?.scene, { path: chapter?.path })).toContain('path=line2');
  });

  it('parses vfd-01 as the existing Line 2 VFD component', () => {
    const parsed = parseDeviceQuery('vfd-01');
    expect(parsed?.deviceId).toBe('vfd-01');
    expect(parsed?.componentId).toBe('L2-CC-VFD-001');
    expect(components.some((item) => item.id === parsed?.componentId)).toBe(true);
  });

  it('derives coverage from live records the same way the UI does', () => {
    const completeness = assetDocumentationCompleteness();
    expect(completeness.map((item) => item.assetId).sort()).toEqual(machines.map((item) => item.id).sort());
    for (const row of completeness) {
      expect(row.percent).toBe(documentationPercent(row.assetId));
    }
    expect(documentationCoveragePercent()).toBe(Math.round((documentedAreaCount() / areas.length) * 100));
  });

  it('gives empty areas a capture kit and documented areas none', () => {
    const empty = captureKitForArea('area-dock-1');
    expect(empty?.kind).toBe('empty');
    expect(empty?.prompts.length).toBeGreaterThan(0);
    expect(captureKitForArea('area-warehouse-f')?.kind).toBe('has-assets');
  });

  it('lists the Line 2 PLC rack with no invented addresses and servo family stubs', () => {
    const rack = line2PlcRack();
    expect(rack.some((item) => item.componentId === 'L2-CC-PLC-001')).toBe(true);
    expect(rack.every((item) => item.address === null)).toBe(true);
    expect(familyForComponent('FG-L4-SD13041')?.kind).toBe('SERVO');
    expect(manualForFamily('family-l4-servo')?.excerpt.toLowerCase()).toContain('not in this build');
  });
});
