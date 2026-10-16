-- PREPARED ONLY. Requires a reviewed, backed-up, write-free migration window.
-- Additive nullable fields: preserve every existing listing and legacy catalogue ID.
BEGIN;
ALTER TABLE commerce_listings
  ADD COLUMN IF NOT EXISTS taxonomy_category_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS taxonomy_subcategory_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS taxonomy_listing_type_slug VARCHAR(100);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_commerce_taxonomy_complete'
      AND conrelid = 'commerce_listings'::regclass
  ) THEN
    ALTER TABLE commerce_listings
      ADD CONSTRAINT ck_commerce_taxonomy_complete
      CHECK (
        (taxonomy_category_slug IS NULL AND taxonomy_subcategory_slug IS NULL AND taxonomy_listing_type_slug IS NULL)
        OR
        (taxonomy_category_slug IS NOT NULL AND taxonomy_subcategory_slug IS NOT NULL AND taxonomy_listing_type_slug IS NOT NULL)
      );
  END IF;
END $$;
COMMIT;


