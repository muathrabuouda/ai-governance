// Adapter: the booking Notifier port implemented over the SMS gateway in contracts/sms-provider.json.
// Everything vendor-specific lives here: URL, headers, status codes, retry rules.
import type { Notifier, NotifyResult } from "../../modules/booking/notify.ts";

export type Http = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; headers: Record<string, string>; json(): Promise<unknown> }>;

export interface SmsConfig {
  baseUrl: string;
  apiKey: string;
  http: Http;
  timeoutMs?: number; // per attempt
  maxAttempts?: number; // AC 2.3: three attempts in total
  sleep?: (ms: number) => Promise<void>;
}

const E164 = /^\+[1-9]\d{7,14}$/;

export function smsNotifier(cfg: SmsConfig): Notifier {
  const { timeoutMs = 5_000, maxAttempts = 3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = cfg;
  return {
    async send(to, text, messageKey): Promise<NotifyResult> {
      if (!E164.test(to) || text.length === 0 || text.length > 670) return { ok: false, error: "Rejected" };
      let last: NotifyResult = { ok: false, error: "Unavailable" };
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(new DOMException("timed out", "TimeoutError")), timeoutMs);
        const signal = ctrl.signal;
        try {
          const res = await cfg.http(`${cfg.baseUrl}/v1/messages`, {
            method: "POST",
            // the SAME key on every retry, so the provider never sends the message twice
            headers: {
              authorization: `Bearer ${cfg.apiKey}`,
              "content-type": "application/json",
              "idempotency-key": messageKey,
            },
            body: JSON.stringify({ to, text }),
            signal,
          });
          if (res.status === 202)
            return { ok: true, providerId: String(((await res.json()) as { id: string }).id) };
          if (res.status >= 400 && res.status < 500 && res.status !== 429)
            return { ok: false, error: "Rejected" }; // our fault: no retry
          last = { ok: false, error: "Unavailable" };
          const wait =
            res.status === 429 ? Number(res.headers["retry-after"] ?? 1) * 1000 : 2 ** attempt * 500;
          if (attempt < maxAttempts) await sleep(wait);
        } catch (e) {
          last = { ok: false, error: (e as Error).name === "TimeoutError" ? "Timeout" : "Unavailable" };
          if (attempt < maxAttempts) await sleep(2 ** attempt * 500);
        } finally {
          clearTimeout(timer);
        }
      }
      return last;
    },
  };
}
