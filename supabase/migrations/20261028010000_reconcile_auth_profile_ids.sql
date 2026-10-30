-- Reconcile legacy profile IDs with Supabase Auth IDs without orphaning owned rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.profiles'::regclass AND attname = 'id'
      )]::SMALLINT[]
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END;
$$;

DO $$
DECLARE
  foreign_key RECORD;
  constraint_definition TEXT;
  deferrable_position INTEGER;
BEGIN
  FOR foreign_key IN
    SELECT conrelid::regclass AS table_name,
           conname,
           pg_get_constraintdef(oid, true) AS definition,
           convalidated
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'public.profiles'::regclass
  LOOP
    constraint_definition := regexp_replace(
      foreign_key.definition,
      ' ON UPDATE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );
    deferrable_position := strpos(constraint_definition, ' DEFERRABLE');
    IF deferrable_position > 0 THEN
      constraint_definition :=
        substr(constraint_definition, 1, deferrable_position - 1)
        || ' ON UPDATE CASCADE'
        || substr(constraint_definition, deferrable_position);
    ELSE
      constraint_definition := constraint_definition || ' ON UPDATE CASCADE';
    END IF;
    IF NOT foreign_key.convalidated THEN
      constraint_definition := constraint_definition || ' NOT VALID';
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', foreign_key.table_name, foreign_key.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I %s',
      foreign_key.table_name,
      foreign_key.conname,
      constraint_definition
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  relationship RECORD;
  table_oid REGCLASS;
  column_number SMALLINT;
BEGIN
  FOR relationship IN
    SELECT * FROM (VALUES
      ('categories', 'user_id', 'CASCADE'),
      ('subscriptions', 'user_id', 'CASCADE'),
      ('invoices', 'user_id', 'CASCADE'),
      ('notifications', 'user_id', 'CASCADE'),
      ('webhook_endpoints', 'user_id', 'CASCADE'),
      ('audit_logs', 'actor_user_id', 'SET NULL'),
      ('audit_logs', 'target_user_id', 'SET NULL')
    ) AS expected(table_name, column_name, on_delete)
  LOOP
    table_oid := to_regclass(format('public.%I', relationship.table_name));
    IF table_oid IS NULL THEN
      CONTINUE;
    END IF;

    SELECT attnum INTO column_number
    FROM pg_attribute
    WHERE attrelid = table_oid
      AND attname = relationship.column_name
      AND NOT attisdropped;
    IF column_number IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = table_oid
        AND confrelid = 'public.profiles'::regclass
        AND contype = 'f'
        AND conkey = ARRAY[column_number]::SMALLINT[]
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE %s ON UPDATE CASCADE NOT VALID',
        table_oid,
        relationship.table_name || '_' || relationship.column_name || '_profile_fkey',
        relationship.column_name,
        relationship.on_delete
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN
    SELECT p.id AS old_id, u.id AS auth_id, u.email,
           u.raw_user_meta_data ->> 'full_name' AS auth_name,
           u.raw_user_meta_data ->> 'avatar_url' AS auth_avatar
    FROM public.profiles p
    JOIN auth.users u ON lower(u.email) = lower(p.email)
    WHERE p.id <> u.id
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles current_profile WHERE current_profile.id = u.id
      )
  LOOP
    UPDATE public.profiles
    SET id = profile_record.auth_id,
        email = profile_record.email,
        full_name = COALESCE(NULLIF(BTRIM(profile_record.auth_name), ''), full_name),
        avatar_url = COALESCE(profile_record.auth_avatar, avatar_url),
        updated_at = NOW()
    WHERE id = profile_record.old_id;
  END LOOP;
END;
$$;

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

  IF NEW.email IS NOT NULL THEN
    UPDATE public.profiles
    SET id = NEW.id,
        email = NEW.email,
        full_name = COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), full_name),
        avatar_url = COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', avatar_url),
        updated_at = NOW()
    WHERE lower(email) = lower(NEW.email)
      AND id <> NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles current_profile WHERE current_profile.id = NEW.id
      );

    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.email, ''), profile_name, NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE
          WHEN NULLIF(BTRIM(public.profiles.full_name), '') IS NULL THEN EXCLUDED.full_name
          ELSE public.profiles.full_name
        END,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
