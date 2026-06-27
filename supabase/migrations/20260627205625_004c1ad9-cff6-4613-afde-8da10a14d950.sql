
CREATE POLICY "users_read_own_objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "admins_read_all_objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_insert_own_objects" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "users_delete_own_objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "admins_delete_any_object" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-files' AND public.has_role(auth.uid(), 'admin'));
