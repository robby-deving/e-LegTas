export type EvacuationCenterDetail = {
  disaster: {
    disaster_types_id: number;
    disaster_type_name: string;
    disasters_id: number;
    disaster_name: string;
    disaster_start_date: string; // NOT DONE WRONG OUTPUT
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
};
