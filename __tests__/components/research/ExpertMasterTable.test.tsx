import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpertMasterTable } from '@/components/research/ExpertMasterTable';
import { useResearchStore } from '@/stores/useResearchStore';
import type { ResearchExpert } from '@/types/expert';

const mockExpert: ResearchExpert = {
  id: 'e1',
  name: 'Jane Doe',
  industry: 'Technology',
  subIndustry: 'SaaS',
  country: 'US',
  region: 'NA',
  seniorityScore: 80,
  yearsExperience: 10,
  predictedRate: 250,
  visibilityStatus: 'GLOBAL_POOL',
  isExisting: false,
  similarityScore: 0.92,
  rateConfidence: 0.85,
};


describe('ExpertMasterTable', () => {
  beforeEach(() => {
    useResearchStore.getState().reset();
    useResearchStore.getState().setResults([]);
  });

  it('renders empty state when no results', () => {
    render(<ExpertMasterTable />);
    expect(screen.getByText(/no experts/i)).toBeInTheDocument();
    expect(screen.getByText(/run a research/i)).toBeInTheDocument();
  });

  it('shows expert count when results exist', () => {
    useResearchStore.getState().setResults([mockExpert]);
    render(<ExpertMasterTable />);

    expect(screen.getByText(/1 expert/)).toBeInTheDocument();
  });

  it('has search input', () => {
    render(<ExpertMasterTable />);
    expect(screen.getByPlaceholderText(/search experts/i)).toBeInTheDocument();
  });

  it('updates search filter on input', async () => {
    useResearchStore.getState().setResults([mockExpert]);
    render(<ExpertMasterTable />);

    const searchInput = screen.getByPlaceholderText(/search experts/i);
    await userEvent.type(searchInput, 'Jane');

    expect(searchInput).toHaveValue('Jane');
  });
});
