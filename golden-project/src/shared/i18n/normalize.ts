// Normalise Arabic text for SEARCH only. Never overwrite the stored name with this.
export function normalizeArabic(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[ً-ٰٟ]/g, "") // harakat and dagger alef
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
