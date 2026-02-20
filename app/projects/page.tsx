import Link from 'next/link';
import { getResearchProjects } from '@/app/actions/research';
import { ConciergeBriefBuilder } from '@/components/research/ConciergeBriefBuilder';

export default async function ProjectsPage() {
  const projects = await getResearchProjects();

  return (
    <main style={{ padding: '1.5rem 2rem', fontFamily: 'system-ui', maxWidth: 800 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← ExperTone
        </Link>
        <h1 style={{ marginTop: '0.25rem', fontSize: '1.5rem' }}>Research Projects</h1>
        <p style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.9rem' }}>
          Create a project to trigger the Expert Hunter workflow in n8n.
        </p>
      </div>

      <ConciergeBriefBuilder />

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Recent projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No projects yet. Create one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {projects.map((p) => (
              <li
                key={p.id}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Link href={`/projects/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <strong>{p.title}</strong>
                  </Link>
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.8rem',
                      color: p.status === 'COMPLETED' ? '#22c55e' : p.status === 'RUNNING' ? '#f59e0b' : '#64748b',
                    }}
                  >
                    {p.status}
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {p._count.results} results
                  </p>
                </div>
                <Link
                  href={`/projects/${p.id}`}
                  style={{
                    fontSize: '0.85rem',
                    color: '#4a9eff',
                    textDecoration: 'underline',
                  }}
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
