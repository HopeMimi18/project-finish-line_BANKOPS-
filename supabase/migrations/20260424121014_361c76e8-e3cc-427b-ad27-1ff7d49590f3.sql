
-- Drop unused v1 function (no policy references it anymore)
DROP FUNCTION IF EXISTS public.user_can_view_doc(uuid, public.classification_tag);

-- Remove the redundant duplicate SELECT policies; keep only the owner-or-manager/admin rule
DROP POLICY IF EXISTS "Authenticated can read own folder" ON storage.objects;
DROP POLICY IF EXISTS "Managers can read all docs" ON storage.objects;
