/** Converte ranking em CSV para download no dashboard de resultados. */
export function rankingToCsv(
  ranking: Array<{
    posicao: number;
    nome: string;
    total_nota: number;
    media_nota: number;
    entregas_corrigidas: number;
  }>,
): string {
  const header = 'posicao,grupo,total,media,entregas';
  const rows = ranking.map((item) =>
    [
      item.posicao,
      `"${String(item.nome).replace(/"/g, '""')}"`,
      item.total_nota.toFixed(1),
      item.media_nota.toFixed(1),
      item.entregas_corrigidas,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
