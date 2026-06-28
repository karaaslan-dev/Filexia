-- Lock down profile self-updates: users can only change display_name
DROP POLICY IF EXISTS "users_update_own_profile_limited" ON public.profiles;

CREATE POLICY "users_update_own_profile_limited" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = profiles.id)
  AND storage_quota_mb = (SELECT p.storage_quota_mb FROM public.profiles p WHERE p.id = profiles.id)
  AND must_change_password = (SELECT p.must_change_password FROM public.profiles p WHERE p.id = profiles.id)
  AND storage_used_bytes = (SELECT p.storage_used_bytes FROM public.profiles p WHERE p.id = profiles.id)
);

-- Explicit UPDATE policy for user-files storage bucket
CREATE POLICY "users_update_own_objects" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'user-files' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user-files' AND (auth.uid())::text = (storage.foldername(name))[1]);
