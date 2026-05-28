export type PresetMomento = { nome: string; descricao: string };

export const PRESETS: Record<string, PresetMomento[]> = {
  Aprendiz: [
    { nome: "Entrada do Venerável Mestre", descricao: "Música solene e majestosa para a entrada." },
    { nome: "Abertura dos Trabalhos", descricao: "Música ritualística para abertura no grau de Aprendiz." },
    { nome: "Entrada de Visitantes", descricao: "Recepção fraterna aos Irmãos Visitantes." },
    { nome: "Leitura da Prancha", descricao: "Música suave de fundo durante a leitura." },
    { nome: "Circulação do Tronco de Solidariedade", descricao: "Música contemplativa para o tronco." },
    { nome: "Palavra a Bem da Ordem", descricao: "Silêncio musical ou fundo discreto." },
    { nome: "Cadeia de União", descricao: "Música emotiva para a corrente fraterna." },
    { nome: "Encerramento dos Trabalhos", descricao: "Música de fechamento ritual." },
    { nome: "Ágape", descricao: "Trilha leve e festiva para a confraternização." },
  ],
  Companheiro: [
    { nome: "Entrada do Venerável Mestre", descricao: "Abertura solene." },
    { nome: "Abertura no Grau de Companheiro", descricao: "Música ritual do segundo grau." },
    { nome: "Entrada de Visitantes", descricao: "Recepção fraterna." },
    { nome: "Instrução do Grau", descricao: "Fundo contemplativo." },
    { nome: "Tronco de Solidariedade", descricao: "Música introspectiva." },
    { nome: "Cadeia de União", descricao: "Trilha emotiva." },
    { nome: "Encerramento", descricao: "Música de fechamento." },
    { nome: "Ágape", descricao: "Confraternização." },
  ],
  Mestre: [
    { nome: "Entrada do Venerável Mestre", descricao: "Abertura imponente." },
    { nome: "Abertura no Grau de Mestre", descricao: "Música ritual do terceiro grau, tom grave e nobre." },
    { nome: "Entrada de Visitantes", descricao: "Recepção fraterna." },
    { nome: "Lenda de Hiram", descricao: "Música dramática e profunda." },
    { nome: "Tronco de Solidariedade", descricao: "Trilha contemplativa." },
    { nome: "Cadeia de União", descricao: "Música emotiva e elevada." },
    { nome: "Encerramento", descricao: "Fechamento solene." },
    { nome: "Ágape", descricao: "Confraternização." },
  ],
};

export function extractSpotifyEmbed(url: string): string | null {
  // Accepts: https://open.spotify.com/track/ID or /playlist/ID or spotify:track:ID
  const m = url.match(/(?:open\.spotify\.com\/(intl-\w+\/)?(track|playlist|album|episode|show)\/|spotify:(track|playlist|album|episode|show):)([a-zA-Z0-9]+)/);
  if (!m) return null;
  const type = m[2] || m[3];
  const id = m[4];
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}
