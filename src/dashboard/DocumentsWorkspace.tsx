import { documents, machines } from '../facilityData';
import { documentSource } from '../lib/documentCatalog';
import { renderMarkdown } from '../lib/markdown';
import { markerClass } from '../lib/statusMark';
import type { DocumentationState } from '../types/facility';

const stateLabel: Record<string, string> = {
  COMPLETE: 'Complete', REVIEW: 'Review', IN_PROGRESS: 'In progress', DRAFT: 'Draft', NOT_STARTED: 'Not started',
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

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
  return (
    <section className={`document-directory enter ${activeDocument ? 'has-preview' : ''}`} data-testid="documents-grouped" data-guide-target="documents">
      <div className="document-browser scroll-pane">
        <header className="document-directory-head">
          <div><p className="panel-title">Knowledge library</p><h1>Documents</h1><p>Grouped by the equipment they explain—not dumped into one flat list.</p></div>
          <strong>{documents.length}<small>records</small></strong>
        </header>
        <div className="document-state-filters">
          {(['ALL', 'COMPLETE', 'REVIEW', 'IN_PROGRESS', 'DRAFT', 'NOT_STARTED'] as const).map((state) => (
            <button key={state} type="button" className={docStateFilter === state ? 'selected' : ''} onClick={() => onDocStateFilter(state)}>
              {stateLabel[state] ?? state}
            </button>
          ))}
        </div>
        <div className="document-groups">
          {machines.map((asset) => {
            const rows = documents.filter((item) => item.assetId === asset.id && (docStateFilter === 'ALL' || item.state === docStateFilter));
            if (!rows.length) return null;
            return (
              <section key={asset.id} className="doc-group">
                <header>
                  <div><small>{asset.line}</small><h2>{asset.name}</h2><code>{asset.id}</code></div>
                  <span>{rows.length} {rows.length === 1 ? 'document' : 'documents'}</span>
                </header>
                <div className="doc-cards">
                  {rows.slice().sort((left, right) => left.title.localeCompare(right.title)).map((item) => (
                    <button key={item.id} type="button" className={activeDocument === item.id ? 'selected' : ''} onClick={() => onDocument(item.id)}>
                      <span><small>{item.category}</small><b>{item.title}</b></span><em>{stateLabel[item.state]}</em>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {activeDocument && <aside className="document-preview scroll-pane"><DocumentBody documentId={activeDocument} onClose={() => onDocument(null)} /></aside>}
    </section>
  );
}

function DocumentBody({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const record = documents.find((item) => item.id === documentId);
  if (!record) return null;
  const source = documentSource(record.path) ?? `# ${record.title}\n\nDocument file is not in this build.`;
  return (
    <section className="document-detail">
      <button type="button" onClick={onClose} aria-label="Close documentation detail">×</button>
      <p className="panel-title">{record.category}</p>
      <h3>{record.title}</h3>
      <p>Status: <strong>{stateLabel[record.state]}</strong> · <span className={markerClass(record.verificationStatus)} /> {stateLabel[record.verificationStatus]}</p>
      <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
    </section>
  );
}
