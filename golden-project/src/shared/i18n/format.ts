// Dates are stored in UTC and shown in the clinic's time zone. Digits are chosen explicitly.
export const CLINIC_TZ = "Asia/Jerusalem";

export function formatSlot(startsAt: Date, locale: "ar-PS" | "en"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CLINIC_TZ,
    numberingSystem: locale === "en" ? "latn" : "arab",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(startsAt);
}

export function pluralCategory(count: number, locale: "ar" | "en"): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}
