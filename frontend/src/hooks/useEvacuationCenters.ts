import { useState, useCallback } from 'react';
import type { EvacuationCenter } from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
  currentPage: number;
}

export interface UseEvacuationCentersParams {
  limit?: number;
  offset?: number;
  search?: string;
  ec_type?: 'inside' | 'outside';
  barangay_id?: number;
}

export function useEvacuationCenters(initialParams?: UseEvacuationCentersParams) {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const fetchCenters = useCallback(async (params?: UseEvacuationCentersParams) => {
    try {
      setLoading(true);
      setError(null);
      const result = await evacuationCenterService.getEvacuationCenters(params);
      setCenters(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array is correct here

  const refreshCenters = useCallback(() => {
    fetchCenters(initialParams);
  }, [fetchCenters, initialParams]);

  const refreshWithCurrentParams = useCallback((currentParams: UseEvacuationCentersParams) => {
    fetchCenters(currentParams);
  }, [fetchCenters]);

  const refetchWithParams = useCallback((newParams: UseEvacuationCentersParams) => {
    fetchCenters(newParams);
  }, [fetchCenters]);

  return {
    centers,
    loading,
    error,
    pagination,
    refreshCenters,
    refreshWithCurrentParams,
    refetchWithParams,
  };
}