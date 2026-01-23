import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoPlayer } from "./VideoPlayer";
import { Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Video {
  id: string;
  title: string;
  title_kannada: string | null;
  description: string | null;
  video_url: string;
  video_type: string;
  timestamps: any;
}

interface VideosViewProps {
  chapterId: string | null;
}

export const VideosView = ({ chapterId }: VideosViewProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (chapterId) {
      loadVideos();
    } else {
      setVideos([]);
      setSelectedVideo(null);
    }
  }, [chapterId]);

  const loadVideos = async () => {
    if (!chapterId) return;

    const { data } = await supabase
      .from("videos")
      .select("id, title, title_kannada, description, video_url, video_type, timestamps")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false });

    setVideos(data || []);
    setSelectedVideo(null);
  };

  if (!chapterId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a chapter to see videos
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <Play className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h4 className="font-medium text-base mb-1">Coming Soon...</h4>
        <p className="text-sm text-muted-foreground">
          Videos for this chapter are being prepared
        </p>
      </div>
    );
  }

  // Video player in a dialog for better fullscreen access
  const renderVideoDialog = () => (
    <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <div 
          className="flex-1 p-4 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y pinch-zoom',
            overflowX: 'hidden',
            willChange: 'scroll-position',
            transform: 'translateZ(0)'
          }}
        >
          {selectedVideo && (
            <VideoPlayer
              videoUrl={selectedVideo.video_url}
              videoType={selectedVideo.video_type as "youtube" | "upload"}
              title={selectedVideo.title_kannada || selectedVideo.title}
              description={selectedVideo.description}
              timestamps={selectedVideo.timestamps}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Video list view
  return (
    <>
      {renderVideoDialog()}
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedVideo(video)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted">
                  {video.video_type === "youtube" ? (
                    <YoutubeThumbnail url={video.video_url} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                      <Play className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm line-clamp-2">
                    {video.title_kannada || video.title}
                  </h4>
                  {video.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </>
  );
};

// YouTube thumbnail component
const YoutubeThumbnail = ({ url }: { url: string }) => {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
  
  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Play className="w-12 h-12 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
      alt="Video thumbnail"
      className="w-full h-full object-cover"
    />
  );
};
