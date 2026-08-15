/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, cpSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const servePresentationDev = {
  name: 'serve-presentation-dev',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; writeHead: (n: number) => void }, next: () => void) => void) => void } }) {
    const root = resolve(__dirname, 'presentation');
    server.middlewares.use((req, res, next) => {
      const url = req.url || '';
      const prefix = '/industrial-asset-graph/presentation';
      if (!url.startsWith(prefix)) return next();
      const rel = decodeURIComponent(url.slice(prefix.length).split('?')[0] || '/');
      const file = join(root, rel === '/' || rel === '' ? 'index.html' : rel.replace(/^\//, ''));
      const safe = normalize(file);
      if (!safe.startsWith(root) || !existsSync(safe) || !statSync(safe).isFile()) return next();
      const types: Record<string, string> = {
        '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css',
      };
      res.setHeader('Content-Type', types[extname(safe)] || 'application/octet-stream');
      createReadStream(safe).pipe(res as unknown as NodeJS.WritableStream);
    });
  },
};

const includeStaticPresentations = {
  name: 'include-static-presentations',
  closeBundle() {
    cpSync(
      resolve(__dirname, 'presentation-wow'),
      resolve(__dirname, 'dist/presentation-wow'),
      { recursive: true },
    );
    cpSync(
      resolve(__dirname, 'presentation'),
      resolve(__dirname, 'dist/presentation'),
      { recursive: true },
    );
  },
};

export default defineConfig({
  base: '/industrial-asset-graph/',
  plugins: [react(), servePresentationDev, includeStaticPresentations],
  test: {
    environment: 'node',
  },
});
