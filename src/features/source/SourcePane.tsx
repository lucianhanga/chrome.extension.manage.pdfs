// SourcePane: the left pane — dropzone + resource list + preview modal.

import { useState, useCallback } from 'react';
import { Dropzone } from './Dropzone.tsx';
import { ResourceCard } from './ResourceCard.tsx';
import { PreviewModal } from './PreviewModal.tsx';
import { ingestFile, formatBytes } from '../../pdf/ingest.ts';
import { useAppStore } from '../../state/store.ts';
import type { Resource, PdfResourceData } from '../../state/types.ts';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface ErrorEntry {
  id: string;
  message: string;
}

export function SourcePane() {
  const { resources, addResource, removeResource, clearResources } = useAppStore();
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<{
    resource: Resource;
    pageIndex?: number;
  } | null>(null);

  const totalBytes = resources.reduce((sum, r) => sum + r.sizeBytes, 0);

  const pushError = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setErrors((prev) => [...prev, { id, message }]);
    // Auto-dismiss after 6 s.
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.id !== id));
    }, 6000);
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      let currentBytes = totalBytes;

      for (const file of files) {
        const result = await ingestFile(file, currentBytes);
        if (result.ok) {
          addResource(result.resource);
          currentBytes += result.resource.sizeBytes;
        } else {
          pushError(result.reason);
        }
      }

      setIsLoading(false);
    },
    [addResource, pushError, totalBytes],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeResource(id);
      // Close preview if the removed resource was being previewed.
      if (previewTarget?.resource.id === id) setPreviewTarget(null);
    },
    [removeResource, previewTarget],
  );

  const handlePreview = useCallback((resource: Resource, pageIndex?: number) => {
    setPreviewTarget({ resource, pageIndex });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewTarget(null);
  }, []);

  return (
    <div className="flex flex-col w-1/2 overflow-hidden">
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Source / Resources
        </h2>
        {resources.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">
              {resources.length} {resources.length === 1 ? 'file' : 'files'} &mdash; {formatBytes(totalBytes)}
            </span>
            <button
              type="button"
              onClick={clearResources}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-0.5 rounded hover:bg-gray-800"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dropzone */}
        <Dropzone onFiles={handleFiles} disabled={isLoading} />

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-800/40 rounded-lg">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
            <p className="text-xs text-blue-300">Processing files...</p>
          </div>
        )}

        {/* Error list */}
        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((err) => (
              <div
                key={err.id}
                role="alert"
                className="flex items-start gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg"
              >
                <svg
                  className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-xs text-red-300 flex-1">{err.message}</p>
                <button
                  type="button"
                  aria-label="Dismiss error"
                  onClick={() => dismissError(err.id)}
                  className="text-red-600 hover:text-red-400 ml-1 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Resource list */}
        {resources.length > 0 && (
          <div className="space-y-2">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onRemove={handleRemove}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}

        {/* Empty state when no resources and not loading */}
        {resources.length === 0 && !isLoading && (
          <p className="text-center text-xs text-gray-700 mt-4">
            No resources loaded yet.
          </p>
        )}
      </div>

      {/* Preview modal (portal would be ideal, rendered here for simplicity in v1) */}
      {previewTarget && (
        <PreviewModal
          resource={previewTarget.resource}
          initialPage={previewTarget.pageIndex}
          onClose={handleClosePreview}
          pdfDoc={
            previewTarget.resource.data.kind === 'pdf'
              ? ((previewTarget.resource.data as PdfResourceData).pdfDoc as PDFDocumentProxy)
              : null
          }
        />
      )}
    </div>
  );
}
