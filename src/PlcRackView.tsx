import { useState } from 'react';
import { intelSectionsCollapsed } from './lib/hrefMatrix';
import { ioChannelSummary, ioChannelsFor } from './lib/ioChannels';
import { line2PlcRack } from './lib/plcRack';

export default function PlcRackView() {
  const slots = line2PlcRack();
  const [open, setOpen] = useState(!intelSectionsCollapsed().rack);
  return (
    <details className="plc-rack intel-collapse" data-testid="plc-rack" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
      <summary className="panel-title">MicroLogix rack</summary>
      <ol>
        {slots.map((slot) => {
          const channels = ioChannelsFor(slot.label);
          return (
          <li key={slot.componentId}>
            <span>Slot {slot.slot}</span>
            <b>{slot.label}</b>
            <small>{ioChannelSummary(slot.label)}</small>
            {channels.length > 0 && (
              <details className="io-channels-details" open>
                <summary>{channels.length} empty slots</summary>
                <ul className="io-channels" data-testid={`channels-${slot.componentId}`}>
                  {channels.map((channel) => (
                    <li key={channel.index}>{channel.label} · no address</li>
                  ))}
                </ul>
              </details>
            )}
          </li>
          );
        })}
      </ol>
    </details>
  );
}
