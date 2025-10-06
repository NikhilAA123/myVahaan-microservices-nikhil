-- This script is run automatically by Postgres on its first startup.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('passenger','driver')) NOT NULL DEFAULT 'passenger',
    is_available BOOLEAN DEFAULT true,
    -- --- THIS IS THE NEW PART ---
    current_h3_index TEXT, -- Will store the driver's current H3 hexagon ID
    location_updated_at TIMESTAMPTZ,
    -- --------------------------

);
CREATE INDEX idx_users_h3_index ON users(current_h3_index);

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