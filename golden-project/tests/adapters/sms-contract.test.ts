// Contract test: the adapter sends exactly what the provider contract asks for,
// and handles every response the contract documents. No network: a fake provider replays the contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { smsNotifier, type Http } from "../../src/adapters/sms/sms-notifier.ts";

const contractPath = fileURLToPath(new URL("../../contracts/sms-provider.json", import.meta.url));
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
type Call = { url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> };

function fakeProvider(statuses: number[]) {
  const calls: Call[] = [];
  const http: Http = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: JSON.parse(init.body) });
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    const example = contract.responses[String(status)] ?? {};
    return { status, headers: example.headers ?? {}, json: async () => example.body ?? {} };
  };
  return { http, calls };
}
const noSleep = async () => {};
const cfg = (http: Http) => ({ baseUrl: "https://sms.example", apiKey: "k", http, sleep: noSleep });

test("request matches the contract: method, path, headers, required body fields", async () => {
  const p = fakeProvider([202]);
  await smsNotifier(cfg(p.http)).send("+970599123456", "Your appointment reminder", "appt-1:reminder");
  const c = p.calls[0];
  assert.equal(c.method, contract.request.method);
  assert.equal(new URL(c.url).pathname, contract.request.path);
  for (const h of Object.keys(contract.request.headers)) assert.ok(c.headers[h], `missing header ${h}`);
  for (const f of contract.request.body.required) assert.ok(c.body[f], `missing body field ${f}`);
});

test("202 -> ok with the provider id", async () => {
  const r = await smsNotifier(cfg(fakeProvider([202]).http)).send("+970599123456", "Hello", "k1");
  assert.deepEqual(r, { ok: true, providerId: "msg_8f2c" });
});

test("400 -> Rejected, and no retry (our mistake)", async () => {
  const p = fakeProvider([400]);
  assert.deepEqual(await smsNotifier(cfg(p.http)).send("+970599123456", "Hello", "k2"), {
    ok: false,
    error: "Rejected",
  });
  assert.equal(p.calls.length, 1);
});

test("ac_2_3: 429 then 202 -> retried with the SAME idempotency key", async () => {
  const p = fakeProvider([429, 202]);
  const r = await smsNotifier(cfg(p.http)).send("+970599123456", "Hello", "appt-7:confirm");
  assert.equal(r.ok, true);
  assert.equal(p.calls.length, 2);
  assert.equal(p.calls[0].headers["idempotency-key"], p.calls[1].headers["idempotency-key"]);
});

test("ac_2_3: provider down -> three attempts, then Unavailable", async () => {
  const p = fakeProvider([503]);
  assert.deepEqual(await smsNotifier(cfg(p.http)).send("+970599123456", "Hello", "k3"), {
    ok: false,
    error: "Unavailable",
  });
  assert.equal(p.calls.length, 3);
});

test("a number that is not E.164 is rejected before any call", async () => {
  const p = fakeProvider([202]);
  assert.deepEqual(await smsNotifier(cfg(p.http)).send("0599123456", "Hello", "k4"), {
    ok: false,
    error: "Rejected",
  });
  assert.equal(p.calls.length, 0);
});

test("a provider that never answers -> Timeout", async () => {
  const hang: Http = (_u, init) =>
    new Promise((_r, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  const r = await smsNotifier({ ...cfg(hang), timeoutMs: 20, maxAttempts: 1 }).send(
    "+970599123456",
    "Hello",
    "k5",
  );
  assert.deepEqual(r, { ok: false, error: "Timeout" });
});
