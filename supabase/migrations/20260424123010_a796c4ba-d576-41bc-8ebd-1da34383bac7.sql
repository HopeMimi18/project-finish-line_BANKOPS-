DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.system_settings;

CREATE POLICY "Managers and admins can read settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Public-safe accessor for the break_glass flag only.
CREATE OR REPLACE FUNCTION public.get_break_glass()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(value, '{}'::jsonb)
  FROM public.system_settings
  WHERE key = 'break_glass'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_break_glass() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_break_glass() TO authenticated;