import { useEffect, useRef, useState } from 'react';
import { useFacility } from '../facility';
import { getAttachment, type AttachmentRecord } from '../facility/runtimeDb';

/** Controlled evidence stays in this facility's IndexedDB; no public URL is created. */
export default function LocalDocumentPreview({ attachmentId }: { attachmentId: string }) {
  const facility = useFacility();
  const [value, setValue] = useState<{ record: AttachmentRecord; url: string; text?: string; previewUrl?: string } | null>(null);
  const [error, setError] = useState('');
  const mediaNodes = useRef(new Set<HTMLImageElement | HTMLVideoElement>());
  const rememberMedia = (node: HTMLImageElement | HTMLVideoElement | null) => { if (node) mediaNodes.current.add(node); };
  useEffect(() => {
    let disposed = false; let url = ''; let previewUrl = '';
    setValue(null); setError('');
    void getAttachment(attachmentId, facility.facility.id).then(async record => {
      if (!record) throw new Error('This local attachment is missing. Reapply its private package to relink the original.');
      const text = /^(text\/plain|text\/markdown|text\/csv|application\/json)/.test(record.mimeType) ? await record.blob.text() : undefined;
      const preview = record.previewAttachmentId ? await getAttachment(record.previewAttachmentId, facility.facility.id) : null;
      if (disposed) return;
      if (preview?.mimeType.startsWith('image/') && preview.assetId === record.assetId) previewUrl = URL.createObjectURL(preview.blob);
      url = URL.createObjectURL(record.blob); setValue({ record, url, text, previewUrl });
    }).catch(reason => { if (!disposed) setError(reason instanceof Error ? reason.message : 'Unable to read local evidence.'); });
    return () => {
      disposed = true;
      // Stop pending media/range requests before releasing their local blob URLs.
      for (const node of mediaNodes.current) {
        if (node instanceof HTMLVideoElement) node.pause();
        node.removeAttribute('src');
        if (node instanceof HTMLVideoElement) node.load();
      }
      mediaNodes.current.clear();
      if (url) URL.revokeObjectURL(url);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [attachmentId, facility.facility.id]);
  if (error) return <p role="alert">{error}</p>;
  if (!value) return <p role="status">Loading local evidence…</p>;
  const { record, url, text } = value;
  return <div className="local-document-preview">
    <p>{record.access === 'RESTRICTED' ? 'Restricted evidence' : 'Local evidence'} · {(record.size / 1024).toFixed(0)} KB</p>
    <p><a href={url} download={record.name}>Download original</a></p>
    {record.mimeType.startsWith('image/') && <a href={url} target="_blank" rel="noreferrer"><img ref={rememberMedia} src={url} alt={record.name}/></a>}
    {record.mimeType.startsWith('video/') && <video ref={rememberMedia} src={url} controls preload="metadata"/>}
    {record.mimeType === 'application/pdf' && <><a href={url} target="_blank" rel="noreferrer">Open PDF at full size</a>{value.previewUrl ? <><p>Cover preview · open the PDF for all pages.</p><a href={url} target="_blank" rel="noreferrer"><img ref={rememberMedia} src={value.previewUrl} alt={`${record.name} cover preview`}/></a></> : <iframe src={url} title={record.name}/>}</>}
    {text !== undefined && <pre>{text}</pre>}
  </div>;
}
