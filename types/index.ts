export type Currency = "ETB" | "USD";

export type IconKey =
  | "laptop"
  | "headset"
  | "handset"
  | "wallet"
  | "plus"
  | "bell"
  | "download"
  | "moneybag"
  | "ballot"
  | "phone"
  | "sparkles";

export type CardClass = "c1" | "c2" | "c3" | "c4";

export type PaydayRule = {
  id: string;
  who: string;
  currency: Currency;
  freqDays?: number;
  anchor?: string;
  freqMonthly?: number | "end";
  received: number;
  save: number;
  keep: number;
  iconKey: IconKey;
  cls: CardClass;
};

export type SavingsEntry = {
  id: string;
  who: string;
  currency: Currency;
  save: number;
  iconKey: IconKey;
  date: string;
};

export type Totals = {
  etb: number;
  usd: number;
};

export type SourceSavings = {
  rule: PaydayRule;
  saved: number;
  share: number;
};

export type UpcomingItem = {
  rule: PaydayRule;
  date: Date;
  days: number;
};
