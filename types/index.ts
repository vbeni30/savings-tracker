export type Currency = "ETB" | "USD";

export type Pool = "saved" | "spendable";

export type LedgerEntryType = "payday" | "expense" | "opening_balance" | "adjustment";

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

export type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  who: string;
  sourceId?: string;
  currency: Currency;
  amount: number;
  pool: Pool;
  iconKey: IconKey;
  note?: string;
  date: string;
  received?: number;
  saveAmount?: number;
  keepAmount?: number;
};

/** @deprecated Use LedgerEntry — kept for migration */
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

export type SourceBalance = {
  ruleId: string;
  who: string;
  currency: Currency;
  cls: CardClass;
  iconKey: IconKey;
  received: number;
  saved: number;
};

export type Balances = {
  saved: Totals;
  spendable: Totals;
  received: Totals;
  bySource: SourceBalance[];
};

export type SourcePeriod = "all" | "month";

export type SourceSavings = {
  rule: PaydayRule;
  saved: number;
  received: number;
  share: number;
  savedAllTime?: number;
  receivedAllTime?: number;
};

export type UpcomingItem = {
  rule: PaydayRule;
  date: Date;
  days: number;
};

export type AffordabilityResult = {
  ok: boolean;
  usePool: Pool;
  remainingAfter: number;
  message: string;
};
