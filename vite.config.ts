import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

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
  plugins: [react(), includeStaticPresentations],
});
