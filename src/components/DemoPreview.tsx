import { Card } from "@/components/ui/card";

export const DemoPreview = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            See It In Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch how easy it is to build beautiful applications
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Card className="bg-card border-border overflow-hidden shadow-glow-primary">
            <div className="aspect-video bg-secondary/50 flex items-center justify-center relative">
              {/* Split screen mockup */}
              <div className="w-full h-full grid grid-cols-2 gap-1 p-4">
                {/* Chat side */}
                <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary" />
                    <span className="font-medium text-sm">AI Assistant</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                      <p className="text-xs text-muted-foreground">Create a landing page for my app</p>
                    </div>
                    <div className="bg-primary/20 rounded-lg p-3 max-w-[80%] ml-auto">
                      <p className="text-xs text-foreground">I'll create a beautiful landing page...</p>
                    </div>
                  </div>
                  <div className="h-10 bg-muted/30 rounded-lg mt-4" />
                </div>

                {/* Preview side */}
                <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                    <span className="font-medium text-xs ml-2">Live Preview</span>
                  </div>
                  <div className="flex-1 bg-gradient-hero rounded-lg p-6 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-lg animate-pulse-glow" />
                      <div className="h-4 bg-muted/30 rounded w-32 mx-auto" />
                      <div className="h-3 bg-muted/20 rounded w-24 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
