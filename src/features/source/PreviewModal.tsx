// PreviewModal: full-viewport lightbox for resource preview.
//
// For PDFs: renders pages at high resolution (fit-to-viewport by default) with
// zoom in/out controls and a fit-to-width / actual-size toggle.
// For images and text: unchanged from Phase 2.
//
// Keyboard:
//   Escape         -> close
//   ArrowLeft/Right -> previous/next PDF page
//   + / =          -> zoom in
//   - / _          -> zoom out
//   0              -> reset zoom to fit

import { useEffect, useCallback, useState, useRef } from 'react';
import type { Resource, PdfResourceData, ImageResourceData, TextResourceData } from '../../state/types.ts';
import { formatBytes } from '../../pdf/ingest.ts';
import { getPageThumbnail } from '../../pdf/render.ts';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Target width for the high-res lightbox render (pixels). */
const LIGHTBOX_RENDER_WIDTH = 1600;

/** Zoom step factor per click. */
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4.0;

type ZoomMode = 'fit' | 'actual';

interface PreviewModalProps {
  resource: Resource;
  initialPage?: number; // 0-based
  onClose: () => void;
  /** Pass the open PDFDocumentProxy for high-res re-render. */
  pdfDoc?: PDFDocumentProxy | null;
}

export function PreviewModal({
  resource,
  initialPage = 0,
  onClose,
  pdfDoc,
}: PreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [zoomLevel, setZoomLevel] = useState(1.0); // only used in 'actual' mode
  const renderIdRef = useRef(0); // cancel stale renders

  const { data } = resource;

  // Render or reuse the high-res page image.
  const renderPage = useCallback(
    async (pageIndex: number) => {
      if (data.kind !== 'pdf') return;
      const pdf = data as PdfResourceData;

      // Increment render id so a stale async can detect it was superseded.
      const renderId = ++renderIdRef.current;
      setIsRendering(true);
      setHighResUrl(null);

      try {
        if (pdfDoc) {
          // Render at high resolution via the live PDFDocumentProxy.
          const blob = await getPageThumbnail(pdfDoc, pageIndex + 1, LIGHTBOX_RENDER_WIDTH);
          if (renderIdRef.current !== renderId) return; // superseded
          const url = URL.createObjectURL(blob);
          setHighResUrl(url);
          // Revoke the temporary URL when it is replaced by the next render.
          // Cleanup happens in the effect below via prevUrlRef.
        } else {
          // Fallback: use the ingestion thumbnail (lower resolution).
          const thumb = pdf.thumbnailUrls[pageIndex];
          if (renderIdRef.current !== renderId) return;
          setHighResUrl(thumb ?? null);
        }
      } catch {
        if (renderIdRef.current !== renderId) return;
        const thumb = pdf.thumbnailUrls[pageIndex] ?? null;
        setHighResUrl(thumb);
      } finally {
        if (renderIdRef.current === renderId) {
          setIsRendering(false);
        }
      }
    },
    [data, pdfDoc],
  );

  // Revoke the previous high-res URL when it changes (to avoid blob leaks).
  const prevHighResUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevHighResUrlRef.current;
    prevHighResUrlRef.current = highResUrl;
    if (prev && prev !== highResUrl && prev.startsWith('blob:')) {
      // Only revoke URLs we created here (blob: urls from getPageThumbnail).
      // Ingestion thumbnails are tracked by objectUrl.ts and must not be revoked here.
      // Heuristic: high-res render URLs are created inside this component and are
      // not in data.thumbnailUrls, so check.
      if (data.kind === 'pdf' && !(data as PdfResourceData).thumbnailUrls.includes(prev)) {
        URL.revokeObjectURL(prev);
      }
    }
  });

  // Revoke on unmount.
  useEffect(() => {
    return () => {
      const url = prevHighResUrlRef.current;
      if (url && url.startsWith('blob:')) {
        if (data.kind === 'pdf' && !(data as PdfResourceData).thumbnailUrls.includes(url)) {
          URL.revokeObjectURL(url);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger render when page or resource changes.
  useEffect(() => {
    if (data.kind === 'pdf') {
      void renderPage(currentPage);
    } else if (data.kind === 'image') {
      setHighResUrl((data as ImageResourceData).objectUrl);
    }
  }, [data, currentPage, renderPage]);

  // Keyboard navigation.
  useEffect(() => {
    const pageCount = data.kind === 'pdf' ? (data as PdfResourceData).pageCount : 0;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (data.kind === 'pdf') {
        if (e.key === 'ArrowRight') {
          setCurrentPage((p) => Math.min(p + 1, pageCount - 1));
        } else if (e.key === 'ArrowLeft') {
          setCurrentPage((p) => Math.max(p - 1, 0));
        }
      }
      // Zoom shortcuts.
      if (e.key === '+' || e.key === '=') {
        setZoomMode('actual');
        setZoomLevel((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
      } else if (e.key === '-' || e.key === '_') {
        setZoomMode('actual');
        setZoomLevel((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
      } else if (e.key === '0') {
        setZoomMode('fit');
        setZoomLevel(1.0);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data, onClose]);

  const pageCount = data.kind === 'pdf' ? (data as PdfResourceData).pageCount : 0;

  const handleZoomIn = useCallback(() => {
    setZoomMode('actual');
    setZoomLevel((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomMode('actual');
    setZoomLevel((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const handleToggleFit = useCallback(() => {
    setZoomMode((m) => {
      if (m === 'fit') {
        setZoomLevel(1.0);
        return 'actual';
      }
      return 'fit';
    });
  }, []);

  // Image display style based on zoom mode.
  const imageStyle: React.CSSProperties =
    zoomMode === 'fit'
      ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
      : { width: `${zoomLevel * 100}%`, maxWidth: 'none', objectFit: 'contain' };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${resource.name}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/95 border-b border-gray-800 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-200 truncate" title={resource.name}>
            {resource.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatBytes(resource.sizeBytes)}
            {data.kind === 'pdf' && (
              <> &mdash; {pageCount} {pageCount === 1 ? 'page' : 'pages'}</>
            )}
            {data.kind === 'image' && (
              <> &mdash; {(data as ImageResourceData).width} x {(data as ImageResourceData).height} px</>
            )}
          </p>
        </div>

        {/* Zoom controls — PDF and image only */}
        {(data.kind === 'pdf' || data.kind === 'image') && (
          <div className="flex items-center gap-1 mx-4 flex-shrink-0">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={handleZoomOut}
              disabled={zoomMode === 'actual' && zoomLevel <= ZOOM_MIN}
              className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={zoomMode === 'fit' ? 'Switch to actual size' : 'Switch to fit-to-window'}
              onClick={handleToggleFit}
              className="px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors min-w-[52px] text-center"
            >
              {zoomMode === 'fit' ? 'Fit' : `${Math.round(zoomLevel * 100)}%`}
            </button>

            <button
              type="button"
              aria-label="Zoom in"
              onClick={handleZoomIn}
              disabled={zoomMode === 'actual' && zoomLevel >= ZOOM_MAX}
              className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
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

      {/* Content area — fills remaining viewport */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-950"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {data.kind === 'text' ? (
            <TextPreview text={(data as TextResourceData).preview} />
          ) : isRendering ? (
            <div className="flex flex-col items-center gap-3 mt-20 text-gray-500">
              <div className="w-6 h-6 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
              <span className="text-sm">Rendering...</span>
            </div>
          ) : highResUrl ? (
            <img
              src={highResUrl}
              alt={data.kind === 'pdf' ? `Page ${currentPage + 1}` : resource.name}
              style={imageStyle}
              className="rounded shadow-xl transition-all duration-150"
            />
          ) : (
            <div className="text-gray-600 text-sm mt-20">No preview available.</div>
          )}
        </div>
      </div>

      {/* Page navigation footer — PDFs with more than one page */}
      {data.kind === 'pdf' && pageCount > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-2.5 bg-gray-900/95 border-t border-gray-800 flex-shrink-0">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs text-gray-400 tabular-nums">
            Page {currentPage + 1} of {pageCount}
          </span>

          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === pageCount - 1}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount - 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="flex items-center justify-center gap-4 px-4 py-1.5 bg-gray-900/80 border-t border-gray-800 flex-shrink-0">
        <span className="text-xs text-gray-700">Esc to close</span>
        {data.kind === 'pdf' && pageCount > 1 && (
          <span className="text-xs text-gray-700">Arrow keys to navigate</span>
        )}
        <span className="text-xs text-gray-700">+/- to zoom &mdash; 0 to fit</span>
      </div>
    </div>
  );
}

interface TextPreviewProps {
  text: string;
}

function TextPreview({ text }: TextPreviewProps) {
  return (
    <pre className="w-full max-h-full overflow-auto text-xs text-gray-300 bg-gray-900 rounded-lg p-4 leading-relaxed whitespace-pre-wrap break-words font-mono min-w-[40ch] max-w-4xl">
      {text || '(empty file)'}
    </pre>
  );
}
