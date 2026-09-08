import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = join(process.cwd(), 'public', 'assets', 'evidence');
const output = join(root, 'index.html');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path !== output) files.push(relative(root, path).split(sep).join('/'));
  }
}
await walk(root);
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const esc = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const groups = Map.groupBy(files, file => file.includes('/') ? file.slice(0, file.indexOf('/')) : 'Master files');
const body = [...groups].map(([group, entries]) => `<section><h2>${esc(group)}</h2><p>${entries.length} files</p><ul>${entries.map(file => `<li><a href="${file.split('/').map(encodeURIComponent).join('/')}">${esc(file.slice(file.lastIndexOf('/') + 1))}</a><small>${esc(file)}</small></li>`).join('')}</ul></section>`).join('');
await writeFile(output, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidence archive · Industrial Asset Graph</title><style>body{margin:0;background:#eef3f4;color:#17333f;font:16px system-ui,sans-serif}header,main{max-width:1200px;margin:auto;padding:24px}header{background:#123f54;color:white;max-width:none}header div{max-width:1200px;margin:auto}h1{margin:.2em 0}section{background:white;border:1px solid #ccd9dd;border-radius:14px;padding:20px;margin:18px 0}ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;padding:0;list-style:none}li{border:1px solid #d9e2e5;border-radius:10px;padding:12px;min-width:0}a{color:#075e78;font-weight:700;overflow-wrap:anywhere}small{display:block;color:#60747d;margin-top:6px;overflow-wrap:anywhere}@media(max-width:600px){header,main{padding:16px}ul{grid-template-columns:1fr}}</style></head><body><header><div><a href="../../" style="color:#bfeaff">← Industrial Asset Graph</a><h1>Deployed evidence archive</h1><p>${files.length} original files · KOSME, Wulftec, and plant documentation</p></div></header><main>${body}</main></body></html>`);
console.log(`Indexed ${files.length} evidence files.`);
