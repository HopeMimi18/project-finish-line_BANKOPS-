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
  -- Lock every field except `revoked`: new row must equal old row on all other columns.
  AND EXISTS (
    SELECT 1 FROM public.tokens old
    WHERE old.id = tokens.id
      AND old.created_by   IS NOT DISTINCT FROM tokens.created_by
      AND old.document_id  IS NOT DISTINCT FROM tokens.document_id
      AND old.scope_cid    IS NOT DISTINCT FROM tokens.scope_cid
      AND old.token_hash   IS NOT DISTINCT FROM tokens.token_hash
      AND old.token_preview IS NOT DISTINCT FROM tokens.token_preview
      AND old.permissions  IS NOT DISTINCT FROM tokens.permissions
      AND old.expires_at   IS NOT DISTINCT FROM tokens.expires_at
      AND old.created_at   IS NOT DISTINCT FROM tokens.created_at
  )
);