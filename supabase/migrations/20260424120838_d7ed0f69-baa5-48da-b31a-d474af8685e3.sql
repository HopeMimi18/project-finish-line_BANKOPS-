
DROP POLICY IF EXISTS "Users can create tokens for docs they can view" ON public.tokens;

CREATE POLICY "Users can create tokens for docs they can view"
ON public.tokens
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    NOT ('pii_override' = ANY (permissions))
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = tokens.document_id
      AND (
        d.owner_id = auth.uid()
        OR public.user_can_view_doc_v2(auth.uid(), d.classification, d.client_id)
      )
  )
);
