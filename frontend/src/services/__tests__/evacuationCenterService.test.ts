import { evacuationCenterService } from '../evacuationCenterService';
import type { CreateEvacuationCenterRequest, UpdateEvacuationCenterRequest, CreateRoomRequest, UpdateRoomRequest } from '../../types/evacuation';

// Mock fetch globally
global.fetch = jest.fn();

describe('EvacuationCenterService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getEvacuationCenters', () => {
    it('should fetch all evacuation centers successfully', async () => {
      const mockCenters = [
        { 
          id: 1, 
          name: 'Center 1', 
          address: 'Address 1',
          barangay_id: 1,
          latitude: 14.123,
          longitude: 121.123,
          ec_status: 'Available',
          category: 'School',
          camp_manager_id: null,
          total_capacity: 100,
          created_by: 1
        },
        { 
          id: 2, 
          name: 'Center 2', 
          address: 'Address 2',
          barangay_id: 2,
          latitude: 14.124,
          longitude: 121.124,
          ec_status: 'Available',
          category: 'School',
          camp_manager_id: null,
          total_capacity: 200,
          created_by: 1
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCenters })
      });

      const result = await evacuationCenterService.getEvacuationCenters();

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/evacuation-centers');
      expect(result).toEqual(mockCenters);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      await expect(evacuationCenterService.getEvacuationCenters())
        .rejects
        .toThrow('Failed to fetch evacuation centers');
    });
  });

  describe('getEvacuationCenter', () => {
    it('should fetch a single evacuation center with rooms', async () => {
      const mockCenter = {
        id: 1,
        name: 'Center 1',
        address: 'Address 1',
        barangay_id: 1,
        latitude: 14.123,
        longitude: 121.123,
        ec_status: 'Available',
        category: 'School',
        camp_manager_id: null,
        total_capacity: 100,
        created_by: 1,
        evacuation_center_rooms: [
          {
            id: 1,
            room_name: 'Room 1',
            room_type: 'Temporary',
            individual_room_capacity: 10
          }
        ]
      };

      const expectedTransformedCenter = {
        ...mockCenter,
        rooms: [{
          id: '1',
          roomName: 'Room 1',
          type: 'Temporary',
          capacity: 10,
          evacuationCenterId: 1
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCenter })
      });

      const result = await evacuationCenterService.getEvacuationCenter(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/evacuation-centers/1/rooms');
      expect(result).toEqual(expectedTransformedCenter);
    });

    it('should handle center with no rooms', async () => {
      const mockCenter = {
        id: 1,
        name: 'Center 1',
        address: 'Address 1',
        barangay_id: 1,
        latitude: 14.123,
        longitude: 121.123,
        ec_status: 'Available',
        category: 'School',
        camp_manager_id: null,
        total_capacity: 100,
        created_by: 1
      };

      const expectedTransformedCenter = {
        ...mockCenter,
        rooms: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCenter })
      });

      const result = await evacuationCenterService.getEvacuationCenter(1);

      expect(result).toEqual(expectedTransformedCenter);
    });
  });

  describe('createEvacuationCenter', () => {
    it('should create evacuation center successfully', async () => {
      const mockRequest: CreateEvacuationCenterRequest = {
        name: 'New Center',
        address: 'New Address',
        category: 'School',
        total_capacity: 100,
        longitude: 123.456,
        latitude: 78.901,
        ec_status: 'Available',
        barangay_id: 1,
        created_by: 1
      };

      const mockResponse = {
        data: { id: 1, ...mockRequest }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await evacuationCenterService.createEvacuationCenter(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/evacuation-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest)
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateEvacuationCenter', () => {
    it('should update evacuation center successfully', async () => {
      const mockRequest: UpdateEvacuationCenterRequest = {
        name: 'Updated Center',
        address: 'Updated Address',
        category: 'School',
        total_capacity: 150,
        longitude: 123.456,
        latitude: 78.901,
        ec_status: 'Available'
      };

      const mockResponse = {
        data: {
          id: 1,
          ...mockRequest,
          evacuation_center_rooms: []
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await evacuationCenterService.updateEvacuationCenter(1, mockRequest);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/evacuation-centers/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest)
      });
      expect(result).toEqual({ ...mockResponse.data, rooms: [] });
    });
  });

  describe('deleteEvacuationCenter', () => {
    it('should delete evacuation center successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await evacuationCenterService.deleteEvacuationCenter(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/evacuation-centers/1/soft-delete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should handle delete error with message', async () => {
      const errorMessage = 'Center cannot be deleted';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage })
      });

      await expect(evacuationCenterService.deleteEvacuationCenter(1))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('createRoom', () => {
    it('should create room successfully', async () => {
      const mockRequest: CreateRoomRequest = {
        room_name: 'New Room',
        room_type: 'Temporary',
        individual_room_capacity: 20,
        evacuation_center_id: 1
      };

      const mockResponse = {
        data: { id: 1, ...mockRequest }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await evacuationCenterService.createRoom(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest)
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateRoom', () => {
    it('should update room successfully', async () => {
      const mockRequest: UpdateRoomRequest = {
        room_name: 'Updated Room',
        room_type: 'Temporary',
        individual_room_capacity: 25
      };

      const mockResponse = { id: 1, ...mockRequest };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await evacuationCenterService.updateRoom('1', mockRequest);

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/rooms/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest)
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteRoom', () => {
    it('should delete room successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await evacuationCenterService.deleteRoom('1');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/rooms/1/soft-delete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('getBarangays', () => {
    it('should fetch barangays successfully', async () => {
      const mockBarangays = [
        { id: 1, name: 'Barangay 1' },
        { id: 2, name: 'Barangay 2' }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBarangays })
      });

      const result = await evacuationCenterService.getBarangays();

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/barangays');
      expect(result).toEqual(mockBarangays);
    });
  });
});