import { useCallback, useEffect, useState } from "react";
import { authMe } from "@/lib/api/harmonia.functions";

type User = { id: string; name: string; email: string; role: "owner" | "assistant" | "viewer" };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authMe();
      setUser(result.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}
