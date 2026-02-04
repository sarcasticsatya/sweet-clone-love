import { Bot, Layers, Brain, Video, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

        {/* Feature cards - horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid overflow-x-auto md:overflow-visible gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 min-w-[260px] md:min-w-0 snap-center flex-shrink-0 md:flex-shrink"
              style={{ 
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Icon with gradient background */}
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-base md:text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
