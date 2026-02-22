import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { VanguardLayoutClient } from './VanguardLayoutClient';

export default function VanguardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <VanguardLayoutClient>{children}</VanguardLayoutClient>
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-aether-base mesh-bg text-slate-200 p-8">
          <h1 className="text-2xl font-semibold mb-2">Vanguard</h1>
          <p className="text-slate-400 mb-6">Sign in to access the Command Center.</p>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-aether-emerald/20 text-aether-emerald border border-aether-emerald/40 hover:bg-aether-emerald/30 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </SignedOut>
    </>
  );
}
