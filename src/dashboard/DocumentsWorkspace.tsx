import { documents, machines } from '../facilityData';
import { documentSource } from '../lib/documentCatalog';
import { renderMarkdown } from '../lib/markdown';
import { markerClass } from '../lib/statusMark';
import type { DocumentationState } from '../types/facility';

const stateLabel: Record<string, string> = {
  COMPLETE: 'Complete', REVIEW: 'Review', IN_PROGRESS: 'In progress', DRAFT: 'Draft', NOT_STARTED: 'Not started',
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

const states = ['ALL', 'COMPLETE', 'REVIEW', 'IN_PROGRESS', 'DRAFT', 'NOT_STARTED'] as const;

export default function DocumentsWorkspace({
  activeDocument,
  docStateFilter,
  onDocument,
  onDocStateFilter,
}: {
  activeDocument: string | null;
  docStateFilter: DocumentationState | 'ALL';
  onDocument: (id: string | null) => void;
  onDocStateFilter: (state: DocumentationState | 'ALL') => void;
}) {
  const visibleDocuments = documents.filter((item) => docStateFilter === 'ALL' || item.state === docStateFilter);
  const groupedAssets = machines.map((asset) => ({
    asset,
    rows: visibleDocuments.filter((item) => item.assetId === asset.id).slice().sort((left, right) => left.title.localeCompare(right.title)),
  })).filter((group) => group.rows.length);

  return (
    <section className={`document-directory enter ${activeDocument ? 'has-preview' : ''}`} data-testid="documents-grouped" data-guide-target="documents">
      <div className="document-browser scroll-pane">
        <header className="document-directory-head">
          <div>
            <p className="panel-title">Knowledge library</p>
            <h1>Documents</h1>
            <p>Grouped by the equipment they explain, with status and verification visible before you open anything.</p>
          </div>
          <strong>{visibleDocuments.length}<small>{docStateFilter === 'ALL' ? 'records' : 'matching'}</small></strong>
        </header>
        <div className="document-state-filters" aria-label="Filter documents by status">
          {states.map((state) => {
            const count = state === 'ALL' ? documents.length : documents.filter((item) => item.state === state).length;
            return (
              <button key={state} type="button" className={docStateFilter === state ? 'selected' : ''} aria-pressed={docStateFilter === state} onClick={() => onDocStateFilter(state)}>
                <span>{stateLabel[state] ?? state}</span><small>{count}</small>
              </button>
            );
          })}
        </div>
        <div className="document-workspace-summary" aria-live="polite">
          <span><b>{visibleDocuments.length}</b> documents shown</span>
          <span><b>{groupedAssets.length}</b> assets represented</span>
          {docStateFilter !== 'ALL' && <button type="button" onClick={() => onDocStateFilter('ALL')}>Clear filter</button>}
        </div>
        <div className="document-groups">
          {groupedAssets.map(({ asset, rows }) => (
            <section key={asset.id} className="doc-group">
              <header>
                <div><small>{asset.line}</small><h2>{asset.name}</h2><code>{asset.id}</code></div>
                <span>{rows.length} {rows.length === 1 ? 'document' : 'documents'}</span>
              </header>
              <div className="doc-cards">
                {rows.map((item) => (
                  <button key={item.id} type="button" className={activeDocument === item.id ? 'selected' : ''} aria-pressed={activeDocument === item.id} onClick={() => onDocument(item.id)}>
                    <span><small>{item.category}</small><b>{item.title}</b></span>
                    <em>{stateLabel[item.state]}</em>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!groupedAssets.length && (
            <section className="document-empty" role="status">
              <b>No documents match this status.</b>
              <p>The source library is intact; this filter just has no matching records.</p>
              <button type="button" onClick={() => onDocStateFilter('ALL')}>Show all documents</button>
            </section>
          )}
        </div>
      </div>
      {activeDocument && <aside className="document-preview scroll-pane" aria-label="Document preview"><DocumentBody documentId={activeDocument} onClose={() => onDocument(null)} /></aside>}
    </section>
  );
}

function DocumentBody({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const record = documents.find((item) => item.id === documentId);
  if (!record) return null;
  const source = documentSource(record.path) ?? `# ${record.title}\n\nDocument file is not in this build.`;
  return (
    <section className="document-detail">
      <button className="document-close" type="button" onClick={onClose} aria-label="Close documentation detail">×</button>
      <p className="panel-title">{record.category}</p>
      <h3>{record.title}</h3>
      <p className="document-status-line">Status: <strong>{stateLabel[record.state]}</strong> · <span className={markerClass(record.verificationStatus)} /> {stateLabel[record.verificationStatus]}</p>
      <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
    </section>
  );
}
