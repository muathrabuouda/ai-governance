// Port: what the booking module needs from any messaging provider. No vendor names here.
export type NotifyResult =
  | { ok: true; providerId: string }
  | { ok: false; error: "Rejected" | "Unavailable" | "Timeout" };

export interface Notifier {
  send(to: string, text: string, messageKey: string): Promise<NotifyResult>;
}
