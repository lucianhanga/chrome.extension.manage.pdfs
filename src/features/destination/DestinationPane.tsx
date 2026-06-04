// DestinationPane feature component (Phase 3 implementation).
// Renders the right pane with an empty-state placeholder until Phase 3.

export function DestinationPane() {
  return (
    <div className="flex flex-col w-1/2 overflow-hidden">
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Result / Destination PDF
        </h2>
        <div className="flex items-center gap-2">
          <select
            disabled
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option>Optimized for printing</option>
            <option>Optimized for web sharing</option>
            <option>Compressed</option>
          </select>
          <button
            type="button"
            disabled
            className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Empty destination state */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No pages assembled yet</p>
        <p className="text-xs text-gray-700 mt-2 max-w-xs">
          Drag pages from the Source pane here to build your destination PDF.
          Assembly available in Phase 3.
        </p>
      </div>
    </div>
  );
}
