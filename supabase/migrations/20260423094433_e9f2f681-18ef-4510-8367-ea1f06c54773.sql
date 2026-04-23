-- Hash chain columns
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS row_hash text;

-- Index to find latest row quickly
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON public.audit_events (created_at DESC);

-- Trigger function: compute hash chain on insert
CREATE OR REPLACE FUNCTION public.audit_events_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  last_hash text;
  payload text;
BEGIN
  SELECT row_hash INTO last_hash
  FROM public.audit_events
  WHERE row_hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.prev_hash := COALESCE(last_hash, 'GENESIS');

  payload :=
    COALESCE(NEW.id::text, '') || '|' ||
    COALESCE(NEW.user_id::text, '') || '|' ||
    COALESCE(NEW.action, '') || '|' ||
    COALESCE(NEW.resource_cid, '') || '|' ||
    COALESCE(NEW.document_id::text, '') || '|' ||
    COALESCE(NEW.result, '') || '|' ||
    COALESCE(NEW.meta::text, '{}') || '|' ||
    COALESCE(NEW.created_at::text, now()::text) || '|' ||
    NEW.prev_hash;

  NEW.row_hash := encode(extensions.digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_hash_chain_trg ON public.audit_events;
CREATE TRIGGER audit_events_hash_chain_trg
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_events_hash_chain();

-- Make hash columns immutable after insert (defense in depth)
CREATE OR REPLACE FUNCTION public.audit_events_protect_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_protect_hash_trg ON public.audit_events;
CREATE TRIGGER audit_events_protect_hash_trg
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_events_protect_hash();

-- Verification function: walks the chain and reports any break
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(
  total_rows bigint,
  verified_rows bigint,
  first_break_id uuid,
  first_break_at timestamptz,
  intact boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
  expected_prev text := 'GENESIS';
  expected_hash text;
  payload text;
  cnt bigint := 0;
  ok bigint := 0;
  break_id uuid := NULL;
  break_at timestamptz := NULL;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR rec IN
    SELECT * FROM public.audit_events
    ORDER BY created_at ASC, id ASC
  LOOP
    cnt := cnt + 1;
    payload :=
      COALESCE(rec.id::text, '') || '|' ||
      COALESCE(rec.user_id::text, '') || '|' ||
      COALESCE(rec.action, '') || '|' ||
      COALESCE(rec.resource_cid, '') || '|' ||
      COALESCE(rec.document_id::text, '') || '|' ||
      COALESCE(rec.result, '') || '|' ||
      COALESCE(rec.meta::text, '{}') || '|' ||
      COALESCE(rec.created_at::text, '') || '|' ||
      expected_prev;
    expected_hash := encode(extensions.digest(payload, 'sha256'), 'hex');

    IF rec.prev_hash IS DISTINCT FROM expected_prev OR rec.row_hash IS DISTINCT FROM expected_hash THEN
      IF break_id IS NULL THEN
        break_id := rec.id;
        break_at := rec.created_at;
      END IF;
    ELSE
      ok := ok + 1;
    END IF;

    expected_prev := rec.row_hash;
  END LOOP;

  RETURN QUERY SELECT cnt, ok, break_id, break_at, (break_id IS NULL);
END;
$$;

-- Storage policies for documents bucket (used by seed + uploads)
DO $$ BEGIN
  CREATE POLICY "Authenticated can read own folder"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can write own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Managers can read all docs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;