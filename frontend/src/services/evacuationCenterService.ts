import type { 
  EvacuationCenter, 
  EvacuationRoom, 
  CreateEvacuationCenterRequest, 
  UpdateEvacuationCenterRequest,
  CreateRoomRequest,
  UpdateRoomRequest 
} from '../types/evacuation.ts';  // Add .ts extension
import { store } from '../store';
import { selectToken, selectUserId } from '../features/auth/authSlice';

class EvacuationCenterService {
  private baseUrl = '/api/v1';
  
  private buildHeaders(extra: Record<string, string> = {}) {
    const state = store.getState() as any;
    const token = selectToken(state);
    const userId = selectUserId(state);
    const devUserId = (import.meta as any).env?.VITE_DEV_USER_ID as string | undefined;
    const headers: Record<string, string> = { Accept: 'application/json', ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Fallback for dev if no token
    if (!token && userId) headers['x-user-id'] = String(userId);
    if (!token && !userId && devUserId) headers['x-user-id'] = String(devUserId);
    return headers;
  }

  async getEvacuationCenters(): Promise<EvacuationCenter[]> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch evacuation centers');
    const result = await response.json();
    return result.data; // Extract the data array from the response
  }

  async getEvacuationCenter(id: number): Promise<EvacuationCenter> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers/${id}/rooms`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch evacuation center');
    const result = await response.json();
    
    console.log('Raw API Response:', result); // Log the raw response
    console.log('Response data:', result.data); // Log the data property
    console.log('Rooms from response:', result.data.evacuation_center_rooms); // Log the rooms specifically
    
    // Transform the data to match frontend structure
    const data = result.data;
    const transformedData = {
      ...data,
      rooms: data.evacuation_center_rooms?.map((room: any) => ({
        id: room.id.toString(),
        roomName: room.room_name,
        type: room.room_type,
        capacity: room.individual_room_capacity,
        evacuationCenterId: data.id
      })) || []
    };
    
    console.log('Transformed data:', transformedData); // Log the transformed data
    return transformedData;
  }

  async getEvacuationCenterRooms(id: number): Promise<EvacuationRoom[]> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers/${id}/rooms`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch evacuation center rooms');
    return response.json();
  }

  async createEvacuationCenter(data: CreateEvacuationCenterRequest): Promise<EvacuationCenter> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers`, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create evacuation center');
    const result = await response.json();
    return result.data; // Return the data property from the response
  }

  async updateEvacuationCenter(id: number, data: UpdateEvacuationCenterRequest): Promise<EvacuationCenter> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers/${id}`, {
      method: 'PUT',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update evacuation center');
    const result = await response.json();
    
    // Transform the response data to match frontend structure
    const centerData = result.data;
    return {
      ...centerData,
      rooms: centerData.evacuation_center_rooms?.map((room: any) => ({
        id: room.id.toString(),
        roomName: room.room_name,
        type: room.room_type,
        capacity: room.individual_room_capacity,
        evacuationCenterId: centerData.id
      })) || []
    };
  }

  async deleteEvacuationCenter(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/evacuation-centers/${id}/soft-delete`, {
      method: 'PUT',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to delete evacuation center');
    }
  }

  async createRoom(data: CreateRoomRequest): Promise<EvacuationRoom> {
    console.log('Service: Creating room with data:', data);
    const response = await fetch(`${this.baseUrl}/rooms`, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Room creation failed:', { status: response.status, error: errorText });
      throw new Error(`Failed to create room: ${errorText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async updateRoom(id: string, data: UpdateRoomRequest): Promise<EvacuationRoom> {
    const response = await fetch(`${this.baseUrl}/rooms/${id}`, {
      method: 'PUT',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update room');
    return response.json();
  }

  async deleteRoom(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rooms/${id}/soft-delete`, {
      method: 'PATCH',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
    });
    if (!response.ok) throw new Error('Failed to delete room');
  }

  async getBarangays(): Promise<{ id: number; name: string }[]> {
    const response = await fetch(`${this.baseUrl}/barangays`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch barangays');
    const result = await response.json();
    return result.data;
  }
}

export const evacuationCenterService = new EvacuationCenterService();