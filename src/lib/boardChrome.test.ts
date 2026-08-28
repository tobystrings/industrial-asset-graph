import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDeviceQuery } from './deviceQuery';
import { assetDocumentationCompleteness, documentationCoveragePercent, documentedAreaCount } from './facilityMetrics';
import { filmChapterForAsset } from './filmBridge';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { searchCatalog } from './searchIndex';
import { isWireInstruction, silkEquivalents, silkMapText } from './silkMap';
import { capturedPlantFacts, recordWalkdownCapture, resetWalkdownStore } from './walkdown';
import { reconnectAfterFault } from './productLookup';
import {
  KEPT_SURFACES,
  MIN_HIT_TARGET_PX,
  chromeAtWidth,
  destUnknownHighlight,
  PHONE_CABINET_LIST_HIDE,
  phoneBarFits,
  phoneCabinetCssAllowsChips,
  phoneTargetsMeetMinimum,
  dualNavHidden,
  inspectorVisible,
  cycleInspectorTab,
  parseInspectorTab,
  phoneCabinetOrder,
  railBodyScrolls,
  railColumnWidth,
} from './boardChrome';
import activeFacilityPackage from '../facility/activeFacility';
const { areas } = activeFacilityPackage;

describe('board chrome helpers', () => {
  it('maps query tabs onto overview / capture / intel / record / docs / activity', () => {
    expect(parseInspectorTab('queue')).toBe('capture');
    expect(parseInspectorTab('overview')).toBe('overview');
    expect(parseInspectorTab('intel')).toBe('intel');
    expect(parseInspectorTab('docs')).toBe('docs');
    expect(parseInspectorTab('log')).toBe('activity');
    expect(parseInspectorTab(null)).toBe('overview');
    expect(cycleInspectorTab('overview', 1)).toBe('capture');
    expect(cycleInspectorTab('overview', -1)).toBe('activity');
    expect(inspectorVisible('capture', 'unknowns')).toBe(true);
    expect(inspectorVisible('capture', 'intel')).toBe(false);
    expect(inspectorVisible('intel', 'intel')).toBe(true);
    expect(inspectorVisible('overview', 'verification')).toBe(true);
    expect(inspectorVisible('docs', 'docs')).toBe(true);
    expect(inspectorVisible('activity', 'activity')).toBe(true);
    expect(inspectorVisible('intel', 'banner')).toBe(true);
  });

  it('keeps a nav path at plant-laptop and phone widths', () => {
    const desk = chromeAtWidth(1366);
    expect(desk.sidebar).toBe('inline');
    expect(desk.topNav).toBe('inline');
    expect(desk.inspectorTabs).toBe(true);
    expect(desk.mapMinHeight).toBeGreaterThanOrEqual(360);
    expect(dualNavHidden(1366)).toBe(false);
    const tablet = chromeAtWidth(900);
    expect(tablet.sidebar).toBe('drawer');
    expect(tablet.topNav).toBe('inline');
    expect(dualNavHidden(900)).toBe(false);
    const phone = chromeAtWidth(390);
    expect(phone.bottomNav).toBe(true);
    expect(phone.kpi).toBe('compact');
    expect(phone.relationships).toBe('in-intel');
    expect(dualNavHidden(390)).toBe(false);
    expect(phoneCabinetOrder()).toEqual(['devices', 'detail', 'drawing']);
    expect(MIN_HIT_TARGET_PX).toBe(44);
    const fit = phoneBarFits(390);
    expect(fit.tabs).toBe(6);
    expect(fit.nav).toBe(5);
    expect(fit.tabWidth).toBeGreaterThanOrEqual(44);
    expect(fit.navWidth).toBeGreaterThanOrEqual(44);
    expect(phoneTargetsMeetMinimum(390)).toBe(true);
    expect(railColumnWidth(1366)).toBe(360);
    expect(railColumnWidth(1600)).toBe(380);
    expect(railColumnWidth(390)).toBe(390);
    expect(railBodyScrolls()).toBe(true);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../dashboard.css'), 'utf8');
    expect(css).toContain('.rail-body');
    expect(/\.rail\s*\{[^}]*overflow:\s*hidden/.test(css.replace(/\s+/g, ' '))).toBe(true);
    expect(PHONE_CABINET_LIST_HIDE).toContain(':not(.device-chips)');
    expect(phoneCabinetCssAllowsChips(css)).toBe(true);
    expect(css).toContain(PHONE_CABINET_LIST_HIDE);
  });

  it('keeps every criterion-1 surface named and honesty helpers intact', () => {
    expect(KEPT_SURFACES).toContain('walkdown');
    expect(KEPT_SURFACES).toContain('device-intel');
    expect(KEPT_SURFACES).toContain('film');
    expect(KEPT_SURFACES).toContain('systems');
    const unused = unusedRelationshipCounts();
    expect(unused.FEEDS).toBe(0);
    expect(unused.CONTROLS).toBe(0);
    expect(unused.SENSES).toBe(0);
    expect(unused.INTERLOCKS_WITH).toBe(0);
    expect(parseDeviceQuery('vfd-01')?.componentId).toBe('L2-CC-VFD-001');
    expect(filmChapterForAsset('L2-CC-001')).toEqual({ scene: 5, path: 'line2' });
    const silk = silkMapText(silkEquivalents('family-powerflex-4', 'family-mitsubishi-d700'));
    expect(silk).toContain('A1 ≈ 1');
    expect(isWireInstruction(silk)).toBe(false);
    expect(destUnknownHighlight('vfd-01', null)).toBe('is-dest-unknown');
    expect(destUnknownHighlight('vfd-01', 'AO-1')).toBe('');
  });

  it('does not invent dest on walkdown and still finds markdown-only phrases', () => {
    resetWalkdownStore();
    recordWalkdownCapture({ targetId: 'L2-CC-VFD-001', field: 'note', value: 'walkdown note', capturedBy: 'Don' });
    const facts = capturedPlantFacts('L2-CC-VFD-001');
    expect(facts.dest).toBeNull();
    expect(facts.motor).toBeNull();
    expect(facts.recovery).toBeNull();
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
    expect(reconnectAfterFault('L2-CC-VFD-001').signals.every((item) => item.destId === null)).toBe(true);
    expect(searchCatalog('searchable asset entry').some((hit) => hit.documentId === 'doc-l2-overview')).toBe(true);
    expect(documentationCoveragePercent()).toBe(Math.round((documentedAreaCount() / areas.length) * 100));
    expect(assetDocumentationCompleteness().every((row) => Number.isFinite(row.percent))).toBe(true);
  });
});
