import { Bot, Layers, Brain, Video, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Tutoring",
    description: "Get instant answers to your doubts 24/7 with our intelligent AI tutor that understands your curriculum.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Layers,
    title: "Interactive Flashcards",
    description: "Reinforce your learning with smart flashcards generated from your textbook chapters.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Brain,
    title: "Mind Maps & Infographics",
    description: "Visualize complex concepts with auto-generated mind maps and beautiful infographics.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Video,
    title: "Video Lessons",
    description: "Watch curated video explanations with timestamped navigation for quick learning.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: ClipboardList,
    title: "Practice Quizzes",
    description: "Test your knowledge with AI-generated quizzes and track your progress over time.",
    color: "from-indigo-500 to-violet-500",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-10 md:py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-6 md:mb-16 space-y-2 md:space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">
            Everything You Need to Excel
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful learning tools designed specifically for SSLC preparation
          </p>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden px-4">
          <Carousel 
            opts={{ align: "start", loop: true }} 
            plugins={[
              Autoplay({
                delay: 4000,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
              })
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {features.map((feature, index) => (
                <CarouselItem key={feature.title} className="pl-2 basis-[85%]">
                  <Card 
                    className="group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-500"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 bg-background/80 hover:bg-background border-border" />
            <CarouselNext className="right-0 bg-background/80 hover:bg-background border-border" />
          </Carousel>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
