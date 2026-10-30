-- ============================================================================
-- SUPABASE MIGRATION: FIX ROW LEVEL SECURITY & INFINITE RECURSION
-- ============================================================================

-- 1. FIX PROFILES TABLE & RECURSIVE POLICIES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user approval status" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop auth.users foreign key constraint if running with client profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. FIX SUBSCRIPTIONS TABLE POLICIES (Allow app CRUD operations)
DROP POLICY IF EXISTS "Users can CRUD own subscriptions" ON public.subscriptions;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Ensure user_id allows client generated records
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- 3. FIX CATEGORIES POLICIES
DROP POLICY IF EXISTS "Users can CRUD own categories" ON public.categories;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. FIX INVOICES, NOTIFICATIONS, WEBHOOKS POLICIES
DROP POLICY IF EXISTS "Users can CRUD own invoices" ON public.invoices;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own notifications" ON public.notifications;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own webhooks" ON public.webhook_endpoints;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- User-scoped policies and the Auth profile trigger are installed by the next migration.
