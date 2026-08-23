export interface PatientStats {
  totalToday: number;
  inQueue: number;
  inService: number;
  servedToday: number;
  avgWaitTime: number;
}

export interface RecentPatient {
  id: string;
  patientNum: string;
  service: string;
  status: string;
  createdAt: string;
  waitTime?: number;
}

export interface AllRecentPatient extends RecentPatient {
  createdAtDate: Date;
}

export interface AnalyticsData {
  daily_summary?: Array<{
    visit_date: string;
    total_patients: number;
    avg_wait_registration: number;
    avg_wait_consultation: number;
    avg_total_time: number;
  }>;
  hourly_pattern?: Array<{
    hour: number;
    avg_patients: number;
    avg_wait_consultation: number;
    time_label: string;
  }>;
  bottleneck_analysis?: {
    bottleneck_stage: string;
    avg_wait_registration_min: number;
    avg_wait_consultation_min: number;
    system_status: string;
  };
}
export type Patient = {
  id: number;
  patientNum: string;
  status?: string;
  cubicleNum?: string | null;
  service?: string;
  created_at?: string;
  updated_at?: string;
  phoneNum?: number;
  reg_start?: string;
  reg_end?: string;
  consult_start?: string;
  consult_end?: string;
  counter?: number;
  called_at?: string;
  timeout_seconds?: number;
  queue_position?: number;
  progress_started_at?: string | null;
  cubicle_top_started_at?: string | null;
  preferredCubicleNums?: string[] | null;
  subcategory?: string | null;
  carryout_start?: string | null;
  carryout_end?: string | null;
  cooldown_until?: string | null;
};

export type Cubicle = {
  id: number;
  cubicleNum: string;
  category: string;
  room: number;
  subcategory?: string;
  doctorId?: string | null;
};

export type Doctor = {
  id: string;
  full_name: string;
  specialty?: string | null;
  email?: string | null;
  auth_id?: string | null;
  active: boolean;
  created_at?: string;
};
export type CubicleSelectorType = {
  id: number;
  cubicle_name: string;
  cubicle_order: number;
  cubicle_id: number | null;
  cubicle?: { cubicleNum: string } | null; 
};