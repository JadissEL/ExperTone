import { requireAdmin } from '@/lib/requireAdmin';
import { PlatformHealthClient } from './PlatformHealthClient';

export default async function PlatformHealthPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Platform Health</h1>
      <p className="mt-1 text-slate-500">
        Elite analytics: conversion, system ROI, and search latency
      </p>
      <PlatformHealthClient />
    </div>
  );
}
