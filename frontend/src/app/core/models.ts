export type Role = 'admin' | 'health_worker' | 'resident';

export interface User {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  username: string;
  email: string | null;
  role: Role;
  is_active: boolean;
}

export interface Meta { current_page: number; last_page: number; total: number; per_page: number; }
export interface Paged<T> { data: T[]; meta: Meta; }

export interface Resident {
  id: number;
  reference_no: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  birth_date: string;
  birth_date_estimated: boolean;
  sex: string;
  contact_number: string | null;
  address: string | null;
  purok: string | null;
  barangay: string | null;
  status: string;
  has_portal_account: boolean;
}

export interface Vaccine {
  id: number;
  name: string;
  total_doses: number;
  first_dose_min_age_days: number;
  max_age_days: number | null;
  interval_days: number;
  grace_days: number;
}

export interface Vaccination {
  id: number;
  vaccine_id: number;
  vaccine: string;
  dose_number: number;
  date_given: string;
  batch_number: string | null;
  given_by: string | null;
  voided: boolean;
  void_reason: string | null;
}

export interface ScheduleItem {
  vaccine_id: number;
  vaccine: string;
  dose_number: number;
  total_doses: number;
  due_date: string;
  status: 'upcoming' | 'due' | 'overdue';
  days_overdue: number;
}

export interface FollowUpItem extends ScheduleItem {
  resident_id: number;
  reference_no: string;
  full_name: string;
  birth_date: string;
  purok: string | null;
  contact_number: string | null;
  follow_up_status: string | null;
  follow_up_note: string | null;
}

export interface ResidentDetail {
  resident: Resident;
  vaccinations: Vaccination[];
  schedule: ScheduleItem[];
}

export interface Medicine {
  id: number;
  name: string;
  generic_name: string | null;
  form_strength: string | null;
  unit: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  expiry_date: string | null;
  quantity?: number;
  reorder_level?: number;
  batch_number?: string | null;
  expired?: boolean;
  near_expiry?: boolean;
}

export interface DashboardStats {
  residents_total: number;
  residents_active: number;
  vaccinations_total: number;
  due_doses: number;
  overdue_doses: number;
  due_residents: number;
  overdue_residents: number;
  low_stock: number;
  near_expiry: number;
  expired: number;
}

export interface LogRow {
  id: number; user: string; action: string; subject: string | null;
  description: string | null; ip_address: string | null; created_at: string;
}
