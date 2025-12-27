import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Network, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MindmapViewProps {
  chapterId: string;
}

interface Branch {
  name: string;
  color?: string;
  subbranches?: string[];
}

interface MindmapStructure {
  title: string;
  branches: Branch[];
}

interface MindmapData {
  type?: string;
  structure?: MindmapStructure;
  imageUrl?: string;
}

export const MindmapView = ({ chapterId }: MindmapViewProps) => {
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    setMindmapData(null);
    setInitialLoad(true);
    if (chapterId) {
      loadMindmap();
    }
  }, [chapterId]);

  const loadMindmap = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      const { data: existingMindmap, error } = await supabase
        .from("mindmaps")
        .select("mindmap_data")
        .eq("chapter_id", chapterId)
        .single();

      console.log("Loaded mindmap data:", existingMindmap);

      if (existingMindmap && !error) {
        const data = existingMindmap.mindmap_data as MindmapData;
        console.log("Mindmap structure:", data);
        setMindmapData(data);
      }
    } catch (error) {
      console.error("Error loading mindmap:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const generateMindmap = async (regenerate = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { chapterId, regenerate },
      });

      if (error) throw error;

      setMindmapData(data.mindmap);
      toast.success(regenerate ? "Mind map regenerated!" : "Mind map generated!");
    } catch (error) {
      console.error("Error generating mindmap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const hasKannadaStructure = mindmapData?.type === "kannada-structure" && mindmapData?.structure;

  if (initialLoad && loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-2">
            <Network className="w-3.5 h-3.5" />
            Mind Map
          </h3>
          {mindmapData && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generateMindmap(true)}
              disabled={loading}
              className="h-6 w-6 p-0"
              title="Regenerate"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          ಅಧ್ಯಾಯದ ಮೈಂಡ್ ಮ್ಯಾಪ್
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="absolute inset-0 animate-ping opacity-25">
                  <Network className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">ಮೈಂಡ್ ಮ್ಯಾಪ್ ರಚಿಸಲಾಗುತ್ತಿದೆ...</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Generating Mind Map
                </p>
              </div>
            </div>
          ) : hasKannadaStructure ? (
            <div className="space-y-4">
              {/* Central Topic */}
              <div className="flex justify-center">
                <div className="bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg text-center max-w-[200px]">
                  <p className="font-bold text-sm leading-tight">
                    {mindmapData.structure!.title}
                  </p>
                </div>
              </div>

              {/* Branches */}
              <div className="space-y-3">
                {mindmapData.structure!.branches.map((branch, idx) => {
                  const color = branch.color || defaultColors[idx % defaultColors.length];
                  return (
                    <div key={idx} className="rounded-lg border overflow-hidden" style={{ borderColor: color }}>
                      {/* Branch Header */}
                      <div 
                        className="px-3 py-2 text-white font-semibold text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {branch.name}
                      </div>
                      
                      {/* Subbranches */}
                      {branch.subbranches && branch.subbranches.length > 0 && (
                        <div className="p-2 bg-background">
                          <div className="flex flex-wrap gap-1.5">
                            {branch.subbranches.map((sub, subIdx) => (
                              <span
                                key={subIdx}
                                className="text-xs px-2 py-1 rounded-full border"
                                style={{ 
                                  borderColor: color,
                                  color: color,
                                  backgroundColor: `${color}15`
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Network className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <RefreshCw className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  ಮೈಂಡ್ ಮ್ಯಾಪ್
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  ಅಧ್ಯಾಯದ ಪರಿಕಲ್ಪನಾ ನಕ್ಷೆಯನ್ನು ರಚಿಸಿ
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => generateMindmap(false)} 
                disabled={loading}
                className="text-xs"
              >
                ಮೈಂಡ್ ಮ್ಯಾಪ್ ರಚಿಸಿ
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
