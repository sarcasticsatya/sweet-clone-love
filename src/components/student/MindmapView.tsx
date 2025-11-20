import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MindmapViewProps {
  chapterId: string;
}

export const MindmapView = ({ chapterId }: MindmapViewProps) => {
  const [mindmap, setMindmap] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateMindmap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { chapterId }
      });

      if (error) throw error;
      setMindmap(data.mindmap);
      toast.success("Mindmap generated!");
    } catch (error: any) {
      toast.error("Failed to generate mindmap: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMindmap("");
  }, [chapterId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Network className="w-4 h-4" />
            Mind Map
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Visual concept map of key topics
        </p>
        <Button 
          onClick={generateMindmap} 
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Mind Map"
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {mindmap ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{mindmap}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <Network className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Click "Generate Mind Map" to create a visual concept map
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
