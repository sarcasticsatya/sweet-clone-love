import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { FloatingIcon } from "./FloatingIcon";
import { ArrowRight, Sparkles, Atom, Calculator, BookOpen, Globe, Microscope, PenTool, Brain, FlaskConical } from "lucide-react";

export const HeroSection = () => {
  const navigate = useNavigate();

  const floatingIcons = [
    { icon: <Atom className="w-full h-full" />, x: 5, y: 15, delay: 0, size: "lg" as const },
    { icon: <Calculator className="w-full h-full" />, x: 85, y: 20, delay: 1, size: "md" as const },
    { icon: <BookOpen className="w-full h-full" />, x: 10, y: 70, delay: 2, size: "md" as const },
    { icon: <Globe className="w-full h-full" />, x: 90, y: 65, delay: 0.5, size: "lg" as const },
    { icon: <Microscope className="w-full h-full" />, x: 15, y: 40, delay: 1.5, size: "sm" as const },
    { icon: <PenTool className="w-full h-full" />, x: 80, y: 45, delay: 2.5, size: "sm" as const },
    { icon: <Brain className="w-full h-full" />, x: 50, y: 10, delay: 3, size: "md" as const },
    { icon: <FlaskConical className="w-full h-full" />, x: 70, y: 80, delay: 1.8, size: "sm" as const },
  ];

  return (
    <section className="relative min-h-[60vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background animate-gradient">
      {/* Animated background gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Floating educational icons */}
      {floatingIcons.map((iconProps, index) => (
        <FloatingIcon key={index} {...iconProps} />
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center space-y-4 md:space-y-8 px-4 max-w-4xl mx-auto">
        {/* Logo with glow effect */}
        <div className="flex justify-center animate-fade-in-up">
          <div className="w-16 h-16 md:w-32 md:h-32 bg-primary rounded-2xl md:rounded-3xl flex items-center justify-center p-2 md:p-3 glow-primary shadow-2xl">
            <Logo size="lg" className="w-full h-full" />
          </div>
        </div>

        {/* Title with animation */}
        <div className="space-y-2 md:space-y-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-foreground">
            NythicAI
          </h1>
          <div className="flex items-center justify-center gap-2 text-primary font-medium text-base md:text-xl">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            <span>Your 24x7 Personal Teacher</span>
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        {/* Subtitle */}
        <p 
          className="text-sm md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          AI-powered learning platform designed for Karnataka SSLC students. 
          Master Science, Mathematics, and Social Studies with interactive tools and personalized guidance.
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center animate-fade-in-up"
          style={{ animationDelay: "0.6s" }}
        >
          <Button 
            size="lg" 
            className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => navigate("/auth")}
          >
            Start Learning
            <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-full border-2 hover:bg-primary/5 transition-all duration-300"
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Features
          </Button>
        </div>

        {/* Scroll indicator - hidden on mobile */}
        <div 
          className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle"
          style={{ animationDelay: "1s" }}
        >
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
