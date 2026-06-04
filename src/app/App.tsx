// Two-pane layout shell for PDF Manager.
// Phase 1 delivers the structural skeleton only — no PDF logic yet.

export function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 z-10">
        <span className="text-blue-400 font-semibold tracking-wide text-sm">PDF Manager</span>
        <span className="ml-3 text-gray-500 text-xs">
          Client-side only &mdash; files never leave your browser
        </span>
      </div>

      {/* Main two-pane area, offset by header height */}
      <div className="flex w-full mt-12 overflow-hidden">
        {/* Left pane: Source / Resources */}
        <SourcePane />

        {/* Resizer divider (visual only in Phase 1) */}
        <div className="w-px bg-gray-800 flex-shrink-0" />

        {/* Right pane: Result / Destination PDF */}
        <DestinationPane />
      </div>
    </div>
  );
}

function SourcePane() {
  return (
    <div className="flex flex-col w-1/2 overflow-hidden">
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Source / Resources
        </h2>
      </div>

      {/* Drop zone placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center gap-4 text-center hover:border-blue-500 transition-colors">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16v-8m0 0L8 12m4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">
            Drop PDF, image, or text files here
          </p>
          <p className="text-xs text-gray-600">or</p>
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            Choose files
          </button>
          <p className="text-xs text-gray-600 mt-2">
            File ingestion available in Phase 2
          </p>
        </div>

        {/* Placeholder resource card list */}
        <div className="w-full max-w-md mt-6 space-y-2">
          <PlaceholderCard label="document.pdf" detail="24 pages" />
          <PlaceholderCard label="photo.png" detail="1920 x 1080 px" />
        </div>
      </div>
    </div>
  );
}

function DestinationPane() {
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

interface PlaceholderCardProps {
  label: string;
  detail: string;
}

function PlaceholderCard({ label, detail }: PlaceholderCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 rounded-lg border border-gray-800 opacity-40">
      <div className="w-8 h-10 bg-gray-700 rounded flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-gray-300 truncate">{label}</p>
        <p className="text-xs text-gray-600">{detail}</p>
      </div>
    </div>
  );
}
