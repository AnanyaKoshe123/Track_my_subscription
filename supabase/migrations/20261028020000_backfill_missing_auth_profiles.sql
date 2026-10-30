-- Create profiles for existing email Auth users that predate the profile trigger.
-- Do not duplicate profiles already associated by Auth UUID or email.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(SPLIT_PART(u.email, '@', 1), ''),
    'User'
  ),
  u.raw_user_meta_data ->> 'avatar_url'
FROM auth.users AS u
WHERE NULLIF(BTRIM(u.email), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = u.id OR LOWER(p.email) = LOWER(u.email)
  )
ON CONFLICT (id) DO NOTHING;
