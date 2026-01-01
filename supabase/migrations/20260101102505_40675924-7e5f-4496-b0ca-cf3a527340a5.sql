-- Change chapter_number from integer to text for alphanumeric support (e.g., 1a, 1b, 2.1)
ALTER TABLE public.chapters 
ALTER COLUMN chapter_number TYPE TEXT 
USING chapter_number::TEXT;