import { Atom, Calculator, Globe, Beaker, Ruler, MapPin, BookOpen, FlaskConical, Pi } from "lucide-react";

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
];

export const SubjectsSection = () => {
  return (
    <section className="py-20 px-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Complete SSLC Coverage
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All three core subjects with comprehensive study materials
          </p>
        </div>

        {/* Subjects display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {subjects.map((subject, index) => (
            <div 
              key={subject.name}
              className="group relative"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Subject card */}
              <div className={`relative p-8 rounded-3xl ${subject.bgColor} border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl`}>
                {/* Floating icons */}
                <div className="relative h-32 mb-6">
                  {subject.icons.map((Icon, iconIndex) => (
                    <div
                      key={iconIndex}
                      className="absolute animate-float"
                      style={{
                        animationDelay: `${iconIndex * 0.5}s`,
                        left: `${20 + iconIndex * 25}%`,
                        top: `${iconIndex % 2 === 0 ? 10 : 40}%`,
                      }}
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subject name */}
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    {subject.name}
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    {subject.nameKannada}
                  </p>
                </div>

                {/* Hover gradient */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${subject.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Available in both <span className="font-semibold text-foreground">English</span> and <span className="font-semibold text-foreground">Kannada (ಕನ್ನಡ)</span> medium
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
