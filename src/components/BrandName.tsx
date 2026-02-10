import { cn } from "@/lib/utils";

interface BrandNameProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
}

export const BrandName = ({ size = "md", className }: BrandNameProps) => {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
    hero: "text-4xl md:text-7xl",
  };

  return (
    <span className={cn("font-bold tracking-tight", sizeClasses[size], className)}>
      <span style={{ fontFamily: "'Poppins', sans-serif" }}>Nythic</span>
      <span style={{ fontFamily: "'Movatif W00 Regular', 'Poppins', sans-serif", letterSpacing: '0.05em' }} className="ml-1.5">AI</span>
    </span>
  );
};

export default BrandName;
