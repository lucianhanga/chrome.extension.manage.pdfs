// Image compression dispatcher: sends image bytes to the OffscreenCanvas worker
// for off-main-thread downsampling and re-encoding, according to an export profile.
//
// The worker is lazily instantiated and shared across calls within a single export
// session. Callers that need parallel compression can issue multiple requests
// simultaneously — each is tracked by a unique id and resolved independently.

import type { ExportProfileParams } from './profiles.ts';
import type {
  CompressRequest,
  CompressResponse,
  CompressErrorResponse,
} from '../workers/compress.worker.ts';

// Vite resolves this ?worker&url import at build time, producing a packaged
// same-origin worker URL. This satisfies the MV3 CSP worker-src 'self' rule.
// The ?worker suffix makes Vite bundle the worker module. We use ?worker&url to
// get the URL so we can instantiate it with `new Worker(url, { type: 'module' })`.
import compressWorkerUrl from '../workers/compress.worker.ts?worker&url';

let workerInstance: Worker | null = null;
let workerRequestCounter = 0;
const pendingRequests = new Map<number, {
  resolve: (result: CompressResult) => void;
  reject: (err: Error) => void;
}>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(compressWorkerUrl, { type: 'module' });
    workerInstance.onmessage = (event: MessageEvent<CompressResponse | CompressErrorResponse>) => {
      const response = event.data;
      const pending = pendingRequests.get(response.id);
      if (!pending) return;
      pendingRequests.delete(response.id);

      if (response.ok) {
        pending.resolve({ bytes: response.resultBytes, mimeType: response.outputMimeType });
      } else {
        pending.reject(new Error(response.error));
      }
    };
    workerInstance.onerror = (event) => {
      // Reject all pending requests on a fatal worker error.
      const err = new Error(`Compression worker error: ${event.message}`);
      for (const pending of pendingRequests.values()) {
        pending.reject(err);
      }
      pendingRequests.clear();
      workerInstance = null;
    };
  }
  return workerInstance;
}

/** Result of a compression call. */
export interface CompressResult {
  bytes: ArrayBuffer;
  /** Actual MIME type of the output (may differ from input for alpha-flattened images). */
  mimeType: string;
}

/**
 * Compute the maximum pixel dimension for a given DPI target.
 *
 * PDF pages in the A4 / US Letter range are roughly 8.5" wide.
 * For DPI-capping images: a 300-DPI cap on an 8.5" wide page is ~2550px.
 * We use the DPI value directly as the maximum dimension in pixels,
 * which is the right constraint for web-size images.
 *
 * The chosen formula: maxDimension = targetDpi * 8.5 (typical wide page in inches).
 * This gives:
 *   print (300 DPI)  -> 2550px  (high quality, minimal downsampling)
 *   web   (150 DPI)  -> 1275px  (balanced)
 *   compressed (96 DPI) -> 816px  (small file)
 *
 * For images that are already smaller than the computed max dimension,
 * they are left at their original size (no upscaling).
 */
export function computeMaxDimension(targetDpi: number): number {
  return Math.round(targetDpi * 8.5);
}

/**
 * Re-encode image bytes off the main thread using OffscreenCanvas.
 *
 * - JPEG sources: re-encoded as JPEG at the profile quality with downsampling.
 * - PNG/WebP sources: composited on white and re-encoded as JPEG (alpha flattened)
 *   for compressed/web profiles (flattenAlpha = true).
 *   For the print profile (flattenAlpha = false), alpha is preserved as PNG.
 *
 * Returns compressed bytes and the actual output MIME type.
 */
export async function compressImage(
  imageBytes: ArrayBuffer,
  mimeType: string,
  params: ExportProfileParams,
): Promise<CompressResult> {
  const worker = getWorker();
  const id = ++workerRequestCounter;
  const maxDimension = computeMaxDimension(params.targetDpi);

  // For print profile: preserve PNG transparency. For web/compressed: flatten alpha.
  const flattenAlpha = params.rasterizePdfPages || params.jpegQuality < 0.9;

  return new Promise<CompressResult>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });

    const request: CompressRequest = {
      id,
      imageBytes,
      mimeType,
      jpegQuality: params.jpegQuality,
      maxDimension,
      flattenAlpha,
    };

    // Transfer the imageBytes ArrayBuffer for zero-copy transfer to the worker.
    worker.postMessage(request, [request.imageBytes]);
  });
}

/**
 * Terminate the shared compression worker and clear pending requests.
 * Call this after an export completes to free resources.
 */
export function terminateCompressWorker(): void {
  if (workerInstance) {
    const err = new Error('Compression worker terminated');
    for (const pending of pendingRequests.values()) {
      pending.reject(err);
    }
    pendingRequests.clear();
    workerInstance.terminate();
    workerInstance = null;
  }
}
