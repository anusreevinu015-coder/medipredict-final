-- Medipredict database schema
-- Applied via: npm run db:init

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side sessions. Only the SHA-256 hash of the opaque cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient profile details (one row per patient, linked to the auth account).
CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient medical history (one row per patient).
CREATE TABLE IF NOT EXISTS medical_histories (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  conditions TEXT,
  allergies TEXT,
  medications TEXT,
  surgeries TEXT,
  family_history TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploaded medical reports (files live on the server filesystem; metadata only here).
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'under_review', 'reviewed', 'rejected')),
  extraction_status TEXT NOT NULL DEFAULT 'none'
    CHECK (extraction_status IN ('none', 'processing', 'pending_confirmation', 'confirmed', 'failed')),
  extraction_quality TEXT
    CHECK (extraction_quality IN ('readable', 'low')),
  extraction_text TEXT,
  extraction_items JSONB NOT NULL DEFAULT '[]',
  extraction_report_date TEXT,
  extraction_diagnoses JSONB NOT NULL DEFAULT '[]',
  extraction_medicines JSONB NOT NULL DEFAULT '[]',
  extraction_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep previously created databases up to date while keeping installs idempotent.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_quality TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_text TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_report_date TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_diagnoses JSONB NOT NULL DEFAULT '[]';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_medicines JSONB NOT NULL DEFAULT '[]';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS extraction_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports (user_id);

-- AI assistant chat history (one message per row, linked to the patient).
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (user_id, created_at);

-- Patient-selectable service locations: the Tamil Nadu cities covered by the
-- hospital directory. latitude/longitude power "use my current location"
-- (nearest city) matching on the client. Reference data lives in the schema so
-- it exists even when seeding is skipped.
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL UNIQUE,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Tamil Nadu',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO locations (city, district, state, latitude, longitude, display_order) VALUES
  ('Coimbatore', 'Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, 1),
  ('Chennai', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707, 2),
  ('Madurai', 'Madurai', 'Tamil Nadu', 9.9252, 78.1198, 3),
  ('Tiruchirappalli', 'Tiruchirappalli', 'Tamil Nadu', 10.7905, 78.7047, 4),
  ('Tiruppur', 'Tiruppur', 'Tamil Nadu', 11.1085, 77.3411, 5),
  ('Salem', 'Salem', 'Tamil Nadu', 11.6643, 78.1460, 6),
  ('Erode', 'Erode', 'Tamil Nadu', 11.3410, 77.7172, 7),
  ('Pollachi', 'Pollachi', 'Tamil Nadu', 10.6580, 76.7734, 8)
ON CONFLICT (city) DO NOTHING;

-- Hospitals, departments and doctors used by the hospital recommendation
-- feature. The base tables are defined here; sample/seed VALUES live in
-- db/seed-hospitals.sql so they can be replaced with real data later.
-- Locations are restricted to Tamil Nadu, India (state column enforced on the
-- patient-facing recommendation/catalog queries).
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  state TEXT NOT NULL DEFAULT 'Tamil Nadu',
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  availability TEXT,
  hospital_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, city)
);

CREATE TABLE IF NOT EXISTS hospital_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, name)
);

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES hospital_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  experience INTEGER,
  availability TEXT,
  -- true when the profile is synthetic demo data (seeded) rather than a
  -- doctor an administrator entered. NULL means "unknown / pre-existing".
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, department_id, name)
);

CREATE INDEX IF NOT EXISTS hospitals_city_idx ON hospitals (city);
CREATE INDEX IF NOT EXISTS hospital_departments_name_idx ON hospital_departments (name);
CREATE INDEX IF NOT EXISTS doctors_department_id_idx ON doctors (department_id);

-- Keep previously created databases up to date while keeping installs idempotent.
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'Tamil Nadu';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_type TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience INTEGER;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_demo BOOLEAN;

-- Creates the district index only after the column is guaranteed to exist.
CREATE INDEX IF NOT EXISTS hospitals_district_idx ON hospitals (district);

-- Patient appointment bookings. The patient identity always comes from the
-- authenticated session (user_id), never from the client.
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  department_id UUID NOT NULL REFERENCES hospital_departments(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments (user_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments (appointment_date);

-- Patient feedback and ratings. The patient identity always comes from the
-- authenticated session (user_id), never from the client. Hospital, doctor and
-- appointment associations are optional so feedback stays valid even if the
-- referenced booking is later removed.
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_hospital_id_idx ON feedback (hospital_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Bootstrap admin account (password: admin123) - change immediately after first login.
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Administrator',
  'admin@medipredict.app',
  '$2a$12$ewN2p.e7i3YNw9gu8khV5u/v/PnzSC8h6a/hPTWYjrRBgGA40Jbii',
  'admin'
)
ON CONFLICT (email) DO NOTHING;