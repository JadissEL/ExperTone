import { CommandCenterClient } from './CommandCenterClient';

export default function CommandCenterPage() {
  return (
    <main className="flex h-screen flex-col bg-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-900">
          Expert Intelligence Command Center
        </h1>
        <p className="text-sm text-slate-500">
          Bloomberg-density dashboard for Expert Network CSAs
        </p>
      </header>
      <CommandCenterClient />
    </main>
  );
}
