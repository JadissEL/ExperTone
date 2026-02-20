import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createExpert } from '@/app/actions/experts';

export default function NewExpertPage() {
  async function handleSubmit(formData: FormData) {
    'use server';
    await createExpert({
      name: (formData.get('name') as string)?.trim() ?? '',
      industry: (formData.get('industry') as string)?.trim() ?? '',
      subIndustry: (formData.get('subIndustry') as string)?.trim() ?? '',
      country: (formData.get('country') as string)?.trim() ?? '',
      region: (formData.get('region') as string)?.trim() ?? '',
        currentEmployer: (formData.get('currentEmployer') as string)?.trim() ?? '',
      seniorityScore: parseInt((formData.get('seniorityScore') as string) ?? '50', 10),
      yearsExperience: parseInt((formData.get('yearsExperience') as string) ?? '5', 10),
      predictedRate: parseFloat((formData.get('predictedRate') as string) ?? '200'),
        contactCloaked: (formData.get('contactCloaked') as string) === 'on',
      visibilityStatus: 'GLOBAL_POOL',
      contacts: (formData.get('email') as string)?.trim()
        ? [{ type: 'EMAIL' as const, value: (formData.get('email') as string).trim() }]
        : undefined,
    });
    redirect('/');
  }

  return (
    <main style={{ padding: '1.5rem 2rem', fontFamily: 'system-ui', maxWidth: 500 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← ExperTone
        </Link>
        <h1 style={{ marginTop: '0.25rem', fontSize: '1.5rem' }}>Add Expert</h1>
        <p style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.9rem' }}>
          Add an expert to the pool. Use GLOBAL_POOL to include in search and hunts.
        </p>
      </div>

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="industry" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Industry *
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              required
              placeholder="e.g. Fintech"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="subIndustry" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Sub-industry
            </label>
            <input
              id="subIndustry"
              name="subIndustry"
              type="text"
              placeholder="e.g. Payments"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="country" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Country *
            </label>
            <input
              id="country"
              name="country"
              type="text"
              required
              placeholder="e.g. UAE"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="region" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Region *
            </label>
            <input
              id="region"
              name="region"
              type="text"
              required
              placeholder="e.g. MENA"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>
            <label htmlFor="seniorityScore" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Seniority (0–100)
            </label>
            <input
              id="seniorityScore"
              name="seniorityScore"
              type="number"
              min={0}
              max={100}
              defaultValue={50}
              style={{
                width: 80,
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
          <div>
            <label htmlFor="yearsExperience" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Years exp.
            </label>
            <input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min={0}
              defaultValue={5}
              style={{
                width: 80,
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
          <div>
            <label htmlFor="predictedRate" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Rate ($/hr)
            </label>
            <input
              id="predictedRate"
              name="predictedRate"
              type="number"
              min={0}
              step={10}
              defaultValue={200}
              style={{
                width: 90,
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor="currentEmployer" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Current Employer (for compliance scan)
          </label>
          <input
            id="currentEmployer"
            name="currentEmployer"
            type="text"
            placeholder="e.g. Global Pharma Inc."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
            }}
          />
        </div>
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Email (optional)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="expert@example.com"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
            }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155' }}>
          <input id="contactCloaked" name="contactCloaked" type="checkbox" />
          Enable Privacy Mode (cloak contact until vetted engagement accepted)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1.25rem',
              background: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Add Expert
          </button>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1rem',
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
