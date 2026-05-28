import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Trash2, Music2 } from "lucide-react";
import { extractSpotifyEmbed } from "@/lib/preset-momentos";
import { toast } from "sonner";

export const Route = createFileRoute("/sessoes/$id")({
  head: () => ({ meta: [{ title: "Sessão — Harmonia" }] }),
  component: SessaoDetail,
});

type Sessao = { id: string; titulo: string; data_sessao: string; tipo: string; grau: string; observacoes: string | null };
type Momento = { id: string; nome: string; descricao: string | null; ordem: number };
type Faixa = { id: string; momento_id: string; titulo: string; artista: string | null; spotify_url: string; descricao: string | null; ordem: number };

function SessaoDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [momentos, setMomentos] = useState<Momento[]>([]);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [addMomentoOpen, setAddMomentoOpen] = useState(false);
  const [novoMomento, setNovoMomento] = useState({ nome: "", descricao: "" });
  const [faixaOpenFor, setFaixaOpenFor] = useState<string | null>(null);
  const [novaFaixa, setNovaFaixa] = useState({ titulo: "", artista: "", spotify_url: "", descricao: "" });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  useEffect(() => { if (user) load(); }, [user, id]);

  async function load() {
    const [s, m, f] = await Promise.all([
      supabase.from("sessoes").select("*").eq("id", id).single(),
      supabase.from("momentos").select("*").eq("sessao_id", id).order("ordem"),
      supabase.from("faixas").select("*, momentos!inner(sessao_id)").eq("momentos.sessao_id", id).order("ordem"),
    ]);
    if (s.data) setSessao(s.data as Sessao);
    if (m.data) setMomentos(m.data as Momento[]);
    if (f.data) setFaixas(f.data as Faixa[]);
  }

  async function addMomento() {
    const ordem = momentos.length;
    const { error } = await supabase.from("momentos").insert({ sessao_id: id, nome: novoMomento.nome, descricao: novoMomento.descricao || null, ordem });
    if (error) toast.error(error.message);
    else { toast.success("Momento adicionado"); setAddMomentoOpen(false); setNovoMomento({ nome: "", descricao: "" }); load(); }
  }

  async function removeMomento(mid: string) {
    if (!confirm("Excluir este momento e suas músicas?")) return;
    await supabase.from("momentos").delete().eq("id", mid);
    load();
  }

  async function addFaixa(momentoId: string) {
    if (!extractSpotifyEmbed(novaFaixa.spotify_url)) {
      toast.error("Link do Spotify inválido. Cole um link de música, álbum ou playlist.");
      return;
    }
    const ordem = faixas.filter((f) => f.momento_id === momentoId).length;
    const { error } = await supabase.from("faixas").insert({
      momento_id: momentoId, titulo: novaFaixa.titulo, artista: novaFaixa.artista || null,
      spotify_url: novaFaixa.spotify_url, descricao: novaFaixa.descricao || null, ordem,
    });
    if (error) toast.error(error.message);
    else { toast.success("Música adicionada"); setFaixaOpenFor(null); setNovaFaixa({ titulo: "", artista: "", spotify_url: "", descricao: "" }); load(); }
  }

  async function removeFaixa(fid: string) {
    await supabase.from("faixas").delete().eq("id", fid);
    load();
  }

  if (loading || !user || !sessao) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/sessoes" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-8 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{sessao.tipo}</span>·<span>{sessao.grau}</span>·
            <span>{new Date(sessao.data_sessao + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl">{sessao.titulo}</h1>
          {sessao.observacoes && <p className="mt-3 text-sm text-muted-foreground">{sessao.observacoes}</p>}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Momentos da Sessão</h2>
          <Dialog open={addMomentoOpen} onOpenChange={setAddMomentoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Momento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Momento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={novoMomento.nome} onChange={(e) => setNovoMomento({ ...novoMomento, nome: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={novoMomento.descricao} onChange={(e) => setNovoMomento({ ...novoMomento, descricao: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={addMomento} disabled={!novoMomento.nome}>Adicionar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {momentos.map((m, idx) => {
            const tracks = faixas.filter((f) => f.momento_id === m.id);
            return (
              <section key={m.id} className="rounded-xl border border-border bg-card/60 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-mono">{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-2 font-display text-xl">{m.nome}</h3>
                    {m.descricao && <p className="mt-1 text-sm text-muted-foreground">{m.descricao}</p>}
                  </div>
                  <button onClick={() => removeMomento(m.id)} aria-label="Excluir momento">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {tracks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma música adicionada.</p>
                  )}
                  {tracks.map((f) => (
                    <div key={f.id} className="rounded-lg border border-border bg-background/40 p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Music2 className="h-3.5 w-3.5 text-accent" />
                            <p className="font-medium">{f.titulo}</p>
                            {f.artista && <span className="text-xs text-muted-foreground">— {f.artista}</span>}
                          </div>
                          {f.descricao && <p className="mt-1 text-xs text-muted-foreground">{f.descricao}</p>}
                        </div>
                        <button onClick={() => removeFaixa(f.id)} aria-label="Excluir música">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <SpotifyEmbed url={f.spotify_url} />
                    </div>
                  ))}

                  <Dialog open={faixaOpenFor === m.id} onOpenChange={(o) => setFaixaOpenFor(o ? m.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full border border-dashed border-border">
                        <Plus className="mr-1 h-4 w-4" />Adicionar música do Spotify
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nova Música</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Link do Spotify</Label>
                          <Input
                            value={novaFaixa.spotify_url}
                            onChange={(e) => setNovaFaixa({ ...novaFaixa, spotify_url: e.target.value })}
                            placeholder="https://open.spotify.com/track/..."
                          />
                          <p className="mt-1 text-xs text-muted-foreground">Aceita músicas, álbuns e playlists.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Título</Label><Input value={novaFaixa.titulo} onChange={(e) => setNovaFaixa({ ...novaFaixa, titulo: e.target.value })} /></div>
                          <div><Label>Artista</Label><Input value={novaFaixa.artista} onChange={(e) => setNovaFaixa({ ...novaFaixa, artista: e.target.value })} /></div>
                        </div>
                        <div><Label>Descrição / contexto</Label><Textarea value={novaFaixa.descricao} onChange={(e) => setNovaFaixa({ ...novaFaixa, descricao: e.target.value })} placeholder="Ex: tom solene, volume baixo durante a leitura" /></div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => addFaixa(m.id)} disabled={!novaFaixa.titulo || !novaFaixa.spotify_url}>Adicionar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </section>
            );
          })}

          {momentos.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Nenhum momento. Adicione manualmente acima.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
