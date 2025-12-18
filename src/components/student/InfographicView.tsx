import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Image as ImageIcon, Download, RefreshCw, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InfographicViewProps {
  chapterId: string;
}

interface Infographic {
  image_url: string;
  image_urls?: string[];
}

export const InfographicView = ({ chapterId }: InfographicViewProps) => {
  const [infographic, setInfographic] = useState<Infographic | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Get all image URLs (handle both old single-image and new multi-page format)
  const imageUrls = infographic?.image_urls && infographic.image_urls.length > 0 
    ? infographic.image_urls 
    : infographic?.image_url 
      ? [infographic.image_url] 
      : [];

  const totalPages = imageUrls.length;

  useEffect(() => {
    setInfographic(null);
    setInitialLoad(true);
    setCurrentPage(0);
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
        .select("image_url, image_urls")
        .eq("chapter_id", chapterId)
        .single();

      if (existing && !error) {
        setInfographic({
          image_url: existing.image_url,
          image_urls: (existing.image_urls as string[]) || []
        });
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
    setCurrentPage(0);
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

      setInfographic({
        image_url: data.infographic.image_url,
        image_urls: data.infographic.image_urls || []
      });
      toast.success(regenerate ? "Infographic regenerated!" : "Infographic generated!");
    } catch (error) {
      console.error("Error generating infographic:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate infographic");
    } finally {
      setLoading(false);
    }
  };

  const downloadInfographic = () => {
    const currentImage = imageUrls[currentPage];
    if (!currentImage) return;

    try {
      const link = document.createElement("a");
      link.href = currentImage;
      link.download = `chapter-infographic-page-${currentPage + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
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
                title="Download current page"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {totalPages > 1 
            ? `Complete chapter summary in ${totalPages} pages`
            : "Visual summary of the entire chapter"
          }
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
                <p className="text-xs font-medium text-foreground">Generating Multi-Page Infographic...</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Creating comprehensive visual summaries
                </p>
              </div>
            </div>
          ) : infographic && imageUrls.length > 0 ? (
            <div className="space-y-3">
              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Current page image */}
              <div 
                className="relative cursor-pointer group"
                onClick={() => setZoomedImage(imageUrls[currentPage])}
              >
                <img
                  src={imageUrls[currentPage]}
                  alt={`Chapter Infographic Page ${currentPage + 1}`}
                  className="w-full rounded-lg border border-border shadow-sm"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>

              {/* Page dots */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-1.5">
                  {imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentPage ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                Tap image to zoom • Swipe or use arrows to navigate
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
                  Multi-Page Infographic
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  Generate a comprehensive visual summary covering all key concepts in multiple pages
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

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-2">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Infographic (zoomed)"
              className="w-full h-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
