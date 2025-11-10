import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Play } from "lucide-react";

interface VideosViewProps {
  subjectId: string | null;
}

export const VideosView = ({ subjectId }: VideosViewProps) => {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    if (subjectId) {
      loadVideos();
    }
  }, [subjectId]);

  const loadVideos = async () => {
    if (!subjectId) return;

    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    setVideos(data || []);
  };

  if (!subjectId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a chapter to see subject videos
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No videos available for this subject yet
      </div>
    );
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <CardContent className="p-0">
              {video.video_type === "youtube" ? (
                <div className="aspect-video">
                  {getYouTubeEmbedUrl(video.video_url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(video.video_url)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <a 
                        href={video.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Video
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <video controls className="w-full">
                  <source src={video.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
              <div className="p-3">
                <h4 className="font-medium text-sm">
                  {video.title_kannada || video.title}
                </h4>
                {video.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {video.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
