import { Atom, Calculator, Globe, Beaker, Ruler, MapPin, BookOpen, FlaskConical, Pi, Languages, Type } from "lucide-react";

const subjects = [
  {
    name: "Science",
    nameKannada: "ವಿಜ್ಞಾನ",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    icons: [Atom, Beaker, FlaskConical],
  },
  {
    name: "Mathematics",
    nameKannada: "ಗಣಿತ",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    icons: [Calculator, Ruler, Pi],
  },
  {
    name: "Social Science",
    nameKannada: "ಸಮಾಜ ವಿಜ್ಞಾನ",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    icons: [Globe, MapPin, BookOpen],
  },
  {
    name: "Kannada",
    nameKannada: "ಕನ್ನಡ",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
    icons: [BookOpen],
  },
  {
    name: "English",
    nameKannada: "ಇಂಗ್ಲೀಷ",
    color: "from-rose-500 to-red-500",
    bgColor: "bg-rose-500/10",
    icons: [Languages],
  },
  {
    name: "Hindi",
    nameKannada: "ಹಿಂದಿ",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-500/10",
    icons: [Type],
  },
];

export const SubjectsSection = () => {
  return (
    <section className="py-10 md:py-20 px-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-6 md:mb-16 space-y-2 md:space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">
            Complete SSLC Coverage
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
            All six SSLC subjects with comprehensive study materials
          </p>
        </div>

        {/* Subjects display - 3x2 grid on both mobile and desktop */}
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {subjects.map((subject, index) => (
            <div 
              key={subject.name}
              className="group relative animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Subject card */}
              <div className={`relative p-3 md:p-8 rounded-2xl md:rounded-3xl ${subject.bgColor} border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl`}>
                {/* Icons - single centered on mobile, floating on desktop */}
                <div className="relative h-14 md:h-32 mb-2 md:mb-6 flex justify-center items-center">
                  {/* Mobile: Show only first icon centered */}
                  <div className="md:hidden">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${subject.color} flex items-center justify-center shadow-lg`}>
                      {(() => {
                        const Icon = subject.icons[0];
                        return <Icon className="w-5 h-5 text-white" />;
                      })()}
                    </div>
                  </div>
                  
                  {/* Desktop: Floating icons */}
                  {subject.icons.length > 1 ? (
                    subject.icons.map((Icon, iconIndex) => (
                      <div
                        key={iconIndex}
                        className="hidden md:block absolute animate-float"
                        style={{
                          animationDelay: `${iconIndex * 0.5}s`,
                          left: `${20 + iconIndex * 25}%`,
                          top: `${iconIndex % 2 === 0 ? 10 : 40}%`,
                        }}
                      >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="hidden md:flex items-center justify-center">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 animate-float`}>
                        {(() => {
                          const Icon = subject.icons[0];
                          return <Icon className="w-8 h-8 text-white" />;
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject name */}
                <div className="text-center space-y-0.5 md:space-y-2">
                  <h3 className="text-sm md:text-2xl font-bold text-foreground">
                    {subject.name}
                  </h3>
                  <p className="text-xs md:text-base text-muted-foreground font-medium">
                    {subject.nameKannada}
                  </p>
                </div>

                {/* Hover gradient */}
                <div className={`absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br ${subject.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-6 md:mt-16 text-center">
          <p className="text-xs md:text-base text-muted-foreground">
            Available in both <span className="font-semibold text-foreground">English</span> and <span className="font-semibold text-foreground">Kannada (ಕನ್ನಡ)</span> medium
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
