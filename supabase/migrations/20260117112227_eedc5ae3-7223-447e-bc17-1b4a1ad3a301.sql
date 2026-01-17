-- Add started_at column to track when quiz was started
ALTER TABLE public.quiz_attempts 
ADD COLUMN started_at timestamp with time zone;