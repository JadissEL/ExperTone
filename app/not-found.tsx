import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold text-slate-200">404</h1>
      <p className="text-slate-400">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
      >
        Go home
      </Link>
    </div>
  );
}
