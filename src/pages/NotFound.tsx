import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle, Atom, Calculator, Brain, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingIcon } from "@/components/landing/FloatingIcon";

const floatingIcons = [
  { icon: <Atom className="w-full h-full" />, x: 10, y: 15, delay: 0, size: "md" as const },
  { icon: <Calculator className="w-full h-full" />, x: 85, y: 25, delay: 0.5, size: "sm" as const },
  { icon: <Brain className="w-full h-full" />, x: 90, y: 65, delay: 1, size: "md" as const },
  { icon: <BookOpen className="w-full h-full" />, x: 5, y: 75, delay: 1.5, size: "sm" as const },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-background animate-gradient relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Floating icons - hidden on mobile */}
      <div className="hidden md:block">
        {floatingIcons.map((iconProps, index) => (
          <FloatingIcon key={index} {...iconProps} />
        ))}
      </div>
      
      {/* Centered content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center glow-primary">
            <AlertTriangle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">Oops! Page not found</p>
          <p className="text-sm text-muted-foreground/80">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="rounded-full px-6"
            size="lg"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
