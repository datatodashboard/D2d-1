-- ==============================================================================
-- Crack SQL - Production Baseline Verification Queries
-- Purpose: Read-only audit of table row counts and schema presence before & after Netlify deploy.
-- SAFETY: READ-ONLY. Contains NO DDL, NO UPDATE, NO DELETE, NO TRUNCATE.
-- ==============================================================================

-- 1. Schema Presence Audit: Check which tables and columns actually exist in production
SELECT 
  t.table_schema,
  t.table_name,
  count(c.column_name) AS column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE t.table_schema IN ('public', 'auth')
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_schema, t.table_name
ORDER BY t.table_schema, t.table_name;

-- 2. Inspect specific column presence for critical tables (e.g. certificates, profiles, payments)
SELECT 
  table_schema, 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 
    'progress', 
    'learning_progress', 
    'certificates', 
    'payments', 
    'razorpay_orders', 
    'contests', 
    'contest_registrations', 
    'contest_attempts',
    'contest_evaluations',
    'contest_payments',
    'app_notifications', 
    'admin_users', 
    'question_feedback',
    'historical_progress',
    'historical_certificates'
  )
ORDER BY table_name, ordinal_position;

-- 3. Dynamic Safe Table Row Counts
-- Evaluates all public tables that exist without failing if a table (e.g., certificates) is missing
DO $$
DECLARE
  rec RECORD;
  cnt BIGINT;
BEGIN
  RAISE NOTICE '=== TABLE ROW COUNTS ===';
  FOR rec IN (
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'auth') 
      AND table_name IN (
        'users',
        'profiles',
        'progress',
        'learning_progress',
        'certificates',
        'historical_progress',
        'historical_learning_progress',
        'historical_certificates',
        'payments',
        'razorpay_orders',
        'contests',
        'contest_eligibility',
        'contest_registrations',
        'contest_payments',
        'contest_attempts',
        'contest_evaluations',
        'question_feedback',
        'app_notifications',
        'admin_users',
        'system_settings',
        'scenario_catalog',
        'sql_challenge_attempts'
      )
    ORDER BY table_schema, table_name
  ) LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', rec.table_schema, rec.table_name) INTO cnt;
    RAISE NOTICE '%I.%I: %', rec.table_schema, rec.table_name, cnt;
  END LOOP;
END $$;

-- 4. Individual Explicit Count Queries (Copy-paste friendly into Supabase SQL editor)

-- Auth Users (Identity)
SELECT 'auth.users' AS table_name, count(*) AS total_rows FROM auth.users;

-- Core Learner Profiles
SELECT 'public.profiles' AS table_name, count(*) AS total_rows FROM public.profiles;

-- Learner Scenario Practice & Thinking Engine Progress
SELECT 'public.progress' AS table_name, count(*) AS total_rows FROM public.progress;
SELECT 'public.learning_progress' AS table_name, count(*) AS total_rows FROM public.learning_progress;

-- Certificates (May be missing in some production environments - run if exists)
-- SELECT 'public.certificates' AS table_name, count(*) AS total_rows FROM public.certificates;

-- Payments and Entitlements
SELECT 'public.payments' AS table_name, count(*) AS total_rows FROM public.payments;
-- SELECT 'public.razorpay_orders' AS table_name, count(*) AS total_rows FROM public.razorpay_orders;

-- Administrative & Feedback Tables
SELECT 'public.admin_users' AS table_name, count(*) AS total_rows FROM public.admin_users;
-- SELECT 'public.question_feedback' AS table_name, count(*) AS total_rows FROM public.question_feedback;
-- SELECT 'public.app_notifications' AS table_name, count(*) AS total_rows FROM public.app_notifications;

-- Contest Tables
-- SELECT 'public.contests' AS table_name, count(*) AS total_rows FROM public.contests;
-- SELECT 'public.contest_registrations' AS table_name, count(*) AS total_rows FROM public.contest_registrations;
-- SELECT 'public.contest_payments' AS table_name, count(*) AS total_rows FROM public.contest_payments;
-- SELECT 'public.contest_attempts' AS table_name, count(*) AS total_rows FROM public.contest_attempts;
-- SELECT 'public.contest_evaluations' AS table_name, count(*) AS total_rows FROM public.contest_evaluations;

-- Historical Archives (if created during Thinking Logic 2.0 migration)
-- SELECT 'public.historical_progress' AS table_name, count(*) AS total_rows FROM public.historical_progress;
-- SELECT 'public.historical_certificates' AS table_name, count(*) AS total_rows FROM public.historical_certificates;
