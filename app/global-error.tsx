'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-2xl font-bold text-red-400">Application Error</h1>
          <p className="max-w-md text-center text-slate-400">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
