import { renderHook, act } from '@testing-library/react';
import { useResearchStore } from '@/stores/useResearchStore';

describe('useResearchStore', () => {
  beforeEach(() => {
    act(() => {
      useResearchStore.getState().reset();
    });
  });

  it('has correct initial state', () => {
    const state = useResearchStore.getState();
    expect(state.activeProject).toBeNull();
    expect(state.results).toEqual([]);
    expect(state.uiState.activeTab).toBe('new_matches');
    expect(state.uiState.selectedExpertId).toBeNull();
    expect(state.filters.executionMode).toBe('hybrid');
  });

  it('setActiveProject updates project and clears results', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setActiveProject({
        id: 'proj-1',
        title: 'Test Project',
        status: 'idle',
      });
    });

    expect(result.current.activeProject).toEqual({
      id: 'proj-1',
      title: 'Test Project',
      status: 'idle',
    });
    expect(result.current.results).toEqual([]);
  });

  it('setProjectStatus updates active project status', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setActiveProject({
        id: 'proj-1',
        title: 'Test',
        status: 'idle',
      });
    });

    act(() => {
      result.current.setProjectStatus('scraping');
    });

    expect(result.current.activeProject?.status).toBe('scraping');
  });

  it('setFilters merges partial filters', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setFilters({ industry: 'Technology', rateMax: 500 });
    });

    expect(result.current.filters.industry).toBe('Technology');
    expect(result.current.filters.rateMax).toBe(500);
    expect(result.current.filters.rateMin).toBe(0);
  });

  it('setResults replaces results array', () => {
    const { result } = renderHook(() => useResearchStore());
    const experts = [
      {
        id: 'e1',
        name: 'Jane Doe',
        industry: 'Tech',
        subIndustry: 'SaaS',
        country: 'US',
        region: 'NA',
        seniorityScore: 80,
        yearsExperience: 10,
        predictedRate: 300,
        visibilityStatus: 'GLOBAL_POOL' as const,
        isExisting: true,
        similarityScore: 0.9,
      },
    ];

    act(() => {
      result.current.setResults(experts);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe('Jane Doe');
  });

  it('appendResults adds to existing results', () => {
    const { result } = renderHook(() => useResearchStore());
    const expert1 = {
      id: 'e1',
      name: 'Expert 1',
      industry: 'Tech',
      subIndustry: 'SaaS',
      country: 'US',
      region: 'NA',
      seniorityScore: 80,
      yearsExperience: 10,
      predictedRate: 300,
      visibilityStatus: 'GLOBAL_POOL' as const,
      isExisting: true,
      similarityScore: 0.9,
    };
    const expert2 = { ...expert1, id: 'e2', name: 'Expert 2' };

    act(() => {
      result.current.setResults([expert1]);
    });
    act(() => {
      result.current.appendResults([expert2]);
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[1].name).toBe('Expert 2');
  });

  it('setActiveTab updates uiState', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setActiveTab('existing_db');
    });

    expect(result.current.uiState.activeTab).toBe('existing_db');
  });

  it('setSelectedExpertId updates uiState', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setSelectedExpertId('expert-123');
    });

    expect(result.current.uiState.selectedExpertId).toBe('expert-123');
  });

  it('setOpenTicketFor opens ticket modal state', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setOpenTicketFor({
        expertId: 'e1',
        ownerId: 'u1',
        ownerName: 'John',
      });
    });

    expect(result.current.uiState.openTicketFor).toEqual({
      expertId: 'e1',
      ownerId: 'u1',
      ownerName: 'John',
    });
  });

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useResearchStore());

    act(() => {
      result.current.setActiveProject({ id: 'p1', title: 'P', status: 'idle' });
      result.current.setResults([{ id: 'e1' } as never]);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.activeProject).toBeNull();
    expect(result.current.results).toEqual([]);
  });
});
