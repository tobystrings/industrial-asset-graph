import { useRef, useState } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { exportPrivateRecovery, restorePrivateRecovery, type ImportConflict } from '../facility/additivePackage';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function PrivateAssetImport() {
  const facility = useFacility(); const editor = useFacilityEditor(); const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const recoveryInput = useRef<HTMLInputElement>(null);
  const [recoveryFile, setRecoveryFile] = useState<File | null>(null);
  const conflictKey = `iag-private-import-conflicts-${facility.facility.id}`;
  const [conflicts, setConflicts] = useState<ImportConflict[]>(() => { try { return JSON.parse(localStorage.getItem(conflictKey) ?? '[]'); } catch { return []; } });
  return <section aria-label="Private asset package" className="iag-editor-form">
    <h3>Private asset package</h3>
    <p>Add documented equipment and relink its local evidence. Existing records and pending edits are kept. A private recovery ZIP downloads before insertion; save it outside shared folders.</p>
    <input ref={input} type="file" hidden accept=".zip,application/zip" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      setBusy(true); setMessage('Checking and importing private package…');
      try {
        download(await exportPrivateRecovery(facility.facility.id), `${facility.facility.id}-before-private-import-${Date.now()}.zip`);
        const result = await editor.importPrivateBundle(file);
        setConflicts(result.conflicts);
        localStorage.setItem(conflictKey, JSON.stringify(result.conflicts));
        setMessage(`Added ${result.added.length} records and ${result.attachmentsAdded} attachments. ${result.conflicts.length} conflicts retained for review.`);
        if (result.conflicts.length) download(new Blob([JSON.stringify(result.conflicts, null, 2)], { type: 'application/json' }), 'private-import-conflicts.json');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Private import failed.'); }
      finally { setBusy(false); event.target.value = ''; }
    }}/>
    <button type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : 'Add Private Asset Package (.zip)'}</button>
    {message && <p role="status">{message}</p>}
    {conflicts.length > 0 && <div><p>The incoming versions remain in the private conflict report. Current local values were kept.</p><ul>{conflicts.map(row => <li key={`${row.collection}:${row.id}`}>{row.collection}: {row.id}</li>)}</ul></div>}
    <details><summary>Restore a private recovery backup</summary>
      <p>Rollback replaces this facility’s local database, including evidence and pending edits, with the selected backup. A backup of the current state downloads first.</p>
      <input ref={recoveryInput} type="file" accept=".zip,application/zip" aria-label="Private recovery backup" onChange={event => setRecoveryFile(event.target.files?.[0] ?? null)}/>
      <button type="button" disabled={busy || !recoveryFile} onClick={async () => {
        if (!recoveryFile) return; setBusy(true);
        try {
          download(await exportPrivateRecovery(facility.facility.id), `${facility.facility.id}-before-rollback-${Date.now()}.zip`);
          await restorePrivateRecovery(recoveryFile, facility.facility.id);
          location.reload();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Rollback failed.'); setBusy(false); }
      }}>Replace local data with selected backup</button>
    </details>
  </section>;
}
