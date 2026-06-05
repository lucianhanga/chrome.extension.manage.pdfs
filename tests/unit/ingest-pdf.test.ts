// Regression test for the PDF ingestion "detached ArrayBuffer" bug.
//
// pdf.js transfers (detaches) the ArrayBuffer handed to its worker. ingestPdf must
// copy the raw bytes it needs for export BEFORE calling openPdf — otherwise building
// `rawBytes` from the now-detached buffer throws
//   "Cannot perform Construct on a detached ArrayBuffer"
// outside any try/catch, the whole ingestion promise rejects, and the Source pane is
// left stuck on an endless progress bar (isLoading never resets).
//
// Runs in Node; render.ts (pdf.js) and objectUrl.ts (URL.createObjectURL) are mocked.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pdf.js layer. openPdf simulates pdf.js by detaching the buffer it receives,
// exactly as the real worker transfer does.
vi.mock('../../src/pdf/render.ts', () => ({
  openPdf: vi.fn(async (bytes: ArrayBuffer) => {
    // Transferring with structuredClone detaches `bytes` on this thread.
    structuredClone(bytes, { transfer: [bytes] });
    return { numPages: 1 };
  }),
  getPdfMetadata: vi.fn(async () => ({
    pageCount: 1,
    pageDimensions: [{ width: 100, height: 100 }],
    title: undefined,
    author: undefined,
  })),
  getPageThumbnail: vi.fn(
    async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
  ),
}));

vi.mock('../../src/shared/objectUrl.ts', () => ({
  createTrackedObjectUrl: vi.fn(() => 'blob:thumb'),
}));

const { ingestFile } = await import('../../src/pdf/ingest.ts');
const render = await import('../../src/pdf/render.ts');
const openPdf = render.openPdf as ReturnType<typeof vi.fn>;

function makePdfFile(bytes: Uint8Array): File {
  return new File([bytes], 'sample.pdf', { type: 'application/pdf' });
}

describe('ingestFile — PDF detached-buffer regression', () => {
  beforeEach(() => {
    openPdf.mockClear();
  });

  it('preserves rawBytes even though pdf.js detaches the buffer it receives', async () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);

    const result = await ingestFile(makePdfFile(original), 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Guard: the mock must actually have detached the buffer, otherwise this test
    // would pass even with the bug present.
    expect(openPdf).toHaveBeenCalledTimes(1);
    const handed = openPdf.mock.calls[0][0] as ArrayBuffer;
    expect(handed.byteLength).toBe(0); // detached by the simulated worker transfer

    expect(result.resource.data.kind).toBe('pdf');
    if (result.resource.data.kind !== 'pdf') return;

    // The raw bytes survived as an intact, independent copy of the file contents.
    expect(Array.from(result.resource.data.rawBytes)).toEqual([10, 20, 30, 40, 50]);
  });

  it('resolves (never rejects) for a valid PDF so the loading state can reset', async () => {
    // A rejection here is what previously stranded the Source pane spinner.
    await expect(ingestFile(makePdfFile(new Uint8Array([1])), 0)).resolves.toMatchObject({
      ok: true,
    });
  });

  it('populates page metadata and one thumbnail per page', async () => {
    const result = await ingestFile(makePdfFile(new Uint8Array([1, 2])), 0);
    expect(result.ok).toBe(true);
    if (!result.ok || result.resource.data.kind !== 'pdf') return;

    expect(result.resource.data.pageCount).toBe(1);
    expect(result.resource.data.thumbnailUrls).toEqual(['blob:thumb']);
  });
});
