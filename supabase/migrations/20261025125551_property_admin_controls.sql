ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'exclusive';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'price_reduced';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'under_contract';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.properties.is_featured IS
  'Administrator-selected homepage favorite.';
COMMENT ON COLUMN public.properties.is_online IS
  'Whether the property is visible on public property listings and detail pages.';

UPDATE public.properties
SET is_featured = true
WHERE id IN (6667, 5213, 5212, 5211, 5209, 5208, 5207, 5206, 5205);
