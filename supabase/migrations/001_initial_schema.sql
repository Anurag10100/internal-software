-- ==========================================
-- HRMS + BOOTHPILOT SUPABASE SCHEMA
-- Initial Migration
-- ==========================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CORE HR TABLES
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT,
  role TEXT DEFAULT 'employee',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  assigned_by_user_id TEXT NOT NULL REFERENCES users(id),
  assigned_to_user_id TEXT NOT NULL REFERENCES users(id),
  due_date TEXT NOT NULL,
  due_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  location TEXT,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  profile TEXT DEFAULT 'Standard',
  in_probation INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active'
);

-- HRMS Settings table
CREATE TABLE IF NOT EXISTS hrms_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  late_time TEXT DEFAULT '10:30 AM',
  half_day_time TEXT DEFAULT '11:00 AM',
  settings_json JSONB
);

-- ==========================================
-- PROBATION MANAGEMENT TABLES
-- ==========================================

-- Probations table
CREATE TABLE IF NOT EXISTS probations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_days INTEGER DEFAULT 90,
  status TEXT DEFAULT 'ongoing',
  extended_till TEXT,
  extension_reason TEXT,
  confirmed_by TEXT REFERENCES users(id),
  confirmed_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Probation reviews table
CREATE TABLE IF NOT EXISTS probation_reviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  probation_id TEXT NOT NULL REFERENCES probations(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  review_date TEXT NOT NULL,
  milestone TEXT,
  rating INTEGER,
  feedback TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Probation checklists table
CREATE TABLE IF NOT EXISTS probation_checklists (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  probation_id TEXT NOT NULL REFERENCES probations(id),
  item TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT
);

-- ==========================================
-- APPRAISAL SYSTEM TABLES
-- ==========================================

-- Appraisal cycles table
CREATE TABLE IF NOT EXISTS appraisal_cycles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appraisals table
CREATE TABLE IF NOT EXISTS appraisals (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  cycle_id TEXT NOT NULL REFERENCES appraisal_cycles(id),
  employee_id TEXT NOT NULL REFERENCES users(id),
  manager_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  self_rating REAL,
  manager_rating REAL,
  final_rating REAL,
  self_comments TEXT,
  manager_comments TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  appraisal_id TEXT REFERENCES appraisals(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_date TEXT,
  weightage INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  self_rating INTEGER,
  manager_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 360 Feedback table
CREATE TABLE IF NOT EXISTS feedback_360 (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  appraisal_id TEXT NOT NULL REFERENCES appraisals(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewer_type TEXT,
  rating INTEGER,
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  is_anonymous INTEGER DEFAULT 1,
  submitted_at TEXT
);

-- ==========================================
-- PERFORMANCE MANAGEMENT TABLES
-- ==========================================

-- KPIs table
CREATE TABLE IF NOT EXISTS kpis (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  metric_type TEXT,
  target_value REAL,
  current_value REAL DEFAULT 0,
  unit TEXT,
  period TEXT,
  status TEXT DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance notes table
CREATE TABLE IF NOT EXISTS performance_notes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  type TEXT,
  content TEXT NOT NULL,
  is_private INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PIPs table (Performance Improvement Plans)
CREATE TABLE IF NOT EXISTS pips (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  manager_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  goals TEXT,
  status TEXT DEFAULT 'active',
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PIP checkpoints table
CREATE TABLE IF NOT EXISTS pip_checkpoints (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  pip_id TEXT NOT NULL REFERENCES pips(id),
  checkpoint_date TEXT NOT NULL,
  progress_notes TEXT,
  rating INTEGER,
  reviewed_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recognitions table
CREATE TABLE IF NOT EXISTS recognitions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  recipient_id TEXT NOT NULL REFERENCES users(id),
  nominator_id TEXT NOT NULL REFERENCES users(id),
  type TEXT,
  badge TEXT,
  title TEXT,
  message TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PAYROLL MANAGEMENT TABLES
-- ==========================================

-- Salary structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  basic_percentage REAL DEFAULT 40,
  hra_percentage REAL DEFAULT 20,
  da_percentage REAL DEFAULT 10,
  special_allowance_percentage REAL DEFAULT 30,
  pf_percentage REAL DEFAULT 12,
  esi_percentage REAL DEFAULT 1.75,
  professional_tax REAL DEFAULT 200,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee salary details
CREATE TABLE IF NOT EXISTS employee_salaries (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  salary_structure_id TEXT REFERENCES salary_structures(id),
  gross_salary REAL NOT NULL,
  basic_salary REAL,
  hra REAL,
  da REAL,
  special_allowance REAL,
  other_allowances REAL DEFAULT 0,
  pf_employee REAL,
  pf_employer REAL,
  esi_employee REAL,
  esi_employer REAL,
  professional_tax REAL,
  tds REAL DEFAULT 0,
  net_salary REAL,
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  pan_number TEXT,
  effective_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  pay_period_start TEXT NOT NULL,
  pay_period_end TEXT NOT NULL,
  working_days INTEGER,
  days_worked INTEGER,
  days_absent INTEGER DEFAULT 0,
  basic_salary REAL,
  hra REAL,
  da REAL,
  special_allowance REAL,
  other_allowances REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  overtime_amount REAL DEFAULT 0,
  bonus REAL DEFAULT 0,
  gross_earnings REAL,
  pf_employee REAL,
  pf_employer REAL,
  esi_employee REAL,
  professional_tax REAL,
  tds REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  loan_deduction REAL DEFAULT 0,
  total_deductions REAL,
  net_salary REAL,
  status TEXT DEFAULT 'draft',
  generated_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Salary revisions
CREATE TABLE IF NOT EXISTS salary_revisions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  previous_gross REAL,
  new_gross REAL NOT NULL,
  revision_type TEXT DEFAULT 'annual',
  percentage_increase REAL,
  reason TEXT,
  effective_from TEXT NOT NULL,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax declarations
CREATE TABLE IF NOT EXISTS tax_declarations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  financial_year TEXT NOT NULL,
  regime TEXT DEFAULT 'new',
  section_80c REAL DEFAULT 0,
  section_80d REAL DEFAULT 0,
  section_80g REAL DEFAULT 0,
  hra_exemption REAL DEFAULT 0,
  lta REAL DEFAULT 0,
  other_exemptions REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, financial_year)
);

-- Reimbursements
CREATE TABLE IF NOT EXISTS reimbursements (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  receipt_url TEXT,
  expense_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_in_payslip_id TEXT REFERENCES payslips(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans and advances
CREATE TABLE IF NOT EXISTS employee_loans (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  loan_type TEXT NOT NULL,
  principal_amount REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  emi_amount REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  remaining_amount REAL,
  remaining_emis INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  loan_id TEXT NOT NULL REFERENCES employee_loans(id),
  payslip_id TEXT REFERENCES payslips(id),
  amount REAL NOT NULL,
  principal_component REAL,
  interest_component REAL,
  payment_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- RECRUITMENT & ATS TABLES
-- ==========================================

-- Job postings
CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT,
  employment_type TEXT DEFAULT 'full_time',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  salary_min REAL,
  salary_max REAL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  skills_required TEXT,
  status TEXT DEFAULT 'draft',
  posted_by TEXT REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  closing_date TEXT,
  positions_count INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  is_remote INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  job_id TEXT REFERENCES job_postings(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  current_company TEXT,
  current_designation TEXT,
  experience_years REAL,
  expected_salary REAL,
  notice_period INTEGER,
  resume_url TEXT,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  source TEXT DEFAULT 'website',
  referral_by TEXT REFERENCES users(id),
  skills TEXT,
  status TEXT DEFAULT 'new',
  stage TEXT DEFAULT 'applied',
  rating INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview schedules
CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  candidate_id TEXT NOT NULL REFERENCES candidates(id),
  job_id TEXT NOT NULL REFERENCES job_postings(id),
  round_number INTEGER DEFAULT 1,
  round_type TEXT DEFAULT 'technical',
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview panelists
CREATE TABLE IF NOT EXISTS interview_panelists (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  is_lead INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview feedback
CREATE TABLE IF NOT EXISTS interview_feedback (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  panelist_id TEXT NOT NULL REFERENCES users(id),
  technical_rating INTEGER,
  communication_rating INTEGER,
  cultural_fit_rating INTEGER,
  overall_rating INTEGER,
  strengths TEXT,
  weaknesses TEXT,
  recommendation TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offer letters
CREATE TABLE IF NOT EXISTS offer_letters (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  candidate_id TEXT NOT NULL REFERENCES candidates(id),
  job_id TEXT NOT NULL REFERENCES job_postings(id),
  offered_salary REAL NOT NULL,
  joining_date TEXT NOT NULL,
  offer_expiry_date TEXT NOT NULL,
  probation_period_months INTEGER DEFAULT 3,
  notice_period_days INTEGER DEFAULT 30,
  benefits TEXT,
  special_conditions TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding templates
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding template tasks
CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  template_id TEXT NOT NULL REFERENCES onboarding_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assigned_to_role TEXT,
  due_days_after_joining INTEGER DEFAULT 0,
  is_mandatory INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- Employee onboarding
CREATE TABLE IF NOT EXISTS employee_onboarding (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  template_id TEXT REFERENCES onboarding_templates(id),
  status TEXT DEFAULT 'in_progress',
  start_date TEXT NOT NULL,
  target_completion_date TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  onboarding_id TEXT NOT NULL REFERENCES employee_onboarding(id),
  template_task_id TEXT REFERENCES onboarding_template_tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assigned_to TEXT REFERENCES users(id),
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by TEXT REFERENCES users(id),
  notes TEXT
);

-- ==========================================
-- LEARNING & DEVELOPMENT TABLES
-- ==========================================

-- Training courses
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  skill_tags TEXT,
  instructor TEXT,
  instructor_id TEXT REFERENCES users(id),
  duration_hours REAL,
  course_type TEXT DEFAULT 'online',
  difficulty_level TEXT DEFAULT 'beginner',
  content_url TEXT,
  thumbnail_url TEXT,
  syllabus TEXT,
  prerequisites TEXT,
  max_participants INTEGER,
  is_mandatory INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course modules
CREATE TABLE IF NOT EXISTS course_modules (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  course_id TEXT NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'video',
  content_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_mandatory INTEGER DEFAULT 1
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  course_id TEXT NOT NULL REFERENCES courses(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'enrolled',
  score REAL,
  certificate_url TEXT,
  UNIQUE(course_id, user_id)
);

-- Module progress
CREATE TABLE IF NOT EXISTS module_progress (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  enrollment_id TEXT NOT NULL REFERENCES course_enrollments(id),
  module_id TEXT NOT NULL REFERENCES course_modules(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'not_started',
  UNIQUE(enrollment_id, module_id)
);

-- Skills inventory
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee skills
CREATE TABLE IF NOT EXISTS employee_skills (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  proficiency_level TEXT DEFAULT 'beginner',
  years_experience REAL,
  is_primary INTEGER DEFAULT 0,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  last_used_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  description TEXT,
  validity_months INTEGER,
  skill_tags TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee certifications
CREATE TABLE IF NOT EXISTS employee_certifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  certification_id TEXT NOT NULL REFERENCES certifications(id),
  credential_id TEXT,
  issue_date TEXT NOT NULL,
  expiry_date TEXT,
  certificate_url TEXT,
  verification_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning paths
CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  skill_tags TEXT,
  estimated_hours REAL,
  difficulty_level TEXT DEFAULT 'intermediate',
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning path courses
CREATE TABLE IF NOT EXISTS learning_path_courses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  learning_path_id TEXT NOT NULL REFERENCES learning_paths(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  order_index INTEGER DEFAULT 0,
  is_mandatory INTEGER DEFAULT 1
);

-- Employee learning paths
CREATE TABLE IF NOT EXISTS employee_learning_paths (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  learning_path_id TEXT NOT NULL REFERENCES learning_paths(id),
  assigned_by TEXT REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  target_completion_date TEXT,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'assigned',
  UNIQUE(user_id, learning_path_id)
);

-- Training sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  course_id TEXT REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  trainer_id TEXT REFERENCES users(id),
  trainer_name TEXT,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  meeting_link TEXT,
  max_participants INTEGER,
  status TEXT DEFAULT 'scheduled',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training session registrations
CREATE TABLE IF NOT EXISTS training_registrations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES training_sessions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'registered',
  attended INTEGER DEFAULT 0,
  feedback_rating INTEGER,
  feedback_comments TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- ==========================================
-- ASSET MANAGEMENT TABLES
-- ==========================================

-- Asset categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  depreciation_rate REAL DEFAULT 0,
  useful_life_years INTEGER,
  parent_category_id TEXT REFERENCES asset_categories(id),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  asset_tag TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES asset_categories(id),
  description TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date TEXT,
  purchase_cost REAL,
  vendor TEXT,
  warranty_end_date TEXT,
  current_value REAL,
  location TEXT,
  status TEXT DEFAULT 'available',
  condition TEXT DEFAULT 'good',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset assignments
CREATE TABLE IF NOT EXISTS asset_assignments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expected_return_date TEXT,
  returned_at TIMESTAMPTZ,
  return_condition TEXT,
  return_notes TEXT,
  status TEXT DEFAULT 'active'
);

-- Asset requests
CREATE TABLE IF NOT EXISTS asset_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT REFERENCES asset_categories(id),
  asset_id TEXT REFERENCES assets(id),
  request_type TEXT DEFAULT 'new',
  reason TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  maintenance_type TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT,
  completed_date TEXT,
  cost REAL,
  vendor TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Software licenses
CREATE TABLE IF NOT EXISTS software_licenses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  software_name TEXT NOT NULL,
  vendor TEXT,
  license_type TEXT DEFAULT 'perpetual',
  license_key TEXT,
  total_seats INTEGER DEFAULT 1,
  used_seats INTEGER DEFAULT 0,
  purchase_date TEXT,
  expiry_date TEXT,
  cost REAL,
  renewal_cost REAL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Software license assignments
CREATE TABLE IF NOT EXISTS license_assignments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  license_id TEXT NOT NULL REFERENCES software_licenses(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

-- ==========================================
-- EXPENSE MANAGEMENT TABLES
-- ==========================================

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  max_amount REAL,
  requires_receipt INTEGER DEFAULT 1,
  requires_approval INTEGER DEFAULT 1,
  parent_category_id TEXT REFERENCES expense_categories(id),
  gl_code TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense policies
CREATE TABLE IF NOT EXISTS expense_policies (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  applies_to TEXT DEFAULT 'all',
  department TEXT,
  designation_level TEXT,
  daily_limit REAL,
  monthly_limit REAL,
  yearly_limit REAL,
  auto_approve_limit REAL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense reports
CREATE TABLE IF NOT EXISTS expense_reports (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  trip_name TEXT,
  trip_start_date TEXT,
  trip_end_date TEXT,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense items
CREATE TABLE IF NOT EXISTS expense_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  report_id TEXT NOT NULL REFERENCES expense_reports(id),
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  expense_date TEXT NOT NULL,
  merchant TEXT,
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  exchange_rate REAL DEFAULT 1,
  receipt_url TEXT,
  is_billable INTEGER DEFAULT 0,
  project_code TEXT,
  client_name TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mileage claims
CREATE TABLE IF NOT EXISTS mileage_claims (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  report_id TEXT NOT NULL REFERENCES expense_reports(id),
  claim_date TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance_km REAL NOT NULL,
  rate_per_km REAL NOT NULL,
  amount REAL NOT NULL,
  purpose TEXT,
  vehicle_type TEXT DEFAULT 'car',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per diem claims
CREATE TABLE IF NOT EXISTS per_diem_claims (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  report_id TEXT NOT NULL REFERENCES expense_reports(id),
  claim_date TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  day_type TEXT DEFAULT 'full',
  breakfast_included INTEGER DEFAULT 0,
  lunch_included INTEGER DEFAULT 0,
  dinner_included INTEGER DEFAULT 0,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ORGANIZATION MANAGEMENT TABLES
-- ==========================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  parent_department_id TEXT REFERENCES departments(id),
  head_user_id TEXT REFERENCES users(id),
  cost_center_id TEXT,
  budget REAL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions/Designations
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  code TEXT UNIQUE,
  department_id TEXT REFERENCES departments(id),
  level INTEGER DEFAULT 1,
  min_salary REAL,
  max_salary REAL,
  description TEXT,
  requirements TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  budget REAL,
  manager_id TEXT REFERENCES users(id),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Office locations
CREATE TABLE IF NOT EXISTS office_locations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  is_headquarters INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reporting hierarchy
CREATE TABLE IF NOT EXISTS reporting_hierarchy (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  reports_to TEXT REFERENCES users(id),
  secondary_reports_to TEXT REFERENCES users(id),
  department_id TEXT REFERENCES departments(id),
  position_id TEXT REFERENCES positions(id),
  location_id TEXT REFERENCES office_locations(id),
  cost_center_id TEXT REFERENCES cost_centers(id),
  effective_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- DOCUMENT MANAGEMENT TABLES
-- ==========================================

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id TEXT REFERENCES document_categories(id),
  access_level TEXT DEFAULT 'all',
  retention_days INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES document_categories(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  version INTEGER DEFAULT 1,
  parent_document_id TEXT REFERENCES documents(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  access_type TEXT DEFAULT 'private',
  department_access TEXT,
  tags TEXT,
  is_template INTEGER DEFAULT 0,
  requires_signature INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document access log
CREATE TABLE IF NOT EXISTS document_access_log (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  document_id TEXT NOT NULL REFERENCES documents(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document shares
CREATE TABLE IF NOT EXISTS document_shares (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  document_id TEXT NOT NULL REFERENCES documents(id),
  shared_with_user_id TEXT REFERENCES users(id),
  shared_with_department TEXT,
  permission TEXT DEFAULT 'view',
  shared_by TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E-signatures
CREATE TABLE IF NOT EXISTS document_signatures (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  document_id TEXT NOT NULL REFERENCES documents(id),
  signer_id TEXT NOT NULL REFERENCES users(id),
  signature_type TEXT DEFAULT 'approval',
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  content TEXT,
  document_id TEXT REFERENCES documents(id),
  version TEXT,
  effective_date TEXT,
  review_date TEXT,
  status TEXT DEFAULT 'draft',
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  requires_acknowledgment INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy acknowledgments
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  policy_id TEXT NOT NULL REFERENCES policies(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  UNIQUE(policy_id, user_id)
);

-- ==========================================
-- COMMUNICATION & ANNOUNCEMENTS TABLES
-- ==========================================

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  target_audience TEXT DEFAULT 'all',
  target_departments TEXT,
  target_locations TEXT,
  author_id TEXT NOT NULL REFERENCES users(id),
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_pinned INTEGER DEFAULT 0,
  requires_acknowledgment INTEGER DEFAULT 0,
  attachment_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement reads
CREATE TABLE IF NOT EXISTS announcement_reads (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  announcement_id TEXT NOT NULL REFERENCES announcements(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  UNIQUE(announcement_id, user_id)
);

-- Company events
CREATE TABLE IF NOT EXISTS company_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meeting',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  virtual_link TEXT,
  is_all_day INTEGER DEFAULT 0,
  is_recurring INTEGER DEFAULT 0,
  recurrence_pattern TEXT,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  target_audience TEXT DEFAULT 'all',
  target_departments TEXT,
  max_participants INTEGER,
  registration_required INTEGER DEFAULT 0,
  registration_deadline TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  event_id TEXT NOT NULL REFERENCES company_events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'registered',
  attended INTEGER DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Employee profiles
CREATE TABLE IF NOT EXISTS employee_profiles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  phone TEXT,
  personal_email TEXT,
  date_of_birth TEXT,
  gender TEXT,
  marital_status TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  current_address TEXT,
  permanent_address TEXT,
  nationality TEXT,
  work_anniversary TEXT,
  bio TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  slack_id TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  language_preference TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Celebration reminders
CREATE TABLE IF NOT EXISTS celebration_reminders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  message_sent INTEGER DEFAULT 0,
  message_sent_at TIMESTAMPTZ,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- OFFBOARDING TABLES
-- ==========================================

-- Exit requests
CREATE TABLE IF NOT EXISTS exit_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  resignation_date TEXT NOT NULL,
  last_working_day TEXT NOT NULL,
  notice_period_days INTEGER,
  exit_type TEXT DEFAULT 'resignation',
  reason_category TEXT,
  reason_details TEXT,
  is_notice_served INTEGER DEFAULT 1,
  notice_buyout_days INTEGER DEFAULT 0,
  notice_buyout_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exit interviews
CREATE TABLE IF NOT EXISTS exit_interviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exit_request_id TEXT NOT NULL REFERENCES exit_requests(id),
  interviewer_id TEXT NOT NULL REFERENCES users(id),
  interview_date TEXT NOT NULL,
  overall_experience_rating INTEGER,
  management_rating INTEGER,
  work_environment_rating INTEGER,
  growth_opportunities_rating INTEGER,
  compensation_rating INTEGER,
  reason_for_leaving TEXT,
  liked_most TEXT,
  improvements_suggested TEXT,
  would_recommend INTEGER,
  would_rejoin INTEGER,
  additional_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clearance items
CREATE TABLE IF NOT EXISTS clearance_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  is_mandatory INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee clearance
CREATE TABLE IF NOT EXISTS employee_clearance (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exit_request_id TEXT NOT NULL REFERENCES exit_requests(id),
  clearance_item_id TEXT NOT NULL REFERENCES clearance_items(id),
  status TEXT DEFAULT 'pending',
  cleared_by TEXT REFERENCES users(id),
  cleared_at TIMESTAMPTZ,
  remarks TEXT,
  UNIQUE(exit_request_id, clearance_item_id)
);

-- Final settlements
CREATE TABLE IF NOT EXISTS final_settlements (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exit_request_id TEXT NOT NULL UNIQUE REFERENCES exit_requests(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  last_salary REAL DEFAULT 0,
  leave_encashment_days INTEGER DEFAULT 0,
  leave_encashment_amount REAL DEFAULT 0,
  bonus_amount REAL DEFAULT 0,
  gratuity_amount REAL DEFAULT 0,
  notice_recovery REAL DEFAULT 0,
  other_recoveries REAL DEFAULT 0,
  recovery_details TEXT,
  gross_settlement REAL DEFAULT 0,
  tds_deduction REAL DEFAULT 0,
  net_settlement REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  calculated_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge transfer
CREATE TABLE IF NOT EXISTS knowledge_transfer (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exit_request_id TEXT NOT NULL REFERENCES exit_requests(id),
  topic TEXT NOT NULL,
  description TEXT,
  transfer_to_user_id TEXT NOT NULL REFERENCES users(id),
  documents TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ANALYTICS & REPORTING TABLES
-- ==========================================

-- Saved reports
CREATE TABLE IF NOT EXISTS saved_reports (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  filters JSONB,
  columns JSONB,
  group_by TEXT,
  sort_by TEXT,
  chart_type TEXT,
  is_public INTEGER DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  report_id TEXT NOT NULL REFERENCES saved_reports(id),
  schedule_type TEXT NOT NULL,
  schedule_day INTEGER,
  schedule_time TEXT,
  recipients TEXT,
  format TEXT DEFAULT 'pdf',
  is_active INTEGER DEFAULT 1,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  widget_type TEXT NOT NULL,
  title TEXT,
  config JSONB,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  is_visible INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  action_url TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',
  notifications_email INTEGER DEFAULT 1,
  notifications_push INTEGER DEFAULT 1,
  notifications_slack INTEGER DEFAULT 0,
  dashboard_layout JSONB,
  sidebar_collapsed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BOOTHPILOT AI TABLES
-- ==========================================

-- Exhibitors (multi-tenancy)
CREATE TABLE IF NOT EXISTS bp_exhibitors (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  industry TEXT,
  website TEXT,
  icp_description TEXT,
  event_name TEXT,
  event_location TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  booth_number TEXT,
  settings_json JSONB,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booth users
CREATE TABLE IF NOT EXISTS bp_users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exhibitor_id TEXT NOT NULL REFERENCES bp_exhibitors(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'staff',
  avatar TEXT,
  is_active INTEGER DEFAULT 1,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS bp_leads (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exhibitor_id TEXT NOT NULL REFERENCES bp_exhibitors(id),
  captured_by_user_id TEXT NOT NULL REFERENCES bp_users(id),
  full_name TEXT NOT NULL,
  company_name TEXT,
  designation TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  interest_tag TEXT,
  notes TEXT,
  capture_source TEXT DEFAULT 'manual',
  badge_scan_data TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qualification questions
CREATE TABLE IF NOT EXISTS bp_qualification_questions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  exhibitor_id TEXT NOT NULL REFERENCES bp_exhibitors(id),
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'text',
  options_json JSONB,
  order_index INTEGER DEFAULT 0,
  is_required INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qualification answers
CREATE TABLE IF NOT EXISTS bp_qualification_answers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  lead_id TEXT NOT NULL REFERENCES bp_leads(id),
  question_id TEXT NOT NULL REFERENCES bp_qualification_questions(id),
  answer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead scores
CREATE TABLE IF NOT EXISTS bp_lead_scores (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  lead_id TEXT NOT NULL REFERENCES bp_leads(id),
  score INTEGER NOT NULL,
  label TEXT NOT NULL,
  reasons_json JSONB,
  risk_flags_json JSONB,
  next_best_action TEXT,
  recommended_message_angle TEXT,
  ai_model TEXT,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE IF NOT EXISTS bp_followups (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  lead_id TEXT NOT NULL REFERENCES bp_leads(id),
  channel TEXT NOT NULL,
  subject TEXT,
  message_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  generated_by_user_id TEXT REFERENCES bp_users(id),
  ai_model TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead activities
CREATE TABLE IF NOT EXISTS bp_lead_activities (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  lead_id TEXT NOT NULL REFERENCES bp_leads(id),
  user_id TEXT NOT NULL REFERENCES bp_users(id),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);

-- Check-ins indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON check_ins(date);

-- Probation indexes
CREATE INDEX IF NOT EXISTS idx_probation_user ON probations(user_id);
CREATE INDEX IF NOT EXISTS idx_probation_status ON probations(status);

-- Appraisal indexes
CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_cycle ON appraisals(cycle_id);

-- KPI indexes
CREATE INDEX IF NOT EXISTS idx_kpis_user ON kpis(user_id);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- BoothPilot indexes
CREATE INDEX IF NOT EXISTS idx_bp_leads_exhibitor ON bp_leads(exhibitor_id);
CREATE INDEX IF NOT EXISTS idx_bp_leads_captured_by ON bp_leads(captured_by_user_id);
CREATE INDEX IF NOT EXISTS idx_bp_leads_status ON bp_leads(status);
CREATE INDEX IF NOT EXISTS idx_bp_users_exhibitor ON bp_users(exhibitor_id);
CREATE INDEX IF NOT EXISTS idx_bp_users_email ON bp_users(email);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
