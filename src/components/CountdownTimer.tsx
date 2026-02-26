import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: string;
}

export const CountdownTimer = ({ expiresAt }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };

    setTimeLeft(calc());
    const interval = setInterval(() => {
      const t = calc();
      setTimeLeft(t);
      if (t.expired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.expired) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive animate-pulse">
      <Clock className="w-3.5 h-3.5" />
      <span>
        Offer ends in {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
        {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
};
