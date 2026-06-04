// OffscreenCanvas image (re)compression worker.
// Receives CompressRequest messages, re-encodes the image using OffscreenCanvas,
// and returns CompressResponse with the resulting bytes.
//
// All heavy pixel work runs off the main thread here so the UI stays responsive
// during export even for large images.

export interface CompressRequest {
  id: number;
  imageBytes: ArrayBuffer;
  mimeType: string;
  /** Target JPEG quality [0-1]. Used only when outputting JPEG. */
  jpegQuality: number;
  /** Maximum dimension (width or height) in pixels. Larger images are downsampled. */
  maxDimension: number;
  /**
   * When true, images with an alpha channel are composited on white before JPEG
   * encoding instead of keeping PNG. Set to false to preserve transparency as PNG.
   */
  flattenAlpha: boolean;
}

export interface CompressResponse {
  id: number;
  ok: true;
  resultBytes: ArrayBuffer;
  outputMimeType: string;
}

export interface CompressErrorResponse {
  id: number;
  ok: false;
  error: string;
}

// Decode image bytes to an ImageBitmap, respecting the source MIME type.
async function decodeImage(bytes: ArrayBuffer, mimeType: string): Promise<ImageBitmap> {
  const blob = new Blob([bytes], { type: mimeType });
  return createImageBitmap(blob);
}

// Check whether the source has an alpha channel (PNG, WebP with alpha).
function sourceHasAlpha(mimeType: string): boolean {
  return mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/gif';
}

async function processImage(req: CompressRequest): Promise<CompressResponse> {
  const bitmap = await decodeImage(req.imageBytes, req.mimeType);

  const originalW = bitmap.width;
  const originalH = bitmap.height;

  // Compute output dimensions: downscale to maxDimension if either axis exceeds it.
  let outW = originalW;
  let outH = originalH;
  if (outW > req.maxDimension || outH > req.maxDimension) {
    const scale = req.maxDimension / Math.max(outW, outH);
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

  const hasAlpha = sourceHasAlpha(req.mimeType);

  if (hasAlpha && req.flattenAlpha) {
    // Composite on a white background before JPEG encoding.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: req.jpegQuality });
    const resultBytes = await blob.arrayBuffer();
    return { id: req.id, ok: true, resultBytes, outputMimeType: 'image/jpeg' };
  }

  if (hasAlpha && !req.flattenAlpha) {
    // Preserve alpha channel as PNG (no quality setting; PNG is lossless).
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const resultBytes = await blob.arrayBuffer();
    return { id: req.id, ok: true, resultBytes, outputMimeType: 'image/png' };
  }

  // Opaque image (JPEG source): re-encode as JPEG with desired quality.
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: req.jpegQuality });
  const resultBytes = await blob.arrayBuffer();
  return { id: req.id, ok: true, resultBytes, outputMimeType: 'image/jpeg' };
}

// In a worker context, postMessage accepts a transfer list as the second argument.
// The DOM lib types postMessage as Window.postMessage which has a different signature.
// Cast self to a minimal worker-compatible interface to satisfy the type checker.
type WorkerSelf = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
  postMessage(message: unknown): void;
};
const workerSelf = self as unknown as WorkerSelf;

workerSelf.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const req = event.data;
  try {
    const response = await processImage(req);
    // Transfer the ArrayBuffer to avoid copying.
    workerSelf.postMessage(response, [response.resultBytes]);
  } catch (err) {
    const errorResponse: CompressErrorResponse = {
      id: req.id,
      ok: false,
      error: String(err),
    };
    workerSelf.postMessage(errorResponse);
  }
};
