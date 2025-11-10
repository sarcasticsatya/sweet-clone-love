import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Eye, Zap, Code, Database, Smartphone } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Interface",
    description: "Simply describe what you want to build. Our AI understands and creates it for you.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description: "See your changes instantly in real-time as you chat with the AI.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Build complete applications in minutes, not weeks. Iterate rapidly with AI.",
  },
  {
    icon: Code,
    title: "Clean Code",
    description: "Generate production-ready code with best practices built in.",
  },
  {
    icon: Database,
    title: "Full-Stack Ready",
    description: "Create databases, APIs, and authentication with simple commands.",
  },
  {
    icon: Smartphone,
    title: "Responsive Design",
    description: "Every app is mobile-friendly and works perfectly on all devices.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-4 relative">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features that make building apps simple and enjoyable
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow-primary group"
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
