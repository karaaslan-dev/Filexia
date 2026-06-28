REVOKE SELECT(password_hash) ON public.share_links FROM authenticated;

-- Re-grant SELECT on all other columns explicitly so the remaining app queries still work
GRANT SELECT(id, owner_id, file_id, token, expires_at, max_downloads, download_count, require_auth, is_revoked, created_at, updated_at) ON public.share_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;