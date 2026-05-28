import { useSession } from "@tanstack/react-start/server";

export type AppSession = {
  userId?: string;
  email?: string;
  name?: string;
  spotifyState?: string;
};

export function useAppSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set with at least 32 chars");
  }

  return useSession<AppSession>({
    name: "harmonia-session",
    password,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  });
}
