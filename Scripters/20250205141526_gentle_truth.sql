/*
  # Create EV Charging Sessions Table

  1. New Tables
    - `charging_sessions`
      - `id` (uuid, primary key)
      - `start_time` (timestamptz)
      - `duration_minutes` (integer)
      - `cost` (decimal)
      - `status` (text) - 'active' or 'completed'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `charging_sessions` table
    - Add policy for public access (since ESP32 needs to read the data)
*/

CREATE TABLE IF NOT EXISTS charging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz DEFAULT now(),
  duration_minutes integer NOT NULL,
  cost decimal NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE charging_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access for ESP32
CREATE POLICY "Allow public read access"
  ON charging_sessions
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert"
  ON charging_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);