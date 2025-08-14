import { useState } from 'react';
import type { 
  CreateEvacuationCenterRequest, 
  UpdateEvacuationCenterRequest,
  EvacuationCenter 
} from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';

export function useEvacuationCenterMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCenter = async (data: CreateEvacuationCenterRequest): Promise<EvacuationCenter | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await evacuationCenterService.createEvacuationCenter(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create evacuation center');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCenter = async (id: number, data: UpdateEvacuationCenterRequest): Promise<EvacuationCenter | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await evacuationCenterService.updateEvacuationCenter(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update evacuation center');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteCenter = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await evacuationCenterService.deleteEvacuationCenter(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete evacuation center');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCenter,
    updateCenter,
    deleteCenter,
    loading,
    error,
  };
}