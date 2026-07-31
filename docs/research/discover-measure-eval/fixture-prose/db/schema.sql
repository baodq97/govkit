-- The spreadsheet replacement someone started and abandoned.
CREATE TABLE booking (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  lane          TEXT NOT NULL,
  container     TEXT,
  wanted_on     DATE,
  status        TEXT
);

CREATE TABLE quote (
  id         SERIAL PRIMARY KEY,
  booking_id INT REFERENCES booking(id),
  base_rate  NUMERIC(12,2),
  surcharges NUMERIC(12,2),
  quoted_on  DATE
);

CREATE TABLE movement (
  id         SERIAL PRIMARY KEY,
  booking_id INT REFERENCES booking(id),
  event      TEXT,
  noted_at   TIMESTAMP
);
