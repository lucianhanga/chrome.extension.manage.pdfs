// ResourceCard: displays one loaded resource with thumbnail, metadata, and controls.
// Multi-page PDFs show a "Show pages / Hide pages" toggle that expands the PageGrid.

import { useState } from 'react';
import type { Resource, PdfResourceData, ImageResourceData } from '../../state/types.ts';
import { formatBytes } from '../../pdf/ingest.ts';
import { PageGrid } from './PageGrid.tsx';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface ResourceCardProps {
  resource: Resource;
  onRemove: (id: string) => void;
  onPreview: (resource: Resource, pageIndex?: number) => void;
}

export function ResourceCard({ resource, onRemove, onPreview }: ResourceCardProps) {
  const { id, name, sizeBytes, data } = resource;
  const [gridExpanded, setGridExpanded] = useState(false);

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onRemove(id);
  }

  const isPdf = data.kind === 'pdf';
  const isMultiPage = isPdf && (data as PdfResourceData).pageCount > 1;
  const pdfDoc = isPdf
    ? ((data as PdfResourceData).pdfDoc as PDFDocumentProxy | null)
    : null;

  return (
    <div className="px-3 py-3 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors group">
      {/* Main row: thumbnail + metadata + remove */}
      <div className="flex items-start gap-3">
        {/* Thumbnail / icon — clicking opens the lightbox at page 0 */}
        <button
          type="button"
          aria-label={`Preview ${name}`}
          className="flex-shrink-0 w-16 h-20 bg-gray-800 rounded overflow-hidden border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => onPreview(resource, 0)}
        >
          <ThumbnailArea data={data} />
        </button>

        {/* Metadata column */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-200 truncate" title={name}>
            {name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{formatBytes(sizeBytes)}</p>
          <MetaLines data={data} />

          {/* Show / Hide pages toggle for multi-page PDFs */}
          {isMultiPage && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setGridExpanded((v) => !v); }}
              className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg
                className={['w-3 h-3 transition-transform', gridExpanded ? 'rotate-90' : ''].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {gridExpanded ? 'Hide pages' : 'Show pages'}
            </button>
          )}
        </div>

        {/* Remove button — visible on hover/focus */}
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={handleRemove}
          className="flex-shrink-0 mt-0.5 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded page grid — only mounted when toggled open */}
      {isPdf && gridExpanded && (
        <PageGrid
          resourceId={id}
          data={data as PdfResourceData}
          pdfDoc={pdfDoc}
          onOpenLightbox={(pageIndex) => onPreview(resource, pageIndex)}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

interface ThumbnailAreaProps {
  data: Resource['data'];
}

function ThumbnailArea({ data }: ThumbnailAreaProps) {
  if (data.kind === 'pdf') {
    const url = (data as PdfResourceData).thumbnailUrls[0];
    if (url) {
      return (
        <img
          src={url}
          alt="Page 1"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      );
    }
    return <PageFallback />;
  }

  if (data.kind === 'image') {
    return (
      <img
        src={(data as ImageResourceData).objectUrl}
        alt="Preview"
        className="w-full h-full object-contain"
        loading="lazy"
      />
    );
  }

  // text
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        className="w-7 h-7 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
      <svg
        className="w-7 h-7 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25"
        />
      </svg>
    </div>
  );
}

interface MetaLinesProps {
  data: Resource['data'];
}

function MetaLines({ data }: MetaLinesProps) {
  if (data.kind === 'pdf') {
    const pdf = data as PdfResourceData;
    const dim = pdf.pageDimensions[0];
    return (
      <div className="mt-1 space-y-0.5">
        <p className="text-xs text-gray-400">
          {pdf.pageCount} {pdf.pageCount === 1 ? 'page' : 'pages'}
          {dim ? ` — ${Math.round(dim.width)} x ${Math.round(dim.height)} pt` : ''}
        </p>
        {pdf.title && (
          <p className="text-xs text-gray-600 truncate" title={pdf.title}>
            {pdf.title}
          </p>
        )}
        {pdf.author && (
          <p className="text-xs text-gray-600 truncate" title={pdf.author}>
            {pdf.author}
          </p>
        )}
      </div>
    );
  }

  if (data.kind === 'image') {
    const img = data as ImageResourceData;
    return (
      <p className="text-xs text-gray-400 mt-1">
        {img.width > 0 ? `${img.width} x ${img.height} px` : 'Image'}
      </p>
    );
  }

  // text
  return <p className="text-xs text-gray-400 mt-1">Plain text</p>;
}
