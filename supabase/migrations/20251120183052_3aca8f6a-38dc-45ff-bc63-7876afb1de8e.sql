-- Create mindmaps table to store generated mindmaps permanently
CREATE TABLE public.mindmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  mindmap_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view mindmaps
CREATE POLICY "Anyone can view mindmaps"
ON public.mindmaps
FOR SELECT
USING (true);

-- Authenticated users can create mindmaps (edge function will create them)
CREATE POLICY "Authenticated users can create mindmaps"
ON public.mindmaps
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_mindmaps_chapter_id ON public.mindmaps(chapter_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_mindmaps_updated_at
BEFORE UPDATE ON public.mindmaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();