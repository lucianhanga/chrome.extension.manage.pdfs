// Two-pane layout shell for PDF Manager.
// Phase 2: Source pane is fully implemented; Destination pane stub remains.

import { SourcePane } from '../features/source/SourcePane.tsx';
import { DestinationPane } from '../features/destination/DestinationPane.tsx';

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

        {/* Resizer divider (visual only in Phase 2) */}
        <div className="w-px bg-gray-800 flex-shrink-0" />

        {/* Right pane: Result / Destination PDF */}
        <DestinationPane />
      </div>
    </div>
  );
}
