INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  FALSE,
  26214400,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their documents" ON public.documents;
CREATE POLICY "Owners can read their documents"
ON public.documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = documents.profile_id
      AND profiles.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can insert their documents" ON public.documents;
CREATE POLICY "Owners can insert their documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = documents.profile_id
      AND profiles.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can delete their documents" ON public.documents;
CREATE POLICY "Owners can delete their documents"
ON public.documents FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = documents.profile_id
      AND profiles.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can read their document files" ON storage.objects;
CREATE POLICY "Owners can read their document files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.id::text FROM public.profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can upload their document files" ON storage.objects;
CREATE POLICY "Owners can upload their document files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.id::text FROM public.profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can delete their document files" ON storage.objects;
CREATE POLICY "Owners can delete their document files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.id::text FROM public.profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
  )
);