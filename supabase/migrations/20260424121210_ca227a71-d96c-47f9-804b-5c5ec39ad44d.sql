
DROP POLICY IF EXISTS "Owner or manager/admin can revoke (update) tokens" ON public.tokens;

CREATE POLICY "Owner or manager/admin can revoke (update) tokens"
ON public.tokens
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (
    NOT ('pii_override' = ANY (permissions))
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
