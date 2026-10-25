/** O'yin versiyasi — bitta manba. Versiyani faqat shu yerda o'zgartiring. */
export const GAME_VERSION = "1.0.3";

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  { version: "1.0.3", date: "2026-10-11", notes: "Pauza tugmasi qo'shildi" },
  { version: "1.0.2", date: "2026-10-11", notes: "Ovoz effektlari qo'shildi" },
  { version: "1.0.1", date: "2026-10-08", notes: "O'yin oynasi ekranga to'liq moslashtirildi. O'lim bug'i tuzatildi" },
  { version: "1.0.0", date: "2026-10-08", notes: "Birinchi to'liq versiya" },
];
