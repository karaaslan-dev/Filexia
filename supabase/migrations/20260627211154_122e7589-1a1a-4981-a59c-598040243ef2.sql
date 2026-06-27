-- Folders table
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, parent_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read_own_folders ON public.folders FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY users_insert_own_folders ON public.folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY users_update_own_folders ON public.folders FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY users_delete_own_folders ON public.folders FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY admins_read_all_folders ON public.folders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_folders_owner_parent ON public.folders(owner_id, parent_id);

-- Add folder_id to files
ALTER TABLE public.files ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
CREATE INDEX idx_files_owner_folder ON public.files(owner_id, folder_id);

-- Add FK from files.owner_id -> profiles.id so PostgREST embed `profiles:owner_id` works
ALTER TABLE public.files ADD CONSTRAINT files_owner_profile_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;