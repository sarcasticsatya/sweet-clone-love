import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Video, Plus, ExternalLink, Upload, Loader2, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const ManageVideos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [titleKannada, setTitleKannada] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Edit state
  const [editingVideo, setEditingVideo] = useState<any>(null);

  // Filtered chapters based on selected subject
  const filteredChapters = chapters.filter(ch => ch.subject_id === selectedSubjectId);

  useEffect(() => {
    loadVideos();
    loadSubjects();
    loadChapters();
  }, []);

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*, chapters(*, subjects(*))")
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

  const loadChapters = async () => {
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .order("chapter_number");
    
    setChapters(data || []);
  };

  const handleUploadVideo = async () => {
    if (!selectedChapterId || !title) {
      toast.error("Please select a chapter and provide a title");
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
        const fileName = `${selectedChapterId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
          chapter_id: selectedChapterId,
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

  const handleEditVideo = async () => {
    if (!editingVideo || !selectedChapterId || !title) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        chapter_id: selectedChapterId,
        title,
        title_kannada: titleKannada || null,
        description: description || null,
      };

      // Only update URL if it's a YouTube video and URL changed
      if (editingVideo.video_type === "youtube" && youtubeUrl !== editingVideo.video_url) {
        updateData.video_url = youtubeUrl;
      }

      const { error } = await supabase
        .from("videos")
        .update(updateData)
        .eq("id", editingVideo.id);

      if (error) throw error;

      toast.success("Video updated successfully");
      setEditDialogOpen(false);
      setEditingVideo(null);
      resetForm();
      loadVideos();
    } catch (error: any) {
      toast.error(error.message || "Failed to update video");
    }
    setLoading(false);
  };

  const handleDeleteVideo = async (video: any) => {
    setLoading(true);
    try {
      // Delete from storage if uploaded
      if (video.storage_path) {
        await supabase.storage.from("subject-videos").remove([video.storage_path]);
      }

      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast.success("Video deleted successfully");
      loadVideos();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video");
    }
    setLoading(false);
  };

  const openEditDialog = (video: any) => {
    setEditingVideo(video);
    // Set subject first so chapters filter properly
    const subjectId = video.chapters?.subject_id || "";
    setSelectedSubjectId(subjectId);
    setSelectedChapterId(video.chapter_id);
    setTitle(video.title);
    setTitleKannada(video.title_kannada || "");
    setDescription(video.description || "");
    setVideoType(video.video_type);
    setYoutubeUrl(video.video_url);
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedSubjectId("");
    setSelectedChapterId("");
    setTitle("");
    setTitleKannada("");
    setDescription("");
    setVideoType("youtube");
    setYoutubeUrl("");
    setVideoFile(null);
    setUploadProgress(0);
    setEditingVideo(null);
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
                  <Select value={selectedSubjectId} onValueChange={(val) => {
                    setSelectedSubjectId(val);
                    setSelectedChapterId("");
                  }}>
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
                  <Label>Chapter</Label>
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedSubjectId ? "Choose chapter" : "Select subject first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredChapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          Chapter {chapter.chapter_number}: {chapter.name_kannada}
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
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingVideo(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubjectId} onValueChange={(val) => {
                  setSelectedSubjectId(val);
                  setSelectedChapterId("");
                }}>
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
                <Label>Chapter</Label>
                <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSubjectId ? "Choose chapter" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredChapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        Chapter {chapter.chapter_number}: {chapter.name_kannada}
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
              </div>
              {editingVideo?.video_type === "youtube" && (
                <div>
                  <Label>YouTube URL</Label>
                  <Input 
                    value={youtubeUrl} 
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}
              {editingVideo?.video_type === "upload" && (
                <p className="text-sm text-muted-foreground">
                  To replace the video file, delete this video and upload a new one.
                </p>
              )}
              <Button onClick={handleEditVideo} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Chapter</TableHead>
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
                <TableCell>
                  <div>
                    <div className="text-sm">{video.chapters?.name_kannada}</div>
                    <div className="text-xs text-muted-foreground">
                      {video.chapters?.subjects?.name_kannada}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {video.video_type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(video)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Video</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{video.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteVideo(video)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {videos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No videos uploaded yet. Click "Add Video" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
