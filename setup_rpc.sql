CREATE OR REPLACE FUNCTION get_profiles_with_email(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  title text,
  avatar_url text,
  phone text,
  email varchar,
  password_set boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.full_name,
    up.title,
    up.avatar_url,
    up.phone,
    au.email::varchar,
    up.password_set
  FROM public.user_profiles up
  JOIN auth.users au ON up.user_id = au.id
  WHERE up.user_id = ANY(user_ids);
END;
$$;
