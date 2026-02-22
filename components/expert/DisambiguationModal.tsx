'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { DisambiguationCandidate } from './ClickableName';

interface DisambiguationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  candidates: DisambiguationCandidate[];
  onSelect: (expertId: string) => void;
}

export function DisambiguationModal({
  open,
  onOpenChange,
  name,
  candidates,
  onSelect,
}: DisambiguationModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl overflow-y-auto"
          onPointerDownOutside={() => onOpenChange(false)}
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-slate-100">
              Multiple people with this name
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Select the person you mean for &quot;{name}&quot;
          </p>
          <div className="space-y-3">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c.expertId);
                  onOpenChange(false);
                }}
                className="w-full text-left p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <div className="flex gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-slate-400">
                        {c.headline?.charAt(0) ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-100">{c.headline}</span>
                      <span className="shrink-0 text-xs font-medium text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded">
                        {Math.round((c.matchScore ?? c.confidence) * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-0.5">
                      {c.company} · {c.location}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.industry} · {c.education}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{c.summary}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
