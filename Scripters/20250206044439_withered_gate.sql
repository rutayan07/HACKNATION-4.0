/*
  # Add phone number to charging sessions

  1. Changes
    - Add phone_number column to charging_sessions table
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE charging_sessions 
ADD COLUMN IF NOT EXISTS phone_number text NOT NULL;