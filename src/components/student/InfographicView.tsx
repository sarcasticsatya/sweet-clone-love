import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Image, RefreshCw, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isKannadaUIRequired, infographicText } from "@/lib/languageUtils";

interface InfographicViewProps {
  chapterId: string;
  subjectId: string | null;
}

interface KannadaPage {
  title: string;
  keyPoints: string[];
  imageUrl?: string | null;
}

interface Infographic {
  image_url: string;
  image_urls?: any;
  kannada_pages?: KannadaPage[];
  images_pending?: boolean;
}

export const InfographicView = ({ chapterId, subjectId }: InfographicViewProps) => {
  const [infographic, setInfographic] = useState<Infographic | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imagesPending, setImagesPending] = useState(false);
  const [imagesReady, setImagesReady] = useState(0);
  const [useKannadaUI, setUseKannadaUI] = useState(false);

  useEffect(() => {
    setInfographic(null);
    setCurrentPage(0);
    setInitialLoad(true);
    setImagesPending(false);
    setImagesReady(0);
    fetchSubjectInfo();
    if (chapterId) {
      loadInfographic();
    }
  }, [chapterId, subjectId]);

  const fetchSubjectInfo = async () => {
    if (!subjectId) return;
    
    try {
      const { data: subject } = await supabase
        .from("subjects")
        .select("name, medium")
        .eq("id", subjectId)
        .single();
      
      if (subject) {
        setUseKannadaUI(isKannadaUIRequired(subject.name, subject.medium));
      }
    } catch (error) {
      console.error("Error fetching subject info:", error);
    }
  };

  const t = useKannadaUI ? infographicText.kn : infographicText.en;

  // Poll for image updates when images are pending
  useEffect(() => {
    if (!imagesPending || !chapterId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-infographic", {
          body: { chapterId, mode: "poll" },
        });

        if (data?.infographic) {
          const infographicData = data.infographic;
          const storedData = infographicData.image_urls as any;
          const pages = storedData?.kannada_pages || infographicData.kannada_pages || [];
          
          // Count ready images
          const readyCount = pages.filter((p: KannadaPage) => p.imageUrl).length;
          setImagesReady(readyCount);

          // Update pages
          setInfographic(prev => ({
            ...prev!,
            kannada_pages: pages,
            images_pending: infographicData.images_pending
          }));

          // Stop polling when all images are ready
          if (!infographicData.images_pending) {
            setImagesPending(false);
            toast.success(t.imagesReady);
          }
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [imagesPending, chapterId, t.imagesReady]);

  const loadInfographic = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from("infographics")
        .select("image_url, image_urls, images_pending")
        .eq("chapter_id", chapterId)
        .single();

      if (existing && !error) {
        const storedData = existing.image_urls as any;
        
        if (storedData?.kannada_pages && Array.isArray(storedData.kannada_pages)) {
          setInfographic({
            image_url: existing.image_url,
            image_urls: storedData.image_urls || [],
            kannada_pages: storedData.kannada_pages,
            images_pending: existing.images_pending
          });
          
          // If images are still pending, start polling
          if (existing.images_pending) {
            setImagesPending(true);
            const readyCount = storedData.kannada_pages.filter((p: KannadaPage) => p.imageUrl).length;
            setImagesReady(readyCount);
          }
        } else if (Array.isArray(storedData)) {
          setInfographic({
            image_url: existing.image_url,
            image_urls: storedData
          });
        } else {
          setInfographic({
            image_url: existing.image_url,
            image_urls: storedData?.image_urls || []
          });
        }
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
    setImagesPending(false);
    setImagesReady(0);
    
    try {
      // First, request quick mode to get key points immediately
      const { data: quickData, error: quickError } = await supabase.functions.invoke("generate-infographic", {
        body: { chapterId, regenerate, mode: "quick" },
      });

      if (quickError) throw quickError;

      if (quickData?.infographic) {
        // Show key points immediately
        setInfographic({
          image_url: quickData.infographic.image_url,
          kannada_pages: quickData.infographic.kannada_pages || [],
          images_pending: true
        });
        setLoading(false);
        setImagesPending(true);
        toast.success(t.keyPointsReady);

        // Now trigger full generation in background
        supabase.functions.invoke("generate-infographic", {
          body: { chapterId, regenerate: false, mode: "full" },
        }).then(({ data: fullData }) => {
          if (fullData?.infographic) {
            setInfographic({
              image_url: fullData.infographic.image_url,
              kannada_pages: fullData.infographic.kannada_pages || [],
              images_pending: false
            });
            setImagesPending(false);
            toast.success(t.complete);
          }
        }).catch(console.error);
      }
    } catch (error) {
      console.error("Error generating infographic:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
      setLoading(false);
    }
  };

  const kannadaPages = infographic?.kannada_pages || [];
  const totalPages = kannadaPages.length || 1;

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

  const currentKannadaPage = kannadaPages[currentPage];
  const currentImageUrl = currentKannadaPage?.imageUrl;

  if (initialLoad && loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          {useKannadaUI ? "ಲೋಡ್ ಆಗುತ್ತಿದೆ..." : "Loading..."}
        </p>
      </div>
    );
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-2">
            <Image className="w-3.5 h-3.5" />
            {t.title}
          </h3>
          {infographic && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generateInfographic(true)}
              disabled={loading}
              className="h-6 w-6 p-0"
              title={useKannadaUI ? "ಪುನಃ ರಚಿಸಿ" : "Regenerate"}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t.subtitle}
        </p>
        {imagesPending && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t.generatingImages(imagesReady, totalPages)}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="absolute inset-0 animate-ping opacity-25">
                  <Image className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">{t.generating}</p>
              </div>
            </div>
          ) : kannadaPages.length > 0 ? (
            <div className="space-y-4">
              {/* Page Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
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
                    {t.page(currentPage + 1, totalPages)}
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

              {/* Section Title */}
              {currentKannadaPage && (
                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-center">
                  <p className="font-bold text-sm">{currentKannadaPage.title}</p>
                </div>
              )}

              {/* Visual Diagram or Loading Skeleton */}
              {currentImageUrl ? (
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setZoomedImage(currentImageUrl)}
                >
                  <img
                    src={currentImageUrl}
                    alt="Visual Diagram"
                    className="w-full rounded-lg border border-border shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
              ) : imagesPending ? (
                <div className="space-y-2">
                  <Skeleton className="w-full h-48 rounded-lg" />
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{t.generatingImage}</span>
                  </div>
                </div>
              ) : null}

              {/* Key Points */}
              {currentKannadaPage?.keyPoints && currentKannadaPage.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t.keyPoints}
                  </p>
                  <div className="space-y-2">
                    {currentKannadaPage.keyPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border-l-4 bg-muted/50"
                        style={{ borderLeftColor: colors[idx % colors.length] }}
                      >
                        <p className="text-sm leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page indicators */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-1.5 pt-2">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : infographic?.image_url && infographic.image_url !== "pending" ? (
            <div className="space-y-3">
              <div 
                className="relative cursor-pointer group"
                onClick={() => setZoomedImage(infographic.image_url)}
              >
                <img
                  src={infographic.image_url}
                  alt="Infographic"
                  className="w-full rounded-lg border border-border shadow-sm"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Image className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <RefreshCw className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  {t.createDesc}
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => generateInfographic(false)} 
                disabled={loading}
                className="text-xs"
              >
                {t.create}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Zoomed"
              className="w-full h-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
