import { useEffect, useState } from 'react';
import { evidenceFingerprint, evidenceFingerprintBytes } from './lib/evidenceHash';
import { isInventableField } from './lib/floorPass';
import { walkdownMoreDefaultOpen } from './lib/hrefMatrix';
import { loadLastWho, recordWalkdownCapture, saveLastWho } from './lib/walkdown';
import { promptForUnknown } from './lib/walkdownPrompts';
import type { WalkdownField } from './types/facility';

export default function WalkdownForm({
  targetId,
  promptSource,
  defaultField = 'unknown',
  onSaved,
  compact = true,
}: {
  targetId: string;
  promptSource?: string;
  defaultField?: WalkdownField;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const prompt = promptSource ? promptForUnknown(promptSource) : null;
  const [field, setField] = useState<WalkdownField>(prompt?.field ?? defaultField);
  const [value, setValue] = useState('');
  const [who, setWho] = useState(loadLastWho);
  const [photoRef, setPhotoRef] = useState('');
  const [photoHash, setPhotoHash] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [moreOpen, setMoreOpen] = useState(walkdownMoreDefaultOpen);
  useEffect(() => {
    if (prompt) setField(prompt.field);
  }, [promptSource]);
  return (
    <form
      className={`walkdown-form${compact ? ' is-compact' : ''}`}
      data-testid="walkdown-form"
      data-target={targetId}
      onSubmit={async (event) => {
        event.preventDefault();
        const hash = photoHash
          ?? (photoRef.trim() ? (await evidenceFingerprint(photoRef.trim())).sha256 : null);
        const saved = recordWalkdownCapture({
          targetId,
          field,
          value,
          capturedBy: who || 'field',
          photoRef: photoRef || undefined,
          photoHash: hash || undefined,
        });
        if (!saved && isInventableField(field)) {
          setMessage('Left blank — dest, motor, and recovery stay empty unless you type them.');
          return;
        }
        if (!saved) {
          setMessage('Need a who and a target.');
          return;
        }
        saveLastWho(who || 'field');
        setValue('');
        setPhotoRef('');
        setPhotoHash(undefined);
        setMessage('Saved locally. Not in the graph yet.');
        onSaved?.();
      }}
    >
      <p className="panel-title">Field capture · {targetId}</p>
      <p className="walkdown-hint">{prompt?.hint ?? 'Stays on this browser. Destinations, motors, and recovery stay empty unless you type them.'}</p>
      <label>
        Typed value
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={prompt?.placeholder ?? 'Leave blank if unknown'} />
      </label>
      <label className="photo-file">
        Local photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setPhotoRef('');
              setPhotoHash(undefined);
              return;
            }
            const print = await evidenceFingerprintBytes(file.name, await file.arrayBuffer());
            setPhotoRef(print.filename);
            setPhotoHash(print.sha256);
          }}
        />
        <small>{photoRef ? `${photoRef} · hashed · not uploaded` : 'Not uploaded · local hash only'}</small>
      </label>
      <details className="walkdown-more" data-testid="walkdown-more" open={moreOpen} onToggle={(event) => setMoreOpen((event.target as HTMLDetailsElement).open)}>
        <summary>More · field, initials, dest</summary>
        <label>
          Field
          <select value={field} onChange={(event) => setField(event.target.value as WalkdownField)}>
            <option value="unknown">Unknown / note</option>
            <option value="note">Note</option>
            <option value="serial">Serial</option>
            <option value="param">Parameter</option>
            <option value="dest">Destination (only if known)</option>
            <option value="motor">Motor (only if known)</option>
            <option value="recovery">Recovery (only if known)</option>
          </select>
        </label>
        <label>
          Who
          <input value={who} onChange={(event) => setWho(event.target.value)} placeholder="Initials" />
        </label>
        <p className="walkdown-hint">Dest, motor, and recovery stay empty unless you type them. They do not enter the graph until Apply.</p>
      </details>
      {!compact && (
        <label>
          Who
          <input value={who} onChange={(event) => setWho(event.target.value)} placeholder="Initials" />
        </label>
      )}
      <button type="submit">Save capture</button>
      {message && <small>{message}</small>}
    </form>
  );
}
