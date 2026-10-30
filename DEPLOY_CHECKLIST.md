# Crack SQL "Version 1" Production Deployment Checklist

This document is the standard operating procedure for deploying Crack SQL Version 1 to Netlify while guaranteeing **zero data loss** and ensuring **no demo mode** traces remain.

---

## ⚠️ Core Deployment Principles

1. **Website Code Only**: This release deploys ONLY front-end static files to Netlify.
2. **Zero Database Migrations on Production**:
   - Do **NOT** run any SQL scripts or migrations against your production Supabase database.
   - **Never run** `migrations/017_thinking_engine_2_0_global_reset.sql` or `migrations/017_thinking_logic_2_merge_and_reset.sql` (they truncate learner progress and active certificates).
   - Notice: Existing migration files contain duplicate `017_` numbering, which is preserved as-is for auditable history.
3. **No Secret Values in Code**: Secrets (Supabase service role keys, Razorpay keys, Google client secrets) are never committed to git. Client uses standard public anonymous credentials.

---

## Pre-Deployment Phase (Before Deploying to Netlify)

### Step 1: Mandatory Supabase Full Backup & Restore Test
Do not proceed until you have completed this step:
1. **Supabase Dashboard Backup / PITR**:
   - Navigate to **Supabase Dashboard → Project Settings → Database → Backups**.
   - Confirm your latest automatic daily backup or Point-In-Time Recovery (PITR) is active and current.
2. **Export `public` schema via `pg_dump`**:
   ```bash
   pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
     --schema=public \
     --clean --if-exists --no-owner --no-privileges \
     -f crack_sql_public_backup_$(date +%Y%m%d).sql
   ```
3. **Export `auth.users` via Supabase Dashboard / SQL**:
   - In Supabase Dashboard → Authentication → Users, or via SQL Editor:
     ```sql
     -- Verify auth users export count
     SELECT id, email, created_at FROM auth.users;
     ```
4. **Backup Verification**: Verify the downloaded `.sql` file is non-empty and stores table schemas and row copies.

---

### Step 2: Run Baseline Row Counts & Schema Audit
Open Supabase SQL Editor and run `deploy/baseline-counts.sql`:
1. Record the baseline counts for:
   - `auth.users`
   - `public.profiles`
   - `public.progress`
   - `public.learning_progress`
   - `public.payments`
   - `public.certificates` (if present)
   - `public.contests` & contest tables (if present)
2. Run the schema audit query in `deploy/baseline-counts.sql` to verify which tables and columns actually exist in your production instance.
   - *Note on `public.certificates`*: If `public.certificates` is absent in production, the app handles this gracefully without throwing uncaught errors; do NOT run DDL during this deployment. Any future table additions must be staged in a staging project first.

---

### Step 3: Auth & Identity Provider Configuration
Verify and update the following settings to ensure learners sign in to their existing accounts without losing linked progress or certificates:
1. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL**: `https://thinkandcracksql.netlify.app` (or your custom Netlify production domain).
   - **Redirect URLs**: Add both:
     - `https://thinkandcracksql.netlify.app`
     - `https://thinkandcracksql.netlify.app/*`
     - `https://*.netlify.app/*` (if using deploy previews on staging).
2. **Google Cloud Console → Credentials → OAuth 2.0 Client IDs**:
   - **Authorized JavaScript origins**:
     - `https://thinkandcracksql.netlify.app`
     - `https://[YOUR-PROJECT-REF].supabase.co`
   - **Authorized redirect URIs**:
     - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
3. **Identity Match Guarantee**:
   - The Supabase Project Ref must remain the same so that Google user IDs (`sub` / `auth.uid()`) match existing rows in `public.profiles`, `public.progress`, and `public.payments`.

---

### Step 4: Edge Functions & Webhook Settings (Keep Unchanged)
Do NOT redeploy or modify existing Supabase edge functions or Razorpay webhooks:
- `create-razorpay-order`: Keep existing function and environment variables.
- `verify-razorpay-payment`: Keep existing function.
- `razorpay-webhook`: Keep existing function; do not alter Razorpay webhook URL.
- `send-gmail`: Keep existing function.

---

## Deployment Configuration (Netlify)

### Netlify Site Environment Variables
Configure the following variable names in **Netlify Site Configuration → Environment Variables** (supply your production values without putting them in git):
- `SUPABASE_URL` (e.g. `https://[YOUR-PROJECT-REF].supabase.co`)
- `SUPABASE_ANON_KEY` (public anon key)
- `RAZORPAY_KEY_ID` (production Key ID `rzp_live_...`)

### Publish Settings
- **Base directory**: `/` (repository root)
- **Build command**: `npm run build`
- **Publish directory**: `dist`

---

## Post-Deployment Verification (Three Distinct Levels)

### Level 1: Local Verification
Run locally before pushing code:
1. `npm run lint`: Confirm 0 syntax or import errors.
2. `npm test`: Confirm all unit & regression tests pass.
3. Test production build artifacts:
   ```bash
   npm run build
   npx serve dist -l 3000
   ```
4. Verify case-insensitive check for demo keyword across `dist/` returns 0 results.

---

### Level 2: Staging Verification (Deploy Preview)
Once Netlify builds a deploy preview (or staging site):
1. **Unauthenticated Visit**: Confirm ONLY the login screen with "Continue with Google" is shown. Confirm NO "Try Demo" or "Demo" buttons exist.
2. **Google Sign-In**: Sign in with an existing learner Google account.
3. **Progress & Persistence**: Confirm existing domain completion counts, earned score stars, and certificates match pre-deploy baseline.
4. **Learning Flow**: Complete 1 practice exercise, click "Check My Thinking", ensure evaluation scores accurately, and verify SQL unlocks at >= 8/10.
5. **Generate SQL**: Test "Generate SQL" feature on unlocked scenario.
6. **Certificate Verification**: Navigate to `/verify.html` and verify an existing certificate ID.
7. **Payment Preview**: Test Razorpay checkout flow in test mode if applicable.
8. **Admin Dashboard**: Sign in with an admin account and open `/admin.html`. Confirm admin dashboard loads real data with zero demo controls or sample banners.
9. **Responsive Check**: Test at 360×800 and 412×915 on mobile and tablet.

---

### Level 3: Production Release & Audit
After pointing production traffic:
1. **Re-run Baseline Counts**: Execute `deploy/baseline-counts.sql` in Supabase SQL editor.
   - All table row counts must be **equal to or greater than** pre-deploy counts.
   - **Zero rows deleted, zero rows reset.**
2. **First-Hour Health Monitoring**:
   - Check Netlify Deploy Logs for build or asset serving errors.
   - Check Supabase Dashboard → Logs → Auth Logs for failed sign-ins.
   - Check Supabase Dashboard → Logs → Edge Functions for Razorpay webhook delivery.

---

## Rollback Procedure

If any issue arises:
1. In Netlify Dashboard, navigate to **Deploys**.
2. Select the previous successful deploy.
3. Click **Publish deploy**.
4. **Data Safety Confirmation**: Because this release made **zero database schema changes** and executed **zero migrations**, rolling back the website deploy restores the previous frontend instantly with **zero data loss**.
