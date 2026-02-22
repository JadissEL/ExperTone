import Link from 'next/link';
import { getResearchProjects } from '@/app/actions/research';
import { ConciergeBriefBuilder } from '@/components/research/ConciergeBriefBuilder';

export default async function ProjectsPage() {
  const projects = await getResearchProjects();

  return (
    <main className="min-h-screen bg-aether-base mesh-bg px-6 py-8 font-sans" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="mb-6">
        <Link href="/" className="text-slate-400 hover:text-slate-200 no-underline text-sm">
          ← ExperTone
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Research Projects</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a project to trigger the Expert Hunter workflow in n8n.
        </p>
      </div>

      <ConciergeBriefBuilder />

      <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4">
        <h2 className="text-base font-medium text-white mb-3">Recent projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400">No projects yet. Create one above.</p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
              >
                <div>
                  <Link href={`/projects/${p.id}`} className="text-white font-medium no-underline hover:text-emerald-400">
                    {p.title}
                  </Link>
                  <span
                    className={`ml-2 text-xs ${
                      p.status === 'COMPLETED' ? 'text-emerald-400' : p.status === 'RUNNING' ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {p.status}
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {p._count.results} results
                  </p>
                </div>
                <Link
                  href={`/projects/${p.id}`}
                  className="text-sm text-sky-400 hover:text-sky-300 underline"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
