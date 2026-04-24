ALTER TABLE public.tokens
ADD COLUMN token_hash text,
ADD COLUMN token_preview text;

UPDATE public.tokens
SET
  token_hash = encode(extensions.digest(token, 'sha256'), 'hex'),
  token_preview = CASE
    WHEN char_length(token) <= 8 THEN token
    ELSE left(token, 3) || '...' || right(token, 4)
  END
WHERE token_hash IS NULL;

ALTER TABLE public.tokens
ALTER COLUMN token_hash SET NOT NULL,
ALTER COLUMN token_preview SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tokens_token_hash_idx ON public.tokens (token_hash);

ALTER TABLE public.tokens
ADD CONSTRAINT tokens_token_hash_format_chk
CHECK (token_hash ~ '^[a-f0-9]{64}$');

ALTER TABLE public.tokens
ADD CONSTRAINT tokens_token_preview_len_chk
CHECK (char_length(token_preview) BETWEEN 1 AND 10);

ALTER TABLE public.tokens
DROP COLUMN token;

DROP POLICY IF EXISTS "Users can insert audit events for themselves" ON public.audit_events;

CREATE OR REPLACE FUNCTION public.assign_user_role(_target_user uuid, _role public.app_role)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_row public.user_roles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user, _role)
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING * INTO inserted_row;

  IF inserted_row IS NULL THEN
    RAISE EXCEPTION 'role already assigned';
  END IF;

  RETURN inserted_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_role(_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.user_roles
  WHERE id = _role_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'role not found';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Managers and admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers and admins can delete roles" ON public.user_roles;

GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;