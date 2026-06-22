-- Square payment integration (MySQL / MariaDB)
-- Run once against production database (e.g. odatra5_dev_db).
-- Prefer: npm run db:square-columns (auto-detects dialect)

-- Ledger for Square payments per booking
CREATE TABLE IF NOT EXISTS payment_transactions (
  paymentTransactionId BIGINT NOT NULL AUTO_INCREMENT,
  bookingType ENUM('AIRPORT', 'P2P', 'HOURLY') NOT NULL,
  bookingId BIGINT NOT NULL,
  squarePaymentId VARCHAR(64) NULL,
  idempotencyKey VARCHAR(64) NOT NULL,
  amountCents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM(
    'PENDING',
    'AUTHORIZED',
    'COMPLETED',
    'FAILED',
    'CANCELED',
    'REFUNDED'
  ) NOT NULL DEFAULT 'PENDING',
  rawResponse JSON NULL,
  confirmationNumber VARCHAR(64) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (paymentTransactionId),
  UNIQUE KEY uq_payment_transactions_idempotency (idempotencyKey),
  KEY idx_payment_transactions_booking (bookingType, bookingId),
  KEY idx_payment_transactions_square_payment_id (squarePaymentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
