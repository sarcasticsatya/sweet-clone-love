import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Video, Plus, ExternalLink, Upload, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const ManageVideos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [titleKannada, setTitleKannada] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    loadVideos();
    loadSubjects();
  }, []);

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*, subjects(*)")
      .order("created_at", { ascending: false });
    
    setVideos(data || []);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    
    setSubjects(data || []);
  };

  const handleUploadVideo = async () => {
    if (!selectedSubjectId || !title) {
      toast.error("Please fill all required fields");
      return;
    }

    if (videoType === "youtube" && !youtubeUrl) {
      toast.error("Please provide YouTube URL");
      return;
    }

    if (videoType === "upload" && !videoFile) {
      toast.error("Please select a video file");
      return;
    }

    setLoading(true);
    try {
      let videoUrl = youtubeUrl;
      let storagePath = null;

      if (videoType === "upload" && videoFile) {
        setIsUploading(true);
        setUploadProgress(0);

        const fileExt = videoFile.name.split(".").pop();
        const fileName = `${selectedSubjectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload with progress tracking using XMLHttpRequest
        const { data: { session } } = await supabase.auth.getSession();
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percent);
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error('Upload failed'));
            }
          });
          
          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          xhr.open('POST', `${supabaseUrl}/storage/v1/object/subject-videos/${fileName}`);
          xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);
          xhr.send(videoFile);
        });

        setIsUploading(false);
        storagePath = fileName;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("subject-videos")
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      const { error } = await supabase
        .from("videos")
        .insert({
          subject_id: selectedSubjectId,
          title,
          title_kannada: titleKannada || null,
          description: description || null,
          video_url: videoUrl,
          video_type: videoType,
          storage_path: storagePath
        });

      if (error) throw error;

      toast.success("Video added successfully");
      setDialogOpen(false);
      resetForm();
      loadVideos();
    } catch (error: any) {
      toast.error(error.message || "Failed to add video");
    }
    setLoading(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const resetForm = () => {
    setSelectedSubjectId("");
    setTitle("");
    setTitleKannada("");
    setDescription("");
    setVideoType("youtube");
    setYoutubeUrl("");
    setVideoFile(null);
    setUploadProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Manage Videos
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Video</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name_kannada} ({subject.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title (English)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Title (Kannada - Optional)</Label>
                  <Input value={titleKannada} onChange={(e) => setTitleKannada(e.target.value)} />
                </div>
                <div>
                  <Label>Description with Timestamps (Optional)</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Video overview

0:00 - Introduction
2:30 - Main concept explanation
5:45 - Example problem 1
10:20 - Summary`}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add timestamps in MM:SS format. Students can click them to jump to that time.
                  </p>
                </div>
                <div>
                  <Label>Video Type</Label>
                  <RadioGroup value={videoType} onValueChange={setVideoType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="youtube" id="youtube" />
                      <Label htmlFor="youtube">YouTube Link</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upload" id="upload" />
                      <Label htmlFor="upload">Upload Video File</Label>
                    </div>
                  </RadioGroup>
                </div>
                {videoType === "youtube" && (
                  <div>
                    <Label>YouTube URL</Label>
                    <Input 
                      value={youtubeUrl} 
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                )}
                {videoType === "upload" && (
                  <div className="space-y-2">
                    <Label>Video File</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {videoFile ? videoFile.name : "Click to select video file"}
                        </p>
                        {videoFile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No size limit. Larger files may take longer to upload.
                    </p>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <Button onClick={handleUploadVideo} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isUploading ? "Uploading..." : "Adding..."}
                    </>
                  ) : (
                    "Add Video"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{video.title_kannada || video.title}</div>
                    {video.title_kannada && (
                      <div className="text-xs text-muted-foreground">{video.title}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{video.subjects?.name_kannada}</TableCell>
                <TableCell>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {video.video_type}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
