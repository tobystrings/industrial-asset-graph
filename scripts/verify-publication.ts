import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { validatePublication } from '../src/facility/publicationModel';
const root='public/facility-state/facility-j-lieb';
if(existsSync(root)) for(const name of ['current.json',...(existsSync(`${root}/revisions`)?readdirSync(`${root}/revisions`).map(n=>`revisions/${n}`):[])]) {
  if(!existsSync(`${root}/${name}`))continue;
  const row=JSON.parse(readFileSync(`${root}/${name}`,'utf8'));
  validatePublication(row.payload,'facility-j-lieb');
}
console.log('Public facility snapshots validated.');
