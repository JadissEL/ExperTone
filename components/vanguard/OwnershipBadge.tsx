'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe } from 'lucide-react';
import { MICRO } from '@/lib/vanguard/motion';

interface OwnershipBadgeProps {
  status: string;
  className?: string;
}

export function OwnershipBadge({ status, className = '' }: OwnershipBadgeProps) {
  const isPrivate = status === 'PRIVATE';

  return (
    <motion.span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
        isPrivate
          ? 'bg-expert-frost border-expert-emerald/40 text-slate-300 shadow-[0_0_12px_-2px_rgba(16,185,129,0.25)]'
          : 'bg-expert-emerald-muted border-expert-emerald/30 text-expert-emerald'
      } ${className}`}
      whileHover={{ scale: MICRO.badgeHoverScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {isPrivate ? (
        <motion.span
          whileHover={{ rotate: MICRO.lockRotation }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <Lock className="w-3 h-3 opacity-80" />
        </motion.span>
      ) : (
        <Globe className="w-3 h-3 opacity-80" />
      )}
      {status === 'GLOBAL_POOL' ? 'Global' : 'Private'}
    </motion.span>
  );
}
