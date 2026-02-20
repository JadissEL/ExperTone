import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { isAdmin } from '@/lib/requireAdmin';

export default async function Home() {
  const admin = await isAdmin();
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>ExperTone</h1>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign In</button>
          </SignInButton>
        </SignedOut>
      </div>

      <SignedIn>
        <p>Welcome! Use the API at <code>/api/search</code> for semantic search.</p>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/graph" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
            View 3D Knowledge Graph →
          </Link>
          {' · '}
          <Link href="/projects" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
            Research Projects →
          </Link>
          {' · '}
          <Link href="/experts/new" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
            Add Expert →
          </Link>
          {' · '}
          <Link href="/profile" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
            My Profile →
          </Link>
          {admin && (
            <>
              {' · '}
              <Link href="/admin" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Governance Suite →
              </Link>
            </>
          )}
        </p>
      </SignedIn>
      <SignedOut>
        <p>Sign in to use ExperTone.</p>
      </SignedOut>
    </main>
  );
}
