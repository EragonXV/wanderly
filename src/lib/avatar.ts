export function getAvatarFallback(name?: string | null) {
  const normalized = (name || 'U').trim();
  const initial = normalized.charAt(0).toUpperCase() || 'U';
  const palette = [
    'bg-blue-100 text-blue-700',
    'bg-cyan-100 text-cyan-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-indigo-100 text-indigo-700',
  ];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }

  return {
    initial,
    colorClass: palette[Math.abs(hash) % palette.length],
  };
}
