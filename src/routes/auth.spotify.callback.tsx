import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { finalizeSpotifyConnection } from "@/lib/api/harmonia.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/spotify/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        toast.error(`Spotify retornou erro: ${error}`);
        navigate({ to: "/sessoes" });
        return;
      }

      if (!code || !state) {
        toast.error("Callback Spotify inválido");
        navigate({ to: "/sessoes" });
        return;
      }

      try {
        await finalizeSpotifyConnection({ data: { code, state } });
        toast.success("Spotify conectado");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao conectar Spotify");
      }
      navigate({ to: "/sessoes" });
    };

    void run();
  }, [navigate]);

  return <div className="min-h-screen bg-background" />;
}
