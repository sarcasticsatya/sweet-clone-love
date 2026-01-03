-- Function to auto-assign new subject to all students with matching medium and active purchases
CREATE OR REPLACE FUNCTION public.auto_assign_subject_to_students()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert access for all students who:
  -- 1. Have matching medium in their profile
  -- 2. Have at least one active (non-expired) purchase with completed payment
  INSERT INTO public.student_subject_access (student_id, subject_id)
  SELECT DISTINCT sp.user_id, NEW.id
  FROM public.student_profiles sp
  WHERE sp.medium = NEW.medium
    AND EXISTS (
      SELECT 1 FROM public.student_purchases p
      WHERE p.student_id = sp.user_id
        AND p.payment_status = 'completed'
        AND p.expires_at > NOW()
    )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a new subject is added
CREATE TRIGGER on_subject_created
  AFTER INSERT ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_subject_to_students();