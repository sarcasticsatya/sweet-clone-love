-- Fix overly permissive RLS policies for educational content

-- 1. Fix email_verification_tokens - remove overly permissive policy
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_verification_tokens;

-- Only allow users to view their own tokens (service role bypasses RLS anyway)
CREATE POLICY "Users can view own verification tokens"
ON public.email_verification_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Fix infographics - restrict to users with subject access
DROP POLICY IF EXISTS "Anyone can view infographics" ON public.infographics;

CREATE POLICY "Students can view infographics for accessible chapters"
ON public.infographics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.student_subject_access ssa ON ssa.subject_id = c.subject_id
    WHERE c.id = infographics.chapter_id AND ssa.student_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix mindmaps - restrict to users with subject access
DROP POLICY IF EXISTS "Anyone can view mindmaps" ON public.mindmaps;

CREATE POLICY "Students can view mindmaps for accessible chapters"
ON public.mindmaps FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.student_subject_access ssa ON ssa.subject_id = c.subject_id
    WHERE c.id = mindmaps.chapter_id AND ssa.student_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix quizzes - restrict to users with subject access
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;

CREATE POLICY "Students can view quizzes for accessible chapters"
ON public.quizzes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.student_subject_access ssa ON ssa.subject_id = c.subject_id
    WHERE c.id = quizzes.chapter_id AND ssa.student_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Fix flashcards - restrict to users with subject access
DROP POLICY IF EXISTS "Anyone can view flashcards" ON public.flashcards;

CREATE POLICY "Students can view flashcards for accessible chapters"
ON public.flashcards FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.student_subject_access ssa ON ssa.subject_id = c.subject_id
    WHERE c.id = flashcards.chapter_id AND ssa.student_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Fix chapter-pdfs storage bucket - make it private
UPDATE storage.buckets SET public = false WHERE id = 'chapter-pdfs';

-- Update storage policy to check subject access
DROP POLICY IF EXISTS "Authenticated users can view chapter PDFs" ON storage.objects;

CREATE POLICY "Students can view PDFs for accessible subjects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chapter-pdfs' AND (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.student_subject_access ssa ON ssa.subject_id = c.subject_id
      WHERE c.pdf_storage_path = name AND ssa.student_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);