import { ReactNode } from "react";

interface FloatingIconProps {
  icon: ReactNode;
  delay?: number;
  x: number;
  y: number;
  size?: "sm" | "md" | "lg";
}

export const FloatingIcon = ({ icon, delay = 0, x, y, size = "md" }: FloatingIconProps) => {
  const sizeClasses = {
    sm: "w-6 h-6 md:w-8 md:h-8",
    md: "w-8 h-8 md:w-12 md:h-12",
    lg: "w-12 h-12 md:w-16 md:h-16",
  };

  return (
    <div
      className={`absolute ${sizeClasses[size]} text-primary/20 animate-float will-change-transform pointer-events-none`}
      style={{
        animationDelay: `${delay}s`,
        left: `${x}%`,
        top: `${y}%`,
      }}
    >
      {icon}
    </div>
  );
};

export default FloatingIcon;
