'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PrivacyModeToggle({
  expertId,
  projectId,
  initialCloaked,
}: {
  expertId: string;
  projectId: string;
  initialCloaked: boolean;
}) {
  const [cloaked, setCloaked] = useState(initialCloaked);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/experts/${expertId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactCloaked: !cloaked,
          projectId,
        }),
      });
      if (res.ok) {
        setCloaked(!cloaked);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.78rem',
        color: '#475569',
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={cloaked}
        onChange={onToggle}
        disabled={loading}
        style={{ width: 14, height: 14 }}
      />
      Privacy Mode
    </label>
  );
}
