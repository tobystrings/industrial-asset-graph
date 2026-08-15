import { describe, expect, it, beforeEach } from 'vitest';
import { components } from '../facilityData';
import { doorSheetCards, doorSheetText } from './doorSheet';
import { evidenceFingerprint } from './evidenceHash';
import { filmHonestyForAsset } from './filmBridge';
import { floorPacketFor, l4FloorPacket } from './floorPacket';
import { himBackupStatus } from './himBackup';
import { ioChannelsFor } from './ioChannels';
import { unusedRelationshipCounts, suppliesHonesty } from './relationshipHonesty';
import { decideReview, exportReviewPack, importReviewPack, parseReviewPack } from './reviewPack';
import { searchCatalog } from './searchIndex';
import { visiblePartsFor } from './visibleParts';
import { promptForUnknown, todayWalkdownItems } from './walkdownPrompts';
import { latestNoteFor, markUnknownCaptured, recordWalkdownCapture, resetWalkdownStore, unknownQueueState } from './walkdown';

describe('recommendation helpers on shipped code', () => {
  beforeEach(() => resetWalkdownStore());

  it('exports a review pack that stays out of the graph and can be imported', () => {
    recordWalkdownCapture({ targetId: 'L2-CC-VFD-001', field: 'note', value: 'walkdown note', capturedBy: 'Don' });
    const pack = exportReviewPack();
    expect(pack.inGraph).toBe(false);
    expect(pack.captures.length).toBeGreaterThan(0);
    const parsed = parseReviewPack(JSON.stringify(pack));
    expect(parsed?.inGraph).toBe(false);
    resetWalkdownStore();
    expect(importReviewPack(parsed!)).toBeGreaterThan(0);
    expect(latestNoteFor('L2-CC-VFD-001')?.value).toBe('walkdown note');
    const decided = decideReview(pack.captures[0].id, 'keep');
    expect(decided?.review).toBe('keep');
  });

  it('merges queue state from captures and does not invent dest', () => {
    expect(unknownQueueState('L2-CC-001', 'Confirm cabinet asset ID')).toBe('open');
    markUnknownCaptured('L2-CC-001', 'Confirm cabinet asset ID', 'Don');
    expect(unknownQueueState('L2-CC-001', 'Confirm cabinet asset ID')).toBe('captured');
    expect(latestNoteFor('L2-CC-001:Confirm cabinet asset ID')?.field).toBe('unknown');
  });

  it('picks a prompt per unknown without inventing dest or LOTO', () => {
    expect(promptForUnknown('Confirm cabinet asset ID').field).toBe('serial');
    expect(promptForUnknown('VFD motor assignment').field).toBe('motor');
    expect(promptForUnknown('Document Line 2 recovery and troubleshooting procedures').field).toBe('recovery');
    expect(promptForUnknown('Machine LOTO points').hint.toLowerCase()).toContain('field_verify');
    const dest = promptForUnknown('Verify wiring and network topology');
    expect(dest.field).toBe('dest');
    expect(dest.placeholder.toLowerCase()).toContain('blank');
  });

  it('builds L4 packet, today sheet, and door links from live records', () => {
    const packet = l4FloorPacket();
    expect(packet.assetId).toBe('FG-L4-MTN-001');
    expect(packet.deviceIds).toContain('FG-L4-VFD-001');
    expect(packet.text).toContain('DISPUTED');
    expect(packet.text.toLowerCase()).toContain('dest-unknown');
    expect(floorPacketFor('L2-CC-001').assetId).toBe('L2-CC-001');
    const today = todayWalkdownItems();
    expect(today.some((item) => item.kind === 'area-kit')).toBe(true);
    expect(today.some((item) => item.kind === 'serial')).toBe(true);
    expect(today.some((item) => item.kind === 'dest-unknown')).toBe(true);
    expect(today.some((item) => item.kind === 'loto')).toBe(true);
    const cards = doorSheetCards('https://example.test');
    expect(cards.some((card) => card.deviceId === 'vfd-01' && card.href.includes('device=vfd-01'))).toBe(true);
    expect(cards.some((card) => card.deviceId === 'plc-micrologix-1400')).toBe(true);
    expect(doorSheetText(cards)).toContain('device=vfd-01');
  });

  it('keeps I/O channels, HIM, parts, supplies, and L4 film honest', () => {
    const channels = ioChannelsFor('1762-IA8');
    expect(channels).toHaveLength(8);
    expect(channels.every((item) => item.address === null)).toBe(true);
    expect(himBackupStatus('L2-CC-VFD-001').stored).toBe(false);
    expect(visiblePartsFor('L2-CC-001').every((item) => item.source === 'drawing')).toBe(true);
    expect(visiblePartsFor('L2-CC-001').map((item) => item.id)).toEqual(components.filter((item) => item.parentId === 'L2-CC-001').map((item) => item.id));
    expect(unusedRelationshipCounts().SUPPLIES).toBe(0);
    expect(suppliesHonesty().note).toContain('upstream');
    expect(filmHonestyForAsset('FG-L4-MTN-001').kind).toBe('intro-only');
    expect(filmHonestyForAsset('L2-CC-001').kind).toBe('chapter');
  });

  it('ranks dest-unknown ahead of film for A1 and hashes evidence without bundling', async () => {
    const hits = searchCatalog('A1');
    expect(hits[0]?.subtitle?.toLowerCase()).toContain('dest-unknown');
    const filmAt = hits.findIndex((hit) => hit.kind === 'film');
    if (filmAt >= 0) expect(filmAt).toBeGreaterThan(0);
    const print = await evidenceFingerprint('local/vfd01-nameplate.jpg', 'not-a-real-photo');
    expect(print.bundled).toBe(false);
    expect(print.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(print.filename).toBe('local/vfd01-nameplate.jpg');
  });
});
