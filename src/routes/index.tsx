import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Play } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harmonia — Gestão Musical da Loja Maçônica" },
      {
        name: "description",
        content:
          "Organize as músicas do Spotify por momento da sessão. Facilite o trabalho da Harmonia.",
      },
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
    <div className="flex min-h-screen flex-col" style={{ background: "var(--gradient-hero)" }}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn.ggailabs.com/portal/harmonia-app.png"
            alt="Harmonia"
            className="h-8 w-8"
          />
          <span className="font-display text-xl">Harmonia</span>
        </div>
        <Link
          to="/login"
          className="rounded-md border border-border/60 px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <img
          src="https://cdn.ggailabs.com/portal/harmonia-app.png"
          alt="Harmonia"
          className="h-16 w-16"
        />
        <h1 className="mt-6 font-display text-5xl leading-tight text-foreground md:text-6xl">
          Harmonia
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
          Organize a música dos trabalhos ritualísticos. Crie sessões, importe playlists do Spotify
          e execute ao vivo.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play className="h-4 w-4" />
          Acessar Harmonia
        </Link>
      </main>
    </div>
  );
}
