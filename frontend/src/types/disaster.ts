export interface Disaster {
  id: number;
  name: string;
  type: string;
  type_id: number;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Ended';
}

export interface DisasterPayload {
  disaster_name: string;
  disaster_type_id: number;
  disaster_start_date: string;
  disaster_end_date: string | null;
}

export interface DisasterTypeWithId {
  id: number | null; 
  name: string;
}
