-- Add medium column to subjects table
ALTER TABLE public.subjects ADD COLUMN medium TEXT NOT NULL DEFAULT 'English';

-- Add constraint to ensure valid values
ALTER TABLE public.subjects ADD CONSTRAINT subjects_medium_check CHECK (medium IN ('English', 'Kannada'));

-- Link existing bundles to subjects based on medium
-- First, let's ensure bundle_subjects has the right relationships
-- Get the English bundle and link all English subjects
INSERT INTO public.bundle_subjects (bundle_id, subject_id)
SELECT cb.id, s.id
FROM public.course_bundles cb
CROSS JOIN public.subjects s
WHERE cb.name ILIKE '%English%' AND s.medium = 'English'
ON CONFLICT DO NOTHING;

-- Get the Kannada bundle and link all Kannada subjects  
INSERT INTO public.bundle_subjects (bundle_id, subject_id)
SELECT cb.id, s.id
FROM public.course_bundles cb
CROSS JOIN public.subjects s
WHERE cb.name ILIKE '%Kannada%' AND s.medium = 'Kannada'
ON CONFLICT DO NOTHING;

-- Create a function to auto-assign subjects when a student purchases a bundle
CREATE OR REPLACE FUNCTION public.auto_assign_subjects_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bundle_medium TEXT;
BEGIN
  -- Get the medium from the bundle name
  SELECT 
    CASE 
      WHEN cb.name ILIKE '%English%' THEN 'English'
      WHEN cb.name ILIKE '%Kannada%' THEN 'Kannada'
      ELSE NULL
    END INTO bundle_medium
  FROM public.course_bundles cb
  WHERE cb.id = NEW.bundle_id;
  
  -- If we found a valid medium, auto-assign all subjects of that medium
  IF bundle_medium IS NOT NULL THEN
    INSERT INTO public.student_subject_access (student_id, subject_id)
    SELECT NEW.student_id, s.id
    FROM public.subjects s
    WHERE s.medium = bundle_medium
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign subjects when payment is completed
CREATE TRIGGER on_purchase_complete
  AFTER INSERT OR UPDATE ON public.student_purchases
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.auto_assign_subjects_on_purchase();