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

export type ActiveEvacuation = {
  id: number;
  disaster_id: number;
  assigned_user_id: number;
  evacuation_center_id: number;
  evacuation_start_date: string; // ISO 8601 datetime string
  evacuation_end_date: string | null;
  total_no_of_family: number;
  total_no_of_individuals: number;
  evacuation_center_name: string;
  evacuation_center_total_capacity: number;
  evacuation_center_barangay_name: string;
  assigned_user_name: string;
};

