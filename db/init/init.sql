-- This script is run automatically by Postgres on its first startup.
-- It sets up the entire database schema needed for the application.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');

-- This table is for both passengers and drivers.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('passenger','driver')) NOT NULL DEFAULT 'passenger',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- THIS IS THE MISSING PART ---
-- This table will store the details for every ride taken.
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID REFERENCES users(id) NOT NULL,
    driver_id UUID REFERENCES users(id),
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    drop_lat DOUBLE PRECISION NOT NULL,
    drop_lng DOUBLE PRECISION NOT NULL,
    fare_amount NUMERIC(10,2),
    status ride_status DEFAULT 'requested',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- You can add the other tables from our design here as well...
-- CREATE TABLE vehicles (...)
-- CREATE TABLE ride_location_updates (...)
 