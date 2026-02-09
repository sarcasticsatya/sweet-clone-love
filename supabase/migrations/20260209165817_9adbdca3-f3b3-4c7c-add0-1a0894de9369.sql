ALTER TABLE public.course_bundles
  ADD COLUMN features jsonb DEFAULT '["All subjects included", "Video lessons & AI tutoring", "Flashcards & quizzes", "Mind maps for each chapter"]'::jsonb;