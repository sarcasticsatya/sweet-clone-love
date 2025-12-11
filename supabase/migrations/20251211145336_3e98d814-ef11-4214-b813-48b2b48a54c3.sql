-- Course bundles table
CREATE TABLE public.course_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_kannada text,
  description text,
  price_inr numeric(10,2) NOT NULL,
  validity_days integer NOT NULL DEFAULT 365,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student purchases table (Stripe-ready structure)
CREATE TABLE public.student_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.course_bundles(id),
  amount_paid numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'dummy',
  stripe_payment_id text,
  stripe_session_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(student_id, bundle_id)
);

-- Link bundles to subjects
CREATE TABLE public.bundle_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.course_bundles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, subject_id)
);

-- Add timestamps column to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS timestamps jsonb;

-- Enable RLS
ALTER TABLE public.course_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_bundles
CREATE POLICY "Anyone can view active course bundles" ON public.course_bundles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage course bundles" ON public.course_bundles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for student_purchases
CREATE POLICY "Students can view their own purchases" ON public.student_purchases
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own purchases" ON public.student_purchases
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all purchases" ON public.student_purchases
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bundle_subjects
CREATE POLICY "Anyone can view bundle subjects" ON public.bundle_subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage bundle subjects" ON public.bundle_subjects
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert the two course bundles
INSERT INTO public.course_bundles (name, name_kannada, description, price_inr, validity_days) VALUES
('SSLC English Medium Complete Course', 'SSLC ಇಂಗ್ಲಿಷ್ ಮಾಧ್ಯಮ ಸಂಪೂರ್ಣ ಕೋರ್ಸ್', 'Complete SSLC preparation in English medium with all subjects, video lessons, flashcards, quizzes, and AI tutoring.', 2999.00, 365),
('SSLC Kannada Medium Complete Course', 'SSLC ಕನ್ನಡ ಮಾಧ್ಯಮ ಸಂಪೂರ್ಣ ಕೋರ್ಸ್', 'Complete SSLC preparation in Kannada medium with all subjects, video lessons, flashcards, quizzes, and AI tutoring.', 2999.00, 365);