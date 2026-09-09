import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validatePublication } from '../src/facility/publicationModel';
const root='public/facility-state/facility-j-lieb';
if(existsSync(root)) for(const name of ['current.json',...(existsSync(`${root}/revisions`)?readdirSync(`${root}/revisions`).map(n=>`revisions/${n}`):[])]) {
  if(!existsSync(`${root}/${name}`))continue;
  const row=JSON.parse(readFileSync(`${root}/${name}`,'utf8'));
  validatePublication(row.payload,'facility-j-lieb');
}
console.log('Public facility snapshots validated.');
const contentRoot='public/facility-content/lieb-foods';
const manifest=JSON.parse(readFileSync(`${contentRoot}/publication-manifest.json`,'utf8'));
for(const file of manifest.files) {
  if(file.path.startsWith('/')||file.path.includes('\\')||file.path.split('/').includes('..'))throw new Error('Unsafe public source path.');
  const bytes=readFileSync(`${contentRoot}/${file.path}`);
  if(bytes.length!==file.size||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error(`Public source integrity failed: ${file.path}`);
}
console.log(`Verified ${manifest.files.length} public source file hashes.`);
