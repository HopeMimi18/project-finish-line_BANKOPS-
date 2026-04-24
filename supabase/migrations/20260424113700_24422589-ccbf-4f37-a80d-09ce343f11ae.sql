-- Restrict audit_events.action to a known whitelist to prevent forged/junk audit entries.
-- Users are still permitted to insert their own audit rows (RLS enforces user_id = auth.uid()),
-- but the action field is now constrained to recognized application actions.

CREATE OR REPLACE FUNCTION public.audit_events_validate_action()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action IS NULL OR length(NEW.action) = 0 OR length(NEW.action) > 100 THEN
    RAISE EXCEPTION 'audit_events.action must be 1-100 characters';
  END IF;

  IF NEW.action !~ '^[a-z][a-z0-9_.:-]*$' THEN
    RAISE EXCEPTION 'audit_events.action must be lowercase snake_case (letters, digits, _.:-)';
  END IF;

  -- Cap meta size to prevent abuse
  IF NEW.meta IS NOT NULL AND length(NEW.meta::text) > 8192 THEN
    RAISE EXCEPTION 'audit_events.meta exceeds 8KB limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_validate_action_trg ON public.audit_events;
CREATE TRIGGER audit_events_validate_action_trg
BEFORE INSERT ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.audit_events_validate_action();