import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Music2,
  Play,
  Pause,
  Share2,
  X,
  ChevronUp,
  ChevronDown,
  Pencil,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { extractSpotifyEmbed } from "@/lib/preset-momentos";
import { toast } from "sonner";
import {
  addMoment,
  addTrack,
  disconnectSpotifyAccount,
  getSpotifyConnectionStatus,
  getSpotifyDevices,
  getEventSpotifyDevices,
  getSpotifySdkToken,
  getEventDetail,
  importPlaylistToEvent,
  listSpotifyPlaylists,
  listUsers,
  removeMoment,
  updateMoment,
  removeTrack,
  shareEvent,
  removeShare,
  listEventShares,
  spotifyPausePlayback,
  spotifyPlayTrack,
  startSpotifyConnection,
  updateEventTrack,
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
  spotify_uri: string | null;
  note: string | null;
  order_index: number;
};

type SpotifyDevice = { id: string; name: string; type: string; is_active: boolean };

const STATUS_LABEL: Record<string, string> = {
  draft: "rascunho",
  ready: "pronta",
  live: "ao vivo",
  finished: "encerrada",
  archived: "arquivada",
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => {
        connect: () => Promise<boolean>;
        disconnect: () => void;
        addListener: (event: string, cb: (arg: any) => void) => void;
      };
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

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
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [playbackMode, setPlaybackMode] = useState<"remote" | "sdk">("remote");
  const [sdkReady, setSdkReady] = useState(false);
  const [deleteMomentTarget, setDeleteMomentTarget] = useState<Momento | null>(null);
  const [deleteTrackTarget, setDeleteTrackTarget] = useState<Faixa | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [userList, setUserList] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedShareUserId, setSelectedShareUserId] = useState("");
  const [shareList, setShareList] = useState<Array<{ id: string; name: string; email: string }>>(
    [],
  );
  const [nowPlaying, setNowPlaying] = useState<{ name: string; artist: string } | null>(null);
  const [editingMoment, setEditingMoment] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [executionMode, setExecutionMode] = useState(false);

  const groupedTracks = useMemo(
    () =>
      momentos.map((m) => ({
        m,
        tracks: faixas
          .filter((f) => f.moment_id === m.id)
          .sort((a, b) => a.order_index - b.order_index),
      })),
    [momentos, faixas],
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) void load();
  }, [user, id]);

  useEffect(() => {
    if (user) void loadSpotify();
  }, [user]);

  useEffect(() => {
    if (!spotifyConnected || playbackMode !== "sdk") return;

    let disposed = false;
    let scriptEl: HTMLScriptElement | null = null;
    let sdkPlayer: { disconnect: () => void } | null = null;

    const setup = async () => {
      const tokenResult = await getSpotifySdkToken();
      const token = tokenResult.accessToken;

      const initPlayer = () => {
        if (!window.Spotify) return;
        const player = new window.Spotify.Player({
          name: "Harmonia Web Player",
          getOAuthToken: (cb) => cb(token),
          volume: 0.8,
        });

        player.addListener("ready", ({ device_id }: any) => {
          if (disposed) return;
          setSdkReady(true);
          setSelectedDeviceId(device_id);
          setDevices((prev) => {
            const exists = prev.some((d) => d.id === device_id);
            if (exists) return prev;
            return [
              { id: device_id, name: "Harmonia Web Player", type: "Computer", is_active: true },
              ...prev,
            ];
          });
        });

        player.addListener("not_ready", () => {
          if (disposed) return;
          setSdkReady(false);
        });

        player.connect().catch(() => {
          toast.error("Não foi possível conectar o Spotify SDK.");
        });
        sdkPlayer = player;
      };

      if (window.Spotify) {
        initPlayer();
        return;
      }

      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      scriptEl = document.createElement("script");
      scriptEl.src = "https://sdk.scdn.co/spotify-player.js";
      scriptEl.async = true;
      document.body.appendChild(scriptEl);
    };

    setup().catch((e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar Spotify SDK");
    });

    return () => {
      disposed = true;
      setSdkReady(false);
      sdkPlayer?.disconnect();
      if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, [spotifyConnected, playbackMode]);

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
        const [pls, devs] = await Promise.all([
          listSpotifyPlaylists().catch(() => []),
          getSpotifyDevices().catch(() => [] as SpotifyDevice[]),
        ]);
        setPlaylists(pls as Array<{ id: string; name: string; tracks: { total: number } }>);
        const typed = devs as SpotifyDevice[];
        setDevices(typed);
        const active = typed.find((d) => d.is_active)?.id ?? "";
        setSelectedDeviceId((prev) => prev || active);
      } else {
        setPlaylists([]);
        setDevices([]);
        setSelectedDeviceId("");
      }
    } catch {
      setSpotifyConnected(false);
      setPlaylists([]);
      setDevices([]);
      setSelectedDeviceId("");
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

  async function handleDisconnectSpotify() {
    try {
      await disconnectSpotifyAccount();
      toast.success("Conta Spotify desconectada");
      await loadSpotify();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao desconectar Spotify");
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

  async function confirmRemoveMomento() {
    if (!deleteMomentTarget) return;
    try {
      await removeMoment({ data: { momentId: deleteMomentTarget.id } });
      toast.success("Momento excluído");
      setDeleteMomentTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir momento");
    }
  }

  async function confirmRemoveFaixa() {
    if (!deleteTrackTarget) return;
    try {
      await removeTrack({ data: { trackId: deleteTrackTarget.id } });
      toast.success("Música excluída");
      setDeleteTrackTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir música");
    }
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

  async function loadShares() {
    try {
      const list = await listEventShares({ data: { eventId: id } });
      setShareList(list as Array<{ id: string; name: string; email: string }>);
    } catch {
      setShareList([]);
    }
  }

  async function loadUsers() {
    try {
      const list = await listUsers();
      setUserList(list as Array<{ id: string; name: string; email: string }>);
    } catch {
      setUserList([]);
    }
  }

  async function handleShare() {
    if (!selectedShareUserId) return;
    setShareBusy(true);
    try {
      const target = userList.find((u) => u.id === selectedShareUserId);
      await shareEvent({ data: { eventId: id, targetEmail: target!.email } });
      toast.success("Sessão compartilhada");
      setSelectedShareUserId("");
      await loadShares();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao compartilhar");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleRemoveShare(targetUserId: string) {
    try {
      await removeShare({ data: { eventId: id, targetUserId } });
      toast.success("Compartilhamento removido");
      await loadShares();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  async function handlePlayTrack(
    trackUri: string | null,
    trackName?: string,
    trackArtist?: string,
  ) {
    if (!selectedDeviceId) {
      toast.error("Selecione um device Spotify para reprodução.");
      return;
    }
    if (!trackUri) {
      toast.error("Faixa sem URI Spotify.");
      return;
    }
    try {
      await spotifyPlayTrack({ data: { deviceId: selectedDeviceId, trackUri, eventId: id } });
      if (trackName) setNowPlaying({ name: trackName, artist: trackArtist || "" });
      toast.success("Reprodução iniciada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao reproduzir faixa");
    }
  }

  async function handlePausePlayback() {
    if (!selectedDeviceId) {
      toast.error("Selecione um device Spotify para reprodução.");
      return;
    }
    try {
      await spotifyPausePlayback({ data: { deviceId: selectedDeviceId, eventId: id } });
      toast.success("Reprodução pausada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao pausar reprodução");
    }
  }

  async function handleRenameMoment(momentId: string) {
    if (!editingName.trim()) return;
    try {
      await updateMoment({ data: { momentId, name: editingName.trim() } });
      setEditingMoment(null);
      setEditingName("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao renomear");
    }
  }

  async function handleMoveMoment(momentId: string, direction: "up" | "down") {
    const idx = momentos.findIndex((m) => m.id === momentId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= momentos.length) return;

    const current = momentos[idx];
    const target = momentos[targetIdx];

    try {
      await updateMoment({ data: { momentId: current.id, orderIndex: target.order_index } });
      await updateMoment({ data: { momentId: target.id, orderIndex: current.order_index } });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao reordenar");
    }
  }

  async function handleChangeTrackMoment(trackId: string, momentId: string) {
    try {
      await updateEventTrack({ data: { trackId, momentId } });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao mover faixa");
    }
  }

  async function handleChangeTrackNote(trackId: string, note: string) {
    try {
      await updateEventTrack({ data: { trackId, note } });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar observação");
    }
  }

  async function handleMoveTrackWithinMoment(
    trackId: string,
    momentId: string,
    direction: "up" | "down",
  ) {
    const list = faixas
      .filter((f) => f.moment_id === momentId)
      .sort((a, b) => a.order_index - b.order_index);
    const currentIndex = list.findIndex((f) => f.id === trackId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const current = list[currentIndex];
    const target = list[targetIndex];

    try {
      await updateEventTrack({ data: { trackId: current.id, orderIndex: target.order_index } });
      await updateEventTrack({ data: { trackId: target.id, orderIndex: current.order_index } });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao reordenar faixa");
    }
  }

  if (loading || !user) return <DetailSkeleton />;
  if (!sessao) return <DetailSkeleton />;

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

        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>{STATUS_LABEL[sessao.status] || sessao.status}</span>·
                <span>{new Date(sessao.event_date).toLocaleDateString("pt-BR")}</span>
              </div>
              <h1 className="mt-3 font-display text-4xl">{sessao.title}</h1>
              {sessao.notes && <p className="mt-3 text-sm text-muted-foreground">{sessao.notes}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareOpen(true);
                  loadShares();
                  loadUsers();
                }}
                className="gap-1.5 border-border/60 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </Button>
              <button
                onClick={() => setExecutionMode((m) => !m)}
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-glow)] transition-all duration-200 hover:scale-[1.02] ${
                  executionMode
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {executionMode ? (
                  <>
                    <X className="h-4 w-4" />
                    Sair
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Executar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <details className="group mb-8 rounded-xl border border-border bg-card/60 transition open:shadow-[var(--shadow-elegant)]">
          <summary className="flex cursor-pointer list-none items-center justify-between p-6">
            <div>
              <h2 className="font-display text-2xl">Spotify</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {spotifyConnected
                  ? `Conectado como ${spotifyDisplayName || "usuário Spotify"}`
                  : "Conta não conectada"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground transition group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="border-t border-border px-6 pb-6 pt-4">
            {!spotifyConnected ? (
              <Button onClick={handleConnectSpotify} size="sm">
                Conectar Spotify
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={playbackMode === "remote" ? "default" : "outline"}
                    onClick={() => setPlaybackMode("remote")}
                    size="sm"
                  >
                    Controle remoto
                  </Button>
                  <Button
                    variant={playbackMode === "sdk" ? "default" : "outline"}
                    onClick={() => setPlaybackMode("sdk")}
                    size="sm"
                  >
                    SDK Web Player
                  </Button>
                  <Button variant="outline" onClick={handleDisconnectSpotify} size="sm">
                    Desconectar
                  </Button>
                  {playbackMode === "sdk" && (
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {sdkReady ? "SDK pronto" : "Inicializando SDK..."}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
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
                  <Button onClick={handleImportPlaylist} disabled={!selectedPlaylistId} size="sm">
                    Importar
                  </Button>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    <option value="">Selecione um device Spotify</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.type}) {d.is_active ? "- ativo" : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={handlePausePlayback}
                    disabled={!selectedDeviceId}
                    size="sm"
                  >
                    Pause
                  </Button>
                </div>
              </div>
            )}
          </div>
        </details>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Momentos da Sessão</h2>
          <Dialog open={addMomentoOpen} onOpenChange={setAddMomentoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Momento
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
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
          {groupedTracks.map(({ m, tracks }, idx) => (
            <section
              key={m.id}
              className="group/moment rounded-xl border border-border/60 bg-gradient-to-b from-card/60 to-card/30 p-6 transition-all duration-300 hover:border-border/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-medium tracking-tight text-secondary-foreground">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => handleMoveMoment(m.id, "up")}
                        disabled={idx === 0}
                        className="rounded p-0.5 text-muted-foreground/40 transition hover:text-foreground disabled:opacity-20"
                        aria-label="Subir momento"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveMoment(m.id, "down")}
                        disabled={idx === momentos.length - 1}
                        className="rounded p-0.5 text-muted-foreground/40 transition hover:text-foreground disabled:opacity-20"
                        aria-label="Descer momento"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {editingMoment === m.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-md border border-accent/50 bg-background px-2 py-1 font-display text-xl outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameMoment(m.id);
                          if (e.key === "Escape") {
                            setEditingMoment(null);
                            setEditingName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => handleRenameMoment(m.id)}
                        className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <h3
                      className="mt-2 cursor-pointer font-display text-xl transition hover:text-accent"
                      onClick={() => {
                        setEditingMoment(m.id);
                        setEditingName(m.name);
                      }}
                    >
                      {m.name}
                    </h3>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingMoment(m.id);
                      setEditingName(m.name);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground/30 transition hover:text-accent [@media(hover:none)]:opacity-100 opacity-0 group-hover/moment:opacity-100"
                    aria-label="Renomear momento"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteMomentTarget(m)}
                    className="rounded-md p-1.5 text-muted-foreground/30 transition hover:bg-destructive/10 hover:text-destructive [@media(hover:none)]:opacity-100 opacity-0 group-hover/moment:opacity-100"
                    aria-label="Excluir momento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {tracks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma música adicionada.</p>
                )}
                {tracks.map((f) => (
                  <div
                    key={f.id}
                    className="group/track rounded-xl border border-border/40 bg-gradient-to-b from-card/70 to-card/30 p-4 transition-all duration-300 hover:border-accent/40 hover:bg-accent/[0.02]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <Music2 className="h-3.5 w-3.5" />
                          </span>
                          <p className="truncate font-medium text-foreground/90">{f.track_name}</p>
                          {f.artists_json?.[0] && (
                            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                              — {f.artists_json[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTrackTarget(f)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/40 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Excluir música"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {f.artists_json?.[0] && (
                      <p className="mb-3 text-xs text-muted-foreground sm:hidden">
                        {f.artists_json[0]}
                      </p>
                    )}

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        onClick={() =>
                          handlePlayTrack(f.spotify_uri, f.track_name, f.artists_json?.[0])
                        }
                        className="h-7 gap-1.5 rounded-lg bg-accent/10 px-3 text-xs font-medium text-accent transition-all duration-200 hover:bg-accent/20 active:scale-[0.97]"
                      >
                        <Play className="h-3 w-3" />
                        Tocar
                      </Button>
                      <button
                        onClick={() => handleMoveTrackWithinMoment(f.id, f.moment_id, "up")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/40 transition hover:bg-secondary/50 hover:text-foreground"
                        aria-label="Subir faixa"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveTrackWithinMoment(f.id, f.moment_id, "down")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/40 transition hover:bg-secondary/50 hover:text-foreground"
                        aria-label="Descer faixa"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mb-3">
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        value={f.moment_id}
                        onChange={(e) => handleChangeTrackMoment(f.id, e.target.value)}
                      >
                        {momentos.map((mom) => (
                          <option key={mom.id} value={mom.id}>
                            {mom.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Textarea
                      value={f.note ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFaixas((prev) =>
                          prev.map((t) => (t.id === f.id ? { ...t, note: val } : t)),
                        );
                      }}
                      onBlur={(e) => handleChangeTrackNote(f.id, e.target.value)}
                      placeholder="Observação da faixa neste momento"
                      className="mb-3"
                    />
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
                      Adicionar música
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
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
                            onChange={(e) => setNovaFaixa({ ...novaFaixa, titulo: e.target.value })}
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
          ))}

          {momentos.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Nenhum momento. Adicione manualmente acima.
            </div>
          )}
        </div>
      </main>

      {nowPlaying && (
        <div className="sticky bottom-0 border-t border-border/60 bg-card/95 backdrop-blur px-4 py-3 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.3)]">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground/50">{nowPlaying.name}</p>
              {nowPlaying.artist && (
                <p className="truncate text-xs text-muted-foreground/50">{nowPlaying.artist}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/sessoes/$id/executar"
                params={{ id }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent transition hover:bg-accent/20"
                aria-label="Ir para execução"
              >
                <SkipForward className="h-4 w-4" />
              </Link>
              <button
                onClick={handlePausePlayback}
                disabled={!selectedDeviceId}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-105 active:scale-95 disabled:opacity-40"
                aria-label="Pausar"
              >
                <Pause className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-display">Compartilhar sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedShareUserId}
                onChange={(e) => setSelectedShareUserId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um usuário</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <Button onClick={handleShare} disabled={!selectedShareUserId || shareBusy}>
                {shareBusy ? "..." : "Compartilhar"}
              </Button>
            </div>
            {shareList.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Compartilhado com:</p>
                {shareList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(s.id)}
                      className="ml-2 rounded-md p-1.5 text-muted-foreground/40 transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteMomentTarget}
        onOpenChange={(o) => !o && setDeleteMomentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir momento</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteMomentTarget?.name}" e todas as suas músicas serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMomento}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir momento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTrackTarget}
        onOpenChange={(o) => !o && setDeleteTrackTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir música</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTrackTarget?.track_name}" será removida desta sessão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFaixa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir música
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="mb-6 h-5 w-20" />
        <div className="mb-8 rounded-2xl border border-border bg-card p-8">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
        <div className="mb-8 rounded-xl border border-border bg-card/60 p-6">
          <Skeleton className="h-7 w-24 mb-3" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-6">
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-6 w-40" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
