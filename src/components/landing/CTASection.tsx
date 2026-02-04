import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-10 md:py-20 px-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="max-w-4xl mx-auto text-center space-y-4 md:space-y-8">
        {/* Main CTA */}
        <div className="space-y-2 md:space-y-4">
          <h2 className="text-xl md:text-4xl font-bold text-foreground">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of SSLC students who are already learning smarter with NythicAI
          </p>
        </div>

        <Button 
          size="lg" 
          className="text-base md:text-lg px-8 md:px-10 py-5 md:py-7 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          onClick={() => navigate("/auth")}
        >
          Get Started Now
          <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
        </Button>

        {/* Contact Support - compact on mobile */}
        <div className="pt-4 md:pt-8 border-t border-border/50 mt-4 md:mt-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2 md:mb-3">
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base font-medium">Need Help? Contact Support</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            <span className="text-sm md:text-base text-muted-foreground">+91 82773 23208</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 md:h-7 md:w-7" 
              onClick={() => {
                navigator.clipboard.writeText("8277323208");
                toast.success("Phone number copied!");
              }}
            >
              <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
