-- Create storage buckets for PDFs and videos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('chapter-pdfs', 'chapter-pdfs', false),
  ('subject-videos', 'subject-videos', true);

-- RLS policies for chapter-pdfs bucket
CREATE POLICY "Admins can upload chapter PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chapter-pdfs' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update chapter PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chapter-pdfs' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete chapter PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chapter-pdfs' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can view chapter PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chapter-pdfs');

-- RLS policies for subject-videos bucket
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subject-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subject-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'subject-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Everyone can view videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'subject-videos');