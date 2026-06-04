// ResourceCard: displays one loaded resource with thumbnail(s), metadata, and a remove button.

import { useState } from 'react';
import type { Resource, PdfResourceData, ImageResourceData } from '../../state/types.ts';
import { formatBytes } from '../../pdf/ingest.ts';

interface ResourceCardProps {
  resource: Resource;
  onRemove: (id: string) => void;
  onPreview: (resource: Resource, pageIndex?: number) => void;
}

export function ResourceCard({ resource, onRemove, onPreview }: ResourceCardProps) {
  const { id, name, sizeBytes, data } = resource;
  const [thumbPage, setThumbPage] = useState(0); // 0-based

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onRemove(id);
  }

  return (
    <div className="flex items-start gap-3 px-3 py-3 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors group">
      {/* Thumbnail / icon area */}
      <button
        type="button"
        aria-label={`Preview ${name}`}
        className="flex-shrink-0 w-16 h-20 bg-gray-800 rounded overflow-hidden border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => onPreview(resource, data.kind === 'pdf' ? thumbPage : undefined)}
      >
        <ThumbnailArea data={data} thumbPage={thumbPage} />
      </button>

      {/* Metadata column */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate" title={name}>
          {name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{formatBytes(sizeBytes)}</p>
        <MetaLines data={data} />

        {/* Page navigator for multi-page PDFs */}
        {data.kind === 'pdf' && data.pageCount > 1 && (
          <PageNavigator
            pageCount={data.pageCount}
            current={thumbPage}
            onChange={setThumbPage}
          />
        )}
      </div>

      {/* Remove button — only visible on hover/focus */}
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
  );
}

// --- Sub-components ---

interface ThumbnailAreaProps {
  data: Resource['data'];
  thumbPage: number;
}

function ThumbnailArea({ data, thumbPage }: ThumbnailAreaProps) {
  if (data.kind === 'pdf') {
    const url = (data as PdfResourceData).thumbnailUrls[thumbPage];
    if (url) {
      return (
        <img
          src={url}
          alt={`Page ${thumbPage + 1}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      );
    }
    // Fallback if thumbnail is empty string (render failed)
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

interface PageNavigatorProps {
  pageCount: number;
  current: number;
  onChange: (page: number) => void;
}

function PageNavigator({ pageCount, current, onChange }: PageNavigatorProps) {
  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        type="button"
        aria-label="Previous page thumbnail"
        disabled={current === 0}
        onClick={(e) => { e.stopPropagation(); onChange(current - 1); }}
        className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xs text-gray-600">
        {current + 1} / {pageCount}
      </span>
      <button
        type="button"
        aria-label="Next page thumbnail"
        disabled={current === pageCount - 1}
        onClick={(e) => { e.stopPropagation(); onChange(current + 1); }}
        className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
