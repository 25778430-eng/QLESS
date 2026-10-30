-- Reviews and star ratings can't be changed once posted.
-- The only change allowed is the POPIA clean-up blanking old review text.
CREATE OR REPLACE FUNCTION "review_locked"() RETURNS trigger AS $$
BEGIN
  IF NEW."rating" IS DISTINCT FROM OLD."rating"
     OR NEW."bookingId" IS DISTINCT FROM OLD."bookingId"
     OR NEW."vendorId" IS DISTINCT FROM OLD."vendorId"
     OR NEW."customerId" IS DISTINCT FROM OLD."customerId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR (NEW."text" IS DISTINCT FROM OLD."text" AND NEW."text" <> '') THEN
    RAISE EXCEPTION 'Reviews cannot be changed once posted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "review_locked" ON "Review";
CREATE TRIGGER "review_locked" BEFORE UPDATE ON "Review" FOR EACH ROW EXECUTE FUNCTION "review_locked"();
