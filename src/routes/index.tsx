import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Music, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harmonia — Gestão Musical da Loja Maçônica" },
      { name: "description", content: "Organize as músicas do Spotify por momento da sessão. Facilite o trabalho da Harmonia." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/sessoes" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rotate-45 border-2 border-primary" />
          <span className="font-display text-xl">Harmonia</span>
        </div>
        <Link to="/login" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-20 pb-32 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Para o Chefe de Harmonia
        </p>
        <h1 className="font-display text-5xl md:text-7xl leading-tight">
          A trilha sonora dos
          <br />
          <span style={{ backgroundImage: "var(--gradient-silver)", WebkitBackgroundClip: "text", color: "transparent" }}>
            trabalhos ritualísticos
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Organize playlists do Spotify por momento da sessão. Aprendiz, Companheiro ou Mestre — tudo pronto, ao alcance de um clique.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-[1.02]"
          >
            Começar agora
          </Link>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Music, t: "Spotify integrado", d: "Cole o link, toque direto no app." },
            { icon: Sparkles, t: "Momentos prontos", d: "Ritual padrão dos três graus pré-cadastrados." },
            { icon: Users, t: "Colaborativo", d: "Toda a Harmonia da Loja em um só lugar." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card/50 p-6 text-left backdrop-blur">
              <Icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="font-display text-xl">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
