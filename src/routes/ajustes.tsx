import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Harmonia" }] }),
  component: AjustesPage,
});

function AjustesPage() {
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
        <h1 className="font-display text-3xl">Ajustes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Preferências operacionais e configurações da conta.
        </p>
        <div className="mt-8 rounded-xl border border-border bg-card/50 p-5">
          <p className="text-sm text-muted-foreground">
            Configurações avançadas de operação serão ampliadas nas próximas iterações.
          </p>
        </div>
      </main>
    </div>
  );
}

