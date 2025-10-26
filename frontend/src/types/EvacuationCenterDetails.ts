//EvacuationCenterDetails.ts
export type EvacuationEventMeta = {
  id: number;
  evacuation_start_date: string | null;
  evacuation_end_date: string | null;
  is_event_ended: boolean;
};

export type EvacuationCenterDetail = {
  evacuation_event?: EvacuationEventMeta;

  disaster: {
    disaster_types_id: number;
    disaster_type_name: string;
    disasters_id: number;
    disaster_name: string;
    disaster_start_date: string;
    disaster_end_date: string | null;
  };
  evacuation_center: {
    evacuation_center_id: number;
    evacuation_center_name: string;
    evacuation_center_barangay_id: number;
    evacuation_center_barangay_name: string;
  };
  evacuation_summary: {
    total_no_of_family: number;
    total_no_of_individuals: number;
    evacuation_center_capacity: number;
  };
};
export type EvacueeStatistics = {
  title: string;
  summary: {
    total_no_of_male: number;
    total_no_of_female: number;
    total_no_of_infant: number;
    total_no_of_children: number;
    total_no_of_youth: number;
    total_no_of_adult: number;
    total_no_of_seniors: number;
    total_no_of_pwd: number;
    total_no_of_pregnant: number;
    total_no_of_lactating_women: number;
  };
};

export type FamilyMember = {
  evacuee_id: number;
  resident_id: number;
  full_name: string;
  age: number;
  barangay_of_origin: string;
  sex: string;
  vulnerability_types: string[];
  room_name: string;
  arrival_timestamp: string;
};

export type ServiceReceived = {
  service_received: string;
  created_at: string; // ISO timestamp
};


export type FamilyEvacueeInformation = {
  id: number;
  disaster_evacuation_event_id: string;
  family_head_full_name: string;
  barangay: string;
  total_individuals: number;
  room_name: string;
  decampment_timestamp: string | null;
  view_family: {
    evacuation_center_name: string;
    head_of_family: string;
    decampment: string | null;
    summary_per_family: {
      total_no_of_male: number;
      total_no_of_female: number;
      total_no_of_individuals: number;
      total_no_of_family: number;
      total_no_of_infant: number;
      total_no_of_children: number;
      total_no_of_youth: number;
      total_no_of_adult: number;
      total_no_of_seniors: number;
      total_no_of_pwd: number;
      total_no_of_pregnant: number;
      total_no_of_lactating_women: number;
    };
  };
  list_of_family_members: {
    family_members: FamilyMember[];
  };
  // Adding services field here
  relief_goods_and_services?: ServiceReceived[]; // Array of services received
};



export interface Evacuee {
  evacuee_resident_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  birthdate: string;
  sex: string;
  barangay_of_origin: string;
  barangay_name?: string | null;
  marital_status: string;
  educational_attainment: string;
  school_of_origin: string;
  occupation: string;
  purok: string;
  relationship_to_family_head: string;
  date_registered: string;
  arrival_timestamp: string;
  decampment_timestamp: string | null;
  reported_age_at_arrival: number;
  disaster_evacuation_event_id: number;
  ec_rooms_id: number;
  family_head_id: number;
  vulnerability_type_ids: string[];

  is_active?: boolean;
  active_event_id?: number | null;
  active_disaster_id?: number | null;
  active_ec_id?: number | null;
  active_ec_name?: string | null;

  family_head_full_name?: string | null;
}



export type Barangay = {
  id: number;
  name: string;
};

export type RoomOption = {
  id: number;
  room_name: string;
  available?: number;  
  capacity?: number;   
};

export type RegisterEvacuee = {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix?: string | null;
  birthdate: string;
  sex: string;
  barangay_of_origin: number;
  marital_status: string;
  educational_attainment: string;
  school_of_origin?: string;
  occupation?: string;
  purok?: string;
  relationship_to_family_head: string;
  family_head_id?: number;
  date_registered?: string;

  is_infant?: boolean;
  is_children?: boolean;
  is_youth?: boolean;
  is_adult?: boolean;
  is_senior?: boolean;
  is_pwd?: boolean;
  is_pregnant?: boolean;
  is_lactating?: boolean;

  ec_rooms_id: number | null;
  disaster_evacuation_event_id: number;
   existing_evacuee_resident_id?: number;
};

export type FamilyHeadResult = {
  family_head_id: number;
  family_head_full_name: string;
  barangay: string;
  barangay_id: number | null;
  purok: string | null;
  evacuation_room: string | null;
};

export type EditEvacueeApi = {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  birthdate?: string | null; 
  sex: string; 
  barangay_of_origin?: number | null;
  // evacuee_residents fields
  marital_status?: string | null;
  educational_attainment?: string | null;
  school_of_origin?: string | null;
  occupation?: string | null;
  purok?: string | number | null;
  relationship_to_family_head: string; 
  // head/registration helpers
  family_head_id?: number | null; 
  family_head_full_name?: string | null;
  ec_rooms_id?: number | null; 
  room_name?: string | null; 
  // vulnerabilities
  vulnerability_type_ids?: number[];
};

export type SelectedEvacuee = {
  id: number; 
  registration_ec_rooms_id: number | null;
};

export type SortKey = "family_head_full_name" | "total_individuals" | "decampment_timestamp";
export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey; dir: SortDir } | null;
