-- First drop the policies that depend on subject_id
DROP POLICY IF EXISTS "Students can view assigned subject videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON public.videos;

-- Add chapter_id column to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE;

-- Remove the old subject_id foreign key constraint and column
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_subject_id_fkey;
ALTER TABLE public.videos DROP COLUMN IF EXISTS subject_id;

-- Create new RLS policies
CREATE POLICY "Admins can manage videos" 
ON public.videos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view chapter videos" 
ON public.videos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chapters c
    JOIN student_subject_access ssa ON ssa.subject_id = c.subject_id
    WHERE c.id = videos.chapter_id AND ssa.student_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);