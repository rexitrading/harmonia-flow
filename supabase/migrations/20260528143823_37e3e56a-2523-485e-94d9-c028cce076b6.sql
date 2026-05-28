
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sessoes
CREATE TABLE public.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data_sessao DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Ordinária',
  grau TEXT NOT NULL DEFAULT 'Aprendiz',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes TO authenticated;
GRANT ALL ON public.sessoes TO service_role;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sessoes" ON public.sessoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sessoes" ON public.sessoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth update sessoes" ON public.sessoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sessoes" ON public.sessoes FOR DELETE TO authenticated USING (true);

-- Momentos
CREATE TABLE public.momentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_momentos_sessao ON public.momentos(sessao_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.momentos TO authenticated;
GRANT ALL ON public.momentos TO service_role;
ALTER TABLE public.momentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all momentos" ON public.momentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Faixas
CREATE TABLE public.faixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  momento_id UUID NOT NULL REFERENCES public.momentos(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  artista TEXT,
  spotify_url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_faixas_momento ON public.faixas(momento_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faixas TO authenticated;
GRANT ALL ON public.faixas TO service_role;
ALTER TABLE public.faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all faixas" ON public.faixas FOR ALL TO authenticated USING (true) WITH CHECK (true);
