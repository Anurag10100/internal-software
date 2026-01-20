// ==========================================
// ENTERPRISE HR MANAGEMENT SYSTEM
// TypeScript Type Definitions
// ==========================================

// ==========================================
// PAYROLL TYPES
// ==========================================

export interface SalaryStructure {
  id: string;
  name: string;
  description?: string;
  basic_percentage: number;
  hra_percentage: number;
  da_percentage: number;
  special_allowance_percentage: number;
  pf_percentage: number;
  esi_percentage: number;
  professional_tax: number;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeSalary {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  department?: string;
  designation?: string;
  salary_structure_id?: string;
  structure_name?: string;
  gross_salary: number;
  basic_salary: number;
  hra: number;
  da: number;
  special_allowance: number;
  other_allowances: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  net_salary: number;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan_number?: string;
  effective_from?: string;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  department?: string;
  designation?: string;
  month: number;
  year: number;
  pay_period_start: string;
  pay_period_end: string;
  working_days: number;
  days_worked: number;
  days_absent: number;
  basic_salary: number;
  hra: number;
  da: number;
  special_allowance: number;
  other_allowances: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus: number;
  gross_earnings: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  professional_tax: number;
  tds: number;
  other_deductions: number;
  loan_deduction: number;
  total_deductions: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  generated_at?: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  payment_reference?: string;
  created_at: string;
}

export interface SalaryRevision {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  previous_gross: number;
  new_gross: number;
  revision_type: 'annual' | 'promotion' | 'adjustment' | 'market';
  percentage_increase: number;
  reason?: string;
  effective_from: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface TaxDeclaration {
  id: string;
  user_id: string;
  user_name?: string;
  financial_year: string;
  regime: 'old' | 'new';
  section_80c: number;
  section_80d: number;
  section_80g: number;
  hra_exemption: number;
  lta: number;
  other_exemptions: number;
  total_deductions: number;
  status: 'draft' | 'submitted' | 'verified';
  submitted_at?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  category: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface EmployeeLoan {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  loan_type: 'advance' | 'personal' | 'emergency';
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  emi_amount: number;
  tenure_months: number;
  remaining_amount: number;
  remaining_emis: number;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
}

// ==========================================
// RECRUITMENT TYPES
// ==========================================

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location?: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_min: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  skills_required?: string;
  status: 'draft' | 'published' | 'closed' | 'on_hold';
  posted_by?: string;
  posted_by_name?: string;
  posted_at?: string;
  closing_date?: string;
  positions_count: number;
  positions_filled: number;
  is_remote: boolean;
  applicants_count?: number;
  created_at: string;
  candidates?: Candidate[];
}

export interface Candidate {
  id: string;
  job_id?: string;
  job_title?: string;
  job_department?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  current_company?: string;
  current_designation?: string;
  experience_years?: number;
  expected_salary?: number;
  notice_period?: number;
  resume_url?: string;
  cover_letter?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  source: 'website' | 'linkedin' | 'referral' | 'agency' | 'campus' | 'other';
  referral_by?: string;
  referral_by_name?: string;
  skills?: string;
  status: 'new' | 'in_process' | 'hired' | 'rejected' | 'on_hold';
  stage: 'applied' | 'screening' | 'interview' | 'technical' | 'hr' | 'offer' | 'hired' | 'rejected';
  rating?: number;
  notes?: string;
  created_at: string;
  interviews?: Interview[];
  offer?: OfferLetter;
}

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id: string;
  job_title?: string;
  department?: string;
  round_number: number;
  round_type: 'screening' | 'technical' | 'hr' | 'cultural' | 'final';
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  panelists?: InterviewPanelist[];
  feedback?: InterviewFeedback[];
  created_at: string;
}

export interface InterviewPanelist {
  id: string;
  interview_id: string;
  user_id: string;
  panelist_name?: string;
  panelist_email?: string;
  is_lead: boolean;
  created_at: string;
}

export interface InterviewFeedback {
  id: string;
  interview_id: string;
  panelist_id: string;
  panelist_name?: string;
  technical_rating?: number;
  communication_rating?: number;
  cultural_fit_rating?: number;
  overall_rating?: number;
  strengths?: string;
  weaknesses?: string;
  recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  notes?: string;
  submitted_at: string;
}

export interface OfferLetter {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id: string;
  job_title?: string;
  department?: string;
  offered_salary: number;
  joining_date: string;
  offer_expiry_date: string;
  probation_period_months: number;
  notice_period_days: number;
  benefits?: string;
  special_conditions?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired';
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_by?: string;
  created_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  created_at: string;
}

export interface OnboardingTask {
  id: string;
  onboarding_id: string;
  template_task_id?: string;
  title: string;
  description?: string;
  category?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  notes?: string;
}

export interface EmployeeOnboarding {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  department?: string;
  template_id?: string;
  template_name?: string;
  status: 'in_progress' | 'completed';
  start_date: string;
  target_completion_date?: string;
  completed_at?: string;
  tasks?: OnboardingTask[];
  completed_tasks?: number;
  total_tasks?: number;
  created_at: string;
}

// ==========================================
// LEARNING & DEVELOPMENT TYPES
// ==========================================

export interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  skill_tags?: string;
  instructor?: string;
  instructor_id?: string;
  instructor_name?: string;
  duration_hours?: number;
  course_type: 'online' | 'in_person' | 'hybrid';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  content_url?: string;
  thumbnail_url?: string;
  syllabus?: string;
  prerequisites?: string;
  max_participants?: number;
  is_mandatory: boolean;
  is_active: boolean;
  enrolled_count?: number;
  modules_count?: number;
  modules?: CourseModule[];
  enrollment?: CourseEnrollment;
  moduleProgress?: ModuleProgress[];
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'document' | 'quiz' | 'assignment';
  content_url?: string;
  duration_minutes?: number;
  order_index: number;
  is_mandatory: boolean;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  course_title?: string;
  course_description?: string;
  category?: string;
  duration_hours?: number;
  thumbnail_url?: string;
  difficulty_level?: string;
  user_id: string;
  user_name?: string;
  department?: string;
  enrolled_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  score?: number;
  certificate_url?: string;
  total_modules?: number;
  completed_modules?: number;
}

export interface ModuleProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  started_at?: string;
  completed_at?: string;
  time_spent_minutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
}

export interface EmployeeSkill {
  id: string;
  user_id: string;
  user_name?: string;
  skill_id: string;
  skill_name?: string;
  category?: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  is_primary: boolean;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
  last_used_at?: string;
  created_at: string;
}

export interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  description?: string;
  validity_months?: number;
  skill_tags?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeCertification {
  id: string;
  user_id: string;
  certification_id: string;
  certification_name?: string;
  issuing_organization?: string;
  credential_id?: string;
  issue_date: string;
  expiry_date?: string;
  certificate_url?: string;
  verification_url?: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string;
  target_role?: string;
  skill_tags?: string;
  estimated_hours?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  is_active: boolean;
  courses_count?: number;
  enrolled_count?: number;
  courses?: LearningPathCourse[];
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface LearningPathCourse {
  id: string;
  learning_path_id: string;
  course_id: string;
  title?: string;
  description?: string;
  duration_hours?: number;
  difficulty_level?: string;
  thumbnail_url?: string;
  order_index: number;
  is_mandatory: boolean;
  enrollment_status?: string;
  progress_percentage?: number;
}

export interface TrainingSession {
  id: string;
  course_id?: string;
  course_title?: string;
  title: string;
  description?: string;
  trainer_id?: string;
  trainer_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_link?: string;
  max_participants?: number;
  registered_count?: number;
  my_registration?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

// ==========================================
// ASSET MANAGEMENT TYPES
// ==========================================

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
  depreciation_rate: number;
  useful_life_years?: number;
  parent_category_id?: string;
  parent_name?: string;
  assets_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  category_id: string;
  category_name?: string;
  description?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  vendor?: string;
  warranty_end_date?: string;
  current_value?: number;
  location?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  assigned_to_name?: string;
  assigned_to_id?: string;
  assignments?: AssetAssignment[];
  maintenance?: AssetMaintenance[];
  created_at: string;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  user_id: string;
  user_name?: string;
  assigned_by: string;
  assigned_by_name?: string;
  assigned_at: string;
  expected_return_date?: string;
  returned_at?: string;
  return_condition?: string;
  return_notes?: string;
  status: 'active' | 'returned';
}

export interface AssetRequest {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  category_id?: string;
  category_name?: string;
  asset_id?: string;
  asset_name?: string;
  asset_tag?: string;
  request_type: 'new' | 'replacement' | 'upgrade';
  reason: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  fulfilled_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  asset_name?: string;
  asset_tag?: string;
  category_name?: string;
  maintenance_type: 'preventive' | 'repair' | 'upgrade' | 'inspection';
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  vendor?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface SoftwareLicense {
  id: string;
  software_name: string;
  vendor?: string;
  license_type: 'perpetual' | 'subscription' | 'site' | 'user';
  license_key?: string;
  total_seats: number;
  used_seats: number;
  purchase_date?: string;
  expiry_date?: string;
  cost?: number;
  renewal_cost?: number;
  status: 'active' | 'expired' | 'cancelled';
  notes?: string;
  assignments?: LicenseAssignment[];
  created_at: string;
}

export interface LicenseAssignment {
  id: string;
  license_id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  assigned_by: string;
  assigned_by_name?: string;
  assigned_at: string;
  revoked_at?: string;
  status: 'active' | 'revoked';
}

// ==========================================
// EXPENSE MANAGEMENT TYPES
// ==========================================

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  max_amount?: number;
  requires_receipt: boolean;
  requires_approval: boolean;
  parent_category_id?: string;
  parent_name?: string;
  gl_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface ExpensePolicy {
  id: string;
  name: string;
  description?: string;
  applies_to: 'all' | 'department' | 'level';
  department?: string;
  designation_level?: string;
  daily_limit?: number;
  monthly_limit?: number;
  yearly_limit?: number;
  auto_approve_limit?: number;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseReport {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  title: string;
  description?: string;
  trip_name?: string;
  trip_start_date?: string;
  trip_end_date?: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submitted_at?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  paid_at?: string;
  payment_reference?: string;
  rejection_reason?: string;
  items_count?: number;
  items?: ExpenseItem[];
  mileage?: MileageClaim[];
  perDiem?: PerDiemClaim[];
  created_at: string;
}

export interface ExpenseItem {
  id: string;
  report_id: string;
  category_id: string;
  category_name?: string;
  expense_date: string;
  merchant?: string;
  description?: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  receipt_url?: string;
  is_billable: boolean;
  project_code?: string;
  client_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
}

export interface MileageClaim {
  id: string;
  report_id: string;
  claim_date: string;
  from_location: string;
  to_location: string;
  distance_km: number;
  rate_per_km: number;
  amount: number;
  purpose?: string;
  vehicle_type: 'car' | 'bike' | 'public';
  created_at: string;
}

export interface PerDiemClaim {
  id: string;
  report_id: string;
  claim_date: string;
  city: string;
  country: string;
  day_type: 'full' | 'half';
  breakfast_included: boolean;
  lunch_included: boolean;
  dinner_included: boolean;
  rate: number;
  amount: number;
  created_at: string;
}

// ==========================================
// ORGANIZATION TYPES
// ==========================================

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: string;
  parent_name?: string;
  head_user_id?: string;
  head_name?: string;
  cost_center_id?: string;
  cost_center_name?: string;
  budget?: number;
  employees_count?: number;
  is_active: boolean;
  employees?: OrganizationEmployee[];
  subDepartments?: Department[];
  children?: Department[];
  created_at: string;
}

export interface Position {
  id: string;
  title: string;
  code?: string;
  department_id?: string;
  department_name?: string;
  level: number;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  requirements?: string;
  employees_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description?: string;
  budget?: number;
  manager_id?: string;
  manager_name?: string;
  employees_count?: number;
  departments_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_headquarters: boolean;
  employees_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface ReportingHierarchy {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  avatar?: string;
  designation?: string;
  reports_to?: string;
  manager_name?: string;
  secondary_reports_to?: string;
  department_id?: string;
  department_name?: string;
  position_id?: string;
  position_title?: string;
  location_id?: string;
  location_name?: string;
  cost_center_id?: string;
  effective_from?: string;
  directReports?: ReportingHierarchy[];
  created_at: string;
}

export interface OrganizationEmployee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  designation?: string;
  position_title?: string;
  reports_to?: string;
  manager_name?: string;
}

export interface EmployeeProfile {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  avatar?: string;
  department?: string;
  designation?: string;
  role?: string;
  phone?: string;
  personal_email?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  current_address?: string;
  permanent_address?: string;
  nationality?: string;
  work_anniversary?: string;
  bio?: string;
  linkedin_url?: string;
  twitter_url?: string;
  slack_id?: string;
  timezone: string;
  language_preference: string;
  hierarchy?: ReportingHierarchy;
  created_at: string;
  updated_at: string;
}

// ==========================================
// DOCUMENT MANAGEMENT TYPES
// ==========================================

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  parent_name?: string;
  access_level: 'all' | 'hr' | 'finance' | 'admin' | 'private';
  retention_days?: number;
  documents_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  version: number;
  parent_document_id?: string;
  owner_id: string;
  owner_name?: string;
  owner_department?: string;
  access_type: 'private' | 'public' | 'department';
  department_access?: string;
  tags?: string;
  is_template: boolean;
  requires_signature: boolean;
  status: 'active' | 'archived';
  archived_at?: string;
  shares?: DocumentShare[];
  signatures?: DocumentSignature[];
  versions?: Document[];
  created_at: string;
  updated_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  shared_with_user_id?: string;
  shared_with_name?: string;
  shared_with_department?: string;
  permission: 'view' | 'edit' | 'admin';
  shared_by: string;
  shared_by_name?: string;
  expires_at?: string;
  created_at: string;
}

export interface DocumentSignature {
  id: string;
  document_id: string;
  signer_id: string;
  signer_name?: string;
  signature_type: 'approval' | 'acknowledgment' | 'witness';
  status: 'pending' | 'signed' | 'declined';
  signed_at?: string;
  ip_address?: string;
  notes?: string;
  order_index: number;
  created_at: string;
}

export interface Policy {
  id: string;
  title: string;
  category?: string;
  description?: string;
  content?: string;
  document_id?: string;
  document_title?: string;
  file_url?: string;
  file_name?: string;
  version?: string;
  effective_date?: string;
  review_date?: string;
  status: 'draft' | 'published' | 'archived';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  requires_acknowledgment: boolean;
  acknowledged?: boolean;
  acknowledged_at?: string;
  acknowledgments_count?: number;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

// ==========================================
// ANNOUNCEMENT & COMMUNICATION TYPES
// ==========================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'policy' | 'event' | 'achievement';
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_audience: 'all' | 'department' | 'location' | 'custom';
  target_departments?: string;
  target_locations?: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  publish_at?: string;
  expires_at?: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  attachment_url?: string;
  status: 'draft' | 'published' | 'archived';
  reads_count?: number;
  my_read_id?: string;
  created_at: string;
}

export interface CompanyEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'meeting' | 'training' | 'celebration' | 'townhall' | 'team_building' | 'other';
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual_link?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  organizer_id: string;
  organizer_name?: string;
  organizer_avatar?: string;
  organizer_email?: string;
  target_audience: 'all' | 'department' | 'location' | 'custom';
  target_departments?: string;
  max_participants?: number;
  registration_required: boolean;
  registration_deadline?: string;
  registrations_count?: number;
  my_registration?: string;
  registrations?: EventRegistration[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  avatar?: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  attended: boolean;
  registered_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Celebration {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
  type: 'birthday' | 'anniversary';
  date?: string;
  years?: number;
}

// ==========================================
// OFFBOARDING TYPES
// ==========================================

export interface ExitRequest {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  department?: string;
  designation?: string;
  avatar?: string;
  resignation_date: string;
  last_working_day: string;
  notice_period_days?: number;
  exit_type: 'resignation' | 'termination' | 'retirement' | 'layoff' | 'contract_end';
  reason_category?: string;
  reason_details?: string;
  is_notice_served: boolean;
  notice_buyout_days: number;
  notice_buyout_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  clearance?: EmployeeClearance[];
  exitInterview?: ExitInterview;
  knowledgeTransfer?: KnowledgeTransfer[];
  settlement?: FinalSettlement;
  created_at: string;
}

export interface ClearanceItem {
  id: string;
  name: string;
  department: string;
  description?: string;
  is_mandatory: boolean;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeClearance {
  id: string;
  exit_request_id: string;
  clearance_item_id: string;
  item_name?: string;
  department?: string;
  description?: string;
  status: 'pending' | 'cleared' | 'not_applicable';
  cleared_by?: string;
  cleared_by_name?: string;
  cleared_at?: string;
  remarks?: string;
}

export interface ExitInterview {
  id: string;
  exit_request_id: string;
  interviewer_id: string;
  interviewer_name?: string;
  interview_date: string;
  overall_experience_rating?: number;
  management_rating?: number;
  work_environment_rating?: number;
  growth_opportunities_rating?: number;
  compensation_rating?: number;
  reason_for_leaving?: string;
  liked_most?: string;
  improvements_suggested?: string;
  would_recommend: boolean;
  would_rejoin: boolean;
  additional_comments?: string;
  created_at: string;
}

export interface KnowledgeTransfer {
  id: string;
  exit_request_id: string;
  topic: string;
  description?: string;
  transfer_to_user_id: string;
  transfer_to_name?: string;
  documents?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface FinalSettlement {
  id: string;
  exit_request_id: string;
  user_id: string;
  last_salary: number;
  leave_encashment_days: number;
  leave_encashment_amount: number;
  bonus_amount: number;
  gratuity_amount: number;
  notice_recovery: number;
  other_recoveries: number;
  recovery_details?: string;
  gross_settlement: number;
  tds_deduction: number;
  net_settlement: number;
  status: 'draft' | 'approved' | 'paid';
  calculated_at?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  paid_at?: string;
  payment_reference?: string;
  created_at: string;
}

// ==========================================
// ANALYTICS TYPES
// ==========================================

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  filters?: string;
  columns?: string;
  group_by?: string;
  sort_by?: string;
  chart_type?: string;
  is_public: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  title?: string;
  config?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_visible: boolean;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_slack: boolean;
  dashboard_layout?: string;
  sidebar_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ==========================================
// DASHBOARD STATS TYPES
// ==========================================

export interface PayrollDashboardStats {
  totalEmployees: number;
  totalPayroll: number;
  pendingPayslips: number;
  pendingReimbursements: number;
  pendingLoans: number;
  activeLoans: number;
  totalLoanAmount: number;
  recentRevisions: number;
}

export interface RecruitmentDashboardStats {
  openPositions: number;
  totalCandidates: number;
  interviewsThisWeek: number;
  pendingOffers: number;
  hiredThisMonth: number;
  candidatesByStage: { stage: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  activeOnboarding: number;
}

export interface LearningDashboardStats {
  myStats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    coursesInProgress: number;
    skillsCount: number;
    certificationsCount: number;
    learningPathsAssigned: number;
    upcomingSessions: number;
    totalLearningHours: number;
  };
  orgStats?: {
    totalCourses: number;
    totalEnrollments: number;
    completionRate: number;
    activeTrainingSessions: number;
    skillsInSystem: number;
    certificationsExpiringSoon: number;
  };
}

export interface AssetDashboardStats {
  totalAssets: number;
  availableAssets: number;
  assignedAssets: number;
  maintenanceAssets: number;
  pendingRequests: number;
  upcomingMaintenance: number;
  totalAssetValue: number;
  assetsByCategory: { name: string; count: number }[];
  licensesExpiringSoon: number;
  totalLicenses: number;
}

export interface ExpenseDashboardStats {
  myStats: {
    draftReports: number;
    pendingReports: number;
    approvedReports: number;
    totalReimbursed: number;
    pendingAmount: number;
  };
  orgStats?: {
    totalPendingReports: number;
    totalPendingAmount: number;
    approvedAwaitingPayment: number;
    thisMonthTotal: number;
    topCategories: { name: string; total: number }[];
  };
}

export interface OrganizationDashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  totalPositions: number;
  totalLocations: number;
  employeesByDepartment: { name: string; count: number }[];
  employeesByLocation: { name: string; count: number }[];
  employeesByLevel: { level: number; count: number }[];
  recentJoiners: {
    id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    created_at: string;
  }[];
}

export interface OffboardingDashboardStats {
  pendingExitRequests: number;
  approvedExits: number;
  exitingThisMonth: number;
  pendingClearances: number;
  pendingSettlements: number;
  recentExits: {
    id: string;
    last_working_day: string;
    exit_type: string;
    user_name: string;
    department: string;
    cleared_items: number;
    total_items: number;
  }[];
  exitsByReason: { reason_category: string; count: number }[];
}
