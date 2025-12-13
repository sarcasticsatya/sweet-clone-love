-- Create infographics table for caching chapter infographics
CREATE TABLE public.infographics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_chapter_infographic UNIQUE (chapter_id)
);

-- Enable RLS
ALTER TABLE public.infographics ENABLE ROW LEVEL SECURITY;

-- Anyone can view infographics
CREATE POLICY "Anyone can view infographics" 
ON public.infographics 
FOR SELECT 
USING (true);

-- Authenticated users can create infographics
CREATE POLICY "Authenticated users can create infographics" 
ON public.infographics 
FOR INSERT 
WITH CHECK (true);