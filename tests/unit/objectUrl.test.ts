import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock browser URL API before importing the module.
let urlCounter = 0;
const mockCreate = vi.fn((_blob: Blob) => `blob:mock/${++urlCounter}`);
const mockRevoke = vi.fn();

vi.stubGlobal('URL', {
  createObjectURL: mockCreate,
  revokeObjectURL: mockRevoke,
});

const { createTrackedObjectUrl, revokeTrackedObjectUrl, revokeAllTrackedUrls } =
  await import('../../src/shared/objectUrl.ts');

beforeEach(() => {
  mockCreate.mockClear();
  mockRevoke.mockClear();
  // Reset internal Set by revoking all first
  revokeAllTrackedUrls();
  mockRevoke.mockClear();
});

describe('createTrackedObjectUrl', () => {
  it('delegates to URL.createObjectURL', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url = createTrackedObjectUrl(blob);
    expect(mockCreate).toHaveBeenCalledWith(blob);
    expect(typeof url).toBe('string');
  });
});

describe('revokeTrackedObjectUrl', () => {
  it('revokes a tracked url', () => {
    const blob = new Blob(['x']);
    const url = createTrackedObjectUrl(blob);
    revokeTrackedObjectUrl(url);
    expect(mockRevoke).toHaveBeenCalledWith(url);
  });

  it('does not revoke an unknown url', () => {
    revokeTrackedObjectUrl('blob:unknown/123');
    expect(mockRevoke).not.toHaveBeenCalled();
  });
});

describe('revokeAllTrackedUrls', () => {
  it('revokes all currently tracked urls', () => {
    const b1 = new Blob(['a']);
    const b2 = new Blob(['b']);
    createTrackedObjectUrl(b1);
    createTrackedObjectUrl(b2);
    revokeAllTrackedUrls();
    expect(mockRevoke).toHaveBeenCalledTimes(2);
  });
});
