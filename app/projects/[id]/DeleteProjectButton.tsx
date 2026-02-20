'use client';

import { useRouter } from 'next/navigation';
import { deleteProject } from '@/app/actions/research';

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm('Delete this project and all its results?')) return;
    await deleteProject(projectId);
    router.push('/projects');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: '0.35rem 0.75rem',
        fontSize: '0.85rem',
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      Delete project
    </button>
  );
}
