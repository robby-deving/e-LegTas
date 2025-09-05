import { useState } from 'react';
import type { 
  CreateEvacuationCenterRequest, 
  UpdateEvacuationCenterRequest,
  EvacuationCenter 
} from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';

export function useEvacuationCenterMutations() {
  const [error, setError] = useState<string | null>(null);

  // Separate loading states for each operation
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createCenter = async (data: CreateEvacuationCenterRequest): Promise<EvacuationCenter | null> => {
    try {
      setIsCreating(true);
      setError(null);
      const result = await evacuationCenterService.createEvacuationCenter(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create evacuation center');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const updateCenter = async (id: number, data: UpdateEvacuationCenterRequest): Promise<EvacuationCenter | null> => {
    try {
      setIsUpdating(true);
      setError(null);
      const result = await evacuationCenterService.updateEvacuationCenter(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update evacuation center');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCenter = async (id: number): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);
      await evacuationCenterService.deleteEvacuationCenter(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete evacuation center');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createCenter,
    updateCenter,
    deleteCenter,
    isCreating,
    isUpdating,
    isDeleting,
    error,
  };
}