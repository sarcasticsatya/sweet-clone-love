import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";

interface Timestamp {
  time: number;
  label: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  videoType: "youtube" | "upload";
  title: string;
  description?: string | null;
  timestamps?: Timestamp[] | null;
}

export const VideoPlayer = ({
  videoUrl,
  videoType,
  title,
  description,
  timestamps,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse timestamps from description if not provided directly
  const parsedTimestamps = timestamps || parseTimestampsFromDescription(description);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const seekToTimestamp = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        // Lock to landscape on mobile
        if (screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as any).lock("landscape");
          } catch (e) {
            // Orientation lock not supported or not allowed
          }
        }
      } else {
        await document.exitFullscreen();
        if (screen.orientation && 'unlock' in screen.orientation) {
          try {
            (screen.orientation as any).unlock();
          } catch (e) {
            // Orientation unlock not supported
          }
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  // YouTube seeking function using postMessage API
  const seekYouTube = (timeInSeconds: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [timeInSeconds, true]
        }),
        '*'
      );
      // Also try to play after seeking
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }),
        '*'
      );
    }
  };

  // YouTube embed handling
  if (videoType === "youtube") {
    const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&origin=${window.location.origin}` : null;

    return (
      <div className="space-y-4">
        <div ref={containerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {embedUrl ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Invalid YouTube URL
            </div>
          )}
        </div>

      <div className="space-y-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {/* Description timestamps hidden - only showing boxed timestamps */}
        </div>

        {parsedTimestamps && parsedTimestamps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Timestamps</h4>
            <div className="flex flex-wrap gap-2">
              {parsedTimestamps.map((ts, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => seekYouTube(ts.time)}
                >
                  {formatTime(ts.time)} - {ts.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Native video player for uploaded videos
  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full cursor-pointer"
          onClick={togglePlay}
          playsInline
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground ml-1" />
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="mb-3"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {/* Description timestamps hidden - only showing boxed timestamps */}
      </div>

      {parsedTimestamps && parsedTimestamps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Timestamps</h4>
          <div className="flex flex-wrap gap-2">
            {parsedTimestamps.map((ts, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => seekToTimestamp(ts.time)}
              >
                {formatTime(ts.time)} - {ts.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to parse timestamps from description
function parseTimestampsFromDescription(description?: string | null): Timestamp[] {
  if (!description) return [];

  const timestamps: Timestamp[] = [];
  
  // Pattern for START_TIME-END_TIME LABEL format (e.g., "00:00:01-00:00:12  ಪರಿಚಯ")
  const rangeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)/g;
  let match;

  while ((match = rangeRegex.exec(description)) !== null) {
    const timeStr = match[1]; // Start time
    const label = match[3].trim();

    const parts = timeStr.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }

    timestamps.push({ time: seconds, label });
  }

  // If range pattern found timestamps, return them
  if (timestamps.length > 0) {
    return timestamps;
  }

  // Fallback: Standard TIME - LABEL format (e.g., "0:30 - Introduction")
  const simpleRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*([^\d\n].+?)(?=\n|$)/g;
  while ((match = simpleRegex.exec(description)) !== null) {
    const timeStr = match[1];
    const label = match[2].trim();

    const parts = timeStr.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }

    timestamps.push({ time: seconds, label });
  }

  return timestamps;
}

// Helper function to render description with clickable timestamps
function renderDescriptionWithTimestamps(
  description: string,
  onSeek: (time: number) => void
) {
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
  const parts = description.split(regex);

  return parts.map((part, idx) => {
    if (regex.test(part)) {
      const timeParts = part.split(":").map(Number);
      let seconds = 0;
      if (timeParts.length === 3) {
        seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      } else if (timeParts.length === 2) {
        seconds = timeParts[0] * 60 + timeParts[1];
      }

      return (
        <button
          key={idx}
          className="text-primary hover:underline font-medium"
          onClick={() => onSeek(seconds)}
        >
          {part}
        </button>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default VideoPlayer;
