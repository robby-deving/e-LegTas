export type EvacuationCenter = {
  id: number;
  name: string;
  address: string;
  barangay_id: number;
  latitude: number;
  longitude: number;
  ec_status: 'Available' | 'Not Available'; // Add other possible values if any
  category: 'School' | 'Church' | 'Gym' | 'Other'; // Add other possible values if any
  camp_manager_id: number | null;
  created_by: number;
  created_at: string; // or Date if parsed
  updated_at: string | null;
  barangay_name: string;
  camp_manager_name: string | null;
  camp_manager_phone_number?: string | null; 
};
