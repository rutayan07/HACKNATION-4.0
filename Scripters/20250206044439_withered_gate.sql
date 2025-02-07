
ALTER TABLE charging_sessions 
ADD COLUMN IF NOT EXISTS phone_number text NOT NULL;
