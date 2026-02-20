import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResearchFilterSidebar } from '@/components/research/ResearchFilterSidebar';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ projectId: 'proj-123', projectTitle: 'Research' }),
  });
});

describe('ResearchFilterSidebar', () => {
  it('renders filter sidebar with title', () => {
    render(<ResearchFilterSidebar />);
    expect(screen.getByText('Research Filters')).toBeInTheDocument();
    expect(screen.getByText('15-point precision search engine')).toBeInTheDocument();
  });

  it('renders Start Research button', () => {
    render(<ResearchFilterSidebar />);
    expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument();
  });

  it('renders region toggle buttons', () => {
    render(<ResearchFilterSidebar />);
    expect(screen.getByText('MENA')).toBeInTheDocument();
    expect(screen.getByText('DACH')).toBeInTheDocument();
    expect(screen.getByText('LATAM')).toBeInTheDocument();
  });

  it('toggles region on click', async () => {
    render(<ResearchFilterSidebar />);
    const menaButton = screen.getByText('MENA');
    await userEvent.click(menaButton);
    expect(menaButton).toHaveClass('border-slate-900');
  });

  it('renders execution mode buttons', () => {
    render(<ResearchFilterSidebar />);
    expect(screen.getByText(/online only/i)).toBeInTheDocument();
    expect(screen.getByText(/database only/i)).toBeInTheDocument();
    expect(screen.getByText(/hybrid/i)).toBeInTheDocument();
  });

  it('submits form on Start Research click', async () => {
    render(<ResearchFilterSidebar />);
    const submitBtn = screen.getByRole('button', { name: /start research/i });
    await userEvent.click(submitBtn);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/research/trigger',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
