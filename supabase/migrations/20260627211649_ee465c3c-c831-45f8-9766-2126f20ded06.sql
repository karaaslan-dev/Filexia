CREATE TABLE public.share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  require_auth BOOLEAN NOT NULL DEFAULT false,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read_own_links ON public.share_links FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY users_insert_own_links ON public.share_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY users_update_own_links ON public.share_links FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY users_delete_own_links ON public.share_links FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY admins_read_all_links ON public.share_links FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_share_links_updated_at BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_share_links_owner ON public.share_links(owner_id);
CREATE INDEX idx_share_links_file ON public.share_links(file_id);