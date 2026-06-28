-- Prevent authenticated users from reading share-link password hashes via the Data API.
-- Server-side admin functions still use supabaseAdmin (service role) to verify hashes.
REVOKE SELECT(password_hash) ON public.share_links FROM authenticated;

-- Re-grant SELECT on the non-sensitive columns the app reads directly.
GRANT SELECT(id, owner_id, file_id, token, expires_at, max_downloads, download_count, require_auth, is_revoked, created_at, updated_at) ON public.share_links TO authenticated;

-- Ensure full table privileges remain for normal CRUD operations.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
