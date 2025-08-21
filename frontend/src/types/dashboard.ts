// src/types/dashboard.ts

export type Disaster = {
  id: number;
  disaster_name: string;
  disaster_start_date: string | null;
  disaster_end_date: string | null;
  disaster_types?: {
    name: string;
  };
  disaster_evacuation_event_id: number;
  evacuation_center_id: number;
};

export type DisasterEvacuationEvent = {
  evacuation_end_date: string | null;
};

export type EvacuationSummary = {
  disaster_evacuation_event_id: number;
  total_no_of_individuals: number | null;
  total_no_of_family: number | null;
  total_no_of_male: number | null;
  total_no_of_female: number | null;
  total_no_of_infant: number | null;
  total_no_of_children: number | null;
  total_no_of_youth: number | null;
  total_no_of_adult: number | null;
  total_no_of_seniors: number | null;
  total_no_of_pwd: number | null;
  total_no_of_pregnant: number | null;
  total_no_of_lactating_women: number | null;
};

export interface CenterInfo {
  id: number;
  name: string;
  barangay: string | null;
}