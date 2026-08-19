import { forwardRef } from 'react';
import FloorPacket from '../FloorPacket';
import SelectedAssetPanel from './SelectedAssetPanel';
import { INSPECTOR_TABS, type InspectorTab } from '../lib/boardChrome';
import { applyConfirmText, importSkipSummary } from '../lib/floorPass';
import { totalTrackedFacts } from '../lib/facilityMetrics';
import { applyKeepDecision, decideReview, filterReviewCaptures, graphPatchPreview, graphPatchText, importReviewPackResult, keepPatchSummary, keepPatchText, parseReviewPack, reviewPackJson } from '../lib/reviewPack';
import { markerClass } from '../lib/statusMark';
import { applyKeptCapture, localActivityCaptures } from '../lib/walkdown';
import type { FacilityArea, FacilityAsset, ReviewDecision, VerificationState } from '../types/facility';
import type { todayChipTarget } from '../lib/walkdownPrompts';

type TraceNode = { id: string; label: string };

type Revision = { id: string; reason: string; changedBy: string; changedAt: string };
type EvidenceLike = { id?: string };

const stateLabel: Record<string, string> = {
  COMPLETE: 'Complete', REVIEW: 'Review', IN_PROGRESS: 'In progress', DRAFT: 'Draft', NOT_STARTED: 'Not started',
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

function StatusI({ status }: { status: string }) {
  return <i className={markerClass(status as VerificationState)} aria-hidden="true" />;
}

type Props = {
  inspectorTab: InspectorTab;
  onInspectorTab: (tab: InspectorTab) => void;
  nodes: TraceNode[];
  filters: Set<VerificationState>;
  shownCounts: Record<VerificationState, number>;
  selectedAsset: FacilityAsset | null;
  selectedArea: FacilityArea | null;
  activeDocument: string | null;
  onDocument: (id: string | null) => void;
  onOpenCabinet: () => void;
  packetOpen: boolean;
  packetAsset: string;
  onPacket: (assetId: string) => void;
  onClosePacket: () => void;
  focusCabinet: boolean;
  onFocusCabinet: () => void;
  onDoorSheet: () => void;
  onCapture: () => void;
  onTrace: () => void;
  openUnknown: string | null;
  onOpenUnknown: (id: string | null) => void;
  focusDevice: string | null;
  todayIndex: number;
  onTodayIndex: (index: number) => void;
  onTodayJump: (jump: ReturnType<typeof todayChipTarget>) => void;
  captureTick: number;
  reviewFilter: 'all' | ReviewDecision;
  onReviewFilter: (filter: 'all' | ReviewDecision) => void;
  lastKeepPatch: string | null;
  onLastKeepPatch: (value: string | null) => void;
  lastKeepSummary: string | null;
  onLastKeepSummary: (value: string | null) => void;
  lastPreviewPatch: string | null;
  onLastPreviewPatch: (value: string | null) => void;
  importNote: string | null;
  onImportNote: (value: string | null) => void;
  applyWarning: string | null;
  onApplyWarning: (value: string | null) => void;
  revisions: Revision[];
  evidence: EvidenceLike[];
};

const InspectorRail = forwardRef<HTMLDivElement, Props>(function InspectorRail({
  inspectorTab, onInspectorTab, nodes, filters, shownCounts, selectedAsset, selectedArea,
  activeDocument, onDocument, onOpenCabinet, packetOpen, packetAsset, onPacket, onClosePacket,
  focusCabinet, onFocusCabinet, onDoorSheet, onCapture, onTrace, openUnknown, onOpenUnknown,
  focusDevice, todayIndex, onTodayIndex, onTodayJump, captureTick, reviewFilter, onReviewFilter,
  lastKeepPatch, onLastKeepPatch, lastKeepSummary, onLastKeepSummary, lastPreviewPatch,
  onLastPreviewPatch, importNote, onImportNote, applyWarning, onApplyWarning, revisions, evidence,
}, railRef) {
  const selectedFactTotal = totalTrackedFacts(selectedAsset);

  return (
    <div className={`rail tab-${inspectorTab}`} data-testid="inspector-rail">
      <div className="rail-chrome">
        <div className="phone-trace" data-testid="phone-trace">{nodes.map((node) => <span key={node.id}>{node.label}</span>)}</div>
        <div className="inspector-tabs" data-testid="inspector-tabs">
          {INSPECTOR_TABS.map((tab) => (
            <button key={tab} type="button" className={inspectorTab === tab ? 'active' : ''} onClick={() => onInspectorTab(tab)}>
              {tab === 'overview' ? 'Overview' : tab === 'capture' ? 'Capture' : tab === 'intel' ? 'Intel' : tab === 'record' ? 'Record' : tab === 'docs' ? 'Docs' : 'Activity'}
            </button>
          ))}
        </div>
      </div>

      <div className="rail-body scroll-pane" ref={railRef}>
        {inspectorTab === 'overview' && (
          <section className="verification-panel panel enter">
            <p className="panel-title">Verification status</p>
            {(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED'] as VerificationState[]).map((state) => (
              <div key={state} className={filters.has(state) ? '' : 'is-dimmed'}>
                <StatusI status={state} />
                <span>{stateLabel[state]}</span>
                <b>{shownCounts[state]}</b>
                <i className="verify-meter" style={{ width: `${selectedFactTotal ? Math.round((shownCounts[state] / selectedFactTotal) * 100) : 0}%` }} />
              </div>
            ))}
            <footer>Total tracked facts <strong>{selectedFactTotal}</strong></footer>
          </section>
        )}

        {(inspectorTab !== 'overview' || selectedAsset || selectedArea) && (
          <SelectedAssetPanel
            asset={selectedAsset}
            area={selectedArea}
            activeDocument={activeDocument}
            onDocument={onDocument}
            onOpenCabinet={onOpenCabinet}
            onPacket={onPacket}
            onFocusCabinet={onFocusCabinet}
            onDoorSheet={onDoorSheet}
            focusCabinet={focusCabinet}
            tab={inspectorTab === 'overview' ? 'record' : inspectorTab}
            onCapture={onCapture}
            onTrace={onTrace}
            openUnknown={openUnknown}
            onOpenUnknown={onOpenUnknown}
            focusDevice={focusDevice}
            todayIndex={todayIndex}
            onTodayIndex={onTodayIndex}
            onTodayJump={onTodayJump}
          />
        )}

        {packetOpen && <FloorPacket assetId={packetAsset} onClose={onClosePacket} />}

        {inspectorTab === 'activity' && (
          <section className="activity-panel panel enter">
            <p className="panel-title">This browser · {captureTick ? `${captureTick} review action${captureTick === 1 ? '' : 's'}` : 'local only'}</p>
            <div className="review-filters" data-testid="review-filters">
              {(['all', 'pending', 'keep', 'reject'] as const).map((filter) => (
                <button key={filter} type="button" className={reviewFilter === filter ? 'selected' : ''} onClick={() => onReviewFilter(filter)}>{filter}</button>
              ))}
            </div>
            {filterReviewCaptures(localActivityCaptures(), reviewFilter).length === 0 && <p className="walkdown-hint" data-testid="log-empty">Nothing captured on this phone. Use Capture to add a local note.</p>}
            {filterReviewCaptures(localActivityCaptures(), reviewFilter).map((item) => (
              <div key={item.id} className="log-row">
                <StatusI status="FIELD_VERIFY" />
                <span><b>{item.capturedBy} · {item.targetId} · {item.field}</b><small>Not in the graph · {item.review ?? 'pending'}{item.applied ? ' · applied overlay' : ''} · {new Date(item.capturedAt).toLocaleString()}</small></span>
                <div className="log-row-actions">
                  <button type="button" data-testid="preview-patch" onClick={() => {
                    const text = graphPatchText(graphPatchPreview(item));
                    onLastPreviewPatch(text);
                    void navigator.clipboard?.writeText(text);
                  }}>Preview patch</button>
                  <button type="button" onClick={() => {
                    const { patch } = applyKeepDecision(item.id);
                    if (patch) {
                      const text = keepPatchText(patch);
                      onLastKeepPatch(text);
                      onLastKeepSummary(keepPatchSummary(patch));
                      void navigator.clipboard?.writeText(text);
                    }
                    onCapture();
                  }}>Keep (review)</button>
                  <button type="button" onClick={() => {
                    if (item.review !== 'keep') applyKeepDecision(item.id);
                    onApplyWarning(applyConfirmText(item));
                    applyKeptCapture(item.id);
                    onCapture();
                  }}>Apply overlay</button>
                  <button type="button" onClick={() => { decideReview(item.id, 'reject'); onCapture(); }}>reject</button>
                  {item.review === 'reject' && <button type="button" onClick={() => { decideReview(item.id, 'pending'); onCapture(); }}>undo</button>}
                </div>
              </div>
            ))}
            {applyWarning && <p className="apply-warning" data-testid="apply-warning">{applyWarning}</p>}
            {lastPreviewPatch && <pre className="keep-patch" data-testid="graph-patch-preview">{lastPreviewPatch}</pre>}
            {lastKeepSummary && <p className="keep-summary" data-testid="keep-summary">{lastKeepSummary}</p>}
            {lastKeepPatch && <pre className="keep-patch" data-testid="keep-patch">{lastKeepPatch}</pre>}
            {lastKeepPatch && <details className="keep-json"><summary>Copy keep patch</summary><button type="button" className="copy-patch" onClick={() => { void navigator.clipboard?.writeText(lastKeepPatch); }}>Copy</button></details>}
            {importNote && <p className="keep-summary">{importNote}</p>}
            <div className="review-actions">
              <button type="button" onClick={() => {
                const blob = new Blob([reviewPackJson()], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = 'iag-review-pack.json';
                link.click();
                URL.revokeObjectURL(href);
              }}>Export review pack</button>
              <label className="import-pack">Import JSON<input type="file" accept="application/json" className="sr-only" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const pack = parseReviewPack(await file.text());
                if (pack) {
                  const result = importReviewPackResult(pack);
                  onImportNote(importSkipSummary(result.added, result.skipped));
                }
                onCapture();
              }} /></label>
            </div>
            <p className="panel-title">Graph</p>
            {revisions.map((item) => <div key={item.id}><StatusI status="IN_PROGRESS" /><span><b>{item.reason}</b><small>{item.changedBy} · {new Date(item.changedAt).toLocaleDateString()}</small></span></div>)}
            <div><StatusI status="FIELD_VERIFY" /><span><b>{evidence.length} local evidence records indexed</b><small>Files remain outside the frontend bundle</small></span></div>
            <div><StatusI status="COMPLETE" /><span><b>Evidence-aware structured data</b><small>LOCAL_ONLY evidence is not bundled</small></span></div>
          </section>
        )}
      </div>
    </div>
  );
});

export default InspectorRail;
