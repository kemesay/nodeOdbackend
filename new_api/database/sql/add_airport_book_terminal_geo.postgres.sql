-- PostgreSQL: run once if columns are missing (Sequelize sync() without alter won't add them).
-- psql -U postgres -d oda_transportation -f database/sql/add_airport_book_terminal_geo.postgres.sql

ALTER TABLE airport_books
  ADD COLUMN IF NOT EXISTS "airportLocationAddress" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "airportLocationLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "airportLocationLongitude" DOUBLE PRECISION;
