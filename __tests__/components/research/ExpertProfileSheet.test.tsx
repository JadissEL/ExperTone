import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpertProfileSheet } from '@/components/research/ExpertProfileSheet';
import { useResearchStore } from '@/stores/useResearchStore';

const mockExpert = {
  id: 'e1',
  name: 'Jane Doe',
  industry: 'Technology',
  subIndustry: 'SaaS',
  country: 'US',
  region: 'NA',
  seniorityScore: 80,
  yearsExperience: 10,
  predictedRate: 250,
  visibilityStatus: 'GLOBAL_POOL' as const,
  isExisting: true,
  similarityScore: 0.9,
  pastEmployers: ['Acme Corp', 'TechCo'],
  reputationScore: 0.85,
};

describe('ExpertProfileSheet', () => {
  beforeEach(() => {
    useResearchStore.getState().reset();
    useResearchStore.getState().setSelectedExpertId(null);
    useResearchStore.getState().setResults([]);
  });

  it('does not render when no expert selected', () => {
    render(<ExpertProfileSheet />);
    expect(screen.queryByText('Expert Profile')).not.toBeInTheDocument();
  });

  it('renders expert from store when selected', () => {
    useResearchStore.getState().setResults([mockExpert]);
    useResearchStore.getState().setSelectedExpertId('e1');

    render(<ExpertProfileSheet />);

    expect(screen.getByText('Expert Profile')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/Technology/)).toBeInTheDocument();
    expect(screen.getByText(/SaaS/)).toBeInTheDocument();
  });

  it('shows Score Breakdown section', () => {
    useResearchStore.getState().setResults([mockExpert]);
    useResearchStore.getState().setSelectedExpertId('e1');

    render(<ExpertProfileSheet />);

    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
  });

  it('shows Past Work History section', () => {
    useResearchStore.getState().setResults([mockExpert]);
    useResearchStore.getState().setSelectedExpertId('e1');

    render(<ExpertProfileSheet />);

    expect(screen.getByText('Past Work History')).toBeInTheDocument();
  });

  it('shows Relationship Graph placeholder', () => {
    useResearchStore.getState().setResults([mockExpert]);
    useResearchStore.getState().setSelectedExpertId('e1');

    render(<ExpertProfileSheet />);

    expect(screen.getByText('Relationship Graph')).toBeInTheDocument();
  });
});
