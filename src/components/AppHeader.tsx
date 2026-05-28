import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { authSignOut } from "@/lib/api/harmonia.functions";

export function AppHeader() {
  const navigate = useNavigate();

  async function logout() {
    await authSignOut();
    navigate({ to: "/" });
  }

  return (
    <header className="border-b border-border bg-card/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/sessoes" className="flex items-center gap-2">
          <div className="h-6 w-6 rotate-45 border-2 border-primary" />
          <span className="font-display text-lg">Harmonia</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </header>
  );
}
