-- Tie application profiles to Supabase Auth and scope data access to the signed-in user.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_name TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.email, ''), profile_name, NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE
          WHEN NULLIF(BTRIM(public.profiles.full_name), '') IS NULL THEN EXCLUDED.full_name
          ELSE public.profiles.full_name
        END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
      AND c.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.profiles'::regclass AND attname = 'id'
      )]::smallint[]
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.subscriptions'::regclass
      AND c.confrelid = 'public.profiles'::regclass
      AND c.contype = 'f'
      AND c.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'user_id'
      )]::smallint[]
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND approval_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.id = (SELECT auth.uid())
     AND NOT public.is_approved_admin()
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.approval_status IS DISTINCT FROM OLD.approval_status) THEN
    RAISE EXCEPTION 'Only an approved administrator may change profile role or approval status.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_fields ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

DROP POLICY IF EXISTS "Allow profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Allow profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user approval status" ON public.profiles;
DROP POLICY IF EXISTS "Allow subscriptions select" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions insert" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions update" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions delete" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can CRUD own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow categories CRUD" ON public.categories;
DROP POLICY IF EXISTS "Users can CRUD own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow invoices CRUD" ON public.invoices;
DROP POLICY IF EXISTS "Users can CRUD own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow notifications CRUD" ON public.notifications;
DROP POLICY IF EXISTS "Users can CRUD own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow webhooks CRUD" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Users can CRUD own webhooks" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Anyone can view subscription templates" ON public.subscription_templates;
DROP POLICY IF EXISTS "Allow templates select" ON public.subscription_templates;
DROP POLICY IF EXISTS "Allow audit_logs CRUD" ON public.audit_logs;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));

CREATE POLICY "categories_select_visible"
  ON public.categories FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "categories_manage_own"
  ON public.categories FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));

CREATE POLICY "subscriptions_select_own_or_admin"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "subscriptions_update_own_or_admin"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "subscriptions_delete_own_or_admin"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));

CREATE POLICY "invoices_manage_own_or_admin"
  ON public.invoices FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "notifications_manage_own_or_admin"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "webhooks_manage_own_or_admin"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_approved_admin()));
CREATE POLICY "templates_select_authenticated"
  ON public.subscription_templates FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT public.is_approved_admin()));
