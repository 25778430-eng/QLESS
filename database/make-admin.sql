-- Make yourself a Qless admin.
-- 1. Sign in to the app once with your cellphone number, so your account exists.
-- 2. Put your number below in +27 format (082 123 4567 becomes +27821234567) and run this.
UPDATE "User" SET "role" = 'ADMIN' WHERE "phone" = '+27820000000';
