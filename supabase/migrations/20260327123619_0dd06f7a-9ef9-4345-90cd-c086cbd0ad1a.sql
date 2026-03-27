
-- Add age column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS age integer;

-- Update handle_new_user to also create a students record for student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );

  -- Auto-create students record for student role
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.students (profile_id, grade, age)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'class',
      (NEW.raw_user_meta_data->>'age')::integer
    );
  END IF;

  RETURN NEW;
END;
$function$;
