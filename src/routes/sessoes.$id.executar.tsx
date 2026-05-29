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
  Car,
  Smartphone,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getEventDetail,
  getSpotifyConnectionStatus,
  getSpotifyDevices,
  getEventSpotifyDevices,
  spotifyPlayTrack,
  spotifyPausePlayback,
} from "@/lib/api/harmonia.functions";

export const Route = createFileRoute("/sessoes/$id/executar")({
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
  const [condutorMode, setCondutorMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [momentFilter, setMomentFilter] = useState<string>("__all__");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, id]);

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
      await spotifyPlayTrack({
        data: { deviceId: selectedDeviceId || undefined, trackUri, eventId: id },
      });
      setPlaying(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao reproduzir");
    } finally {
      setBusy(false);
    }
  }

  async function handlePause() {
    if (!selectedDeviceId) return;
    setBusy(true);
    try {
      await spotifyPausePlayback({ data: { deviceId: selectedDeviceId, eventId: id } });
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

  const btnClass = condutorMode
    ? "h-14 w-14 rounded-full flex items-center justify-center text-muted-foreground"
    : "h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground";

  const playBtnClass = condutorMode
    ? "h-16 w-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-[var(--shadow-glow)] ring-1 ring-primary/20"
    : "h-12 w-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-[var(--shadow-glow)] ring-1 ring-primary/10";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/sessoes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {sessao.title}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCondutorMode((c) => !c)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                condutorMode
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {condutorMode ? (
                <span className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" /> Condutor
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" /> Normal
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {!spotifyConnected && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
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

      {deviceList.length > 0 && (
        <div className="mx-auto mt-3 w-full max-w-4xl px-4">
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
          >
            {deviceList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type}) {d.is_active ? "ativo" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <main
        className={`mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 ${
          condutorMode ? "py-4" : "py-6"
        }`}
      >
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

            <div className="flex-1 space-y-4 overflow-y-auto">
              {filteredGroups.map((group) => {
                const mi = groups.findIndex((g) => g.m.id === group.m.id);
                const isCurrent = mi === currentMomentIdx;
                const isPast = mi < currentMomentIdx;
                return (
                  <div
                    key={group.m.id}
                    className={`rounded-xl border transition-all duration-300 ${
                      isCurrent
                        ? "border-accent/70 bg-gradient-to-b from-card to-card/80 shadow-[var(--shadow-glow)] ring-1 ring-accent/10"
                        : isPast
                          ? "border-border/30 bg-card/20 opacity-40"
                          : "border-border/50 bg-card/40 hover:border-border/70"
                    } ${condutorMode ? "p-4" : "p-5"}`}
                  >
                    <div className={`flex items-center gap-2 ${isCurrent ? "mb-3" : ""}`}>
                      <span
                        className={`inline-flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                          isCurrent
                            ? "h-6 w-6 bg-accent text-accent-foreground shadow-[0_0_12px_-2px_var(--accent)]"
                            : "h-5 w-5 bg-secondary text-muted-foreground"
                        }`}
                      >
                        {String(mi + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`${isCurrent ? "text-sm font-medium text-foreground/80" : "text-xs text-muted-foreground"}`}
                      >
                        {group.m.name}
                      </span>
                      {isCurrent && (
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${playing ? "animate-pulse bg-accent" : "bg-accent/50"}`}
                          />
                          {playing ? "ao vivo" : "selecionado"}
                        </span>
                      )}
                    </div>

                    <div className={isCurrent ? "space-y-1" : "mt-2 space-y-0.5"}>
                      {group.tracks.map((t, ti) => {
                        const isActive = isCurrent && ti === currentTrackIdx;
                        return (
                          <button
                            key={t.id}
                            onClick={() => selectTrack(mi, ti)}
                            disabled={!t.spotify_uri}
                            className={`flex w-full items-center gap-3 rounded-xl text-left transition-all duration-200 ${
                              isActive
                                ? condutorMode
                                  ? "bg-accent/15 p-4 ring-1 ring-accent/20"
                                  : "bg-accent/12 p-3 ring-1 ring-accent/15"
                                : condutorMode
                                  ? "p-3 hover:bg-secondary/40"
                                  : "p-2.5 hover:bg-secondary/30"
                            } ${!t.spotify_uri ? "opacity-40" : ""}`}
                          >
                            <div
                              className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
                                isActive
                                  ? "bg-accent text-accent-foreground shadow-[0_0_10px_-2px_var(--accent)]"
                                  : "bg-secondary/60 text-muted-foreground"
                              } ${condutorMode ? "h-9 w-9" : "h-8 w-8"}`}
                            >
                              <Music2 className={condutorMode ? "h-4 w-4" : "h-3.5 w-3.5"} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate font-medium leading-tight ${
                                  isActive ? "text-accent-foreground" : "text-foreground/80"
                                } ${condutorMode ? "text-base" : "text-sm"}`}
                              >
                                {t.track_name}
                              </p>
                              {t.artists_json?.[0] && (
                                <p
                                  className={`mt-0.5 truncate text-muted-foreground/60 ${
                                    condutorMode ? "text-sm" : "text-xs"
                                  }`}
                                >
                                  {t.artists_json[0]}
                                </p>
                              )}
                            </div>
                            {isActive && playing && (
                              <div className="flex shrink-0 items-end gap-[3px] px-1">
                                <span className="h-3 w-[3px] animate-pulse rounded-full bg-accent" />
                                <span
                                  className="h-4 w-[3px] animate-pulse rounded-full bg-accent"
                                  style={{ animationDelay: "0.15s", animationDuration: "0.8s" }}
                                />
                                <span
                                  className="h-2.5 w-[3px] animate-pulse rounded-full bg-accent"
                                  style={{ animationDelay: "0.3s", animationDuration: "1.1s" }}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={`flex-shrink-0 border-t border-border/60 bg-gradient-to-t from-background via-background to-transparent ${
                condutorMode ? "pt-6 pb-6 mt-4" : "pt-5 pb-3 mt-4"
              }`}
            >
              <div
                className={`flex items-center justify-center ${condutorMode ? "gap-10" : "gap-8"}`}
              >
                <button
                  onClick={goPrev}
                  disabled={!canGoPrev()}
                  className={`${btnClass} transition-all duration-200 hover:bg-secondary/60 hover:text-foreground active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent`}
                  aria-label="Anterior"
                >
                  <SkipBack className={condutorMode ? "h-6 w-6" : "h-5 w-5"} />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={busy || !currentTrack?.spotify_uri || !selectedDeviceId}
                  className={`${playBtnClass} transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100`}
                  aria-label={playing ? "Pausar" : "Reproduzir"}
                >
                  {busy ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  ) : playing ? (
                    <Pause className={condutorMode ? "h-7 w-7" : "h-6 w-6"} />
                  ) : (
                    <Play className={condutorMode ? "h-7 w-7 ml-0.5" : "h-6 w-6 ml-0.5"} />
                  )}
                </button>

                <button
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className={`${btnClass} transition-all duration-200 hover:bg-secondary/60 hover:text-foreground active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent`}
                  aria-label="Próximo"
                >
                  <SkipForward className={condutorMode ? "h-6 w-6" : "h-5 w-5"} />
                </button>
              </div>

              {currentTrack && (
                <div
                  className={`mx-auto mt-3 max-w-xs text-center ${condutorMode ? "text-sm" : "text-xs"}`}
                >
                  <p className="truncate font-medium text-foreground/80">
                    {currentTrack.track_name}
                  </p>
                  {currentTrack.artists_json?.[0] && (
                    <p className="truncate text-muted-foreground/60">
                      {currentTrack.artists_json[0]}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
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
