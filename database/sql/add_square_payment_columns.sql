-- Square payment integration (PostgreSQL)
-- Run once against oda_transportation database.

-- Ledger for Square payments per booking
CREATE TABLE IF NOT EXISTS payment_transactions (
  "paymentTransactionId" BIGSERIAL PRIMARY KEY,
  "bookingType" VARCHAR(16) NOT NULL CHECK ("bookingType" IN ('AIRPORT', 'P2P', 'HOURLY')),
  "bookingId" BIGINT NOT NULL,
  "squarePaymentId" VARCHAR(64),
  "idempotencyKey" VARCHAR(64) NOT NULL UNIQUE,
  "amountCents" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "rawResponse" JSONB,
  "confirmationNumber" VARCHAR(64),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking
  ON payment_transactions ("bookingType", "bookingId");

CREATE INDEX IF NOT EXISTS idx_payment_transactions_square_payment_id
  ON payment_transactions ("squarePaymentId");

-- Tokenized card metadata on saved payment methods
ALTER TABLE payment_details
  ADD COLUMN IF NOT EXISTS "squareCustomerId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "squareCardId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "cardBrand" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "last4" VARCHAR(4),
  ADD COLUMN IF NOT EXISTS "expMonth" SMALLINT,
  ADD COLUMN IF NOT EXISTS "expYear" SMALLINT;

-- Optional: allow null PAN for Square-only rows (legacy rows keep existing data)
ALTER TABLE payment_details
  ALTER COLUMN "creditCardNumber" DROP NOT NULL,
  ALTER COLUMN "expirationDate" DROP NOT NULL,
  ALTER COLUMN "securityCode" DROP NOT NULL;

-- Booking paymentMethod enums: allow Square tokenized methods.
-- These enums may already exist depending on how the DB was created.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_hourly_charter_books_paymentMethod') THEN
    ALTER TYPE "enum_hourly_charter_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_NEW_CARD';
    ALTER TYPE "enum_hourly_charter_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_SAVED_CARD';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_point_to_point_books_paymentMethod') THEN
    ALTER TYPE "enum_point_to_point_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_NEW_CARD';
    ALTER TYPE "enum_point_to_point_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_SAVED_CARD';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_airport_books_paymentMethod') THEN
    ALTER TYPE "enum_airport_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_NEW_CARD';
    ALTER TYPE "enum_airport_books_paymentMethod" ADD VALUE IF NOT EXISTS 'SQUARE_SAVED_CARD';
  END IF;
END $$;

-- payment_status: add AUTHORIZED if using native PG enums (Sequelize sync may handle this)
-- ALTER TYPE "enum_airport_books_paymentStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
