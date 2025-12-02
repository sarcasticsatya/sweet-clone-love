-- Create student_profiles table for additional student details
CREATE TABLE public.student_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  surname text NOT NULL,
  date_of_birth date NOT NULL,
  city text NOT NULL,
  school_name text NOT NULL,
  medium text NOT NULL CHECK (medium IN ('Kannada', 'English', 'Other')),
  parent_mobile text NOT NULL,
  parent_email text NOT NULL,
  personal_email text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own profile"
ON public.student_profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can insert their own profile"
ON public.student_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update their own profile"
ON public.student_profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all student profiles"
ON public.student_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all student profiles"
ON public.student_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();