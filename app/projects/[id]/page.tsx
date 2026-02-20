import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectWithResults, reRunHunt } from '@/app/actions/research';
import { DeleteProjectButton } from './DeleteProjectButton';
import { PrivacyModeToggle } from './PrivacyModeToggle';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectWithResults(id);

  if (!project) {
    notFound();
  }

  return (
    <main style={{ padding: '1.5rem 2rem', fontFamily: 'system-ui', maxWidth: 900 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/projects" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Research Projects
        </Link>
        <h1 style={{ marginTop: '0.25rem', fontSize: '1.5rem' }}>{project.title}</h1>
        <p style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.9rem' }}>
          {project.status} · {project.results.length} expert{project.results.length !== 1 ? 's' : ''} found
        </p>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form action={reRunHunt.bind(null, project.id)}>
            <button
              type="submit"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Re-run hunt
            </button>
          </form>
          {project.results.length > 0 && (
            <a
              href={`/api/projects/${project.id}/export`}
              download
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Export CSV
            </a>
          )}
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      {project.results.length === 0 ? (
        <p style={{ color: '#64748b' }}>
          No results yet. The Expert Hunter may still be running, no experts matched the filters, or n8n/ML service may be down. Use &quot;Re-run hunt&quot; above to retry.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {project.results.map((r) => (
            // Prisma client types may lag behind latest schema in editor diagnostics.
            <li
              key={r.id}
              style={{
                padding: '1rem 1.25rem',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                marginBottom: '0.5rem',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {(() => {
                    const expert = r.expert as typeof r.expert & {
                      verifiedAt?: Date | null;
                      verifiedBadgeProvider?: string | null;
                      professionalAuthorityIndex?: number | null;
                      complianceScore?: number | null;
                      mnpiRiskLevel?: string | null;
                      requiresManualScreening?: boolean | null;
                      contactCloaked?: boolean | null;
                    };
                    return (
                      <>
                  <strong>{r.expert.name}</strong>
                  {expert.verifiedAt ? (
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: '#dcfce7',
                        color: '#166534',
                      }}
                    >
                      Verified {expert.verifiedBadgeProvider ? `· ${expert.verifiedBadgeProvider}` : ''}
                    </span>
                  ) : null}
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.8rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background:
                        r.classificationTier === 'S'
                          ? '#dcfce7'
                          : r.classificationTier === 'A'
                            ? '#dbeafe'
                            : r.classificationTier === 'B'
                              ? '#fef3c7'
                              : '#f3f4f6',
                    }}
                  >
                    Tier {r.classificationTier}
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                    {r.expert.industry}
                    {r.expert.subIndustry ? ` · ${r.expert.subIndustry}` : ''}
                  </p>
                  {expert.professionalAuthorityIndex != null ? (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#0f766e' }}>
                      Authority Index: {Number(expert.professionalAuthorityIndex).toFixed(2)}
                    </p>
                  ) : null}
                  {(expert.complianceScore != null || expert.mnpiRiskLevel) && (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#7c3aed' }}>
                      Compliance: {expert.complianceScore ?? 'N/A'}
                      {expert.mnpiRiskLevel ? ` · ${expert.mnpiRiskLevel}` : ''}
                      {expert.requiresManualScreening ? ' · Manual screening required' : ''}
                    </p>
                  )}
                  <p style={{ margin: '0.2rem 0 0' }}>
                    <PrivacyModeToggle
                      expertId={r.expert.id}
                      projectId={project.id}
                      initialCloaked={!!expert.contactCloaked}
                    />
                  </p>
                  {r.expert.contacts?.length ? (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {r.expert.contacts?.map((c) => c.value).join(', ')}
                    </p>
                  ) : null}
                      </>
                    );
                  })()}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {(r.matchScore * 100).toFixed(0)}%
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    match score
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
