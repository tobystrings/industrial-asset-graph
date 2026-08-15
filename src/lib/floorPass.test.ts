import { describe, expect, it, beforeEach } from 'vitest';
import { areas, machines } from '../facilityData';
import { applyKeepDecision } from './reviewPack';
import { applyKeptCapture, recordWalkdownCapture, resetWalkdownStore } from './walkdown';
import { todayWalkdownItems } from './walkdownPrompts';
import {
  applyConfirmText,
  coverageSubtitle,
  destUnknownOpenCount,
  importSkipSummary,
  intelFocusTitle,
  panToDeviceFromRects,
  panToDeviceTransform,
  queueCountLabel,
  todayItemState,
  todayProgress,
} from './floorPass';
import { documentedAreaCount, graphFieldItemCount, openFieldItemCount } from './facilityMetrics';
import { line2DriveInstances } from './driveInstances';

describe('floor-pass helpers', () => {
  beforeEach(() => resetWalkdownStore());

  it('tracks today walk state without overlaying dest on keep', () => {
    const dest = todayWalkdownItems().find((item) => item.id === 'L2-CC-VFD-001' && item.kind === 'dest-unknown')!;
    expect(todayItemState(dest)).toBe('open');
    const saved = recordWalkdownCapture({ targetId: 'L2-CC-VFD-001', field: 'dest', value: 'typed dest', capturedBy: 'Don' });
    expect(todayItemState(dest)).toBe('captured');
    applyKeepDecision(saved!.id);
    expect(todayItemState(dest)).toBe('kept');
    expect(line2DriveInstances().find((item) => item.componentId === 'L2-CC-VFD-001')?.destId).toBeNull();
    applyKeptCapture(saved!.id);
    expect(todayItemState(dest)).toBe('applied');
    expect(line2DriveInstances().find((item) => item.componentId === 'L2-CC-VFD-001')?.destId).toBe('typed dest');
    const progress = todayProgress();
    expect(progress.total).toBe(todayWalkdownItems().length);
    expect(progress.applied + progress.kept + progress.captured + progress.open).toBe(progress.total);
  });

  it('names apply as a local overlay and keeps coverage honest', () => {
    expect(applyConfirmText({ field: 'dest', targetId: 'L2-CC-VFD-001' }).toLowerCase()).toContain('dest-unknown');
    expect(applyConfirmText({ field: 'dest', targetId: 'L2-CC-VFD-001' }).toLowerCase()).toContain('not written to the graph');
    expect(coverageSubtitle()).toBe(`${documentedAreaCount()} of ${areas.length} areas has assets`);
    expect(queueCountLabel(null)).toBe(`${graphFieldItemCount(null)} in the graph · ${openFieldItemCount(null)} open on this phone`);
    expect(destUnknownOpenCount()).toBe(line2DriveInstances().filter((item) => !item.destId).length);
    expect(intelFocusTitle('vfd-01')).toContain('dest-unknown');
    expect(importSkipSummary(2, 3)).toContain('3 skipped');
    const pan = panToDeviceTransform({ x: 100, y: 40, width: 20, height: 20 }, { width: 400, height: 300 }, 2);
    expect(pan.scale).toBe(2);
    expect(pan.x).toBe(400 / 2 - 110 * 2);
    const fromRects = panToDeviceFromRects(
      { left: 200, top: 100, width: 20, height: 20 },
      { left: 0, top: 0, width: 400, height: 300 },
      { x: 0, y: 0, scale: 1 },
      2,
    );
    expect(fromRects.scale).toBe(2);
    expect(fromRects.x).toBe(400 / 2 - 210 * 2);
    expect(machines.length).toBe(2);
  });
});
