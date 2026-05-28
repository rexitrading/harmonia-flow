import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Trash2, Music2 } from "lucide-react";
import { extractSpotifyEmbed } from "@/lib/preset-momentos";
import { toast } from "sonner";
import {
  addMoment,
  addTrack,
  getSpotifyConnectionStatus,
  getEventDetail,
  importPlaylistToEvent,
  listSpotifyPlaylists,
  removeMoment,
  removeTrack,
  startSpotifyConnection,
} from "@/lib/api/harmonia.functions";

export const Route = createFileRoute("/sessoes/$id")({
  head: () => ({ meta: [{ title: "Sessão — Harmonia" }] }),
  component: SessaoDetail,
});

type Sessao = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  notes: string | null;
  status: string;
};
type Momento = { id: string; name: string; color: string | null; order_index: number };
type Faixa = {
  id: string;
  moment_id: string;
  track_name: string;
  artists_json: string[];
  spotify_url: string | null;
  note: string | null;
  order_index: number;
};

function SessaoDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [momentos, setMomentos] = useState<Momento[]>([]);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [addMomentoOpen, setAddMomentoOpen] = useState(false);
  const [novoMomento, setNovoMomento] = useState({ nome: "" });
  const [faixaOpenFor, setFaixaOpenFor] = useState<string | null>(null);
  const [novaFaixa, setNovaFaixa] = useState({
    titulo: "",
    artista: "",
    spotify_url: "",
    descricao: "",
  });
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string; tracks: { total: number } }>
  >([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) load();
  }, [user, id]);

  useEffect(() => {
    if (user) void loadSpotify();
  }, [user]);

  async function load() {
    try {
      const data = await getEventDetail({ data: { eventId: id } });
      setSessao(data.event as Sessao);
      setMomentos(data.moments as Momento[]);
      setFaixas(data.tracks as Faixa[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar sessão");
    }
  }

  async function loadSpotify() {
    try {
      const status = await getSpotifyConnectionStatus();
      setSpotifyConnected(status.connected);
      setSpotifyDisplayName(status.account?.display_name ?? null);
      if (status.connected) {
        const pls = await listSpotifyPlaylists();
        setPlaylists(pls as Array<{ id: string; name: string; tracks: { total: number } }>);
      } else {
        setPlaylists([]);
      }
    } catch {
      setSpotifyConnected(false);
      setPlaylists([]);
    }
  }

  async function handleConnectSpotify() {
    try {
      const { authorizeUrl } = await startSpotifyConnection();
      window.location.href = authorizeUrl;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar conexão Spotify");
    }
  }

  async function handleImportPlaylist() {
    if (!selectedPlaylistId) return;
    try {
      await importPlaylistToEvent({
        data: { eventId: id, spotify_playlist_id: selectedPlaylistId },
      });
      toast.success("Playlist importada");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar playlist");
    }
  }

  async function handleAddMomento() {
    try {
      await addMoment({ data: { eventId: id, name: novoMomento.nome } });
      toast.success("Momento adicionado");
      setAddMomentoOpen(false);
      setNovoMomento({ nome: "" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar momento");
    }
  }

  async function handleRemoveMomento(mid: string) {
    if (!confirm("Excluir este momento e suas músicas?")) return;
    await removeMoment({ data: { momentId: mid } });
    await load();
  }

  async function handleAddFaixa(momentoId: string) {
    if (!extractSpotifyEmbed(novaFaixa.spotify_url)) {
      toast.error("Link do Spotify inválido. Cole um link válido.");
      return;
    }

    try {
      await addTrack({
        data: {
          eventId: id,
          momentId: momentoId,
          track_name: novaFaixa.titulo,
          artist: novaFaixa.artista || undefined,
          spotify_url: novaFaixa.spotify_url,
          note: novaFaixa.descricao || undefined,
        },
      });
      toast.success("Música adicionada");
      setFaixaOpenFor(null);
      setNovaFaixa({ titulo: "", artista: "", spotify_url: "", descricao: "" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar música");
    }
  }

  async function handleRemoveFaixa(fid: string) {
    await removeTrack({ data: { trackId: fid } });
    await load();
  }

  if (loading || !user || !sessao) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/sessoes"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-8 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{sessao.status}</span>·
            <span>{new Date(sessao.event_date).toLocaleDateString("pt-BR")}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl">{sessao.title}</h1>
          {sessao.notes && <p className="mt-3 text-sm text-muted-foreground">{sessao.notes}</p>}
        </div>

        <section className="mb-8 rounded-xl border border-border bg-card/60 p-6">
          <h2 className="font-display text-2xl">Spotify</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {spotifyConnected
              ? `Conectado como ${spotifyDisplayName || "usuário Spotify"}`
              : "Conta não conectada"}
          </p>
          {!spotifyConnected ? (
            <Button className="mt-4" onClick={handleConnectSpotify}>
              Conectar Spotify
            </Button>
          ) : (
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
              >
                <option value="">Selecione uma playlist</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tracks?.total ?? 0} faixas)
                  </option>
                ))}
              </select>
              <Button onClick={handleImportPlaylist} disabled={!selectedPlaylistId}>
                Importar para esta sessão
              </Button>
            </div>
          )}
        </section>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Momentos da Sessão</h2>
          <Dialog open={addMomentoOpen} onOpenChange={setAddMomentoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Momento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Momento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={novoMomento.nome}
                    onChange={(e) => setNovoMomento({ nome: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddMomento} disabled={!novoMomento.nome}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {momentos.map((m, idx) => {
            const tracks = faixas.filter((f) => f.moment_id === m.id);
            return (
              <section key={m.id} className="rounded-xl border border-border bg-card/60 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-mono">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-xl">{m.name}</h3>
                  </div>
                  <button onClick={() => handleRemoveMomento(m.id)} aria-label="Excluir momento">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {tracks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma música adicionada.
                    </p>
                  )}
                  {tracks.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-border bg-background/40 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Music2 className="h-3.5 w-3.5 text-accent" />
                            <p className="font-medium">{f.track_name}</p>
                            {f.artists_json?.[0] && (
                              <span className="text-xs text-muted-foreground">
                                — {f.artists_json[0]}
                              </span>
                            )}
                          </div>
                          {f.note && <p className="mt-1 text-xs text-muted-foreground">{f.note}</p>}
                        </div>
                        <button onClick={() => handleRemoveFaixa(f.id)} aria-label="Excluir música">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      {f.spotify_url && <SpotifyEmbed url={f.spotify_url} />}
                    </div>
                  ))}

                  <Dialog
                    open={faixaOpenFor === m.id}
                    onOpenChange={(o) => setFaixaOpenFor(o ? m.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border border-dashed border-border"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Adicionar música do Spotify
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Música</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Link do Spotify</Label>
                          <Input
                            value={novaFaixa.spotify_url}
                            onChange={(e) =>
                              setNovaFaixa({ ...novaFaixa, spotify_url: e.target.value })
                            }
                            placeholder="https://open.spotify.com/track/..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={novaFaixa.titulo}
                              onChange={(e) =>
                                setNovaFaixa({ ...novaFaixa, titulo: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Artista</Label>
                            <Input
                              value={novaFaixa.artista}
                              onChange={(e) =>
                                setNovaFaixa({ ...novaFaixa, artista: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Descrição / contexto</Label>
                          <Textarea
                            value={novaFaixa.descricao}
                            onChange={(e) =>
                              setNovaFaixa({ ...novaFaixa, descricao: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => handleAddFaixa(m.id)}
                          disabled={!novaFaixa.titulo || !novaFaixa.spotify_url}
                        >
                          Adicionar
                        </Button>
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
