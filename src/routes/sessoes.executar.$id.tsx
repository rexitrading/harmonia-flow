import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Home,
  ListMusic,
  Library,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getEventDetail,
  getSpotifyConnectionStatus,
  getSpotifyDevices,
  getEventSpotifyDevices,
  getSpotifySdkToken,
  spotifyPlayTrack,
  spotifyPausePlayback,
} from "@/lib/api/harmonia.functions";

export const Route = createFileRoute("/sessoes/executar/$id")({
  head: () => ({ meta: [{ title: "Execução — Harmonia" }] }),
  component: ExecutarPage,
});

type Sessao = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  notes: string | null;
  status: string;
};

type Momento = {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
};

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

type SpotifyDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
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

function ExecutarPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [momentos, setMomentos] = useState<Momento[]>([]);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [deviceList, setDeviceList] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentMomentIdx, setCurrentMomentIdx] = useState(0);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [momentFilter, setMomentFilter] = useState<string>("__all__");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, id]);

  useEffect(() => {
    if (!spotifyConnected) return;

    let disposed = false;
    let scriptEl: HTMLScriptElement | null = null;
    let sdkPlayer: { disconnect: () => void } | null = null;

    const setup = async () => {
      const tokenResult = await getSpotifySdkToken({ data: { eventId: id } });
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
          setSelectedDeviceId(device_id);
          setDeviceList((prev) => {
            const exists = prev.some((d) => d.id === device_id);
            if (exists) return prev;
            return [
              { id: device_id, name: "Harmonia Web Player", type: "Computer", is_active: true },
              ...prev,
            ];
          });
        });

        player.connect().catch(() => {
          toast.error("Não foi possível iniciar o Spotify Web Player na execução.");
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

    setup().catch(() => {
      // keep silent; playback can still work with existing active devices
    });

    return () => {
      disposed = true;
      sdkPlayer?.disconnect();
      if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, [spotifyConnected, id]);

  async function loadAll() {
    try {
      const [detail, status] = await Promise.all([
        getEventDetail({ data: { eventId: id } }),
        getSpotifyConnectionStatus(),
      ]);
      setSessao(detail.event as Sessao);
      setMomentos(detail.moments as Momento[]);
      setFaixas(detail.tracks as Faixa[]);
      setSpotifyConnected(status.connected);
      if (status.connected) {
        const devs = (await getSpotifyDevices().catch(() => [])) as SpotifyDevice[];
        setDeviceList(devs);
        const active = devs.find((d) => d.is_active);
        if (active?.id) setSelectedDeviceId(active.id);
        else if (devs.length > 0 && devs[0].id) setSelectedDeviceId(devs[0].id);
      } else {
        const ownerDevs = (await getEventSpotifyDevices({ data: { eventId: id } }).catch(
          () => [],
        )) as SpotifyDevice[];
        setSpotifyConnected(true);
        setDeviceList(ownerDevs);
        const active = ownerDevs.find((d) => d.is_active);
        if (active?.id) setSelectedDeviceId(active.id);
        else if (ownerDevs.length > 0 && ownerDevs[0].id) setSelectedDeviceId(ownerDevs[0].id);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar sessão");
    }
  }

  const groups = useMemo(() => {
    return momentos.map((m) => ({
      m,
      tracks: faixas
        .filter((f) => f.moment_id === m.id)
        .sort((a, b) => a.order_index - b.order_index),
    }));
  }, [momentos, faixas]);

  const currentGroup = groups[currentMomentIdx];
  const currentTrack = currentGroup?.tracks[currentTrackIdx];
  const trackCount = currentGroup?.tracks.length ?? 0;
  const filteredGroups = useMemo(
    () => (momentFilter === "__all__" ? groups : groups.filter((g) => g.m.id === momentFilter)),
    [groups, momentFilter],
  );
  const currentAbsoluteIndex = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < groups.length; i += 1) {
      if (i < currentMomentIdx) acc += groups[i].tracks.length;
      else if (i === currentMomentIdx) {
        acc += currentTrackIdx;
        break;
      }
    }
    return acc;
  }, [groups, currentMomentIdx, currentTrackIdx]);
  const sequenceItems = useMemo(
    () =>
      filteredGroups.flatMap((group) =>
        group.tracks.map((track, localIndex) => {
          const globalMomentIndex = groups.findIndex((g) => g.m.id === group.m.id);
          const absoluteIndex =
            groups
              .slice(0, globalMomentIndex)
              .reduce((sum, g) => sum + g.tracks.length, 0) + localIndex;
          return {
            track,
            momentName: group.m.name,
            absoluteIndex,
          };
        }),
      ),
    [filteredGroups, groups],
  );

  function canGoPrev(): boolean {
    return currentMomentIdx > 0 || currentTrackIdx > 0;
  }

  function canGoNext(): boolean {
    if (currentMomentIdx < groups.length - 1) return true;
    if (currentTrackIdx < trackCount - 1) return true;
    return false;
  }

  function goPrev() {
    if (currentTrackIdx > 0) {
      setCurrentTrackIdx((i) => i - 1);
    } else if (currentMomentIdx > 0) {
      const prevMoment = groups[currentMomentIdx - 1];
      setCurrentMomentIdx((i) => i - 1);
      setCurrentTrackIdx(prevMoment.tracks.length - 1);
    }
    setPlaying(false);
  }

  function goNext() {
    if (currentTrackIdx < trackCount - 1) {
      setCurrentTrackIdx((i) => i + 1);
    } else if (currentMomentIdx < groups.length - 1) {
      setCurrentMomentIdx((i) => i + 1);
      setCurrentTrackIdx(0);
    }
    setPlaying(false);
  }

  function selectTrack(momentIdx: number, trackIdx: number) {
    setCurrentMomentIdx(momentIdx);
    setCurrentTrackIdx(trackIdx);
    setPlaying(false);
    if (!groups[momentIdx]?.tracks[trackIdx]?.spotify_uri) return;
    handlePlay(groups[momentIdx].tracks[trackIdx].spotify_uri!);
  }

  async function togglePlay() {
    if (playing) {
      await handlePause();
    } else if (currentTrack?.spotify_uri) {
      await handlePlay(currentTrack.spotify_uri);
    }
  }

  async function handlePlay(trackUri: string) {
    setBusy(true);
    try {
      const fallbackDeviceId =
        selectedDeviceId || deviceList.find((d) => d.is_active)?.id || deviceList[0]?.id;
      await spotifyPlayTrack({
        data: { deviceId: fallbackDeviceId || undefined, trackUri, eventId: id },
      });
      if (!selectedDeviceId && fallbackDeviceId) setSelectedDeviceId(fallbackDeviceId);
      setPlaying(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao reproduzir");
    } finally {
      setBusy(false);
    }
  }

  async function handlePause() {
    setBusy(true);
    try {
      const fallbackDeviceId =
        selectedDeviceId || deviceList.find((d) => d.is_active)?.id || deviceList[0]?.id;
      if (!fallbackDeviceId) {
        toast.error("Nenhum dispositivo Spotify disponível.");
        return;
      }
      await spotifyPausePlayback({ data: { deviceId: fallbackDeviceId, eventId: id } });
      if (!selectedDeviceId) setSelectedDeviceId(fallbackDeviceId);
      setPlaying(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao pausar");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !sessao) {
    return <ExecutarSkeleton />;
  }

  const btnClass = "h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground";
  const playBtnClass =
    "h-16 w-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-[var(--shadow-glow)] ring-1 ring-primary/20";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/sessoes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {sessao.title}
          </Link>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
            Active Session
          </span>
        </div>
      </header>

      {!spotifyConnected && (
        <div className="mx-auto mt-20 max-w-4xl px-4">
          <div className="rounded-lg border border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Spotify não conectado.{""}
            <Link
              to="/sessoes/$id"
              params={{ id }}
              className="ml-1 underline hover:text-foreground"
            >
              Conectar na edição
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-6 pt-20 pb-24">
        {groups.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Nenhum momento configurado nesta sessão.
          </div>
        ) : (
          <>
            <section className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[var(--shadow-elegant)]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Agora</p>
              <p className="mt-1 text-sm text-accent">{currentGroup?.m.name ?? "Sem momento"}</p>
              <p className="mt-2 truncate text-base font-semibold text-foreground">
                {currentTrack?.track_name ?? "Selecione uma faixa"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack?.artists_json?.[0] ?? "Sem artista"}
              </p>
              {currentTrack?.note && (
                <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{currentTrack.note}</p>
              )}
            </section>

            <div className="mb-4 overflow-x-auto pb-1">
              <div className="flex w-max gap-2">
                <button
                  onClick={() => setMomentFilter("__all__")}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    momentFilter === "__all__"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  Todos
                </button>
                {groups.map((group) => (
                  <button
                    key={group.m.id}
                    onClick={() => setMomentFilter(group.m.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      momentFilter === group.m.id
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {group.m.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pb-56">
              <p className="px-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Sequence
              </p>
              {sequenceItems.map((item) => {
                const isActive = item.absoluteIndex === currentAbsoluteIndex;
                const isCompleted = item.absoluteIndex < currentAbsoluteIndex;
                const groupIndex = groups.findIndex((g) => g.m.name === item.momentName);
                const trackIndex = groups[groupIndex]?.tracks.findIndex(
                  (t) => t.id === item.track.id,
                );
                return (
                  <button
                    key={item.track.id}
                    onClick={() => selectTrack(groupIndex, Math.max(trackIndex, 0))}
                    disabled={!item.track.spotify_uri}
                    className={`relative flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-accent/80 bg-secondary/30 shadow-[0_0_0_1px_var(--accent)]"
                        : isCompleted
                          ? "border-border/40 bg-secondary/20 opacity-60"
                          : "border-border/70 bg-secondary/25 hover:border-accent/60"
                    }`}
                  >
                    {isActive && <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-accent" />}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-accent bg-accent/20"
                          : isCompleted
                            ? "border-border/70 bg-background/80"
                            : "border-border/70 bg-background/70"
                      }`}
                    >
                      {isActive ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      ) : isCompleted ? (
                        <span className="text-sm text-accent">✓</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{item.absoluteIndex + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl leading-none text-foreground">
                        {item.momentName}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {isActive
                          ? `Playing • ${item.track.track_name}`
                          : isCompleted
                            ? "Completed"
                            : `Track: ${item.track.track_name}`}
                      </p>
                      {item.track.note && (
                        <p className="mt-1 line-clamp-2 text-xs text-foreground/75">
                          {item.track.note}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground/80">
                      {isActive ? "⋮" : "▷"}
                    </span>
                  </button>
                );
              })}
            </div>

          </>
        )}
      </main>

      <section className="fixed inset-x-0 bottom-16 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-4 pt-3 pb-3">
          {currentTrack && (
            <div className="mx-auto mb-2 max-w-sm text-center text-xs">
              <p className="truncate font-medium text-foreground/80">{currentTrack.track_name}</p>
              {currentTrack.artists_json?.[0] && (
                <p className="truncate text-muted-foreground/60">{currentTrack.artists_json[0]}</p>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={goPrev}
              disabled={!canGoPrev()}
              className={`${btnClass} transition-all duration-200 hover:bg-secondary/60 hover:text-foreground active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent`}
              aria-label="Anterior"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={togglePlay}
              disabled={busy || !currentTrack?.spotify_uri}
              className={`${playBtnClass} transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100`}
              aria-label={playing ? "Pausar" : "Reproduzir"}
            >
              {busy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : playing ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="ml-0.5 h-6 w-6" />
              )}
            </button>
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className={`${btnClass} transition-all duration-200 hover:bg-secondary/60 hover:text-foreground active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent`}
              aria-label="Próximo"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handlePause}
            disabled={busy}
            className="mx-auto mt-3 flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-destructive/70 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-destructive transition hover:bg-destructive/10 disabled:opacity-40"
          >
            <AlertTriangle className="h-4 w-4" />
            Emergency Stop
          </button>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 py-1 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-4xl grid-cols-4">
          <Link to="/" className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link to="/sessoes" className="flex flex-col items-center justify-center rounded-lg bg-secondary/40 py-2 text-[10px] text-foreground">
            <ListMusic className="h-4 w-4" />
            Sessões
          </Link>
          <button className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground">
            <Library className="h-4 w-4" />
            Biblioteca
          </button>
          <button className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground">
            <Settings className="h-4 w-4" />
            Ajustes
          </button>
        </div>
      </nav>
    </div>
  );
}

function ExecutarSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card/40 px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-5">
              <Skeleton className="h-5 w-20 mb-3" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
