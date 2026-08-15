import { useState } from 'react';
import { floorPacketFor } from './lib/floorPacket';

export default function FloorPacket({ assetId = 'L2-CC-001', onClose }: { assetId?: string; onClose?: () => void }) {
  const packet = floorPacketFor(assetId);
  const [copied, setCopied] = useState(false);
  return (
    <section className="floor-packet-panel" data-testid="floor-packet">
      <div className="panel-heading">
        <b>{packet.title}</b>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(packet.text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy packet'}
        </button>
        <button type="button" onClick={() => window.print()}>Print</button>
        {onClose && <button type="button" onClick={onClose}>Close</button>}
      </div>
      <div className="floor-packet-body" dangerouslySetInnerHTML={{ __html: packet.html }} />
    </section>
  );
}
