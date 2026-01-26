-- ==========================================
-- HRMS + BOOTHPILOT SEED DATA
-- Run after initial schema migration
-- ==========================================

-- Note: Passwords are hashed with bcrypt
-- admin123 = $2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO
-- user123 = $2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM

-- ==========================================
-- SEED USERS
-- ==========================================

INSERT INTO users (id, name, email, password, department, designation, role) VALUES
  ('admin-1', 'Sachin Talwar', 'admin@wowevents.com', '$2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO', 'Management', 'CEO', 'admin'),
  ('admin-2', 'Priya Sharma', 'hr@wowevents.com', '$2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO', 'HR', 'HR Manager', 'admin'),
  ('user-1', 'Amit Talwar', 'amit@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', 'Tech', 'Tech Lead', 'employee'),
  ('user-2', 'Neeti Choudhary', 'neeti@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', 'Concept & Copy', 'Content Writer', 'employee'),
  ('user-3', 'Animesh', 'animesh@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', '2D', 'Graphic Designer', 'employee'),
  ('user-4', 'Rahul Kumar', 'rahul@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', '3D', '3D Artist', 'employee'),
  ('user-5', 'Tarun Fuloria', 'tarun@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', 'Tech', 'Developer', 'employee'),
  ('user-6', 'Mahima', 'mahima@wowevents.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', 'Concept & Copy', 'Copywriter', 'employee')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- SEED TEAM MEMBERS
-- ==========================================

INSERT INTO team_members (id, user_id, profile, in_probation, status) VALUES
  ('tm-1', 'admin-1', 'Admin', 0, 'Active'),
  ('tm-2', 'admin-2', 'Admin', 0, 'Active'),
  ('tm-3', 'user-1', 'Manager', 0, 'Active'),
  ('tm-4', 'user-2', 'Standard', 0, 'Active'),
  ('tm-5', 'user-3', 'Standard', 0, 'Active'),
  ('tm-6', 'user-4', 'Standard', 1, 'Active'),
  ('tm-7', 'user-5', 'Standard', 0, 'Active'),
  ('tm-8', 'user-6', 'Standard', 1, 'Active')
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- SEED HRMS SETTINGS
-- ==========================================

INSERT INTO hrms_settings (id, late_time, half_day_time, settings_json) VALUES
  (1, '10:30 AM', '11:00 AM', '{
    "locationOptions": [
      {"id": "1", "name": "In Office (Gurugram)", "isVisible": true},
      {"id": "2", "name": "In Office (Delhi)", "isVisible": true},
      {"id": "3", "name": "In Meeting", "isVisible": true},
      {"id": "4", "name": "Work From Home", "isVisible": true},
      {"id": "5", "name": "At Event", "isVisible": true}
    ],
    "leaveTypes": [
      {"id": "1", "name": "Casual Leave", "daysPerYear": 7, "requiresDocument": false, "isActive": true},
      {"id": "2", "name": "Earned Leaves", "daysPerYear": 12, "requiresDocument": false, "isActive": true},
      {"id": "3", "name": "Sick Leave", "daysPerYear": 7, "requiresDocument": true, "isActive": true},
      {"id": "4", "name": "Unpaid Leave", "daysPerYear": "unlimited", "requiresDocument": false, "isActive": true},
      {"id": "5", "name": "Work from Home", "daysPerYear": "unlimited", "requiresDocument": false, "isActive": true}
    ],
    "weeklyOffSettings": {
      "sunday": "both_weeks",
      "saturday": "week1_only"
    },
    "holidays": [
      {"id": "1", "name": "New Year", "date": "2026-01-01"},
      {"id": "2", "name": "Republic Day", "date": "2026-01-26"},
      {"id": "3", "name": "Holi", "date": "2026-03-04"},
      {"id": "4", "name": "Independence Day", "date": "2026-08-15"},
      {"id": "5", "name": "Diwali", "date": "2026-11-08"}
    ]
  }'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  late_time = EXCLUDED.late_time,
  half_day_time = EXCLUDED.half_day_time,
  settings_json = EXCLUDED.settings_json;

-- ==========================================
-- SEED DEPARTMENTS
-- ==========================================

INSERT INTO departments (id, name, code, description, is_active) VALUES
  ('dept-1', 'Management', 'MGMT', 'Executive management and leadership', 1),
  ('dept-2', 'Human Resources', 'HR', 'HR operations and employee management', 1),
  ('dept-3', 'Technology', 'TECH', 'Software development and IT', 1),
  ('dept-4', 'Design', 'DESIGN', '2D and 3D design, creative services', 1),
  ('dept-5', 'Content', 'CONTENT', 'Content writing and copywriting', 1),
  ('dept-6', 'Finance', 'FIN', 'Accounting and financial operations', 1),
  ('dept-7', 'Marketing', 'MKT', 'Marketing and communications', 1),
  ('dept-8', 'Operations', 'OPS', 'Business operations and logistics', 1)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- SEED POSITIONS
-- ==========================================

INSERT INTO positions (id, title, code, department_id, level, min_salary, max_salary) VALUES
  ('pos-1', 'CEO', 'CEO', 'dept-1', 10, 5000000, 10000000),
  ('pos-2', 'CTO', 'CTO', 'dept-3', 9, 4000000, 8000000),
  ('pos-3', 'HR Manager', 'HRM', 'dept-2', 7, 1200000, 2000000),
  ('pos-4', 'Tech Lead', 'TL', 'dept-3', 6, 1500000, 2500000),
  ('pos-5', 'Senior Developer', 'SD', 'dept-3', 5, 1000000, 1800000),
  ('pos-6', 'Developer', 'DEV', 'dept-3', 4, 600000, 1200000),
  ('pos-7', 'Graphic Designer', 'GD', 'dept-4', 4, 500000, 1000000),
  ('pos-8', '3D Artist', '3DA', 'dept-4', 4, 600000, 1200000),
  ('pos-9', 'Content Writer', 'CW', 'dept-5', 4, 400000, 800000),
  ('pos-10', 'Copywriter', 'CPW', 'dept-5', 4, 400000, 900000)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- SEED OFFICE LOCATIONS
-- ==========================================

INSERT INTO office_locations (id, name, code, address, city, state, country, is_headquarters) VALUES
  ('loc-1', 'Gurugram HQ', 'GGN-HQ', 'Tower B, Cyber Hub', 'Gurugram', 'Haryana', 'India', 1),
  ('loc-2', 'Delhi Office', 'DEL', 'Connaught Place', 'New Delhi', 'Delhi', 'India', 0)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- SEED SALARY STRUCTURES
-- ==========================================

INSERT INTO salary_structures (id, name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage) VALUES
  ('ss-1', 'Standard Structure', 'Default salary structure for all employees', 40, 20, 10, 30, 12),
  ('ss-2', 'Executive Structure', 'Salary structure for senior management', 50, 25, 0, 25, 12)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED EXPENSE CATEGORIES
-- ==========================================

INSERT INTO expense_categories (id, name, description, max_amount, requires_receipt) VALUES
  ('ec-1', 'Travel', 'Travel and transportation expenses', 50000, 1),
  ('ec-2', 'Accommodation', 'Hotel and lodging expenses', 10000, 1),
  ('ec-3', 'Meals', 'Food and beverage expenses', 5000, 1),
  ('ec-4', 'Office Supplies', 'Stationery and office supplies', 2000, 1),
  ('ec-5', 'Communication', 'Phone, internet, courier', 3000, 0),
  ('ec-6', 'Professional Development', 'Training and certifications', 100000, 1),
  ('ec-7', 'Client Entertainment', 'Client meetings and events', 10000, 1),
  ('ec-8', 'Miscellaneous', 'Other business expenses', 5000, 1)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED ASSET CATEGORIES
-- ==========================================

INSERT INTO asset_categories (id, name, description, depreciation_rate, useful_life_years) VALUES
  ('ac-1', 'Laptops', 'Laptop computers', 33.33, 3),
  ('ac-2', 'Desktops', 'Desktop computers', 33.33, 3),
  ('ac-3', 'Monitors', 'Computer monitors', 20, 5),
  ('ac-4', 'Mobile Devices', 'Phones and tablets', 33.33, 3),
  ('ac-5', 'Furniture', 'Office furniture', 10, 10),
  ('ac-6', 'Peripherals', 'Keyboards, mice, headsets', 50, 2),
  ('ac-7', 'Networking', 'Routers, switches', 20, 5)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED SKILLS
-- ==========================================

INSERT INTO skills (id, name, category, description) VALUES
  ('skill-1', 'JavaScript', 'Programming', 'JavaScript programming language'),
  ('skill-2', 'TypeScript', 'Programming', 'TypeScript programming language'),
  ('skill-3', 'React', 'Frontend', 'React.js framework'),
  ('skill-4', 'Node.js', 'Backend', 'Node.js runtime'),
  ('skill-5', 'Python', 'Programming', 'Python programming language'),
  ('skill-6', 'SQL', 'Database', 'SQL databases'),
  ('skill-7', 'Adobe Photoshop', 'Design', 'Adobe Photoshop'),
  ('skill-8', 'Adobe Illustrator', 'Design', 'Adobe Illustrator'),
  ('skill-9', 'Figma', 'Design', 'Figma design tool'),
  ('skill-10', 'Blender', '3D', 'Blender 3D software'),
  ('skill-11', 'Maya', '3D', 'Autodesk Maya'),
  ('skill-12', 'Content Writing', 'Content', 'Content writing skills'),
  ('skill-13', 'Copywriting', 'Content', 'Marketing copywriting'),
  ('skill-14', 'SEO', 'Marketing', 'Search engine optimization'),
  ('skill-15', 'Project Management', 'Management', 'Project management skills')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- SEED BOOTHPILOT EXHIBITORS
-- ==========================================

INSERT INTO bp_exhibitors (id, company_name, industry, website, icp_description, event_name, event_location, event_start_date, event_end_date, booth_number) VALUES
  ('exhibitor-1', 'TechFlow Solutions', 'Enterprise Software', 'https://techflow.example.com', 'Mid to large enterprises in manufacturing, retail, and logistics looking for ERP and supply chain solutions. Decision makers are typically CIOs, IT Directors, and Operations Heads with budgets of $100K+.', 'Enterprise Tech Summit 2026', 'Pragati Maidan, New Delhi', '2026-02-15', '2026-02-17', 'Hall A - Booth 42'),
  ('exhibitor-2', 'CloudVerse AI', 'Cloud Services', 'https://cloudverse.example.com', 'Startups and SMBs looking for cloud infrastructure and AI services.', 'Cloud Connect 2026', 'BKC, Mumbai', '2026-03-10', '2026-03-12', 'Hall B - Booth 15')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED BOOTHPILOT USERS
-- ==========================================

INSERT INTO bp_users (id, exhibitor_id, name, email, password, phone, role) VALUES
  ('bp-user-1', 'exhibitor-1', 'Rajesh Kumar', 'admin@techflow.com', '$2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO', '+91-9876543210', 'admin'),
  ('bp-user-2', 'exhibitor-1', 'Priya Patel', 'manager@techflow.com', '$2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO', '+91-9876543211', 'manager'),
  ('bp-user-3', 'exhibitor-1', 'Amit Singh', 'amit@techflow.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', '+91-9876543212', 'staff'),
  ('bp-user-4', 'exhibitor-1', 'Neha Gupta', 'neha@techflow.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', '+91-9876543213', 'staff'),
  ('bp-user-5', 'exhibitor-2', 'Vikram Shah', 'admin@cloudverse.com', '$2a$10$X7mIjKJxVYJqoQi8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eMRY5VSZO', '+91-9876543220', 'admin'),
  ('bp-user-6', 'exhibitor-2', 'Ananya Reddy', 'staff@cloudverse.com', '$2a$10$LQJVf3Y9X7mIjKJxVYJqoQ8yMJWI.Z.zKJ0JM4Y/dU8mJlMZ.B1eM', '+91-9876543221', 'staff')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- SEED BOOTHPILOT QUALIFICATION QUESTIONS
-- ==========================================

INSERT INTO bp_qualification_questions (id, exhibitor_id, question_text, question_type, options_json, order_index, is_required) VALUES
  ('q-1', 'exhibitor-1', 'What is your expected timeline for implementation?', 'select', '["Immediate (1-30 days)", "1-3 months", "3-6 months", "6-12 months", "Just exploring"]'::jsonb, 1, 1),
  ('q-2', 'exhibitor-1', 'What is your approximate budget range?', 'select', '["Under ₹10 Lakhs", "₹10-50 Lakhs", "₹50 Lakhs - 1 Crore", "Above ₹1 Crore", "Not defined yet"]'::jsonb, 2, 1),
  ('q-3', 'exhibitor-1', 'What is your role in the buying decision?', 'select', '["Final Decision Maker", "Key Influencer", "Technical Evaluator", "End User", "Just Researching"]'::jsonb, 3, 1),
  ('q-4', 'exhibitor-1', 'How many employees does your organization have?', 'select', '["1-50", "51-200", "201-500", "501-1000", "1000+"]'::jsonb, 4, 0),
  ('q-5', 'exhibitor-1', 'Are you currently using any similar solution?', 'select', '["Yes, looking to replace", "Yes, looking to add", "No, first time buyer"]'::jsonb, 5, 0),
  ('q-6', 'exhibitor-2', 'What is your expected timeline?', 'select', '["Immediate", "1-3 months", "3-6 months", "Exploring"]'::jsonb, 1, 1),
  ('q-7', 'exhibitor-2', 'What is your budget?', 'select', '["Under $10K", "$10K-50K", "$50K-100K", "Above $100K"]'::jsonb, 2, 1),
  ('q-8', 'exhibitor-2', 'Are you a decision maker?', 'select', '["Yes", "Influencer", "Evaluator", "Researching"]'::jsonb, 3, 1)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED CLEARANCE ITEMS
-- ==========================================

INSERT INTO clearance_items (id, name, department, description, is_mandatory, order_index) VALUES
  ('cl-1', 'Return Laptop', 'IT', 'Return company laptop in working condition', 1, 1),
  ('cl-2', 'Return ID Card', 'HR', 'Return employee ID card', 1, 2),
  ('cl-3', 'Return Access Card', 'Admin', 'Return building access card', 1, 3),
  ('cl-4', 'Email Account Deactivation', 'IT', 'Deactivate company email account', 1, 4),
  ('cl-5', 'Software License Revocation', 'IT', 'Revoke all software licenses', 1, 5),
  ('cl-6', 'Knowledge Transfer', 'Department', 'Complete knowledge transfer documentation', 1, 6),
  ('cl-7', 'Library Books Return', 'Admin', 'Return any borrowed library books', 0, 7),
  ('cl-8', 'Loan/Advance Settlement', 'Finance', 'Settle any pending loans or advances', 1, 8),
  ('cl-9', 'Expense Reports Submission', 'Finance', 'Submit all pending expense reports', 1, 9),
  ('cl-10', 'Exit Interview', 'HR', 'Complete exit interview', 1, 10)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED DOCUMENT CATEGORIES
-- ==========================================

INSERT INTO document_categories (id, name, description, access_level) VALUES
  ('doc-cat-1', 'Policies', 'Company policies and procedures', 'all'),
  ('doc-cat-2', 'Templates', 'Document templates', 'all'),
  ('doc-cat-3', 'HR Documents', 'HR related documents', 'hr'),
  ('doc-cat-4', 'Finance Documents', 'Financial documents', 'finance'),
  ('doc-cat-5', 'Employee Documents', 'Personal employee documents', 'private'),
  ('doc-cat-6', 'Training Materials', 'Training and learning resources', 'all')
ON CONFLICT (id) DO NOTHING;
