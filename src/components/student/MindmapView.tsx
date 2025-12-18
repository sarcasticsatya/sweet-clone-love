import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Network, Download, RefreshCw, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MindmapViewProps {
  chapterId: string;
}

interface MindmapData {
  type?: string;
  imageUrl?: string;
  structure?: any;
  // Legacy fields
  nodes?: any[];
  edges?: any[];
}

export const MindmapView = ({ chapterId }: MindmapViewProps) => {
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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

      if (existingMindmap && !error) {
        setMindmapData(existingMindmap.mindmap_data as MindmapData);
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
      // If regenerating, delete existing mindmap first
      if (regenerate) {
        await supabase
          .from("mindmaps")
          .delete()
          .eq("chapter_id", chapterId);
      }

      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { chapterId },
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

  const downloadMindmap = () => {
    const imageUrl = mindmapData?.imageUrl;
    if (!imageUrl) {
      toast.error("No mindmap to download");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "mindmap.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  // Check if mindmap is image-based
  const isImageBased = mindmapData?.type === "image" && mindmapData?.imageUrl;

  if (initialLoad && loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-2">
            <Network className="w-3.5 h-3.5" />
            Mind Map
          </h3>
          {mindmapData && (
            <div className="flex gap-1">
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadMindmap} 
                className="h-6 w-6 p-0"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Visual concept map of the chapter
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
                <p className="text-xs font-medium text-foreground">Generating Mind Map...</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Creating a visual concept map
                </p>
              </div>
            </div>
          ) : isImageBased ? (
            <div className="space-y-3">
              {/* Mindmap image */}
              <div 
                className="relative cursor-pointer group"
                onClick={() => setZoomedImage(mindmapData.imageUrl!)}
              >
                <img
                  src={mindmapData.imageUrl}
                  alt="Chapter Mind Map"
                  className="w-full rounded-lg border border-border shadow-sm"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Tap to zoom • MindMaple style visualization
              </p>
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
                  Visual Mind Map
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  Generate a beautiful mind map image in MindMaple/NotebookLM style
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => generateMindmap(false)} 
                disabled={loading}
                className="text-xs"
              >
                Generate Mind Map
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-2">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Mind Map (zoomed)"
              className="w-full h-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
