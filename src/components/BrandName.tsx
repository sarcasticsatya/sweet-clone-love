import { cn } from "@/lib/utils";
import nythicLogoFull from "@/assets/nythic-logo-full.png";

interface BrandNameProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
}

export const BrandName = ({ size = "md", className }: BrandNameProps) => {
  const heightClasses = {
    xs: "h-4",
    sm: "h-5",
    md: "h-6",
    lg: "h-8",
    xl: "h-10",
    hero: "h-14 md:h-24",
  };

  return (
    <img
      src={nythicLogoFull}
      alt="Nythic AI"
      className={cn("inline-block object-contain", heightClasses[size], className)}
    />
  );
};

export default BrandName;
