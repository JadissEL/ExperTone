'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  ChevronRight,
  Network,
  BarChart3,
  Handshake,
} from 'lucide-react';
import { useVanguardStore } from '@/stores/vanguardStore';
import { useReducedMotion, getTransition } from '@/lib/vanguard/reduced-motion';
import { SPRING } from '@/lib/vanguard/motion';

const NAV_GROUPS = [
  {
    label: 'Research',
    items: [
      { href: '/vanguard', icon: LayoutDashboard, label: 'Command Center' },
      { href: '/projects', icon: FolderOpen, label: 'Projects' },
      { href: '/hunt', icon: BarChart3, label: 'Apex Hunter' },
    ],
  },
  {
    label: 'Experts',
    items: [
      { href: '/graph', icon: Network, label: 'Knowledge Graph' },
      { href: '/experts/new', icon: Users, label: 'Add Expert' },
    ],
  },
  {
    label: 'Deals',
    items: [
      { href: '/command-center', icon: Handshake, label: 'Deals' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/profile', icon: Settings, label: 'Profile' },
    ],
  },
];

export function NavSpine() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const navExpanded = useVanguardStore((s) => s.navExpanded);
  const setNavExpanded = useVanguardStore((s) => s.setNavExpanded);
  const setNavHoverMemory = useVanguardStore((s) => s.setNavHoverMemory);
  const [hovered, setHovered] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = navExpanded || hovered;

  const handleMouseEnter = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setHovered(true);
    setNavExpanded(true);
  };

  const handleMouseLeave = () => {
    setNavHoverMemory(true);
    collapseTimer.current = setTimeout(() => {
      setHovered(false);
      setNavExpanded(false);
      setNavHoverMemory(false);
    }, 300);
  };

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: isExpanded ? 220 : 56 }}
      transition={getTransition(reducedMotion, SPRING.default)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="shrink-0 h-full flex flex-col vanguard-blur border-r border-expert-frost-border bg-expert-navy/60 z-nav"
    >
      <div className="flex items-center h-14 shrink-0 px-3 border-b border-expert-frost-border/50">
        <motion.div
          layout
          className="flex items-center gap-2 min-w-0 overflow-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-expert-emerald/20 flex items-center justify-center shrink-0">
            <span className="text-expert-emerald font-bold text-sm">V</span>
          </div>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-slate-200 text-sm truncate"
            >
              Vanguard
            </motion.span>
          )}
        </motion.div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {isExpanded && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 mb-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider"
              >
                {group.label}
              </motion.p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="relative block">
                      <motion.div
                        layout
                        className={`relative flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors ${
                          isActive
                            ? 'bg-expert-frost-elevated text-expert-emerald'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-expert-frost/50'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={SPRING.snappy}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {isExpanded ? (
                          <>
                            <span className="flex-1 text-sm font-medium truncate">
                              {item.label}
                            </span>
                            {isActive && (
                              <motion.div
                                layoutId="nav-active-indicator"
                                className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-expert-emerald to-transparent rounded-full"
                                transition={SPRING.default}
                              />
                            )}
                          </>
                        ) : isActive && (
                          <motion.div
                            layoutId="nav-active-indicator"
                            className="absolute left-0 top-1 bottom-1 w-0.5 bg-expert-emerald rounded-r"
                            transition={SPRING.default}
                          />
                        )}
                      </motion.div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 border-t border-expert-frost-border/50"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Hover to collapse</span>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
