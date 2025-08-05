import { useState, useEffect } from 'react';
import type { EvacuationCenter } from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';

export function useEvacuationCenters() {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evacuationCenterService.getEvacuationCenters();
      setCenters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const refreshCenters = () => {
    fetchCenters();
  };

  return {
    centers,
    loading,
    error,
    refreshCenters,
  };
}