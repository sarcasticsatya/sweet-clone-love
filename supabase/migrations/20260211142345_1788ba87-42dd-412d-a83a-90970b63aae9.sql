
CREATE OR REPLACE FUNCTION public.auto_assign_subjects_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  matched_medium TEXT;
BEGIN
  -- Dynamically find the first medium from subjects table whose name appears in the bundle name
  SELECT s.medium INTO matched_medium
  FROM (SELECT DISTINCT medium FROM public.subjects) s
  JOIN public.course_bundles cb ON cb.id = NEW.bundle_id
  WHERE cb.name ILIKE '%' || s.medium || '%'
  LIMIT 1;
  
  -- If we found a matching medium, auto-assign all subjects of that medium
  IF matched_medium IS NOT NULL THEN
    INSERT INTO public.student_subject_access (student_id, subject_id)
    SELECT NEW.student_id, s.id
    FROM public.subjects s
    WHERE s.medium = matched_medium
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
