-- Create student activity logs table for tracking time spent
CREATE TABLE public.student_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;

-- Students can manage their own activity logs
CREATE POLICY "Students can manage own activity logs" 
  ON public.student_activity_logs FOR ALL 
  USING (student_id = auth.uid());

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" 
  ON public.student_activity_logs FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_activity_logs_student ON public.student_activity_logs(student_id);
CREATE INDEX idx_activity_logs_created ON public.student_activity_logs(created_at);