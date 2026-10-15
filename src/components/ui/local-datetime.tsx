'use client';

import { useEffect, useState } from 'react';

/**
 * Locale/timezone-safe datetime for SSR: stable ISO date on server,
 * full local formatting after mount (avoids hydration mismatches).
 */
export function LocalDateTime({
  iso,
  fallback = 'Date TBA',
}: {
  iso: string | null | undefined;
  fallback?: string;
}) {
  const [label, setLabel] = useState(() => {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return iso.slice(0, 10);
  });

  useEffect(() => {
    if (!iso) {
      setLabel(fallback);
      return;
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      setLabel(fallback);
      return;
    }
    setLabel(
      d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    );
  }, [iso, fallback]);

  return <span>{label}</span>;
}
