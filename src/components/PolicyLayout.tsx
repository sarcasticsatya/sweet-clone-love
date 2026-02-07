import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Atom, Calculator, Brain, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { FloatingIcon } from "@/components/landing/FloatingIcon";

const floatingIcons = [
  { icon: <Atom className="w-full h-full" />, x: 5, y: 20, delay: 0, size: "md" as const },
  { icon: <Calculator className="w-full h-full" />, x: 92, y: 35, delay: 1, size: "sm" as const },
  { icon: <Brain className="w-full h-full" />, x: 88, y: 75, delay: 2, size: "md" as const },
  { icon: <BookOpen className="w-full h-full" />, x: 8, y: 80, delay: 1.5, size: "sm" as const },
];

interface PolicyLayoutProps {
  title: string;
  children: ReactNode;
}
export const PolicyLayout = ({
  title,
  children
}: PolicyLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background animate-gradient relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Floating icons - hidden on mobile */}
      <div className="hidden md:block">
        {floatingIcons.map((iconProps, index) => (
          <FloatingIcon key={index} {...iconProps} />
        ))}
      </div>

      {/* Header with glass effect */}
      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Logo size="lg" className="w-12 h-12" />
            <div>
              <h1 className="text-xl"><BrandName size="lg" /></h1>
              <p className="text-xs text-primary font-medium">Your 24 X 7 Personal Teacher</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 p-6 md:p-8 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>
          
          <div className="prose prose-sm max-w-none text-foreground">
            {children}
          </div>
        </div>
      </main>

      {/* Footer with glass effect */}
      <footer className="relative z-10 border-t border-border bg-card/80 backdrop-blur-sm mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2025 <BrandName size="sm" className="font-medium" />.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/refund-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground/70">
              Developed by <span className="font-medium text-muted-foreground">AIWOS</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default PolicyLayout;