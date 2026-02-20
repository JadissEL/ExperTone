import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ContributionAnalyticsClient } from './ContributionAnalyticsClient';

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Contribution analytics and ownership health</p>
        <ContributionAnalyticsClient />
      </div>
    </main>
  );
}
