/** Generate a short opaque CID for a stored document. */
export function generateCid(): string {
  // 16 random bytes → base36-ish short id
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return (
    "doc_" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Generate an opaque ephemeral token string. */
export function generateTokenString(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return (
    "tk_" +
    Array.from(arr)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 40)
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeRemaining(expiresAt: string): {
  expired: boolean;
  label: string;
} {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { expired: true, label: "expired" };
  const s = Math.floor(ms / 1000);
  if (s < 60) return { expired: false, label: `${s}s` };
  const m = Math.floor(s / 60);
  if (m < 60) return { expired: false, label: `${m}m ${s % 60}s` };
  const h = Math.floor(m / 60);
  return { expired: false, label: `${h}h ${m % 60}m` };
}
