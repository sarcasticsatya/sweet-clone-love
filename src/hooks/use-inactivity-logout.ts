import { useState, useEffect, useCallback, useRef } from "react";

interface UseInactivityLogoutOptions {
  timeoutMs?: number;
  warningBeforeMs?: number;
  onLogout: () => void;
}

export function useInactivityLogout({
  timeoutMs = 30 * 60 * 1000, // 30 minutes default
  warningBeforeMs = 2 * 60 * 1000, // 2 minutes warning
  onLogout
}: UseInactivityLogoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningBeforeMs / 1000));
  
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setShowWarning(false);
    setRemainingSeconds(Math.floor(warningBeforeMs / 1000));

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.floor(warningBeforeMs / 1000));
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningBeforeMs);

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      onLogout();
    }, timeoutMs);
  }, [timeoutMs, warningBeforeMs, onLogout]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      // Only reset if not currently showing warning
      if (!showWarning) {
        resetTimer();
      }
    };

    // Initial timer setup
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer, showWarning]);

  return { showWarning, remainingSeconds, dismissWarning };
}
