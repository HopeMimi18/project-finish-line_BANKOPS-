
-- 1) Storage: add UPDATE policy for the 'documents' bucket
DROP POLICY IF EXISTS "Owner or manager/admin can update documents files" ON storage.objects;
CREATE POLICY "Owner or manager/admin can update documents files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 2) Safe view of tokens that excludes token_hash
CREATE OR REPLACE VIEW public.tokens_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  token_preview,
  scope_cid,
  document_id,
  permissions,
  expires_at,
  revoked,
  created_at,
  created_by
FROM public.tokens;

GRANT SELECT ON public.tokens_safe TO authenticated;
