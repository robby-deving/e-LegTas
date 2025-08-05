import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { EvacuationCenterForm } from './EvacuationCenterForm';
import { RoomForm } from './RoomForm';
import type { EvacuationCenter, EvacuationRoom, EvacuationCenterCategory, EvacuationCenterStatus } from '../../types/evacuation';
import { useEvacuationCenterMutations } from '../../hooks/useEvacuationCenterMutations';
import { useRoomMutations } from '../../hooks/useRoomsMutations';

interface FormData {
  name: string;
  category: string;
  streetName: string;
  barangay: string;
  barangayId: number;
  latitude: string;
  longitude: string;
  total_capacity: string;  // Changed from capacity to total_capacity
}

interface FormErrors {
  center?: Partial<Record<keyof FormData, string>>;
  rooms?: Record<string, Partial<Record<keyof EvacuationRoom, string>>>;
}

interface EvacuationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  center?: EvacuationCenter;
  onSuccess: () => void;
}

export function EvacuationCenterModal({ isOpen, onClose, mode, center, onSuccess }: EvacuationCenterModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    streetName: '',
    barangay: '',
    barangayId: 0, // Add this field
    latitude: '',
    longitude: '',
    total_capacity: ''
  });

  const [rooms, setRooms] = useState<EvacuationRoom[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const { createCenter, updateCenter, loading: centerLoading } = useEvacuationCenterMutations();
  const { createRoom, updateRoom, deleteRoom } = useRoomMutations();

  // Initialize form data when center changes
  useEffect(() => {
    if (center && mode === 'edit') {
      console.log('Edit mode - center data:', center);
      console.log('Center rooms:', center.rooms); // Add this line
      setFormData({
        name: center.name,
        category: center.category,
        streetName: center.address.split(',')[0] || '',
        barangay: center.address.split(',')[1]?.trim() || '',
        barangayId: center.barangay_id,
        latitude: center.latitude.toString(),
        longitude: center.longitude.toString(),
        total_capacity: (center.total_capacity ?? 0).toString()
      });
      setRooms(center.rooms || []); // Make sure we're setting rooms with a default empty array
    } else {
      setFormData({
        name: '',
        category: '',
        streetName: '',
        barangay: '',
        barangayId: 0, // Reset barangayId
        latitude: '',
        longitude: '',
        total_capacity: ''
      });
      setRooms([]);
    }
    setErrors({});
  }, [center, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = { center: {}, rooms: {} };
    let hasErrors = false;

    // Validate center form
    if (!formData.name.trim()) {
      newErrors.center!.name = 'Name is required';
      hasErrors = true;
    }

    if (!formData.category) {
      newErrors.center!.category = 'Category is required';
      hasErrors = true;
    }

    if (!formData.streetName.trim()) {
      newErrors.center!.streetName = 'Street name is required';
      hasErrors = true;
    }

    if (!formData.barangay.trim()) {
      newErrors.center!.barangay = 'Barangay is required';
      hasErrors = true;
    }

    if (!formData.barangayId) {
      newErrors.center!.barangayId = 'Barangay ID is required';
      hasErrors = true;
    }

    if (!formData.latitude || isNaN(Number(formData.latitude))) {
      newErrors.center!.latitude = 'Valid latitude is required';
      hasErrors = true;
    }

    if (!formData.longitude || isNaN(Number(formData.longitude))) {
      newErrors.center!.longitude = 'Valid longitude is required';
      hasErrors = true;
    }

    if (formData.total_capacity && isNaN(Number(formData.total_capacity))) {
      newErrors.center!.total_capacity = 'Capacity must be a number';
      hasErrors = true;
    }

    // Validate rooms
    rooms.forEach(room => {
      const roomErrors: Partial<Record<keyof EvacuationRoom, string>> = {};
      
      if (!room.roomName.trim()) {
        roomErrors.roomName = 'Room name is required';
        hasErrors = true;
      }

      if (!room.type) {
        roomErrors.type = 'Room type is required';
        hasErrors = true;
      }

      if (!room.capacity || room.capacity <= 0) {
        roomErrors.capacity = 'Valid capacity is required';
        hasErrors = true;
      }

      if (Object.keys(roomErrors).length > 0) {
        newErrors.rooms![room.id] = roomErrors;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleFormInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors.center?.[field as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        center: {
          ...prev.center,
          [field]: undefined
        }
      }));
    }
  };

  // When creating a new room
  const handleAddRoom = () => {
    const newRoom: EvacuationRoom = {
      id: `temp-${Date.now()}`,
      roomName: '',
      type: 'Permanent', // Changed from 'Classroom' to 'Permanent'
      capacity: 0
    };
    console.log('Creating new room:', newRoom);
    setRooms(prev => [...prev, newRoom]);
  };

  const handleRoomChange = (roomId: string, field: string, value: string | number) => {
    console.log('Room change:', { roomId, field, value, valueType: typeof value });
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, [field]: value }
        : room
    ));

    // Clear field error when user starts typing
    if (errors.rooms?.[roomId]?.[field as keyof EvacuationRoom]) {
      setErrors(prev => ({
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...prev.rooms?.[roomId],
            [field]: undefined
          }
        }
      }));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      // If it's an existing room (not a temp one), delete it from the backend
      if (!roomId.startsWith('temp-')) {
        console.log('Deleting room:', roomId);
        try {
          await deleteRoom(roomId);
        } catch (error) {
          // If we get an error but the room is already soft-deleted, we can ignore it
          console.log('Room might already be deleted, proceeding with UI update');
        }
      }
      
      // Remove from UI state regardless of backend result
      setRooms(prev => prev.filter(room => room.id !== roomId));
      
      // Clear room errors
      setErrors(prev => {
        const { [roomId]: _, ...remainingRooms } = prev.rooms || {};
        return {
          ...prev,
          rooms: remainingRooms
        };
      });
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const centerData = {
        name: formData.name.trim(),
        address: `${formData.streetName.trim()}, ${formData.barangay.trim()}`,
        barangay_id: formData.barangayId,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        category: formData.category as EvacuationCenterCategory,
        total_capacity: Number(formData.total_capacity) || 0,
        ec_status: center?.ec_status || 'Available' as EvacuationCenterStatus, // Add this line
        created_by: center?.created_by || 1 // Add this line
      };

      let savedCenter: EvacuationCenter | null = null;

      if (mode === 'add') {
        const result = await createCenter(centerData);
        console.log('Create center response:', result);
        savedCenter = result; // result should now be the center data directly
      } else if (center) {
        savedCenter = await updateCenter(center.id, centerData);
      }

      if (!savedCenter?.id) { // Use optional chaining
        console.error('No evacuation center ID received:', savedCenter);
        return;
      }

      // Handle rooms for new centers or manage room changes for existing centers
      if (mode === 'add' && rooms.length > 0) {
        console.log('Creating rooms for center:', { centerId: savedCenter.id, rooms });
        await Promise.all(
          rooms.map(async room => {
            const roomData = {
              evacuation_center_id: savedCenter!.id,
              room_name: room.roomName,
              room_type: room.type,
              individual_room_capacity: Math.max(1, room.capacity)
            };
            console.log('Creating room with data:', roomData);
            try {
              const result = await createRoom(roomData);
              console.log('Room creation result:', result);
              return result;
            } catch (error) {
              console.error('Error creating room:', error);
              throw error;
            }
          })
        );
      } else if (mode === 'edit' && center) {
        // Handle room updates, creations, and deletions for existing center
        const existingRoomIds = center.rooms?.map(r => r.id) || [];
        const currentRoomIds = rooms.map(r => r.id);

        // Delete removed rooms
        const roomsToDelete = existingRoomIds.filter(id => !currentRoomIds.includes(id));
        await Promise.all(roomsToDelete.map(id => deleteRoom(id)));

        // Update or create rooms
        await Promise.all(
          rooms.map(room => {
            if (room.id.startsWith('temp-')) {
              // Create new room
              return createRoom({
                room_name: room.roomName,
                room_type: room.type,
                individual_room_capacity: room.capacity,
                evacuation_center_id: center.id
              });
            } else {
              // Update existing room
              return updateRoom(room.id, {
                room_name: room.roomName,
                room_type: room.type,
                individual_room_capacity: room.capacity
              });
            }
          })
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving evacuation center:', error);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="xl" className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            {mode === 'add' ? 'Add Evacuation Center' : 'Edit Evacuation Center'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Left Column - Basic Information */}
          <div>
            <EvacuationCenterForm
              formData={formData}
              onFormChange={handleFormInputChange}
              errors={errors.center}
            />
          </div>

          {/* Right Column - Evacuation Rooms */}
          <div>
            <RoomForm
              rooms={rooms}
              onAddRoom={handleAddRoom}
              onRoomChange={handleRoomChange}
              onDeleteRoom={handleDeleteRoom}
              errors={errors.rooms}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={centerLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-green-700 hover:bg-green-800 text-white"
            disabled={centerLoading}
          >
            {centerLoading ? 'Saving...' : (mode === 'add' ? 'Add' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}