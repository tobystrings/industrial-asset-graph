import { mkdir, readdir, copyFile } from 'node:fs/promises';
const destination = 'public/inventory-ocr';
await mkdir(destination, { recursive: true });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', `${destination}/worker.min.js`);
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (file.endsWith('.wasm.js')) await copyFile(`node_modules/tesseract.js-core/${file}`, `${destination}/${file}`);
}
await copyFile('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', `${destination}/eng.traineddata.gz`);
await copyFile('node_modules/tesseract.js/LICENSE.md', `${destination}/LICENSE-tesseract.txt`);
await copyFile('node_modules/tesseract.js-core/LICENSE', `${destination}/LICENSE-core.txt`);
console.log('Prepared same-origin inventory OCR worker and English model.');
