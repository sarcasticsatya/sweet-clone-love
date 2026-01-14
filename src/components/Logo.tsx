import nythicLogo from "@/assets/nythic-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export const Logo = ({ size = "md", className }: LogoProps) => {
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-16 h-16"
  };
  
  return (
    <img 
      src={nythicLogo} 
      alt="Nythic AI" 
      className={cn(sizeClasses[size], "object-contain", className)}
    />
  );
};

export default Logo;
