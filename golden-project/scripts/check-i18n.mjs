// Fails when a key is missing in one language or when placeholders differ.
import { readFileSync } from "node:fs";
const load = (f) => JSON.parse(readFileSync(new URL(`../locales/${f}.json`, import.meta.url), "utf8"));
const ar = load("ar"),
  en = load("en");
const vars = (s) => [...new Set([...s.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");

let bad = 0;
for (const k of new Set([...Object.keys(ar), ...Object.keys(en)])) {
  if (!(k in ar) || !(k in en)) {
    console.error(`missing in ${k in ar ? "en" : "ar"}: ${k}`);
    bad++;
    continue;
  }
  if (vars(ar[k]) !== vars(en[k])) {
    console.error(`placeholders differ: ${k} (ar: ${vars(ar[k])} / en: ${vars(en[k])})`);
    bad++;
  }
}
console.log(bad ? `${bad} problem(s)` : "i18n ok");
process.exit(bad ? 1 : 0);
