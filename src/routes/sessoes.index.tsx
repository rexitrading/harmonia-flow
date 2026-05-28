import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
};

function SessoesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [open, setOpen] = useState(false);
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
    try {
      const data = await listEvents();
      setSessoes(data as Sessao[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar eventos");
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

  async function remove(id: string) {
    if (!confirm("Excluir esta sessão?")) return;
    try {
      await deleteEvent({ data: { id } });
      toast.success("Excluída");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  if (loading || !user) return <div className="min-h-screen bg-background" />;

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
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sessoes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma sessão cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessoes.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-lg border border-border bg-card p-5 transition hover:border-accent"
              >
                <Link to="/sessoes/$id" params={{ id: s.id }} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-foreground">
                      {s.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.event_date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.location || "Sem local"}</p>
                </Link>
                <button
                  onClick={() => remove(s.id)}
                  className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
