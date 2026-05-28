import { extractSpotifyEmbed } from "@/lib/preset-momentos";

export function SpotifyEmbed({ url }: { url: string }) {
  const src = extractSpotifyEmbed(url);
  if (!src) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
        Link do Spotify inválido
      </div>
    );
  }
  return (
    <iframe
      src={src}
      width="100%"
      height="80"
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="rounded-md"
    />
  );
}
