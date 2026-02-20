import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketModal } from '@/components/research/TicketModal';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true });
});

describe('TicketModal', () => {
  it('renders when open', () => {
    render(
      <TicketModal
        open={true}
        onOpenChange={jest.fn()}
        expertId="e1"
        ownerId="o1"
        ownerName="Alice"
      />
    );

    expect(screen.getByText('Request Access')).toBeInTheDocument();
    expect(screen.getByText(/owned by/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/reason for access/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TicketModal
        open={false}
        onOpenChange={jest.fn()}
        expertId="e1"
        ownerId="o1"
      />
    );

    expect(screen.queryByText('Request Access')).not.toBeInTheDocument();
  });

  it('has Cancel and Submit buttons', () => {
    render(
      <TicketModal
        open={true}
        onOpenChange={jest.fn()}
        expertId="e1"
        ownerId="o1"
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
  });

  it('calls onOpenChange when Cancel clicked', async () => {
    const onOpenChange = jest.fn();
    render(
      <TicketModal
        open={true}
        onOpenChange={onOpenChange}
        expertId="e1"
        ownerId="o1"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits ticket on Submit Request', async () => {
    const onOpenChange = jest.fn();
    render(
      <TicketModal
        open={true}
        onOpenChange={onOpenChange}
        expertId="e1"
        ownerId="o1"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await screen.findByRole('button', { name: /submit request/i });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('e1'),
      })
    );
  });
});
