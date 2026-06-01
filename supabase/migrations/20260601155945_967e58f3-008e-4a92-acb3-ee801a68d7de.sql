
-- Make 'renders' bucket private to enforce ownership-based access
UPDATE storage.buckets SET public = false WHERE id = 'renders';

-- Storage RLS: users can read/write only files under their own user_id folder
DROP POLICY IF EXISTS "renders own select" ON storage.objects;
DROP POLICY IF EXISTS "renders own insert" ON storage.objects;
DROP POLICY IF EXISTS "renders own update" ON storage.objects;
DROP POLICY IF EXISTS "renders own delete" ON storage.objects;

CREATE POLICY "renders own select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "renders own insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "renders own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "renders own delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);
