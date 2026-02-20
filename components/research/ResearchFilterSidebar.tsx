'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Database, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  researchFilterSchema,
  type ResearchFilterFormValues,
} from '@/lib/research-filter-schema';
import {
  INDUSTRIES,
  SUB_INDUSTRIES,
  GEO_REGIONS,
  COUNTRIES_BY_REGION,
  LANGUAGES,
} from '@/lib/research-filter-schema';
import { useResearchStore } from '@/stores/useResearchStore';
import { cn } from '@/lib/utils';

export function ResearchFilterSidebar() {
  const { filters, setFilters, setProjectStatus } = useResearchStore();
  const [selectedRegions, setSelectedRegions] = React.useState<string[]>(
    filters.regions ?? []
  );
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    filters.countries ?? []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResearchFilterFormValues>({
    resolver: zodResolver(researchFilterSchema),
    defaultValues: {
      industry: filters.industry ?? '',
      subIndustry: filters.subIndustry ?? '',
      rateMin: filters.rateMin ?? 0,
      rateMax: filters.rateMax ?? 2000,
      usePredictedRange: filters.usePredictedRange ?? true,
      seniorityMin: filters.seniorityMin ?? 0,
      seniorityMax: filters.seniorityMax ?? 100,
      yearsExperienceMin: filters.yearsExperienceMin ?? 0,
      yearsExperienceMax: filters.yearsExperienceMax ?? 50,
      executionMode: filters.executionMode ?? 'hybrid',
      brief: filters.brief ?? '',
      query: filters.query ?? '',
    },
  });

  const industry = watch('industry');
  const [highValueSubIndustries, setHighValueSubIndustries] = React.useState<string[]>([]);
  React.useEffect(() => {
    fetch('/api/admin/high-value-tags', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.highValueSubIndustries && setHighValueSubIndustries(d.highValueSubIndustries))
      .catch(() => {});
  }, []);
  const baseSub = industry ? SUB_INDUSTRIES[industry] ?? [] : [];
  const subIndustries = [...baseSub, ...highValueSubIndustries.filter((s) => !baseSub.includes(s))];

  const toggleRegion = (r: string) => {
    const next = selectedRegions.includes(r)
      ? selectedRegions.filter((x) => x !== r)
      : [...selectedRegions, r];
    setSelectedRegions(next);
    setValue('regions', next);
  };

  const toggleCountry = (c: string) => {
    const next = selectedCountries.includes(c)
      ? selectedCountries.filter((x) => x !== c)
      : [...selectedCountries, c];
    setSelectedCountries(next);
    setValue('countries', next);
  };

  const [scrapingError, setScrapingError] = React.useState<string | null>(null);

  const onSubmit = async (data: ResearchFilterFormValues) => {
    setScrapingError(null);
    const payload = {
      ...data,
      regions: selectedRegions,
      countries: selectedCountries,
    };
    setFilters(payload);
    setProjectStatus('scraping');

    try {
      const res = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: payload,
          projectTitle: data.brief?.slice(0, 50) ?? 'Research',
        }),
      });
      const json = await res.json();
      if (res.ok && json.projectId) {
        useResearchStore.getState().setActiveProject({
          id: json.projectId,
          title: json.projectTitle ?? 'Research',
          status: 'scraping',
        });
        if (json.scrapingError) {
          setScrapingError(json.scrapingError);
        }
      } else {
        setProjectStatus('idle');
        setScrapingError(json.error ?? 'Failed to start research');
      }
    } catch {
      setProjectStatus('idle');
      setScrapingError('Network error. Try again.');
    }
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80">
      {scrapingError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {scrapingError} You can continue with Database Only results.
        </div>
      )}
      <div className="border-b border-slate-200 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Search className="h-4 w-4" />
          Research Filters
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          15-point precision search engine
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        {/* Industry > Sub-industry */}
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select
            value={watch('industry') ?? ''}
            onValueChange={(v) => {
              setValue('industry', v);
              setValue('subIndustry', '');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {subIndustries.length > 0 && (
          <div className="space-y-2">
            <Label>Sub-industry {highValueSubIndustries.length > 0 && <span className="text-xs text-emerald-600">(+ High-Value)</span>}</Label>
            <Select
              value={watch('subIndustry') ?? ''}
              onValueChange={(v) => setValue('subIndustry', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sub-industry" />
              </SelectTrigger>
              <SelectContent>
                {subIndustries.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Geo: Regions */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Regions
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {GEO_REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRegion(r)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs transition-colors',
                  selectedRegions.includes(r)
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Geo: Countries (from selected regions) */}
        {selectedRegions.length > 0 && (
          <div className="space-y-2">
            <Label>Countries</Label>
            <div className="max-h-24 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
              {selectedRegions.flatMap((r) =>
                (COUNTRIES_BY_REGION[r] ?? []).map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(c)}
                      onChange={() => toggleCountry(c)}
                      className="rounded"
                    />
                    {c}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rate range */}
        <div className="space-y-2">
          <Label>Predicted Rate ($/hr)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              {...register('rateMin', { valueAsNumber: true })}
              className="h-8 w-20 text-xs"
              min={0}
              max={5000}
            />
            <span className="text-slate-400">–</span>
            <Input
              type="number"
              {...register('rateMax', { valueAsNumber: true })}
              className="h-8 w-20 text-xs"
              min={0}
              max={5000}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              {...register('usePredictedRange')}
              className="rounded"
            />
            Use predicted range
          </label>
        </div>

        {/* Seniority slider */}
        <div className="space-y-2">
          <Label>Seniority (0–100)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              {...register('seniorityMin', { valueAsNumber: true })}
              className="h-8 w-16 text-xs"
              min={0}
              max={100}
            />
            <Input
              type="number"
              {...register('seniorityMax', { valueAsNumber: true })}
              className="h-8 w-16 text-xs"
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Years experience */}
        <div className="space-y-2">
          <Label>Years Experience</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              {...register('yearsExperienceMin', { valueAsNumber: true })}
              className="h-8 w-16 text-xs"
              min={0}
              max={50}
            />
            <Input
              type="number"
              {...register('yearsExperienceMax', { valueAsNumber: true })}
              className="h-8 w-16 text-xs"
              min={0}
              max={50}
            />
          </div>
        </div>

        {/* Languages (simplified: add/remove with confidence) */}
        <div className="space-y-2">
          <Label>Languages (confidence 1–5)</Label>
          <Select
            onValueChange={(code) => {
              const langs = watch('languages') ?? [];
              if (langs.some((l) => l.code === code)) return;
              setValue('languages', [...langs, { code, confidence: 3 }]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(watch('languages') ?? []).map((l, i) => (
            <div key={l.code} className="flex items-center gap-2 text-xs">
              <span className="w-16">{LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code}</span>
              <select
                value={l.confidence}
                onChange={(e) => {
                  const next = [...(watch('languages') ?? [])];
                  const current = next[i];
                  next[i] = { code: current?.code ?? 'en', confidence: Number(e.target.value) };
                  setValue('languages', next);
                }}
                className="rounded border border-slate-200 px-1 py-0.5"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = (watch('languages') ?? []).filter((_, j) => j !== i);
                  setValue('languages', next);
                }}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Execution mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Execution Mode
          </Label>
          <div className="flex gap-1">
            {(['online_only', 'database_only', 'hybrid'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setValue('executionMode', mode)}
                className={cn(
                  'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                  watch('executionMode') === mode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                )}
              >
                {mode === 'online_only' && <Globe className="mr-1 inline h-3 w-3" />}
                {mode === 'database_only' && <Database className="mr-1 inline h-3 w-3" />}
                {mode === 'hybrid' && <Zap className="mr-1 inline h-3 w-3" />}
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Brief / Query */}
        <div className="space-y-2">
          <Label>Brief / Query</Label>
          <Input
            {...register('brief')}
            placeholder="Research brief..."
            className="text-sm"
          />
          <Input
            {...register('query')}
            placeholder="Semantic query..."
            className="text-sm"
          />
        </div>

        {errors.rateMin && (
          <p className="text-xs text-red-600">{errors.rateMin.message}</p>
        )}

        <Button type="submit" className="mt-auto w-full">
          Start Research
        </Button>
      </form>
    </aside>
  );
}
