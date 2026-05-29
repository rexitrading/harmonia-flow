import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Harmonia" }] }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl">Biblioteca</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Central de trilhas e referências da operação musical.
        </p>
        <div className="mt-8 rounded-xl border border-border bg-card/50 p-5">
          <p className="text-sm text-muted-foreground">
            Use as sessões para importar playlists e organizar por momentos.
          </p>
          <Link
            to="/sessoes"
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ir para sessões
          </Link>
        </div>
      </main>
    </div>
  );
}

