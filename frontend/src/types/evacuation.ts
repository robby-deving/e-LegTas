export type EvacuationCenterStatus = 'Available' | 'Full' | 'Maintenance' | 'Unavailable';

export type EvacuationCenterCategory = 
  | 'School'
  | 'Covered Court'
  | 'Barangay Hall'
  | 'Community Center'
  | 'Chapel/Church'
  | 'Dedicated Evacuation Center'
  | 'Government Building'
  | 'Commercial Building';

export type RoomType = 
  | 'Temporary'
  | 'Permanent'


export interface EvacuationRoom {
  id: string;
  roomName: string;
  type: RoomType;
  capacity: number;
  evacuationCenterId?: number;
}

export interface EvacuationCenter {
  id: number;
  name: string;
  address: string;
  barangay_id: number;
  latitude: number;
  longitude: number;
  ec_status: EvacuationCenterStatus;
  category: EvacuationCenterCategory;
  camp_manager_id: number | null;
  total_capacity: number;
  created_by: number;
  rooms?: EvacuationRoom[];
}

export interface CreateEvacuationCenterRequest {
  name: string;
  address: string;
  barangay_id: number;
  latitude: number;
  longitude: number;
  category: EvacuationCenterCategory;
  ec_status: EvacuationCenterStatus; // Add this
  created_by: number; // Add this
  total_capacity: number; // Add this if needed
}

export interface UpdateEvacuationCenterRequest extends Partial<CreateEvacuationCenterRequest> {
  ec_status?: EvacuationCenterStatus;
}

export interface CreateRoomRequest {
  room_name: string;
  room_type: RoomType;
  individual_room_capacity: number;
  evacuation_center_id: number;
}

export interface UpdateRoomRequest extends Partial<Omit<CreateRoomRequest, 'evacuation_center_id'>> {}