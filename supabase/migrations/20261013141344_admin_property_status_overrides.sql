ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'reserved';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS admin_status_override public.property_status;

COMMENT ON COLUMN public.properties.admin_status_override IS
  'Status selected by an administrator; it takes precedence over provider feed updates.';

CREATE OR REPLACE FUNCTION public.preserve_admin_property_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.admin_status_override IS DISTINCT FROM OLD.admin_status_override THEN
    NEW.status := NEW.admin_status_override;
  ELSIF OLD.admin_status_override IS NOT NULL THEN
    NEW.status := OLD.admin_status_override;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_admin_property_status ON public.properties;
CREATE TRIGGER preserve_admin_property_status
  BEFORE UPDATE OF status, admin_status_override ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_admin_property_status();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'properties'
    ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.properties';
  END IF;
END;
$$;
