# Supabase Setup Guide

This guide will help you set up Supabase as the backend database for the HRMS application.

## Prerequisites

1. A Supabase account (free tier available at [supabase.com](https://supabase.com))
2. Node.js 18 or higher installed

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in the project details:
   - **Name**: `hrms-production` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click **Create new project**
5. Wait for the project to be provisioned (takes ~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: The public key for client-side access
   - **service_role key**: The secret key for server-side access (keep this secret!)

## Step 3: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql` and paste it
4. Click **Run** to execute the schema creation
5. Create another new query
6. Copy the contents of `supabase/migrations/002_seed_data.sql` and paste it
7. Click **Run** to seed the initial data

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## Step 4: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:

```env
# Set database mode to supabase
DATABASE_MODE=supabase

# Your Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 5: Test the Connection

Start the development server:

```bash
npm run dev
```

You should see in the console:
```
Using Supabase (PostgreSQL) database
Server running on port 3001
```

## Default Login Credentials

After seeding the database, you can log in with:

### HRMS Application
- **Admin**: `admin@wowevents.com` / `admin123`
- **HR Admin**: `hr@wowevents.com` / `admin123`
- **Employee**: `amit@wowevents.com` / `user123`

### BoothPilot Application
- **Admin**: `admin@techflow.com` / `admin123`
- **Staff**: `amit@techflow.com` / `staff123`

## Row Level Security (RLS) - Optional

For production, you may want to enable Row Level Security. Here's an example policy:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Policy: Admins can read all data
CREATE POLICY "Admins can view all data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'
    )
  );
```

## Switching Between SQLite and Supabase

The application supports both databases. To switch:

### Use SQLite (Local Development)
```env
DATABASE_MODE=sqlite
```

### Use Supabase (Production)
```env
DATABASE_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Troubleshooting

### "Supabase is not configured" error
- Check that all three Supabase environment variables are set
- Verify the URL format is correct (should start with `https://`)

### Connection timeout
- Check if your Supabase project is active (free tier pauses after inactivity)
- Visit the Supabase dashboard to wake up the project

### Authentication issues
- Ensure passwords in seed data match the bcrypt hashes
- Try regenerating seed data with fresh bcrypt hashes

## Database Schema

The Supabase schema includes:

- **Core HR**: Users, Tasks, Leave Requests, Check-ins
- **Performance**: KPIs, Goals, Appraisals, PIPs, Recognitions
- **Probation**: Probation tracking and reviews
- **Payroll**: Salary structures, Payslips, Tax declarations
- **Recruitment**: Job postings, Candidates, Interviews
- **Learning**: Courses, Certifications, Learning paths
- **Assets**: Asset tracking and assignments
- **Expenses**: Expense reports and claims
- **Organization**: Departments, Positions, Hierarchy
- **Documents**: Document management and e-signatures
- **Announcements**: Company announcements and events
- **Offboarding**: Exit management and clearance
- **BoothPilot**: Trade show lead management

## Support

For issues with Supabase, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
