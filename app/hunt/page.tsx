import { Suspense } from 'react';
import { WarRoomClient } from './WarRoomClient';

export default function HuntPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
            Apex Hunter · War Room
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-source extraction · Elite filtering · One-click capture
          </p>
        </div>
        <a
          href="/dashboard"
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Command Center
        </a>
      </div>

      <Suspense fallback={<div className="p-4 text-slate-500">Loading War Room…</div>}>
        <div className="h-[calc(100vh-5.5rem)]">
          <WarRoomClient />
        </div>
      </Suspense>
    </main>
  );
}
