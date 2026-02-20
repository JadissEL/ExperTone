'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResearchStore } from '@/stores/useResearchStore';
import { cn } from '@/lib/utils';

const ticketSchema = z.object({
  expertId: z.string(),
  requesterId: z.string(),
  ownerId: z.string(),
  message: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: string;
  ownerId: string;
  ownerName?: string;
}

export function TicketModal({
  open,
  onOpenChange,
  expertId,
  ownerId,
  ownerName,
}: TicketModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      expertId,
      ownerId,
      requesterId: '',
      message: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ expertId, ownerId, requesterId: '', message: '' });
    }
  }, [open, expertId, ownerId, reset]);

  const onSubmit = async (data: TicketFormValues) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onOpenChange(false);
      }
    } catch {
      // ignore
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 bg-white p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <Dialog.Title className="text-lg font-semibold">
            Request Access
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            This expert is owned by {ownerName ?? 'another CSA'}. Submit a ticket to request access.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <input type="hidden" {...register('expertId')} />
            <input type="hidden" {...register('ownerId')} />
            <input type="hidden" {...register('requesterId')} />
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Input
                id="message"
                {...register('message')}
                placeholder="Reason for access request..."
                className="min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Submit Request
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
