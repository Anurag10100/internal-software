// ==========================================
// ENTERPRISE HR MANAGEMENT SYSTEM
// Extended Database Schema
// ==========================================

function createExtendedTables(db) {
  console.log('Creating extended enterprise tables...');

  // ==========================================
  // PAYROLL MANAGEMENT TABLES
  // ==========================================

  // Salary structures
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employee salary details
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_salaries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      salary_structure_id TEXT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id)
    )
  `);

  // Payslips
  db.exec(`
    CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      generated_at DATETIME,
      approved_by TEXT,
      approved_at DATETIME,
      paid_at DATETIME,
      payment_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id),
      UNIQUE(user_id, month, year)
    )
  `);

  // Salary revisions
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_revisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      previous_gross REAL,
      new_gross REAL NOT NULL,
      revision_type TEXT DEFAULT 'annual',
      percentage_increase REAL,
      reason TEXT,
      effective_from TEXT NOT NULL,
      approved_by TEXT,
      approved_at DATETIME,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Tax declarations
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_declarations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      submitted_at DATETIME,
      verified_by TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id),
      UNIQUE(user_id, financial_year)
    )
  `);

  // Reimbursements
  db.exec(`
    CREATE TABLE IF NOT EXISTS reimbursements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      receipt_url TEXT,
      expense_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at DATETIME,
      paid_in_payslip_id TEXT,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id),
      FOREIGN KEY (paid_in_payslip_id) REFERENCES payslips(id)
    )
  `);

  // Loans and advances
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Loan repayments
  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_repayments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      payslip_id TEXT,
      amount REAL NOT NULL,
      principal_component REAL,
      interest_component REAL,
      payment_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES employee_loans(id),
      FOREIGN KEY (payslip_id) REFERENCES payslips(id)
    )
  `);

  // ==========================================
  // RECRUITMENT & ATS TABLES
  // ==========================================

  // Job postings
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY,
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
      posted_by TEXT,
      posted_at DATETIME,
      closing_date TEXT,
      positions_count INTEGER DEFAULT 1,
      positions_filled INTEGER DEFAULT 0,
      is_remote INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posted_by) REFERENCES users(id)
    )
  `);

  // Candidates
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      job_id TEXT,
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
      referral_by TEXT,
      skills TEXT,
      status TEXT DEFAULT 'new',
      stage TEXT DEFAULT 'applied',
      rating INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (referral_by) REFERENCES users(id)
    )
  `);

  // Interview schedules
  db.exec(`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      round_number INTEGER DEFAULT 1,
      round_type TEXT DEFAULT 'technical',
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      location TEXT,
      meeting_link TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (job_id) REFERENCES job_postings(id)
    )
  `);

  // Interview panelists
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_panelists (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_lead INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interview_id) REFERENCES interviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Interview feedback
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_feedback (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      panelist_id TEXT NOT NULL,
      technical_rating INTEGER,
      communication_rating INTEGER,
      cultural_fit_rating INTEGER,
      overall_rating INTEGER,
      strengths TEXT,
      weaknesses TEXT,
      recommendation TEXT,
      notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interview_id) REFERENCES interviews(id),
      FOREIGN KEY (panelist_id) REFERENCES users(id)
    )
  `);

  // Offer letters
  db.exec(`
    CREATE TABLE IF NOT EXISTS offer_letters (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      offered_salary REAL NOT NULL,
      joining_date TEXT NOT NULL,
      offer_expiry_date TEXT NOT NULL,
      probation_period_months INTEGER DEFAULT 3,
      notice_period_days INTEGER DEFAULT 30,
      benefits TEXT,
      special_conditions TEXT,
      status TEXT DEFAULT 'draft',
      sent_at DATETIME,
      accepted_at DATETIME,
      rejected_at DATETIME,
      rejection_reason TEXT,
      created_by TEXT,
      approved_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Onboarding tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      assigned_to_role TEXT,
      due_days_after_joining INTEGER DEFAULT 0,
      is_mandatory INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES onboarding_templates(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_onboarding (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT,
      status TEXT DEFAULT 'in_progress',
      start_date TEXT NOT NULL,
      target_completion_date TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (template_id) REFERENCES onboarding_templates(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id TEXT PRIMARY KEY,
      onboarding_id TEXT NOT NULL,
      template_task_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      assigned_to TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending',
      completed_at DATETIME,
      completed_by TEXT,
      notes TEXT,
      FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(id),
      FOREIGN KEY (template_task_id) REFERENCES onboarding_template_tasks(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (completed_by) REFERENCES users(id)
    )
  `);

  // ==========================================
  // LEARNING & DEVELOPMENT TABLES
  // ==========================================

  // Training courses
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      skill_tags TEXT,
      instructor TEXT,
      instructor_id TEXT,
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
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Course modules
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content_type TEXT DEFAULT 'video',
      content_url TEXT,
      duration_minutes INTEGER,
      order_index INTEGER DEFAULT 0,
      is_mandatory INTEGER DEFAULT 1,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Course enrollments
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      progress_percentage INTEGER DEFAULT 0,
      status TEXT DEFAULT 'enrolled',
      score REAL,
      certificate_url TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(course_id, user_id)
    )
  `);

  // Module progress
  db.exec(`
    CREATE TABLE IF NOT EXISTS module_progress (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      started_at DATETIME,
      completed_at DATETIME,
      time_spent_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'not_started',
      FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id),
      FOREIGN KEY (module_id) REFERENCES course_modules(id),
      UNIQUE(enrollment_id, module_id)
    )
  `);

  // Skills inventory
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employee skills
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      proficiency_level TEXT DEFAULT 'beginner',
      years_experience REAL,
      is_primary INTEGER DEFAULT 0,
      verified_by TEXT,
      verified_at DATETIME,
      last_used_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      FOREIGN KEY (verified_by) REFERENCES users(id),
      UNIQUE(user_id, skill_id)
    )
  `);

  // Certifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS certifications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      issuing_organization TEXT NOT NULL,
      description TEXT,
      validity_months INTEGER,
      skill_tags TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employee certifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_certifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      certification_id TEXT NOT NULL,
      credential_id TEXT,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      certificate_url TEXT,
      verification_url TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (certification_id) REFERENCES certifications(id)
    )
  `);

  // Learning paths
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      target_role TEXT,
      skill_tags TEXT,
      estimated_hours REAL,
      difficulty_level TEXT DEFAULT 'intermediate',
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Learning path courses
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_path_courses (
      id TEXT PRIMARY KEY,
      learning_path_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      is_mandatory INTEGER DEFAULT 1,
      FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Employee learning paths
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_learning_paths (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      learning_path_id TEXT NOT NULL,
      assigned_by TEXT,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      target_completion_date TEXT,
      completed_at DATETIME,
      progress_percentage INTEGER DEFAULT 0,
      status TEXT DEFAULT 'assigned',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id),
      UNIQUE(user_id, learning_path_id)
    )
  `);

  // Training calendar
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      trainer_id TEXT,
      trainer_name TEXT,
      session_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      meeting_link TEXT,
      max_participants INTEGER,
      status TEXT DEFAULT 'scheduled',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (trainer_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Training session registrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_registrations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'registered',
      attended INTEGER DEFAULT 0,
      feedback_rating INTEGER,
      feedback_comments TEXT,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES training_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(session_id, user_id)
    )
  `);

  // ==========================================
  // ASSET MANAGEMENT TABLES
  // ==========================================

  // Asset categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      depreciation_rate REAL DEFAULT 0,
      useful_life_years INTEGER,
      parent_category_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_category_id) REFERENCES asset_categories(id)
    )
  `);

  // Assets
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_tag TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES asset_categories(id)
    )
  `);

  // Asset assignments
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_assignments (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expected_return_date TEXT,
      returned_at DATETIME,
      return_condition TEXT,
      return_notes TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    )
  `);

  // Asset requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      asset_id TEXT,
      request_type TEXT DEFAULT 'new',
      reason TEXT NOT NULL,
      urgency TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at DATETIME,
      fulfilled_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES asset_categories(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Asset maintenance
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_maintenance (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      maintenance_type TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT,
      completed_date TEXT,
      cost REAL,
      vendor TEXT,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Software licenses
  db.exec(`
    CREATE TABLE IF NOT EXISTS software_licenses (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Software license assignments
  db.exec(`
    CREATE TABLE IF NOT EXISTS license_assignments (
      id TEXT PRIMARY KEY,
      license_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (license_id) REFERENCES software_licenses(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    )
  `);

  // ==========================================
  // EXPENSE MANAGEMENT TABLES
  // ==========================================

  // Expense categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      max_amount REAL,
      requires_receipt INTEGER DEFAULT 1,
      requires_approval INTEGER DEFAULT 1,
      parent_category_id TEXT,
      gl_code TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id)
    )
  `);

  // Expense policies
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_policies (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Expense reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      trip_name TEXT,
      trip_start_date TEXT,
      trip_end_date TEXT,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      submitted_at DATETIME,
      approved_by TEXT,
      approved_at DATETIME,
      paid_at DATETIME,
      payment_reference TEXT,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Expense items
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES expense_reports(id),
      FOREIGN KEY (category_id) REFERENCES expense_categories(id)
    )
  `);

  // Mileage claims
  db.exec(`
    CREATE TABLE IF NOT EXISTS mileage_claims (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      distance_km REAL NOT NULL,
      rate_per_km REAL NOT NULL,
      amount REAL NOT NULL,
      purpose TEXT,
      vehicle_type TEXT DEFAULT 'car',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES expense_reports(id)
    )
  `);

  // Per diem claims
  db.exec(`
    CREATE TABLE IF NOT EXISTS per_diem_claims (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT DEFAULT 'India',
      day_type TEXT DEFAULT 'full',
      breakfast_included INTEGER DEFAULT 0,
      lunch_included INTEGER DEFAULT 0,
      dinner_included INTEGER DEFAULT 0,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES expense_reports(id)
    )
  `);

  // ==========================================
  // ORGANIZATION MANAGEMENT TABLES
  // ==========================================

  // Departments
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      description TEXT,
      parent_department_id TEXT,
      head_user_id TEXT,
      cost_center_id TEXT,
      budget REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_department_id) REFERENCES departments(id),
      FOREIGN KEY (head_user_id) REFERENCES users(id)
    )
  `);

  // Positions/Designations
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT UNIQUE,
      department_id TEXT,
      level INTEGER DEFAULT 1,
      min_salary REAL,
      max_salary REAL,
      description TEXT,
      requirements TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Cost centers
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      budget REAL,
      manager_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  // Office locations
  db.exec(`
    CREATE TABLE IF NOT EXISTS office_locations (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Reporting hierarchy (who reports to whom)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reporting_hierarchy (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      reports_to TEXT,
      secondary_reports_to TEXT,
      department_id TEXT,
      position_id TEXT,
      location_id TEXT,
      cost_center_id TEXT,
      effective_from TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reports_to) REFERENCES users(id),
      FOREIGN KEY (secondary_reports_to) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (location_id) REFERENCES office_locations(id),
      FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
    )
  `);

  // ==========================================
  // DOCUMENT MANAGEMENT TABLES
  // ==========================================

  // Document categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_category_id TEXT,
      access_level TEXT DEFAULT 'all',
      retention_days INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_category_id) REFERENCES document_categories(id)
    )
  `);

  // Documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      version INTEGER DEFAULT 1,
      parent_document_id TEXT,
      owner_id TEXT NOT NULL,
      access_type TEXT DEFAULT 'private',
      department_access TEXT,
      tags TEXT,
      is_template INTEGER DEFAULT 0,
      requires_signature INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      archived_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES document_categories(id),
      FOREIGN KEY (parent_document_id) REFERENCES documents(id),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  // Document access log
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_access_log (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Document shares
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      shared_with_user_id TEXT,
      shared_with_department TEXT,
      permission TEXT DEFAULT 'view',
      shared_by TEXT NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
      FOREIGN KEY (shared_by) REFERENCES users(id)
    )
  `);

  // E-signatures
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_signatures (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      signer_id TEXT NOT NULL,
      signature_type TEXT DEFAULT 'approval',
      status TEXT DEFAULT 'pending',
      signed_at DATETIME,
      ip_address TEXT,
      notes TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (signer_id) REFERENCES users(id)
    )
  `);

  // Policy documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      description TEXT,
      content TEXT,
      document_id TEXT,
      version TEXT,
      effective_date TEXT,
      review_date TEXT,
      status TEXT DEFAULT 'draft',
      approved_by TEXT,
      approved_at DATETIME,
      requires_acknowledgment INTEGER DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (approved_by) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Policy acknowledgments
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_acknowledgments (
      id TEXT PRIMARY KEY,
      policy_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      acknowledged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (policy_id) REFERENCES policies(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(policy_id, user_id)
    )
  `);

  // ==========================================
  // COMMUNICATION & ANNOUNCEMENTS TABLES
  // ==========================================

  // Announcements
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'normal',
      target_audience TEXT DEFAULT 'all',
      target_departments TEXT,
      target_locations TEXT,
      author_id TEXT NOT NULL,
      publish_at DATETIME,
      expires_at DATETIME,
      is_pinned INTEGER DEFAULT 0,
      requires_acknowledgment INTEGER DEFAULT 0,
      attachment_url TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Announcement reads
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_at DATETIME,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(announcement_id, user_id)
    )
  `);

  // Company events
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_events (
      id TEXT PRIMARY KEY,
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
      organizer_id TEXT NOT NULL,
      target_audience TEXT DEFAULT 'all',
      target_departments TEXT,
      max_participants INTEGER,
      registration_required INTEGER DEFAULT 0,
      registration_deadline TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  // Event registrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'registered',
      attended INTEGER DEFAULT 0,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES company_events(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(event_id, user_id)
    )
  `);

  // Employee directory (extended profile)
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Birthday/Anniversary calendar
  db.exec(`
    CREATE TABLE IF NOT EXISTS celebration_reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      message_sent INTEGER DEFAULT 0,
      message_sent_at DATETIME,
      year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ==========================================
  // OFFBOARDING TABLES
  // ==========================================

  // Exit requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS exit_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Exit interview
  db.exec(`
    CREATE TABLE IF NOT EXISTS exit_interviews (
      id TEXT PRIMARY KEY,
      exit_request_id TEXT NOT NULL,
      interviewer_id TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exit_request_id) REFERENCES exit_requests(id),
      FOREIGN KEY (interviewer_id) REFERENCES users(id)
    )
  `);

  // Clearance checklist
  db.exec(`
    CREATE TABLE IF NOT EXISTS clearance_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      description TEXT,
      is_mandatory INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employee clearance
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_clearance (
      id TEXT PRIMARY KEY,
      exit_request_id TEXT NOT NULL,
      clearance_item_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      cleared_by TEXT,
      cleared_at DATETIME,
      remarks TEXT,
      FOREIGN KEY (exit_request_id) REFERENCES exit_requests(id),
      FOREIGN KEY (clearance_item_id) REFERENCES clearance_items(id),
      FOREIGN KEY (cleared_by) REFERENCES users(id),
      UNIQUE(exit_request_id, clearance_item_id)
    )
  `);

  // Final settlement
  db.exec(`
    CREATE TABLE IF NOT EXISTS final_settlements (
      id TEXT PRIMARY KEY,
      exit_request_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
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
      calculated_at DATETIME,
      approved_by TEXT,
      approved_at DATETIME,
      paid_at DATETIME,
      payment_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exit_request_id) REFERENCES exit_requests(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Knowledge transfer
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_transfer (
      id TEXT PRIMARY KEY,
      exit_request_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      description TEXT,
      transfer_to_user_id TEXT NOT NULL,
      documents TEXT,
      status TEXT DEFAULT 'pending',
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exit_request_id) REFERENCES exit_requests(id),
      FOREIGN KEY (transfer_to_user_id) REFERENCES users(id)
    )
  `);

  // ==========================================
  // ANALYTICS & REPORTING TABLES
  // ==========================================

  // Saved reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      report_type TEXT NOT NULL,
      filters TEXT,
      columns TEXT,
      group_by TEXT,
      sort_by TEXT,
      chart_type TEXT,
      is_public INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Scheduled reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_day INTEGER,
      schedule_time TEXT,
      recipients TEXT,
      format TEXT DEFAULT 'pdf',
      is_active INTEGER DEFAULT 1,
      last_run_at DATETIME,
      next_run_at DATETIME,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES saved_reports(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Dashboard widgets
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      widget_type TEXT NOT NULL,
      title TEXT,
      config TEXT,
      position_x INTEGER DEFAULT 0,
      position_y INTEGER DEFAULT 0,
      width INTEGER DEFAULT 1,
      height INTEGER DEFAULT 1,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Audit logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // System notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      action_url TEXT,
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      time_format TEXT DEFAULT '12h',
      notifications_email INTEGER DEFAULT 1,
      notifications_push INTEGER DEFAULT 1,
      notifications_slack INTEGER DEFAULT 0,
      dashboard_layout TEXT,
      sidebar_collapsed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Extended enterprise tables created successfully!');
}

function seedExtendedData(db) {
  console.log('Seeding extended enterprise data...');

  // Check if we've already seeded extended data
  const checkSeeded = db.prepare("SELECT COUNT(*) as count FROM departments").get();
  if (checkSeeded.count > 0) {
    console.log('Extended data already seeded, skipping...');
    return;
  }

  // Seed departments
  const insertDept = db.prepare(`
    INSERT INTO departments (id, name, code, description, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  insertDept.run('dept-1', 'Management', 'MGMT', 'Executive management and leadership');
  insertDept.run('dept-2', 'Human Resources', 'HR', 'HR operations and employee management');
  insertDept.run('dept-3', 'Technology', 'TECH', 'Software development and IT');
  insertDept.run('dept-4', 'Design', 'DESIGN', '2D and 3D design, creative services');
  insertDept.run('dept-5', 'Content', 'CONTENT', 'Content writing and copywriting');
  insertDept.run('dept-6', 'Finance', 'FIN', 'Accounting and financial operations');
  insertDept.run('dept-7', 'Marketing', 'MKT', 'Marketing and communications');
  insertDept.run('dept-8', 'Operations', 'OPS', 'Business operations and logistics');

  // Seed positions
  const insertPos = db.prepare(`
    INSERT INTO positions (id, title, code, department_id, level, min_salary, max_salary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPos.run('pos-1', 'CEO', 'CEO', 'dept-1', 10, 5000000, 10000000);
  insertPos.run('pos-2', 'CTO', 'CTO', 'dept-3', 9, 4000000, 8000000);
  insertPos.run('pos-3', 'HR Manager', 'HRM', 'dept-2', 7, 1200000, 2000000);
  insertPos.run('pos-4', 'Tech Lead', 'TL', 'dept-3', 6, 1500000, 2500000);
  insertPos.run('pos-5', 'Senior Developer', 'SD', 'dept-3', 5, 1000000, 1800000);
  insertPos.run('pos-6', 'Developer', 'DEV', 'dept-3', 4, 600000, 1200000);
  insertPos.run('pos-7', 'Graphic Designer', 'GD', 'dept-4', 4, 500000, 1000000);
  insertPos.run('pos-8', '3D Artist', '3DA', 'dept-4', 4, 600000, 1200000);
  insertPos.run('pos-9', 'Content Writer', 'CW', 'dept-5', 4, 400000, 800000);
  insertPos.run('pos-10', 'Copywriter', 'CPW', 'dept-5', 4, 400000, 900000);

  // Seed office locations
  const insertLoc = db.prepare(`
    INSERT INTO office_locations (id, name, code, address, city, state, country, is_headquarters)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLoc.run('loc-1', 'Gurugram HQ', 'GGN-HQ', 'Tower B, Cyber Hub', 'Gurugram', 'Haryana', 'India', 1);
  insertLoc.run('loc-2', 'Delhi Office', 'DEL', 'Connaught Place', 'New Delhi', 'Delhi', 'India', 0);

  // Seed cost centers
  const insertCC = db.prepare(`
    INSERT INTO cost_centers (id, name, code, description, budget)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertCC.run('cc-1', 'Corporate', 'CORP', 'Corporate overhead', 5000000);
  insertCC.run('cc-2', 'Product Development', 'PROD', 'Product and tech development', 10000000);
  insertCC.run('cc-3', 'Creative Services', 'CREATIVE', 'Design and content', 3000000);
  insertCC.run('cc-4', 'Client Projects', 'CLIENT', 'Client billable projects', 15000000);

  // Seed salary structures
  const insertSS = db.prepare(`
    INSERT INTO salary_structures (id, name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSS.run('ss-1', 'Standard Structure', 'Default salary structure for all employees', 40, 20, 10, 30, 12);
  insertSS.run('ss-2', 'Executive Structure', 'Salary structure for senior management', 50, 25, 0, 25, 12);

  // Seed expense categories
  const insertEC = db.prepare(`
    INSERT INTO expense_categories (id, name, description, max_amount, requires_receipt)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertEC.run('ec-1', 'Travel', 'Travel and transportation expenses', 50000, 1);
  insertEC.run('ec-2', 'Accommodation', 'Hotel and lodging expenses', 10000, 1);
  insertEC.run('ec-3', 'Meals', 'Food and beverage expenses', 5000, 1);
  insertEC.run('ec-4', 'Office Supplies', 'Stationery and office supplies', 2000, 1);
  insertEC.run('ec-5', 'Communication', 'Phone, internet, courier', 3000, 0);
  insertEC.run('ec-6', 'Professional Development', 'Training and certifications', 100000, 1);
  insertEC.run('ec-7', 'Client Entertainment', 'Client meetings and events', 10000, 1);
  insertEC.run('ec-8', 'Miscellaneous', 'Other business expenses', 5000, 1);

  // Seed asset categories
  const insertAC = db.prepare(`
    INSERT INTO asset_categories (id, name, description, depreciation_rate, useful_life_years)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAC.run('ac-1', 'Laptops', 'Laptop computers', 33.33, 3);
  insertAC.run('ac-2', 'Desktops', 'Desktop computers', 33.33, 3);
  insertAC.run('ac-3', 'Monitors', 'Computer monitors', 20, 5);
  insertAC.run('ac-4', 'Mobile Devices', 'Phones and tablets', 33.33, 3);
  insertAC.run('ac-5', 'Furniture', 'Office furniture', 10, 10);
  insertAC.run('ac-6', 'Peripherals', 'Keyboards, mice, headsets', 50, 2);
  insertAC.run('ac-7', 'Networking', 'Routers, switches', 20, 5);

  // Seed some assets
  const insertAsset = db.prepare(`
    INSERT INTO assets (id, asset_tag, name, category_id, brand, model, serial_number, purchase_date, purchase_cost, status, condition)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAsset.run('asset-1', 'LAP-001', 'MacBook Pro 14"', 'ac-1', 'Apple', 'MacBook Pro M3', 'SN123456', '2025-01-01', 250000, 'assigned', 'excellent');
  insertAsset.run('asset-2', 'LAP-002', 'MacBook Pro 16"', 'ac-1', 'Apple', 'MacBook Pro M3 Max', 'SN123457', '2025-01-01', 350000, 'assigned', 'excellent');
  insertAsset.run('asset-3', 'LAP-003', 'Dell XPS 15', 'ac-1', 'Dell', 'XPS 15 9530', 'SN223456', '2025-02-15', 180000, 'available', 'excellent');
  insertAsset.run('asset-4', 'MON-001', 'LG UltraWide 34"', 'ac-3', 'LG', '34WN80C-B', 'SN334567', '2025-01-10', 45000, 'assigned', 'good');
  insertAsset.run('asset-5', 'MON-002', 'Dell U2722D', 'ac-3', 'Dell', 'U2722D', 'SN334568', '2025-01-10', 35000, 'available', 'good');
  insertAsset.run('asset-6', 'PHN-001', 'iPhone 15 Pro', 'ac-4', 'Apple', 'iPhone 15 Pro', 'SN445678', '2025-03-01', 130000, 'assigned', 'excellent');

  // Seed software licenses
  const insertLicense = db.prepare(`
    INSERT INTO software_licenses (id, software_name, vendor, license_type, total_seats, used_seats, purchase_date, expiry_date, cost, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLicense.run('lic-1', 'Adobe Creative Cloud', 'Adobe', 'subscription', 10, 5, '2025-01-01', '2026-01-01', 500000, 'active');
  insertLicense.run('lic-2', 'Microsoft 365 Business', 'Microsoft', 'subscription', 20, 12, '2025-01-01', '2026-01-01', 200000, 'active');
  insertLicense.run('lic-3', 'Figma Enterprise', 'Figma', 'subscription', 8, 4, '2025-01-01', '2026-01-01', 150000, 'active');
  insertLicense.run('lic-4', 'Slack Business+', 'Slack', 'subscription', 25, 15, '2025-01-01', '2026-01-01', 100000, 'active');
  insertLicense.run('lic-5', 'Autodesk Maya', 'Autodesk', 'subscription', 3, 2, '2025-01-01', '2026-01-01', 300000, 'active');

  // Seed skills
  const insertSkill = db.prepare(`
    INSERT INTO skills (id, name, category, description)
    VALUES (?, ?, ?, ?)
  `);

  insertSkill.run('skill-1', 'JavaScript', 'Programming', 'JavaScript programming language');
  insertSkill.run('skill-2', 'TypeScript', 'Programming', 'TypeScript programming language');
  insertSkill.run('skill-3', 'React', 'Frontend', 'React.js framework');
  insertSkill.run('skill-4', 'Node.js', 'Backend', 'Node.js runtime');
  insertSkill.run('skill-5', 'Python', 'Programming', 'Python programming language');
  insertSkill.run('skill-6', 'SQL', 'Database', 'SQL databases');
  insertSkill.run('skill-7', 'Adobe Photoshop', 'Design', 'Adobe Photoshop');
  insertSkill.run('skill-8', 'Adobe Illustrator', 'Design', 'Adobe Illustrator');
  insertSkill.run('skill-9', 'Figma', 'Design', 'Figma design tool');
  insertSkill.run('skill-10', 'Blender', '3D', 'Blender 3D software');
  insertSkill.run('skill-11', 'Maya', '3D', 'Autodesk Maya');
  insertSkill.run('skill-12', 'Content Writing', 'Content', 'Content writing skills');
  insertSkill.run('skill-13', 'Copywriting', 'Content', 'Marketing copywriting');
  insertSkill.run('skill-14', 'SEO', 'Marketing', 'Search engine optimization');
  insertSkill.run('skill-15', 'Project Management', 'Management', 'Project management skills');

  // Seed certifications
  const insertCert = db.prepare(`
    INSERT INTO certifications (id, name, issuing_organization, description, validity_months, skill_tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertCert.run('cert-1', 'AWS Solutions Architect', 'Amazon Web Services', 'AWS certified solutions architect', 36, 'cloud,aws');
  insertCert.run('cert-2', 'Google Cloud Professional', 'Google', 'GCP professional certification', 24, 'cloud,gcp');
  insertCert.run('cert-3', 'PMP', 'PMI', 'Project Management Professional', 36, 'management,project');
  insertCert.run('cert-4', 'Scrum Master', 'Scrum Alliance', 'Certified Scrum Master', 24, 'agile,scrum');
  insertCert.run('cert-5', 'Adobe Certified Expert', 'Adobe', 'Adobe Creative Suite expert', 24, 'design,adobe');

  // Seed courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (id, title, description, category, skill_tags, duration_hours, course_type, difficulty_level, is_mandatory, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertCourse.run('course-1', 'Company Orientation', 'Introduction to company policies and culture', 'Onboarding', 'company,culture', 4, 'in_person', 'beginner', 1);
  insertCourse.run('course-2', 'Data Security & Privacy', 'Information security best practices', 'Compliance', 'security,compliance', 2, 'online', 'beginner', 1);
  insertCourse.run('course-3', 'React Fundamentals', 'Learn React.js from scratch', 'Technical', 'react,frontend,javascript', 20, 'online', 'beginner', 0);
  insertCourse.run('course-4', 'Advanced TypeScript', 'Master TypeScript for large applications', 'Technical', 'typescript,programming', 15, 'online', 'advanced', 0);
  insertCourse.run('course-5', 'UI/UX Design Principles', 'Design thinking and user experience', 'Design', 'design,ux,ui', 12, 'online', 'intermediate', 0);
  insertCourse.run('course-6', 'Leadership Essentials', 'Leadership and management skills', 'Management', 'leadership,management', 8, 'in_person', 'intermediate', 0);
  insertCourse.run('course-7', 'Effective Communication', 'Business communication skills', 'Soft Skills', 'communication,soft_skills', 6, 'online', 'beginner', 0);

  // Seed learning paths
  const insertLP = db.prepare(`
    INSERT INTO learning_paths (id, title, description, target_role, skill_tags, estimated_hours, difficulty_level, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertLP.run('lp-1', 'New Employee Onboarding', 'Essential training for new hires', 'All', 'onboarding,compliance', 10, 'beginner');
  insertLP.run('lp-2', 'Frontend Developer Path', 'Become a proficient frontend developer', 'Developer', 'frontend,react,typescript', 50, 'intermediate');
  insertLP.run('lp-3', 'Design Excellence', 'Master design tools and principles', 'Designer', 'design,figma,ui,ux', 40, 'intermediate');
  insertLP.run('lp-4', 'Leadership Track', 'Prepare for management roles', 'Manager', 'leadership,management', 30, 'advanced');

  // Seed document categories
  const insertDocCat = db.prepare(`
    INSERT INTO document_categories (id, name, description, access_level)
    VALUES (?, ?, ?, ?)
  `);

  insertDocCat.run('doc-cat-1', 'Policies', 'Company policies and procedures', 'all');
  insertDocCat.run('doc-cat-2', 'Templates', 'Document templates', 'all');
  insertDocCat.run('doc-cat-3', 'HR Documents', 'HR related documents', 'hr');
  insertDocCat.run('doc-cat-4', 'Finance Documents', 'Financial documents', 'finance');
  insertDocCat.run('doc-cat-5', 'Employee Documents', 'Personal employee documents', 'private');
  insertDocCat.run('doc-cat-6', 'Training Materials', 'Training and learning resources', 'all');

  // Seed clearance items
  const insertClearance = db.prepare(`
    INSERT INTO clearance_items (id, name, department, description, is_mandatory, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertClearance.run('cl-1', 'Return Laptop', 'IT', 'Return company laptop in working condition', 1, 1);
  insertClearance.run('cl-2', 'Return ID Card', 'HR', 'Return employee ID card', 1, 2);
  insertClearance.run('cl-3', 'Return Access Card', 'Admin', 'Return building access card', 1, 3);
  insertClearance.run('cl-4', 'Email Account Deactivation', 'IT', 'Deactivate company email account', 1, 4);
  insertClearance.run('cl-5', 'Software License Revocation', 'IT', 'Revoke all software licenses', 1, 5);
  insertClearance.run('cl-6', 'Knowledge Transfer', 'Department', 'Complete knowledge transfer documentation', 1, 6);
  insertClearance.run('cl-7', 'Library Books Return', 'Admin', 'Return any borrowed library books', 0, 7);
  insertClearance.run('cl-8', 'Loan/Advance Settlement', 'Finance', 'Settle any pending loans or advances', 1, 8);
  insertClearance.run('cl-9', 'Expense Reports Submission', 'Finance', 'Submit all pending expense reports', 1, 9);
  insertClearance.run('cl-10', 'Exit Interview', 'HR', 'Complete exit interview', 1, 10);

  // Seed onboarding template
  const insertOnboardTemplate = db.prepare(`
    INSERT INTO onboarding_templates (id, name, department, description, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  insertOnboardTemplate.run('onb-temp-1', 'Standard Onboarding', null, 'Standard onboarding process for all employees');
  insertOnboardTemplate.run('onb-temp-2', 'Tech Onboarding', 'Tech', 'Extended onboarding for tech team members');
  insertOnboardTemplate.run('onb-temp-3', 'Design Onboarding', 'Design', 'Extended onboarding for design team members');

  // Seed onboarding template tasks
  const insertOnboardTask = db.prepare(`
    INSERT INTO onboarding_template_tasks (id, template_id, title, description, category, assigned_to_role, due_days_after_joining, is_mandatory, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Standard onboarding tasks
  insertOnboardTask.run('obt-1', 'onb-temp-1', 'Complete paperwork', 'Submit all joining documents', 'Documentation', 'HR', 1, 1, 1);
  insertOnboardTask.run('obt-2', 'onb-temp-1', 'IT setup', 'Laptop, email, and software setup', 'IT', 'IT', 1, 1, 2);
  insertOnboardTask.run('obt-3', 'onb-temp-1', 'Office tour', 'Tour of office facilities', 'Orientation', 'HR', 1, 1, 3);
  insertOnboardTask.run('obt-4', 'onb-temp-1', 'Meet the team', 'Introduction to team members', 'Orientation', 'Manager', 2, 1, 4);
  insertOnboardTask.run('obt-5', 'onb-temp-1', 'Complete security training', 'Data security awareness training', 'Training', 'Employee', 7, 1, 5);
  insertOnboardTask.run('obt-6', 'onb-temp-1', 'Review company policies', 'Read and acknowledge company policies', 'Compliance', 'Employee', 3, 1, 6);
  insertOnboardTask.run('obt-7', 'onb-temp-1', '30-day check-in', 'First month review with manager', 'Review', 'Manager', 30, 1, 7);

  console.log('Extended enterprise data seeded successfully!');
}

module.exports = { createExtendedTables, seedExtendedData };
