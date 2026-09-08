import { build } from 'esbuild';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Self-contained offline deliverable; no private source photos or facility records.
const result = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import Viewer from './src/machines/WulftecViewer'; createRoot(document.getElementById('root')).render(<Viewer/>);`, loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, outdir: 'out', minify: true, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
});
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text;
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text;
await mkdir('artifacts/wulftec-3d', { recursive: true });
await writeFile('artifacts/wulftec-3d/Wulftec-360.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wulftec WCRT-200 · Interactive 3D</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f7f8;font-family:system-ui,sans-serif;color:#17333f}header{max-width:1500px;margin:0 auto 20px}h1{font-size:26px;margin:0 0 8px}header p{margin:0;color:#526972}#root{max-width:1500px;margin:auto}.page-eyebrow{font-size:11px;letter-spacing:2px;font-weight:700}@media(max-width:600px){body{padding:12px}h1{font-size:22px}}${css}</style></head><body><header><h1>Wulftec WCRT-200</h1><p>Interactive reference model · 360° rotation & exploded assemblies</p></header><div id="root"></div><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`);
console.log('Saved artifacts/wulftec-3d/Wulftec-360.html');
if (process.argv[2]) {
  await mkdir(dirname(process.argv[2]), { recursive: true });
  await copyFile('artifacts/wulftec-3d/Wulftec-360.html', process.argv[2]);
  console.log(`Published standalone viewer to ${process.argv[2]}`);
}
