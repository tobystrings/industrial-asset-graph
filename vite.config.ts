import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

const includeWowPresentation = {
  name: 'include-wow-presentation',
  closeBundle() {
    cpSync(
      resolve(__dirname, 'presentation-wow'),
      resolve(__dirname, 'dist/presentation-wow'),
      { recursive: true },
    );
  },
};

export default defineConfig({
  base: '/industrial-asset-graph/',
  plugins: [react(), includeWowPresentation],
});
