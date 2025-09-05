import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { EvacuationCenterForm } from './EvacuationCenterForm';
import { RoomForm } from './RoomForm';
import type { EvacuationCenter, EvacuationRoom, EvacuationCenterCategory, EvacuationCenterStatus } from '../../types/evacuation';
import { useEvacuationCenterMutations } from '../../hooks/useEvacuationCenterMutations';
import { useRoomMutations } from '../../hooks/useRoomsMutations';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUserId, selectIsAuthenticated } from '../../features/auth/authSlice';

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
  submit?: string;
}

interface EvacuationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  center?: EvacuationCenter;
  onSuccess: () => void;
}

export function EvacuationCenterModal({ isOpen, onClose, mode, center, onSuccess }: EvacuationCenterModalProps) {
  const navigate = useNavigate();
  const currentUserId = useSelector(selectUserId);
  const isAuthenticated = useSelector(selectIsAuthenticated);

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

  const { createCenter, updateCenter, isCreating, isUpdating } = useEvacuationCenterMutations();
  const centerLoading = isCreating || isUpdating;
  const { createRoom, updateRoom, deleteRoom } = useRoomMutations();

  // Check authentication when modal opens
  useEffect(() => {
    if (isOpen && (!isAuthenticated || !currentUserId)) {
      console.warn('User not authenticated when opening modal, redirecting to login');
      navigate('/login');
      onClose();
      return;
    }
  }, [isOpen, isAuthenticated, currentUserId, navigate, onClose]);

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

  // Calculate total capacity whenever rooms change
  useEffect(() => {
    const calculateTotalCapacity = () => {
      // For new centers, sum all room capacities
      if (mode === 'add') {
        const total = rooms
          .reduce((sum, room) => sum + (room.capacity || 0), 0);
        
        setFormData(prev => ({
          ...prev,
          total_capacity: total.toString()
        }));
      } 
      // For editing, add new room capacities to existing total
      else if (center) {
        const existingRoomIds = new Set(center.rooms?.map(r => r.id) || []);
        
        const newRoomsTotal = rooms
          .filter(room => 
            room.id.startsWith('temp-') || // New rooms
            !existingRoomIds.has(room.id)  // Or rooms not in original set
          )
          .reduce((sum, room) => sum + (room.capacity || 0), 0);

        // Get the total from original non-deleted rooms
        const existingRoomsTotal = rooms
          .filter(room => 
            !room.id.startsWith('temp-') && // Existing rooms
            existingRoomIds.has(room.id) && // That were in original set
            !room.markedForDeletion        // And not marked for deletion
          )
          .reduce((sum, room) => sum + (room.capacity || 0), 0);

        const total = existingRoomsTotal + newRoomsTotal;
        
        setFormData(prev => ({
          ...prev,
          total_capacity: total.toString()
        }));
      }
    };

    calculateTotalCapacity();
  }, [rooms, mode, center]);

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

  // Update handleRoomChange to recalculate capacity
  const handleRoomChange = (roomId: string, field: string, value: string | number) => {
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

  // Update handleDeleteRoom to handle marking for deletion
  const handleDeleteRoom = (roomId: string) => {
    if (roomId.startsWith('temp-')) {
      // Remove temporary rooms immediately
      setRooms(prev => prev.filter(room => room.id !== roomId));
    } else {
      // Mark existing rooms for deletion
      setRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { ...room, markedForDeletion: !room.markedForDeletion }
          : room
      ));
    }
  };

  const handleSave = async () => {
    // Clear previous errors
    setErrors({});

    // Check authentication
    if (!isAuthenticated || !currentUserId) {
      console.warn('User not authenticated or missing user ID, redirecting to login');
      navigate('/login');
      return;
    }

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
        ec_status: center?.ec_status || 'Available' as EvacuationCenterStatus,
        created_by: center?.created_by || currentUserId,
        assigned_user_id: center?.assigned_user_id || null
      };

      let savedCenter: EvacuationCenter | null = null;

      if (mode === 'add') {
        savedCenter = await createCenter(centerData);
      } else if (center) {
        savedCenter = await updateCenter(center.id, centerData);

        // Handle room deletions first
        const roomsToDelete = rooms.filter(room => 
          !room.id.startsWith('temp-') && room.markedForDeletion
        );
        
        await Promise.all(roomsToDelete.map(room => deleteRoom(room.id)));
      }

      if (!savedCenter?.id) {
        console.error('No evacuation center ID received:', savedCenter);
        return;
      }

      // Handle room creations and updates
      if (rooms.length > 0) {
        await Promise.all(
          rooms
            .filter(room => !room.markedForDeletion) // Skip marked rooms
            .map(room => {
              if (room.id.startsWith('temp-')) {
                // Create new room
                return createRoom({
                  room_name: room.roomName,
                  room_type: room.type,
                  individual_room_capacity: room.capacity,
                  evacuation_center_id: savedCenter!.id
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save evacuation center';
      setErrors({ submit: errorMessage });
    }
  };

  const handleClose = () => {
    setErrors({});
    setFormData({
      name: '',
      category: '',
      streetName: '',
      barangay: '',
      barangayId: 0,
      latitude: '',
      longitude: '',
      total_capacity: ''
    });
    setRooms([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="xl" className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            {mode === 'add' ? 'Add Evacuation Center' : 'Edit Evacuation Center'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Create a new evacuation center by filling out the information below.' 
              : 'Update the evacuation center information below.'}
          </DialogDescription>
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

        <DialogFooter className="flex-col space-y-2">
          {errors.submit && (
            <div className="text-red-600 text-sm text-center w-full">
              {errors.submit}
            </div>
          )}
          <div className="flex space-x-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}