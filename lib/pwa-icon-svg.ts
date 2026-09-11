/** Brutalist wallet icon — matches the in-app topbar icon button. */
export function buildAppIconSvg(size: number): string {
  const card = Math.round(size * 0.72);
  const x = Math.round((size - card) / 2);
  const y = x - Math.round(size * 0.02);
  const radius = Math.round(size * 0.11);
  const border = Math.max(3, Math.round(size * 0.055));
  const shadow = Math.round(border * 1.35);
  const iconSize = Math.round(card * 0.42);
  const iconX = x + Math.round((card - iconSize) / 2);
  const iconY = y + Math.round((card - iconSize) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#ededed"/>
  <rect x="${x + shadow}" y="${y + shadow}" width="${card}" height="${card}" rx="${radius}" fill="#111111"/>
  <rect x="${x}" y="${y}" width="${card}" height="${card}" rx="${radius}" fill="#ffffff" stroke="#111111" stroke-width="${border}"/>
  <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
</svg>`;
}

export function appIconDataUri(size: number): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildAppIconSvg(size))}`;
}
