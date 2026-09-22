-- Live billing mode columns for hourly_charter_books (PostgreSQL)
-- Run once: npm run db:live-billing-columns
--
-- Adds:
--   billingMode              ENUM  PRE_BOOKED | LIVE  (default PRE_BOOKED)
--   preAuthBufferHours       INT   extra hours included in Square pre-auth for LIVE bookings
--   actualStartTime          TIMESTAMPTZ  when driver starts the trip clock
--   actualEndTime            TIMESTAMPTZ  when driver ends the trip clock
--   actualHoursUsed          DECIMAL(6,2) computed from start→end (15-min increments)
--   overtimeHours            DECIMAL(6,2) max(0, actualHoursUsed - selectedHours)
--   overtimeRateMultiplier   DECIMAL(4,2) industry-standard 1.5× default
--   overtimeAmountInDollars  DECIMAL(10,2) pricePerHour × overtimeHours × multiplier

-- 1. Create the billingMode ENUM type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'enum_hourly_charter_books_billingMode'
  ) THEN
    CREATE TYPE "enum_hourly_charter_books_billingMode" AS ENUM ('PRE_BOOKED', 'LIVE');
  END IF;
END $$;

-- 2. Add columns (all idempotent via ADD COLUMN IF NOT EXISTS)
ALTER TABLE hourly_charter_books
  ADD COLUMN IF NOT EXISTS "billingMode"
    "enum_hourly_charter_books_billingMode"
    NOT NULL DEFAULT 'PRE_BOOKED',

  ADD COLUMN IF NOT EXISTS "preAuthBufferHours"
    INTEGER NOT NULL DEFAULT 2,

  ADD COLUMN IF NOT EXISTS "actualStartTime"
    TIMESTAMPTZ NULL,

  ADD COLUMN IF NOT EXISTS "actualEndTime"
    TIMESTAMPTZ NULL,

  ADD COLUMN IF NOT EXISTS "actualHoursUsed"
    DECIMAL(6, 2) NULL,

  ADD COLUMN IF NOT EXISTS "overtimeHours"
    DECIMAL(6, 2) NULL DEFAULT 0,

  ADD COLUMN IF NOT EXISTS "overtimeRateMultiplier"
    DECIMAL(4, 2) NOT NULL DEFAULT 1.5,

  ADD COLUMN IF NOT EXISTS "overtimeAmountInDollars"
    DECIMAL(10, 2) NULL DEFAULT 0;

-- 3. Index for querying active LIVE trips efficiently
CREATE INDEX IF NOT EXISTS idx_hourly_live_billing
  ON hourly_charter_books ("billingMode", "bookingStatus")
  WHERE "billingMode" = 'LIVE';

-- 4. Backfill: all existing rows get PRE_BOOKED (already the column default, but explicit)
UPDATE hourly_charter_books
  SET "billingMode" = 'PRE_BOOKED'
  WHERE "billingMode" IS NULL;
