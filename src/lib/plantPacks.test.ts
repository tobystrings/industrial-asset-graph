import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeEach } from 'vitest';
import { machines } from '../facilityData';
import { captureKitForArea } from './areaKit';
import { applyKeepDecision, graphPatchPreview, graphPatchText } from './reviewPack';
import { cabinetPackageFor, emptyAreaIds, exportAreaWalkPack, areaWalkPackMachineIds } from './plantPacks';
import { recordWalkdownCapture, resetWalkdownStore } from './walkdown';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { reconnectAfterFault } from './productLookup';

describe('review patch and plant packs', () => {
  beforeEach(() => resetWalkdownStore());

  it('emits a graph-patch preview that does not enter the graph', () => {
    const saved = recordWalkdownCapture({ targetId: 'L2-CC-VFD-001', field: 'dest', value: 'typed dest', capturedBy: 'Don' });
    applyKeepDecision(saved!.id);
    const preview = graphPatchPreview(saved!);
    expect(preview.inGraph).toBe(false);
    expect(preview.applied).toBe(false);
    expect(preview.entity).toBe('L2-CC-VFD-001');
    expect(preview.field).toBe('dest');
    expect(preview.proposed).toBe('typed dest');
    expect(preview.inventsDest).toBe(false);
    expect(graphPatchText(preview)).toContain(saved!.id);
    expect(graphPatchText(preview)).toContain('not in graph');
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
    expect(unusedRelationshipCounts().FEEDS).toBe(0);
  });

  it('exports an empty-area walk pack that does not create a machine', () => {
    const dock = emptyAreaIds().find((id) => id === 'area-dock-1');
    expect(dock).toBe('area-dock-1');
    expect(captureKitForArea('area-dock-1')?.kind).toBe('empty');
    recordWalkdownCapture({ targetId: 'area-dock-1', field: 'note', value: 'aisle photo', capturedBy: 'Don' });
    const pack = exportAreaWalkPack('area-dock-1');
    expect(pack?.createsMachine).toBe(false);
    expect(pack?.inGraph).toBe(false);
    expect(pack?.areaId).toBe('area-dock-1');
    expect(areaWalkPackMachineIds(pack!)).toEqual([]);
    expect(machines.some((item) => item.id === 'area-dock-1')).toBe(false);
    const cabinet = cabinetPackageFor('L2-CC-001');
    expect(cabinet?.assetId).toBe('L2-CC-001');
    expect(cabinet?.drawing).toContain('cabinet.svg');
    expect(cabinet?.destUnknown).toBe(true);
    expect(cabinetPackageFor('FG-L4-MTN-001')).toBeNull();
  });

  it('is called from the live Log, empty-area, and cabinet surfaces', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const dashboard = readFileSync(resolve(root, 'Dashboard.tsx'), 'utf8');
    const cabinet = readFileSync(resolve(root, 'ControlCabinetView.tsx'), 'utf8');
    const css = readFileSync(resolve(root, 'dashboard.css'), 'utf8');
    const app = readFileSync(resolve(root, 'App.tsx'), 'utf8');
    const presentation = readFileSync(resolve(root, '..', 'presentation', 'index.html'), 'utf8');
    expect(dashboard).toContain('graphPatchPreview');
    expect(dashboard).toContain('graphPatchText');
    expect(dashboard).toContain('exportAreaWalkPack');
    expect(dashboard).toContain('data-testid="graph-patch-preview"');
    expect(dashboard).toContain('data-testid="export-area-pack"');
    expect(cabinet).toContain('cabinetPackageFor');
    expect(cabinet).toContain('data-testid="cabinet-package"');
    expect(cabinet).toContain('cabinet-back');
    expect(cabinet).toContain('cabinet-back-label');
    expect(cabinet).toContain('Presentation ↗');
    expect(cabinet).toContain('target="_blank"');
    expect(cabinet).not.toContain('Open 3D');
    const walkdown = readFileSync(resolve(root, 'WalkdownForm.tsx'), 'utf8');
    expect(walkdown).toContain('useState(walkdownMoreDefaultOpen)');
    expect(walkdown).toContain('onToggle');
    expect(walkdown).toContain('setMoreOpen');
    expect(css).toContain('.cabinet-back-label { display: none; }');
    expect(app).not.toContain('FilmTheater');
    expect(app).not.toContain('has-genie-dock');
    expect(dashboard).toContain('standalonePresentationHref');
    expect(dashboard).toContain('target="_blank"');
    expect(dashboard).toContain('genieQueryFromSearch');
    expect(dashboard).toContain('...genieQueryFromSearch(location.search)');
    expect(presentation.match(/data-scene="\d+"/g)).toHaveLength(11);
    expect(new Set(presentation.match(/data-scene="\d+"/g))).toHaveLength(11);
    expect(presentation).toContain('class="scene board-scene" data-scene="9"');
  });
});
