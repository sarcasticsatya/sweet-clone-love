-- Add DELETE policy for admins on student_profiles
CREATE POLICY "Admins can delete student profiles"
ON public.student_profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on quiz_attempts
CREATE POLICY "Admins can delete quiz attempts"
ON public.quiz_attempts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on chat_messages
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));