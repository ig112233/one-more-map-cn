import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Single-file build: inlines all JS/CSS into one self-contained HTML.
// Run `npm run build:single` to produce dist-single/ (public assets are
// base64-inlined afterwards by scripts/inline-public.mjs).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    // singlefile's recommended config inlines imported assets (incl. icons)
  },
})
