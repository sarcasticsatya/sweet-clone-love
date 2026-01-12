-- Add session tracking to student_profiles for single-device login
ALTER TABLE student_profiles 
ADD COLUMN active_session_id TEXT,
ADD COLUMN session_updated_at TIMESTAMPTZ;

-- Add progressive loading support to infographics table
ALTER TABLE infographics 
ADD COLUMN images_pending BOOLEAN DEFAULT false,
ADD COLUMN pages_data JSONB;

-- Allow authenticated users to update infographics (for background image updates)
CREATE POLICY "Authenticated users can update infographics"
ON infographics FOR UPDATE
USING (true)
WITH CHECK (true);