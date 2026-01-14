import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseActivityTrackerProps {
  activityType: "chat" | "quiz" | "flashcard" | "video" | "mindmap" | "infographic";
  subjectId?: string | null;
  chapterId?: string | null;
  enabled?: boolean;
}

export function useActivityTracker({
  activityType,
  subjectId,
  chapterId,
  enabled = true,
}: UseActivityTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const lastLogRef = useRef<number>(Date.now());

  const logActivity = useCallback(async () => {
    if (!enabled) return;

    const now = Date.now();
    const durationSeconds = Math.floor((now - lastLogRef.current) / 1000);

    if (durationSeconds < 5) return; // Only log if at least 5 seconds

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("student_activity_logs").insert({
        student_id: user.id,
        subject_id: subjectId || null,
        chapter_id: chapterId || null,
        activity_type: activityType,
        duration_seconds: durationSeconds,
      });

      lastLogRef.current = now;
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }, [activityType, subjectId, chapterId, enabled]);

  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = Date.now();
    lastLogRef.current = Date.now();

    // Log activity every 60 seconds
    const interval = setInterval(logActivity, 60000);

    // Log when component unmounts
    return () => {
      clearInterval(interval);
      logActivity();
    };
  }, [enabled, logActivity]);

  return { logActivity };
}
