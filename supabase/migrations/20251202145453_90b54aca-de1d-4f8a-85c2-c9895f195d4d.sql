-- Function to create student profile from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create profile if user metadata indicates student signup
  IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL THEN
    INSERT INTO public.student_profiles (
      user_id,
      first_name,
      surname,
      date_of_birth,
      city,
      school_name,
      medium,
      parent_mobile,
      parent_email,
      personal_email
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'surname', ''),
      COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::date, CURRENT_DATE),
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'school_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'medium', ''),
      COALESCE(NEW.raw_user_meta_data->>'parent_mobile', ''),
      COALESCE(NEW.raw_user_meta_data->>'parent_email', ''),
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create student profile on user signup
CREATE TRIGGER on_auth_user_created_student_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student_profile();