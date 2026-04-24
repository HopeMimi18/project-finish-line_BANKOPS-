-- 1. Replace tokens INSERT policy to block pii_override for non-managers/admins
DROP POLICY IF EXISTS "Users can create tokens for docs they can view" ON public.tokens;

CREATE POLICY "Users can create tokens for docs they can view"
ON public.tokens
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    NOT ('pii_override' = ANY(permissions))
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = tokens.document_id
      AND (
        d.owner_id = auth.uid()
        OR public.user_can_view_doc(auth.uid(), d.classification)
      )
  )
);

-- 2. Scope profile SELECT to self for regular users; managers/admins see all
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
);