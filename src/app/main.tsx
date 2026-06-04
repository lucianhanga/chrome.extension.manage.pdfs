import './tailwind.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

// TODO Phase 2: set pdfjs GlobalWorkerOptions.workerSrc here, before any pdf.js call.
// import * as pdfjsLib from 'pdfjs-dist';
// import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
