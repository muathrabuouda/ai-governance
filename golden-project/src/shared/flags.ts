// Feature flags: ship code dark, turn it on gradually, turn it off without a deploy.
export interface FlagConfig {
  [flag: string]: { enabled: boolean; percent?: number };
}

// Stable bucket 0–99 per user, so the same patient always gets the same answer.
function bucket(flag: string, userId: string): number {
  let h = 2166136261;
  for (const ch of flag + ":" + userId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
}

export function flags(config: FlagConfig) {
  return {
    isOn(flag: string, userId: string): boolean {
      const f = config[flag];
      if (!f || !f.enabled) return false; // unknown or off = OFF (fail safe)
      return bucket(flag, userId) < (f.percent ?? 100);
    },
  };
}
