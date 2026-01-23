// ==========================================
// BOOTHPILOT AI - TRADE SHOW LEAD MANAGEMENT
// Database Schema
// ==========================================

function createBoothPilotTables(db) {
  console.log('Creating BoothPilot AI tables...');

  // ==========================================
  // EXHIBITOR / MULTI-TENANCY
  // ==========================================

  // Exhibitors table (multi-tenancy root)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_exhibitors (
      id TEXT PRIMARY KEY,
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
      settings_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==========================================
  // BOOTH USERS (EXHIBITOR TEAM)
  // ==========================================

  // Booth users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_users (
      id TEXT PRIMARY KEY,
      exhibitor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'staff',
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exhibitor_id) REFERENCES bp_exhibitors(id)
    )
  `);

  // ==========================================
  // LEADS
  // ==========================================

  // Leads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_leads (
      id TEXT PRIMARY KEY,
      exhibitor_id TEXT NOT NULL,
      captured_by_user_id TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exhibitor_id) REFERENCES bp_exhibitors(id),
      FOREIGN KEY (captured_by_user_id) REFERENCES bp_users(id)
    )
  `);

  // ==========================================
  // QUALIFICATION QUESTIONS
  // ==========================================

  // Qualification questions template
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_qualification_questions (
      id TEXT PRIMARY KEY,
      exhibitor_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'text',
      options_json TEXT,
      order_index INTEGER DEFAULT 0,
      is_required INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exhibitor_id) REFERENCES bp_exhibitors(id)
    )
  `);

  // Qualification answers for leads
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_qualification_answers (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES bp_leads(id),
      FOREIGN KEY (question_id) REFERENCES bp_qualification_questions(id)
    )
  `);

  // ==========================================
  // AI LEAD SCORING
  // ==========================================

  // Lead scores table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_lead_scores (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      label TEXT NOT NULL,
      reasons_json TEXT,
      risk_flags_json TEXT,
      next_best_action TEXT,
      recommended_message_angle TEXT,
      ai_model TEXT,
      scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES bp_leads(id)
    )
  `);

  // ==========================================
  // AI FOLLOW-UPS
  // ==========================================

  // Follow-up drafts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_followups (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      subject TEXT,
      message_text TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      generated_by_user_id TEXT,
      ai_model TEXT,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES bp_leads(id),
      FOREIGN KEY (generated_by_user_id) REFERENCES bp_users(id)
    )
  `);

  // ==========================================
  // ACTIVITY TRACKING
  // ==========================================

  // Lead activity log
  db.exec(`
    CREATE TABLE IF NOT EXISTS bp_lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES bp_leads(id),
      FOREIGN KEY (user_id) REFERENCES bp_users(id)
    )
  `);

  console.log('BoothPilot AI tables created successfully!');
}

function seedBoothPilotData(db) {
  console.log('Seeding BoothPilot AI demo data...');

  // Check if we've already seeded BoothPilot data
  const checkSeeded = db.prepare("SELECT COUNT(*) as count FROM bp_exhibitors").get();
  if (checkSeeded.count > 0) {
    console.log('BoothPilot data already seeded, skipping...');
    return;
  }

  const bcrypt = require('bcryptjs');

  // Seed demo exhibitor
  const insertExhibitor = db.prepare(`
    INSERT INTO bp_exhibitors (id, company_name, company_logo, industry, website, icp_description, event_name, event_location, event_start_date, event_end_date, booth_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExhibitor.run(
    'exhibitor-1',
    'TechFlow Solutions',
    null,
    'Enterprise Software',
    'https://techflow.example.com',
    'Mid to large enterprises in manufacturing, retail, and logistics looking for ERP and supply chain solutions. Decision makers are typically CIOs, IT Directors, and Operations Heads with budgets of $100K+.',
    'Enterprise Tech Summit 2026',
    'Pragati Maidan, New Delhi',
    '2026-02-15',
    '2026-02-17',
    'Hall A - Booth 42'
  );

  // Seed second exhibitor for multi-tenancy demo
  insertExhibitor.run(
    'exhibitor-2',
    'CloudVerse AI',
    null,
    'Cloud Services',
    'https://cloudverse.example.com',
    'Startups and SMBs looking for cloud infrastructure and AI services.',
    'Cloud Connect 2026',
    'BKC, Mumbai',
    '2026-03-10',
    '2026-03-12',
    'Hall B - Booth 15'
  );

  // Seed demo users
  const insertUser = db.prepare(`
    INSERT INTO bp_users (id, exhibitor_id, name, email, password, phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const staffPassword = bcrypt.hashSync('staff123', 10);

  // TechFlow team
  insertUser.run('bp-user-1', 'exhibitor-1', 'Rajesh Kumar', 'admin@techflow.com', adminPassword, '+91-9876543210', 'admin');
  insertUser.run('bp-user-2', 'exhibitor-1', 'Priya Patel', 'manager@techflow.com', adminPassword, '+91-9876543211', 'manager');
  insertUser.run('bp-user-3', 'exhibitor-1', 'Amit Singh', 'amit@techflow.com', staffPassword, '+91-9876543212', 'staff');
  insertUser.run('bp-user-4', 'exhibitor-1', 'Neha Gupta', 'neha@techflow.com', staffPassword, '+91-9876543213', 'staff');

  // CloudVerse team
  insertUser.run('bp-user-5', 'exhibitor-2', 'Vikram Shah', 'admin@cloudverse.com', adminPassword, '+91-9876543220', 'admin');
  insertUser.run('bp-user-6', 'exhibitor-2', 'Ananya Reddy', 'staff@cloudverse.com', staffPassword, '+91-9876543221', 'staff');

  // Seed default qualification questions for TechFlow
  const insertQuestion = db.prepare(`
    INSERT INTO bp_qualification_questions (id, exhibitor_id, question_text, question_type, options_json, order_index, is_required)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuestion.run('q-1', 'exhibitor-1', 'What is your expected timeline for implementation?', 'select',
    JSON.stringify(['Immediate (1-30 days)', '1-3 months', '3-6 months', '6-12 months', 'Just exploring']), 1, 1);
  insertQuestion.run('q-2', 'exhibitor-1', 'What is your approximate budget range?', 'select',
    JSON.stringify(['Under ₹10 Lakhs', '₹10-50 Lakhs', '₹50 Lakhs - 1 Crore', 'Above ₹1 Crore', 'Not defined yet']), 2, 1);
  insertQuestion.run('q-3', 'exhibitor-1', 'What is your role in the buying decision?', 'select',
    JSON.stringify(['Final Decision Maker', 'Key Influencer', 'Technical Evaluator', 'End User', 'Just Researching']), 3, 1);
  insertQuestion.run('q-4', 'exhibitor-1', 'How many employees does your organization have?', 'select',
    JSON.stringify(['1-50', '51-200', '201-500', '501-1000', '1000+']), 4, 0);
  insertQuestion.run('q-5', 'exhibitor-1', 'Are you currently using any similar solution?', 'select',
    JSON.stringify(['Yes, looking to replace', 'Yes, looking to add', 'No, first time buyer']), 5, 0);

  // Default questions for CloudVerse
  insertQuestion.run('q-6', 'exhibitor-2', 'What is your expected timeline?', 'select',
    JSON.stringify(['Immediate', '1-3 months', '3-6 months', 'Exploring']), 1, 1);
  insertQuestion.run('q-7', 'exhibitor-2', 'What is your budget?', 'select',
    JSON.stringify(['Under $10K', '$10K-50K', '$50K-100K', 'Above $100K']), 2, 1);
  insertQuestion.run('q-8', 'exhibitor-2', 'Are you a decision maker?', 'select',
    JSON.stringify(['Yes', 'Influencer', 'Evaluator', 'Researching']), 3, 1);

  // Seed sample leads for TechFlow
  const insertLead = db.prepare(`
    INSERT INTO bp_leads (id, exhibitor_id, captured_by_user_id, full_name, company_name, designation, email, phone, industry, interest_tag, notes, capture_source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLead.run('lead-1', 'exhibitor-1', 'bp-user-3', 'Suresh Menon', 'Tata Steel', 'CIO', 'suresh.menon@tatasteel.com', '+91-9812345671', 'Manufacturing', 'ERP', 'Very interested in supply chain module. Asked detailed questions about integration with SAP.', 'manual', 'qualified');
  insertLead.run('lead-2', 'exhibitor-1', 'bp-user-3', 'Kavita Sharma', 'Reliance Retail', 'IT Director', 'kavita.sharma@ril.com', '+91-9812345672', 'Retail', 'Inventory Management', 'Looking for multi-location inventory sync. Budget approved. Wants demo next week.', 'badge_scan', 'qualified');
  insertLead.run('lead-3', 'exhibitor-1', 'bp-user-4', 'Ramesh Iyer', 'Mahindra Logistics', 'VP Operations', 'ramesh.iyer@mahindra.com', '+91-9812345673', 'Logistics', 'Fleet Management', 'Interested but timeline is 6 months. Collecting information for board presentation.', 'manual', 'new');
  insertLead.run('lead-4', 'exhibitor-1', 'bp-user-4', 'Anjali Nair', 'Startup XYZ', 'Founder', 'anjali@startupxyz.com', '+91-9812345674', 'Technology', 'General', 'Early stage startup. Just exploring options. Budget constraints.', 'manual', 'new');
  insertLead.run('lead-5', 'exhibitor-1', 'bp-user-3', 'Vikram Malhotra', 'Adani Ports', 'Head of IT', 'vikram.m@adani.com', '+91-9812345675', 'Logistics', 'Supply Chain', 'Large port operations. Need custom solution. High value prospect. Asked for on-site demo.', 'manual', 'contacted');

  // Seed qualification answers for some leads
  const insertAnswer = db.prepare(`
    INSERT INTO bp_qualification_answers (id, lead_id, question_id, answer_text)
    VALUES (?, ?, ?, ?)
  `);

  // Answers for Suresh Menon (HOT lead)
  insertAnswer.run('ans-1', 'lead-1', 'q-1', '1-3 months');
  insertAnswer.run('ans-2', 'lead-1', 'q-2', 'Above ₹1 Crore');
  insertAnswer.run('ans-3', 'lead-1', 'q-3', 'Final Decision Maker');
  insertAnswer.run('ans-4', 'lead-1', 'q-4', '1000+');
  insertAnswer.run('ans-5', 'lead-1', 'q-5', 'Yes, looking to replace');

  // Answers for Kavita Sharma (HOT lead)
  insertAnswer.run('ans-6', 'lead-2', 'q-1', 'Immediate (1-30 days)');
  insertAnswer.run('ans-7', 'lead-2', 'q-2', '₹50 Lakhs - 1 Crore');
  insertAnswer.run('ans-8', 'lead-2', 'q-3', 'Key Influencer');
  insertAnswer.run('ans-9', 'lead-2', 'q-4', '1000+');

  // Answers for Ramesh Iyer (WARM lead)
  insertAnswer.run('ans-10', 'lead-3', 'q-1', '6-12 months');
  insertAnswer.run('ans-11', 'lead-3', 'q-2', '₹10-50 Lakhs');
  insertAnswer.run('ans-12', 'lead-3', 'q-3', 'Key Influencer');

  // Answers for Anjali Nair (COLD lead)
  insertAnswer.run('ans-13', 'lead-4', 'q-1', 'Just exploring');
  insertAnswer.run('ans-14', 'lead-4', 'q-2', 'Under ₹10 Lakhs');
  insertAnswer.run('ans-15', 'lead-4', 'q-3', 'Just Researching');

  // Seed lead scores
  const insertScore = db.prepare(`
    INSERT INTO bp_lead_scores (id, lead_id, score, label, reasons_json, risk_flags_json, next_best_action, recommended_message_angle, ai_model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertScore.run('score-1', 'lead-1', 92, 'HOT',
    JSON.stringify(['Final decision maker', 'Budget above 1 Crore', 'Timeline within 3 months', 'Looking to replace existing solution', 'Enterprise size company']),
    JSON.stringify([]),
    'Schedule on-site demo within 48 hours',
    'Focus on ROI and migration support from existing ERP',
    'gpt-4'
  );

  insertScore.run('score-2', 'lead-2', 88, 'HOT',
    JSON.stringify(['Immediate timeline', 'Budget approved', 'Large retail chain', 'Clear use case identified']),
    JSON.stringify(['Not the final decision maker']),
    'Schedule demo next week as requested',
    'Emphasize multi-location inventory sync and retail-specific features',
    'gpt-4'
  );

  insertScore.run('score-3', 'lead-3', 58, 'WARM',
    JSON.stringify(['Good company size', 'Clear interest in fleet management']),
    JSON.stringify(['Long timeline (6+ months)', 'Still collecting information']),
    'Add to nurture sequence, share case studies monthly',
    'Send logistics industry case studies and ROI calculator',
    'gpt-4'
  );

  insertScore.run('score-4', 'lead-4', 25, 'COLD',
    JSON.stringify(['Has expressed interest']),
    JSON.stringify(['Early stage startup', 'Budget constraints', 'Just exploring', 'Not a decision maker']),
    'Add to newsletter, low-touch follow-up only',
    'Share startup-friendly pricing and growth stories',
    'gpt-4'
  );

  // Seed follow-up drafts
  const insertFollowup = db.prepare(`
    INSERT INTO bp_followups (id, lead_id, channel, subject, message_text, status, generated_by_user_id, ai_model, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFollowup.run('fu-1', 'lead-1', 'whatsapp', null,
    'Hi Suresh! Great meeting you at the Enterprise Tech Summit today. I really enjoyed our conversation about modernizing Tata Steel\'s supply chain operations. As discussed, I\'d love to schedule an on-site demo to show you how we can help with SAP integration. Would next Tuesday or Wednesday work for you? Looking forward to connecting! - Amit, TechFlow Solutions',
    'sent', 'bp-user-3', 'gpt-4', '2026-02-15 14:30:00'
  );

  insertFollowup.run('fu-2', 'lead-1', 'email', 'Following up from Enterprise Tech Summit - Next Steps',
    'Dear Suresh,\n\nIt was a pleasure meeting you at our booth today at the Enterprise Tech Summit. Your insights about Tata Steel\'s digital transformation journey were truly impressive.\n\nAs we discussed, I understand you\'re looking to modernize your supply chain operations with a focus on seamless SAP integration. Our solution has helped similar enterprises achieve 30% reduction in inventory costs and 40% improvement in supply chain visibility.\n\nI\'d like to propose an on-site demo at your convenience next week. During this session, we can:\n• Walk through our SAP integration capabilities\n• Show relevant manufacturing industry case studies\n• Discuss a customized implementation roadmap\n\nWould Tuesday or Wednesday afternoon work for your team?\n\nBest regards,\nAmit Singh\nSenior Solutions Consultant\nTechFlow Solutions\n+91-9876543212',
    'draft', 'bp-user-3', 'gpt-4', null
  );

  insertFollowup.run('fu-3', 'lead-2', 'whatsapp', null,
    'Hi Kavita! Thanks for stopping by our booth today. Your multi-location inventory challenge sounds like exactly what we specialize in. I\'ve noted your request for a demo next week. Our team will send you calendar options shortly. Have a great rest of the event! - Neha, TechFlow',
    'sent', 'bp-user-4', 'gpt-4', '2026-02-15 16:45:00'
  );

  console.log('BoothPilot AI demo data seeded successfully!');
}

module.exports = { createBoothPilotTables, seedBoothPilotData };
