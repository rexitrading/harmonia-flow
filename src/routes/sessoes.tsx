import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { PRESETS } from "@/lib/preset-momentos";
import { toast } from "sonner";

export const Route = createFileRoute("/sessoes")({
  head: () => ({ meta: [{ title: "Sessões — Harmonia" }] }),
  component: SessoesPage,
});

type Sessao = {
  id: string; titulo: string; data_sessao: string; tipo: string; grau: string; observacoes: string | null;
};

function SessoesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", data_sessao: new Date().toISOString().slice(0, 10), tipo: "Ordinária", grau: "Aprendiz", observacoes: "", popular: true });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data, error } = await supabase.from("sessoes").select("*").order("data_sessao", { ascending: false });
    if (error) toast.error(error.message); else setSessoes(data ?? []);
  }

  async function create() {
    if (!user) return;
    const { data, error } = await supabase.from("sessoes").insert({
      titulo: form.titulo, data_sessao: form.data_sessao, tipo: form.tipo, grau: form.grau,
      observacoes: form.observacoes || null, created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (form.popular && data) {
      const presets = PRESETS[form.grau] ?? [];
      const rows = presets.map((p, i) => ({ sessao_id: data.id, ordem: i, nome: p.nome, descricao: p.descricao }));
      if (rows.length) await supabase.from("momentos").insert(rows);
    }
    toast.success("Sessão criada");
    setOpen(false);
    setForm({ ...form, titulo: "", observacoes: "" });
    load();
    if (data) navigate({ to: "/sessoes/$id", params: { id: data.id } });
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta sessão?")) return;
    const { error } = await supabase.from("sessoes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  }

  if (loading || !user) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quadro da Harmonia</p>
            <h1 className="mt-1 font-display text-4xl">Sessões</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Sessão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-2xl">Nova Sessão</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Sessão de Iniciação" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={form.data_sessao} onChange={(e) => setForm({ ...form, data_sessao: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ordinária">Ordinária</SelectItem>
                        <SelectItem value="Branca">Branca</SelectItem>
                        <SelectItem value="Magna">Magna</SelectItem>
                        <SelectItem value="Iniciação">Iniciação</SelectItem>
                        <SelectItem value="Elevação">Elevação</SelectItem>
                        <SelectItem value="Exaltação">Exaltação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Grau</Label>
                  <Select value={form.grau} onValueChange={(v) => setForm({ ...form, grau: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                      <SelectItem value="Companheiro">Companheiro</SelectItem>
                      <SelectItem value="Mestre">Mestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
                  Popular com momentos ritualísticos do grau
                </label>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={!form.titulo}>Criar</Button>
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
              <div key={s.id} className="group relative rounded-lg border border-border bg-card p-5 transition hover:border-accent">
                <Link to="/sessoes/$id" params={{ id: s.id }} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-foreground">
                      {s.grau}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.data_sessao + "T12:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl">{s.titulo}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.tipo}</p>
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
