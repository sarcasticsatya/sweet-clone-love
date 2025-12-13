import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InfographicViewProps {
  chapterId: string;
}

export const InfographicView = ({ chapterId }: InfographicViewProps) => {
  const [infographic, setInfographic] = useState<{ image_url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    setInfographic(null);
    setInitialLoad(true);
    if (chapterId) {
      loadInfographic();
    }
  }, [chapterId]);

  const loadInfographic = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      // Check for existing cached infographic
      const { data: existing, error } = await supabase
        .from("infographics")
        .select("image_url")
        .eq("chapter_id", chapterId)
        .single();

      if (existing && !error) {
        setInfographic(existing);
      }
    } catch (error) {
      console.error("Error loading infographic:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const generateInfographic = async (regenerate = false) => {
    setLoading(true);
    try {
      // If regenerating, delete existing infographic first
      if (regenerate) {
        await supabase
          .from("infographics")
          .delete()
          .eq("chapter_id", chapterId);
      }

      const { data, error } = await supabase.functions.invoke("generate-infographic", {
        body: { chapterId },
      });

      if (error) throw error;

      setInfographic(data.infographic);
      toast.success(regenerate ? "Infographic regenerated!" : "Infographic generated!");
    } catch (error) {
      console.error("Error generating infographic:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate infographic");
    } finally {
      setLoading(false);
    }
  };

  const downloadInfographic = () => {
    if (!infographic?.image_url) return;

    try {
      const link = document.createElement("a");
      link.href = infographic.image_url;
      link.download = "chapter-infographic.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Download failed");
    }
  };

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
            <ImageIcon className="w-3.5 h-3.5" />
            Chapter Infographic
          </h3>
          {infographic && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => generateInfographic(true)}
                disabled={loading}
                className="h-6 w-6 p-0"
                title="Regenerate"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadInfographic} 
                className="h-6 w-6 p-0"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Visual summary of the entire chapter
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="absolute inset-0 animate-ping opacity-25">
                  <ImageIcon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">Generating Infographic...</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Creating a visual summary of your chapter
                </p>
              </div>
            </div>
          ) : infographic ? (
            <div className="space-y-3">
              <img
                src={infographic.image_url}
                alt="Chapter Infographic"
                className="w-full rounded-lg border border-border shadow-sm"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Tap to zoom • Long press to save
              </p>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <RefreshCw className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Chapter Infographic
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  Generate a visual poster summarizing all key concepts
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => generateInfographic(false)} 
                disabled={loading}
                className="text-xs"
              >
                Generate Infographic
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
