// Tracked object URL helpers to prevent memory leaks.
// Call createTrackedObjectUrl instead of URL.createObjectURL directly.
// Call revokeTrackedObjectUrl when the resource is removed.

const activeUrls = new Set<string>();

export function createTrackedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);
  return url;
}

export function revokeTrackedObjectUrl(url: string): void {
  if (activeUrls.has(url)) {
    URL.revokeObjectURL(url);
    activeUrls.delete(url);
  }
}

/** Revoke all tracked URLs — call on app teardown or tab unload if needed. */
export function revokeAllTrackedUrls(): void {
  for (const url of activeUrls) {
    URL.revokeObjectURL(url);
  }
  activeUrls.clear();
}
