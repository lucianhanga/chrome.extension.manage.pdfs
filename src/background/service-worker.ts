// Service worker for PDF Manager MV3 extension.
// Deliberately thin: opens app.html on action click / context menu.
// No PDF logic here — service workers are ephemeral and must not hold file buffers.

const APP_URL = 'app.html';

// Bring an existing PDF Manager tab to the front, or open a new one.
async function openOrFocusApp(): Promise<void> {
  const appUrl = chrome.runtime.getURL(APP_URL);
  const existing = await chrome.tabs.query({ url: appUrl });

  if (existing.length > 0 && existing[0].id !== undefined) {
    await chrome.tabs.update(existing[0].id, { active: true });
    if (existing[0].windowId !== undefined) {
      await chrome.windows.update(existing[0].windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: appUrl });
}

// Register event listeners synchronously at the top level (MV3 requirement).
chrome.action.onClicked.addListener(() => {
  openOrFocusApp().catch(console.error);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-pdf-manager',
    title: 'Open PDF Manager',
    contexts: ['action'],
  });
});

chrome.runtime.onStartup.addListener(() => {
  // Re-register context menus after service worker restart to avoid duplicates.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'open-pdf-manager',
      title: 'Open PDF Manager',
      contexts: ['action'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-pdf-manager') {
    openOrFocusApp().catch(console.error);
  }
});
