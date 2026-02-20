import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GraphErrorBoundary } from '@/components/dashboard/GraphErrorBoundary';

const KnowledgeGraphClient = dynamic(() => import('./KnowledgeGraphClient'), { ssr: false });

export default function GraphPage() {
  return (
    <main style={{ padding: '1.5rem 2rem', fontFamily: 'system-ui', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← ExperTone
          </Link>
          <h1 style={{ marginTop: '0.25rem', fontSize: '1.5rem' }}>3D Knowledge Graph</h1>
          <p style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.9rem' }}>
            Experts, companies, and skills — drag to rotate, scroll to zoom
          </p>
        </div>
      </div>

      <div
        style={{
          background: '#0f172a',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #334155',
        }}
      >
        <GraphErrorBoundary>
          <KnowledgeGraphClient />
        </GraphErrorBoundary>
      </div>
    </main>
  );
}
