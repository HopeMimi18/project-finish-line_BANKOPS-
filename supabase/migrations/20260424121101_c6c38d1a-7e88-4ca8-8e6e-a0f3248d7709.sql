
-- Replace the storage SELECT policy with one that mirrors documents RLS
DROP POLICY IF EXISTS "Owner or manager/admin can read documents" ON storage.objects;

CREATE POLICY "Read documents bucket via documents RLS"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.storage_path = storage.objects.name
      AND (
        d.owner_id = auth.uid()
        OR public.user_can_view_doc_v2(auth.uid(), d.classification, d.client_id)
      )
  )
);

-- Remove duplicate INSERT policy
DROP POLICY IF EXISTS "Authenticated can write own folder" ON storage.objects;
