// Mirror public shared revisions and immutable files into GitHub's deployed content.
// Uses only the public Supabase key; repository writes are handled by Actions.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const base = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Public Supabase configuration is missing.');
const facilityId = 'facility-j-lieb';
const root = path.resolve('public/facility-state', facilityId);
await mkdir(root, { recursive: true });
async function json(endpoint) {
  const response = await fetch(`${base}/rest/v1/${endpoint}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Public plant fetch failed (${response.status}).`);
  return response.json();
}
async function allRows(endpoint) {
  const result=[];
  for(let offset=0;;offset+=200) {
    const page=await json(`${endpoint}&limit=200&offset=${offset}`);
    if(!Array.isArray(page))throw new Error('Invalid publication page.');
    result.push(...page);if(page.length<200)return result;
  }
}
const revisions = await allRows(`iag_publication_revisions?facility_id=eq.${facilityId}&order=revision.asc`);
if (!Array.isArray(revisions)) throw new Error('Invalid public revision response.');
const submissions = await allRows(`iag_submission_revisions?facility_id=eq.${facilityId}&order=updated_at.asc,submitted_by.asc,revision.asc`);
if (!Array.isArray(submissions)) throw new Error('Invalid public proposal response.');
const verifiedFiles=new Set();
for (const row of [...revisions,...submissions]) {
  if (row.facility_id !== facilityId || row.payload?.facilityId !== facilityId || row.payload?.plant?.facility?.id !== facilityId || !Number.isSafeInteger(row.revision)) throw new Error('Publication facility or revision mismatch.');
  for (const file of row.payload.attachments) {
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid file digest.');
    if(verifiedFiles.has(file.sha256))continue;
    const target = path.join(root, 'files', file.sha256);
    let bytes;
    try { bytes = await readFile(target); } catch { /* not mirrored yet */ }
    if (!bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
      const url = new URL(file.url);
      if (url.origin !== new URL(base).origin || !url.pathname.startsWith(`/storage/v1/object/public/iag-public/${facilityId}/`)) throw new Error('Refusing a file outside this facility publication bucket.');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to mirror ${file.id}.`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== file.size || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`File integrity failed: ${file.id}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    verifiedFiles.add(file.sha256);
  }
  if(row.submitted_by && !/^[a-f0-9-]{36}$/.test(row.submitted_by)) throw new Error('Invalid proposal author ID.');
  const directory = row.submitted_by ? path.join(root,'proposals',row.submitted_by) : path.join(root,'revisions');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${row.revision}.json`), JSON.stringify(row, null, 2) + '\n');
}
if (revisions.length) await writeFile(path.join(root, 'current.json'), JSON.stringify(revisions.at(-1), null, 2) + '\n');
console.log(`Verified ${revisions.length} plant revisions, ${submissions.length} proposed-work revisions, and their attached files.`);
