import './tailwind.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

// Wire the pdf.js packaged worker BEFORE any pdf.js API is called.
// Vite resolves the ?url import at build time — the worker file is copied to dist/
// as a self-hosted packaged resource, which satisfies the MV3 CSP worker-src 'self' rule.
// No data: or blob: workers — all code is bundled.
import { pdfjsLib } from '../pdf/render.ts';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
