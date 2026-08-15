import { line2DriveInstances } from './lib/driveInstances';
import { latestNoteFor } from './lib/walkdown';

export default function DriveSlots({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect?: (componentId: string, cabinetDeviceId: string) => void;
}) {
  const slots = line2DriveInstances();
  return (
    <section className="drive-slots" data-testid="drive-instances">
      <p className="panel-title">Line 2 drive instances</p>
      <div className="drive-slots-scroll scroll-pane">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Id</th>
            <th>Load</th>
            <th>Motor</th>
            <th>Dest</th>
            <th>Capture</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const note = latestNoteFor(slot.componentId);
            return (
            <tr key={slot.componentId} data-selected={selectedId === slot.componentId || selectedId === slot.cabinetDeviceId}>
              <td>{slot.index}</td>
              <td>
                <button type="button" onClick={() => onSelect?.(slot.componentId, slot.cabinetDeviceId)}>
                  {slot.componentId}
                </button>
              </td>
              <td>{slot.loadLabel ?? '—'}</td>
              <td>{slot.motorHp ?? 'FIELD_VERIFY'}</td>
              <td>{slot.destId ?? 'dest-unknown'}</td>
              <td>{note ? `${note.capturedBy} · ${note.field} · ${new Date(note.capturedAt).toLocaleDateString()}` : '—'}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
