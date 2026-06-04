// PreviewModal: larger preview of a selected resource page.
// Renders PDF thumbnails, images, or text content.

import { useEffect, useCallback, useState } from 'react';
import type { Resource, PdfResourceData, ImageResourceData, TextResourceData } from '../../state/types.ts';
import { formatBytes } from '../../pdf/ingest.ts';

interface PreviewModalProps {
  resource: Resource;
  initialPage?: number; // 0-based
  onClose: () => void;
}

export function PreviewModal({ resource, initialPage = 0, onClose }: PreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const { data } = resource;

  const renderPdfPage = useCallback(
    async (pageIndex: number) => {
      if (data.kind !== 'pdf') return;
      setIsRendering(true);
      setPreviewUrl(null);
      try {
        // In v1 the raw ArrayBuffer is not stored after ingestion, so we show the thumbnail.
        // Phase 4 will store raw bytes for a true high-res re-render.
        const thumb = (data as PdfResourceData).thumbnailUrls[pageIndex];
        if (thumb) setPreviewUrl(thumb);
      } finally {
        setIsRendering(false);
      }
    },
    [data],
  );

  useEffect(() => {
    if (data.kind === 'pdf') {
      void renderPdfPage(currentPage);
    } else if (data.kind === 'image') {
      setPreviewUrl((data as ImageResourceData).objectUrl);
    }
  }, [data, currentPage, renderPdfPage]);

  // Close on Escape; navigate with arrow keys for PDFs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (data.kind === 'pdf') {
        if (e.key === 'ArrowRight') {
          setCurrentPage((p) => Math.min(p + 1, (data as PdfResourceData).pageCount - 1));
        }
        if (e.key === 'ArrowLeft') {
          setCurrentPage((p) => Math.max(p - 1, 0));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data, onClose]);

  const pageCount = data.kind === 'pdf' ? (data as PdfResourceData).pageCount : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${resource.name}`}
      onClick={onClose}
    >
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[90vh] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate" title={resource.name}>
              {resource.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatBytes(resource.sizeBytes)}
              {data.kind === 'pdf' && (
                <>
                  {' '}
                  &mdash; {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </>
              )}
              {data.kind === 'image' && (
                <>
                  {' '}
                  &mdash; {(data as ImageResourceData).width} x {(data as ImageResourceData).height} px
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
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

        {/* Content area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gray-950">
          {data.kind === 'text' ? (
            <TextPreview text={(data as TextResourceData).preview} />
          ) : isRendering ? (
            <div className="text-gray-500 text-sm">Rendering...</div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={data.kind === 'pdf' ? `Page ${currentPage + 1}` : resource.name}
              className="max-w-full max-h-full object-contain rounded shadow"
            />
          ) : (
            <div className="text-gray-600 text-sm">No preview available.</div>
          )}
        </div>

        {/* Page navigation footer for PDFs */}
        {data.kind === 'pdf' && pageCount > 1 && (
          <div className="flex items-center justify-center gap-4 px-5 py-3 border-t border-gray-800 flex-shrink-0">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-300 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {currentPage + 1} of {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === pageCount - 1}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount - 1))}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface TextPreviewProps {
  text: string;
}

function TextPreview({ text }: TextPreviewProps) {
  return (
    <pre className="w-full max-h-full overflow-auto text-xs text-gray-300 bg-gray-900 rounded-lg p-4 leading-relaxed whitespace-pre-wrap break-words font-mono">
      {text || '(empty file)'}
    </pre>
  );
}
