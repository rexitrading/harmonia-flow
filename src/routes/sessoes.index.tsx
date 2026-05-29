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
import { Plus, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createEvent, deleteEvent, listEvents } from "@/lib/api/harmonia.functions";

export const Route = createFileRoute("/sessoes/")({
  head: () => ({ meta: [{ title: "Sessões — Harmonia" }] }),
  component: SessoesPage,
});

type Sessao = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  notes: string | null;
  status: "draft" | "ready" | "live" | "finished" | "archived";
  owner_name?: string;
  shared?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "rascunho",
  ready: "pronta",
  live: "ao vivo",
  finished: "encerrada",
  archived: "arquivada",
};

type SortMode = "upcoming" | "past";
type FilterMode = "all" | "active" | "finished";

function SessoesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sessao | null>(null);
  const [sort, setSort] = useState<SortMode>("upcoming");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [form, setForm] = useState({
    title: "",
    event_date: new Date().toISOString().slice(0, 16),
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    setDataLoading(true);
    try {
      const data = await listEvents();
      setSessoes(data as Sessao[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar eventos");
    } finally {
      setDataLoading(false);
    }
  }

  async function create() {
    try {
      const response = await createEvent({
        data: {
          title: form.title,
          event_date: new Date(form.event_date).toISOString(),
          location: form.location || undefined,
          notes: form.notes || undefined,
        },
      });
      toast.success("Sessão criada");
      setOpen(false);
      setForm({ ...form, title: "", notes: "" });
      await load();
      navigate({ to: "/sessoes/$id", params: { id: response.id } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar sessão");
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await deleteEvent({ data: { id: deleteTarget.id } });
      toast.success("Sessão excluída");
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = [...sessoes];

    if (filter === "active")
      list = list.filter((s) => s.status !== "finished" && s.status !== "archived");
    if (filter === "finished")
      list = list.filter((s) => s.status === "finished" || s.status === "archived");

    list.sort((a, b) => {
      const da = new Date(a.event_date).getTime();
      const db = new Date(b.event_date).getTime();
      return sort === "upcoming" ? da - db : db - da;
    });

    if (sort === "upcoming") {
      const upcoming = list.filter((s) => new Date(s.event_date).getTime() >= now - 86400000);
      const past = list.filter((s) => new Date(s.event_date).getTime() < now - 86400000);
      list = [...upcoming, ...past];
    }

    return list;
  }, [sessoes, sort, filter]);

  if (loading || !user) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Quadro da Harmonia
            </p>
            <h1 className="mt-1 font-display text-4xl">Sessões</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Nova Sessão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Sessão de Iniciação"
                  />
                </div>
                <div>
                  <Label>Data e hora</Label>
                  <Input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Local</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={!form.title}>
                  Criar sessão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sessoes.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-border">
              {(["upcoming", "past"] as SortMode[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    sort === s
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "upcoming" ? "Próximas" : "Passadas"}
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-border">
              {(["all", "active", "finished"] as FilterMode[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Todas" : f === "active" ? "Ativas" : "Encerradas"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "sessão" : "sessões"}
            </span>
          </div>
        )}

        {dataLoading ? (
          <SessionGridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {sessoes.length === 0
                ? "Nenhuma sessão cadastrada ainda."
                : "Nenhuma sessão encontrada com este filtro."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SessionCard key={s.id} sessao={s} onDelete={() => setDeleteTarget(s)} />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir sessão</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" será excluída permanentemente. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionCard({ sessao, onDelete }: { sessao: Sessao; onDelete: () => void }) {
  const date = new Date(sessao.event_date);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffHours = Math.round(diffMs / 3600000);
  const isToday = diffMs > 0 && diffMs < 86400000;
  const isSoon = diffMs > 0 && diffMs < 3600000 * 3;

  return (
    <div className="group relative rounded-lg border border-border bg-card p-5 transition hover:border-accent">
      <Link to="/sessoes/$id" params={{ id: sessao.id }} className="block">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-foreground">
            {STATUS_LABEL[sessao.status] || sessao.status}
          </span>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {date.toLocaleDateString("pt-BR")}
            </span>
            {isToday && (
              <p
                className={`text-[10px] font-medium ${isSoon ? "text-accent" : "text-muted-foreground"}`}
              >
                {diffHours > 0 ? `em ${diffHours}h` : "agora"}
              </p>
            )}
          </div>
        </div>
        <h3 className="mt-3 font-display text-xl">{sessao.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{sessao.location || "Sem local"}</p>
        {sessao.shared && sessao.owner_name && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            Compartilhado por {sessao.owner_name}
          </p>
        )}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive [@media(hover:none)]:opacity-100 opacity-0 group-hover:opacity-100"
        aria-label="Excluir sessão"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function SessionGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-3 h-6 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Skeleton className="h-3 w-32 mb-2" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <SessionGridSkeleton />
      </main>
    </div>
  );
}
