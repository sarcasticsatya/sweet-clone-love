import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoPlayer } from "./VideoPlayer";
import { Play } from "lucide-react";

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
  subjectId: string | null;
}

export const VideosView = ({ subjectId }: VideosViewProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

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
    setSelectedVideo(null);
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

  // If a video is selected, show the player
  if (selectedVideo) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <button
            onClick={() => setSelectedVideo(null)}
            className="text-sm text-primary hover:underline"
          >
            ← Back to video list
          </button>

          <VideoPlayer
            videoUrl={selectedVideo.video_url}
            videoType={selectedVideo.video_type as "youtube" | "upload"}
            title={selectedVideo.title_kannada || selectedVideo.title}
            description={selectedVideo.description}
            timestamps={selectedVideo.timestamps}
          />
        </div>
      </ScrollArea>
    );
  }

  // Video list view
  return (
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
                  <YoutubeThumnail url={video.video_url} />
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
  );
};

// YouTube thumbnail component
const YoutubeThumnail = ({ url }: { url: string }) => {
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
