// Structured logger: one JSON object per line, personal data redacted BEFORE it is written.
export type LogFields = Record<string, unknown>;
const PHONE = /\+?\d[\d\s-]{7,}\d/g;

function redact(v: unknown): unknown {
  if (typeof v === "string") return v.replace(PHONE, (m) => m.slice(0, 4) + "…" + m.slice(-2));
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, k === "phone" ? "[redacted]" : redact(x)]),
    );
  return v;
}

export function logger(
  write: (line: string) => void = (l) => process.stdout.write(l + "\n"),
  now = () => new Date(),
) {
  const emit = (level: string, event: string, fields: LogFields = {}) =>
    write(JSON.stringify({ ts: now().toISOString(), level, event, ...(redact(fields) as LogFields) }));
  return {
    info: (event: string, f?: LogFields) => emit("info", event, f),
    warn: (event: string, f?: LogFields) => emit("warn", event, f),
    error: (event: string, f?: LogFields) => emit("error", event, f),
  };
}
