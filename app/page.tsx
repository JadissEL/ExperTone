import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { isAdmin } from '@/lib/requireAdmin';

export default async function Home() {
  const admin = await isAdmin();
  return (
    <main className="min-h-screen bg-expert-navy mesh-bg vanguard-grain">
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="flex items-center justify-between w-full max-w-2xl mb-12">
          <h1 className="text-2xl font-semibold text-slate-200 tracking-tight">ExperTone</h1>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 rounded-lg bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40 hover:bg-expert-emerald/30 transition-colors font-medium">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        <SignedIn>
          <div className="glass-dark rounded-2xl p-8 max-w-xl w-full border border-expert-frost-border">
            <p className="text-slate-300 text-sm mb-6">
              Welcome. Use the API at <code className="text-expert-emerald">/api/search</code> for semantic search.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/vanguard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40 hover:bg-expert-emerald/30 transition-colors font-medium text-sm"
              >
                Command Center →
              </Link>
              <Link
                href="/graph"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-frost/50 text-slate-300 border border-expert-frost-border hover:bg-expert-frost hover:text-slate-200 transition-colors text-sm"
              >
                Knowledge Graph
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-frost/50 text-slate-300 border border-expert-frost-border hover:bg-expert-frost hover:text-slate-200 transition-colors text-sm"
              >
                Projects
              </Link>
              <Link
                href="/experts/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-frost/50 text-slate-300 border border-expert-frost-border hover:bg-expert-frost hover:text-slate-200 transition-colors text-sm"
              >
                Add Expert
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-frost/50 text-slate-300 border border-expert-frost-border hover:bg-expert-frost hover:text-slate-200 transition-colors text-sm"
              >
                Profile
              </Link>
              {admin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-expert-frost/50 text-slate-300 border border-expert-frost-border hover:bg-expert-frost hover:text-slate-200 transition-colors text-sm"
                >
                  Governance
                </Link>
              )}
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <p className="text-slate-400 text-center">Sign in to use ExperTone.</p>
        </SignedOut>
      </div>
    </main>
  );
}
