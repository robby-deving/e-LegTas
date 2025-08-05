import { useState } from 'react';
import type { 
  CreateRoomRequest, 
  UpdateRoomRequest,
  EvacuationRoom 
} from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';

export function useRoomMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async (data: CreateRoomRequest): Promise<EvacuationRoom | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await evacuationCenterService.createRoom(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateRoom = async (id: string, data: UpdateRoomRequest): Promise<EvacuationRoom | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await evacuationCenterService.updateRoom(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await evacuationCenterService.deleteRoom(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRoom,
    updateRoom,
    deleteRoom,
    loading,
    error,
  };
}