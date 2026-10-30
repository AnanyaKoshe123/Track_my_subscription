# Track My Subscription — Supabase Setup & Integration Guide

## 1. Overview
Track My Subscription connects to Supabase as its production-grade PostgreSQL backend. This guide outlines project setup, database schema, RLS policies, authentication workflow, and deployment instructions.

## 2. Supabase Project Configuration
- Get the project URL and publishable key from **Supabase Dashboard → Project Settings → API**.
- Copy `.env.example` to `.env` and set these project-specific values:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```
The app does not contain a fallback project or key. Restart the dev server after changing `.env`.

## 3. Database Schema & Migrations
The consolidated table definitions are stored in `supabase/schema.sql`. For an existing project, apply every migration in timestamp order, including `20261028000000_auth_profiles_rls.sql`, `20261028010000_reconcile_auth_profile_ids.sql`, `20261028020000_backfill_missing_auth_profiles.sql`, `20261028030000_restore_admin_profile_visibility.sql`, and `20261029000000_profile_preferences_and_avatars.sql`. For a new project, run `schema.sql` followed by all migrations. Do not deploy the application before the migrations have installed the Auth profile trigger, user-scoped RLS policies, preference storage, and avatar bucket policies.

The migrations link profile and subscription IDs to their parent records, create profiles from `auth.users`, and replace permissive policies with policies scoped to the authenticated user (with approved-admin access where needed). Existing orphaned IDs are retained by adding the foreign keys as `NOT VALID`; new writes must satisfy them. The reconciliation migration also updates legacy profile IDs to matching Auth UUIDs and cascades that ID change to rows referencing the profile, avoiding duplicate-email conflicts. The backfill migration creates profiles for existing email Auth users that have no matching profile, so they appear in admin user management. The admin visibility migration reasserts the approved-admin profile read policy and authenticated table grant without disabling RLS. The preferences migration adds JSONB profile preferences and a public avatar bucket whose authenticated writes and deletes are restricted to the owner's folder.

Tables include:
- `profiles`: User accounts, roles (`user`, `admin`), approval status (`pending`, `approved`, `rejected`, `suspended`), and user-owned JSONB preferences.
- `categories`: Custom subscription categories with icons and theme colors.
- `subscription_templates`: Global catalog of predefined Indian and global subscription services.
- `subscriptions`: User recurring subscription records with billing amounts, cycles, and renewal dates.
- `invoices`: Uploaded receipts and AI-parsed billing documents.
- `notifications`: Scheduled renewal reminders and in-app alerts.
- `webhook_endpoints` & `audit_logs`: Webhook delivery management and administrative audit logs.

## 4. Row Level Security (RLS)
RLS stays enabled on all tables. Users can access their own profiles and records; approved administrators can review profiles and manage user approval. The client never uses a service-role key. Configure Supabase Auth email confirmation and password requirements in the Supabase dashboard. Supabase's default email provider has strict sending limits; for repeated signup testing or production, configure custom SMTP under **Authentication → SMTP Settings**. If signup hits `over_email_send_rate_limit`, check **Authentication → Users** before retrying. A row in `public.profiles` without a matching Auth user is not a sign-in account.

### Google OAuth

The **Continue with Google** buttons on the sign-in and access-request forms use `supabase.auth.signInWithOAuth({ provider: 'google' })`. The redirect target is the current app origin, so this Vite SPA does not need a separate callback route: the existing Supabase JS client detects the OAuth response, restores the session, and then the app loads the profile through its existing approval checks. OAuth return errors and missing responses are shown on the auth form; temporary OAuth state is kept in tab-scoped session storage and removed after callback handling.

The project is configured for local development at `http://localhost:3000`. The configured Supabase project callback URL is:

```text
https://tbpablkhphhvxgpnqmzz.supabase.co/auth/v1/callback
```

Configure Google and Supabase as follows:

1. In Google Cloud Console, create or select a **Web application** OAuth client.
2. Add `http://localhost:3000` under **Authorized JavaScript origins**. Add the exact production app origin after deployment; the repository's `APP_URL` value is currently a placeholder, not a production URL.
3. Add the Supabase callback URL above under **Authorized redirect URIs**. This callback is the Supabase Auth endpoint, not the app origin.
4. In Google Cloud Console, open **Google Auth Platform → Branding** and set the app name to **Track My Subscription**, plus a support email and the app's domain details. Google only shows the verified app name/logo on the sign-in/consent screen after the applicable verification is complete; branding alone might not immediately change the account chooser text.
5. In Supabase, open **Authentication → Sign In / Providers → Google**, enable the provider, and enter the Google **Client ID** and **Client Secret** there. Never put the client secret or service-role key in the frontend or `.env` variables prefixed with `VITE_`.
6. In **Authentication → URL Configuration**, set the **Site URL** to the deployed app origin in production (use `http://localhost:3000` for local-only testing). Add `http://localhost:3000/` to **Redirect URLs**. After deployment, add the exact production app origin with a trailing slash as well.

The Google page saying **“Choose an account to continue to tbpablkhphhvxgpnqmzz.supabase.co”** is the normal result when Google displays Supabase's default hosted Auth domain; it is not caused by the app's post-login `redirectTo`, which is already set to the current app origin. To replace the visible `*.supabase.co` domain, configure a Supabase custom domain you own (a paid Supabase add-on), then use the callback URL shown by Supabase for that custom domain as Google's **Authorized redirect URI**. Do not replace the callback with the frontend URL. Without a domain you own and access to the Google/Supabase dashboards, this provider-screen branding cannot be changed in frontend code.

The frontend already uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the existing anon-key alias); no new OAuth environment variable is required. OAuth creates the Auth user and the existing database trigger creates its profile. The profile defaults to a regular, pending user; only an administrator can approve it. RLS and the existing approval checks remain in force.

The Account & Preferences page persists profile and display preferences in `profiles.preferences`; avatar uploads require the migration-created `profile-avatars` bucket. Currency display rates refresh from the public ExchangeRate-API open endpoint (`open.er-api.com`) when the app loads; if that service is unavailable, the app clearly indicates that it is using built-in reference estimates. Notification toggles are stored preferences only: scheduled email, push, and summary delivery workflows are not configured. Gmail API access, MFA enrollment, active-session management, published privacy/terms pages, and safe account deletion are also not implemented. Account deletion must not be enabled until a trusted server-side process exists.

See the [Supabase Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls), and [Google Cloud Console](https://console.cloud.google.com/) for provider setup details.

## 5. Deployment & Verification
1. Apply `supabase/schema.sql`, then all five migrations in timestamp order: `20261028000000_auth_profiles_rls.sql`, `20261028010000_reconcile_auth_profile_ids.sql`, `20261028020000_backfill_missing_auth_profiles.sql`, `20261028030000_restore_admin_profile_visibility.sql`, and `20261029000000_profile_preferences_and_avatars.sql` (or apply all migrations in timestamp order). Do not run both the schema and duplicate setup script.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.
3. Run `npm run dev` to start the development server.
4. Test **Continue with Google** from both sign-in and access-request screens. Complete Google consent and verify the user appears under **Supabase → Authentication → Users** and the app returns to its origin.
5. Confirm the new profile is pending and is denied dashboard access until an administrator approves it. Verify rejected and suspended profiles are also denied, and Google sign-in does not grant administrator privileges.
6. Refresh after approval and verify the session persists. Sign out and confirm protected views are no longer available.
7. After an administrator approves the profile, sign in and create a subscription. Confirm its `user_id` matches the authenticated user's UUID in `public.subscriptions`; then reload and verify the same row is fetched. Verify another user cannot read that subscription under RLS.
8. After applying `20261029000000_profile_preferences_and_avatars.sql`, update profile preferences, upload/remove an avatar, refresh, and confirm those changes persist. Repeat as a second user to verify that avatar writes are restricted to each user's own storage folder.

Also test cancelling Google consent and invalid provider/redirect configuration; the auth screen should remain usable and show an actionable error. Existing email/password login, signup, reset, and RLS policies are unchanged.

Password reset sends a Supabase Auth recovery email and redirects back to the app's current origin. Add the deployed app URL (and local development URL when needed) to **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard.

`supabase/seed.sql` seeds only shared categories and templates. User-specific records must be created by an authenticated user and must not use demo IDs.

To bootstrap the first administrator, register that account and promote its profile from the Supabase SQL Editor using its Auth email:
```sql
UPDATE public.profiles
SET role = 'admin', approval_status = 'approved'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_REGISTERED_EMAIL');
```
`YOUR_REGISTERED_EMAIL` is a placeholder, not a supplied admin account. There is no default email or password; use the email and password you registered in Supabase Auth. Run this SQL as the project owner in the Supabase SQL Editor. If the account does not exist in **Authentication → Users**, register it first.
