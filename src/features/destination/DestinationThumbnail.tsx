// DestinationThumbnail: renders the visual thumbnail for a DestinationItem.
//
// For PDF pages: renders via the live pdfDoc proxy using the same render helpers
// as the source PageGrid (so the cached ingestion thumbnail is reused when available,
// and a fresh render is triggered when not).
// For images: uses the objectUrl directly.
//
// This component manages its own blob URL lifecycle: any URL it creates via
// getPageThumbnail (i.e. not the ingestion thumbnail) is revoked on unmount or
// when the item changes.

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../state/store.ts';
import type { PdfResourceData, ImageResourceData } from '../../state/types.ts';
import { getPageThumbnail } from '../../pdf/render.ts';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Width used for destination card thumbnail rendering (pixels). */
const DEST_THUMB_WIDTH = 96;

interface DestinationThumbnailProps {
  resourceId: string;
  kind: 'pdf-page' | 'image' | 'text';
  pageIndex?: number;
  className?: string;
}

export function DestinationThumbnail({
  resourceId,
  kind,
  pageIndex = 0,
  className = '',
}: DestinationThumbnailProps) {
  const resource = useAppStore((s) => s.resources.find((r) => r.id === resourceId));
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  // Track whether we created the URL ourselves so we can revoke it on cleanup.
  const ownedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Revoke any previously owned URL when dependencies change.
    const cleanup = () => {
      if (ownedUrlRef.current) {
        URL.revokeObjectURL(ownedUrlRef.current);
        ownedUrlRef.current = null;
      }
    };

    if (!resource) {
      setThumbUrl(null);
      return cleanup;
    }

    if (kind === 'image' && resource.data.kind === 'image') {
      // Image resources have a persistent objectUrl — just use it.
      cleanup();
      setThumbUrl((resource.data as ImageResourceData).objectUrl);
      return cleanup;
    }

    if (kind === 'pdf-page' && resource.data.kind === 'pdf') {
      const pdfData = resource.data as PdfResourceData;

      // Prefer the cached ingestion thumbnail if it exists for this page.
      const cached = pdfData.thumbnailUrls[pageIndex];
      if (cached) {
        cleanup();
        setThumbUrl(cached);
        return cleanup;
      }

      // Otherwise, render via the live pdfDoc proxy.
      const pdfDoc = pdfData.pdfDoc as PDFDocumentProxy | null;
      if (!pdfDoc) {
        setThumbUrl(null);
        return cleanup;
      }

      let cancelled = false;
      setIsRendering(true);

      getPageThumbnail(pdfDoc, pageIndex + 1, DEST_THUMB_WIDTH)
        .then((blob) => {
          if (cancelled) return;
          cleanup(); // revoke previous owned url if any
          const url = URL.createObjectURL(blob);
          ownedUrlRef.current = url;
          setThumbUrl(url);
        })
        .catch(() => {
          if (!cancelled) setThumbUrl(null);
        })
        .finally(() => {
          if (!cancelled) setIsRendering(false);
        });

      return () => {
        cancelled = true;
        cleanup();
      };
    }

    setThumbUrl(null);
    return cleanup;
  }, [resource, kind, pageIndex]);

  // Final cleanup on unmount.
  useEffect(() => {
    return () => {
      if (ownedUrlRef.current) {
        URL.revokeObjectURL(ownedUrlRef.current);
        ownedUrlRef.current = null;
      }
    };
  }, []);

  // Text items have no rendered raster yet (the page is produced at export time,
  // Phase 4). Show a page-like preview of the text snippet.
  if (kind === 'text') {
    const snippet =
      resource && resource.data.kind === 'text' ? resource.data.preview : '';
    return (
      <div className={`flex flex-col bg-gray-100 text-gray-800 p-1 overflow-hidden ${className}`}>
        <span className="text-[7px] leading-tight whitespace-pre-wrap break-words overflow-hidden">
          {snippet || 'Text'}
        </span>
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className}`}>
        <div className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!thumbUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className}`}>
        <svg
          className="w-5 h-5 text-gray-600"
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

  const alt = kind === 'pdf-page' ? `Page ${pageIndex + 1}` : 'Image';
  return (
    <img
      src={thumbUrl}
      alt={alt}
      className={`object-contain bg-gray-800 ${className}`}
      draggable={false}
    />
  );
}
