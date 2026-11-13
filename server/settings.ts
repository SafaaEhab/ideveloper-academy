import { eq } from "drizzle-orm";
import { academySettings } from "../drizzle/schema";
import { getDb } from "./db";
import {
  DEFAULT_ACADEMY_TIMEZONE,
  DEFAULT_REMINDER_HOUR,
} from "../shared/time";
import {
  OVERPAYMENT_POLICIES,
  REMINDER_OFFSETS,
  type OverpaymentPolicy,
} from "../shared/finance";

/**
 * Configurable academy settings.
 *
 * Anything that is a business decision belongs here. The defaults are either
 * neutral (0%, no transfer details) or conservative (marketing consent
 * required, thank-you disabled), never invented prices or payment credentials.
 */

export const SETTING_KEYS = {
  academyName: "academy.name",
  academyPhone: "academy.phone",
  academyAddress: "academy.address",
  timezone: "academy.timezone",
  reminderOffsets: "finance.reminderOffsets",
  reminderHour: "finance.reminderHour",
  reminderEnabled: "finance.reminderEnabled",
  siblingDiscountPercent: "finance.siblingDiscountPercent",
  overpaymentPolicy: "finance.overpaymentPolicy",
  thankYouEnabled: "finance.thankYouEnabled",
  cashInstructions: "payment.cash.instructions",
  cashHours: "payment.cash.hours",
  instapayNumber: "payment.instapay.number",
  instapayInstructions: "payment.instapay.instructions",
  walletNumber: "payment.wallet.number",
  walletInstructions: "payment.wallet.instructions",
  bankName: "payment.bank.name",
  bankAccountName: "payment.bank.accountName",
  bankAccountNumber: "payment.bank.accountNumber",
  bankIban: "payment.bank.iban",
  bankInstructions: "payment.bank.instructions",
  requireMarketingConsent: "messaging.requireMarketingConsent",
  batchSize: "messaging.batchSize",
  delayMs: "messaging.delayMs",
  retryLimit: "messaging.retryLimit",
  paymentReminderTemplateName: "messaging.paymentReminderTemplateName",
  paymentReminderTemplateLanguage: "messaging.paymentReminderTemplateLanguage",
  thankYouTemplateName: "messaging.thankYouTemplateName",
  thankYouTemplateLanguage: "messaging.thankYouTemplateLanguage",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export type AppSettings = {
  academyName: string;
  academyPhone: string;
  academyAddress: string;
  timezone: string;
  reminderOffsets: number[];
  reminderHour: string;
  reminderEnabled: boolean;
  siblingDiscountPercent: number;
  overpaymentPolicy: OverpaymentPolicy;
  thankYouEnabled: boolean;
  cashInstructions: string;
  cashHours: string;
  instapayNumber: string;
  instapayInstructions: string;
  walletNumber: string;
  walletInstructions: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankInstructions: string;
  requireMarketingConsent: boolean;
  batchSize: number;
  delayMs: number;
  retryLimit: number;
  paymentReminderTemplateName: string;
  paymentReminderTemplateLanguage: string;
  thankYouTemplateName: string;
  thankYouTemplateLanguage: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  // The name and public phone are already printed across the public site.
  academyName: "iDeveloper Academy",
  academyPhone: "01062302368",
  academyAddress: "",
  timezone: DEFAULT_ACADEMY_TIMEZONE,
  reminderOffsets: [...REMINDER_OFFSETS],
  reminderHour: DEFAULT_REMINDER_HOUR,
  reminderEnabled: true,
  siblingDiscountPercent: 0,
  overpaymentPolicy: "credit",
  thankYouEnabled: false,
  cashInstructions: "",
  cashHours: "",
  instapayNumber: "",
  instapayInstructions: "",
  walletNumber: "",
  walletInstructions: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIban: "",
  bankInstructions: "",
  requireMarketingConsent: true,
  batchSize: 25,
  delayMs: 1000,
  retryLimit: 3,
  paymentReminderTemplateName: "",
  paymentReminderTemplateLanguage: "ar",
  thankYouTemplateName: "",
  thankYouTemplateLanguage: "ar",
};

type SettingDefinition = {
  key: SettingKey;
  field: keyof AppSettings;
  parse: (value: unknown) => unknown;
  serialize?: (value: unknown) => unknown;
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const DEFINITIONS: SettingDefinition[] = [
  { key: SETTING_KEYS.academyName, field: "academyName", parse: v => readString(v, DEFAULT_SETTINGS.academyName) },
  { key: SETTING_KEYS.academyPhone, field: "academyPhone", parse: v => readString(v, DEFAULT_SETTINGS.academyPhone) },
  { key: SETTING_KEYS.academyAddress, field: "academyAddress", parse: v => readString(v, DEFAULT_SETTINGS.academyAddress) },
  {
    key: SETTING_KEYS.timezone,
    field: "timezone",
    parse: v => {
      const value = readString(v, DEFAULT_SETTINGS.timezone);
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
        return value;
      } catch {
        return DEFAULT_SETTINGS.timezone;
      }
    },
  },
  {
    key: SETTING_KEYS.reminderOffsets,
    field: "reminderOffsets",
    parse: v =>
      Array.isArray(v)
        ? v.map(Number).filter(n => Number.isFinite(n) && n >= -30 && n <= 60)
        : DEFAULT_SETTINGS.reminderOffsets,
  },
  {
    key: SETTING_KEYS.reminderHour,
    field: "reminderHour",
    parse: v =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v))
        ? String(v)
        : DEFAULT_SETTINGS.reminderHour,
  },
  { key: SETTING_KEYS.reminderEnabled, field: "reminderEnabled", parse: v => readBoolean(v, DEFAULT_SETTINGS.reminderEnabled) },
  {
    key: SETTING_KEYS.siblingDiscountPercent,
    field: "siblingDiscountPercent",
    parse: v => Math.min(100, Math.max(0, readNumber(v, 0))),
  },
  {
    key: SETTING_KEYS.overpaymentPolicy,
    field: "overpaymentPolicy",
    parse: v =>
      (OVERPAYMENT_POLICIES as readonly string[]).includes(String(v))
        ? String(v)
        : DEFAULT_SETTINGS.overpaymentPolicy,
  },
  { key: SETTING_KEYS.thankYouEnabled, field: "thankYouEnabled", parse: v => readBoolean(v, DEFAULT_SETTINGS.thankYouEnabled) },
  { key: SETTING_KEYS.cashInstructions, field: "cashInstructions", parse: v => readString(v, "") },
  { key: SETTING_KEYS.cashHours, field: "cashHours", parse: v => readString(v, "") },
  { key: SETTING_KEYS.instapayNumber, field: "instapayNumber", parse: v => readString(v, "") },
  { key: SETTING_KEYS.instapayInstructions, field: "instapayInstructions", parse: v => readString(v, "") },
  { key: SETTING_KEYS.walletNumber, field: "walletNumber", parse: v => readString(v, "") },
  { key: SETTING_KEYS.walletInstructions, field: "walletInstructions", parse: v => readString(v, "") },
  { key: SETTING_KEYS.bankName, field: "bankName", parse: v => readString(v, "") },
  { key: SETTING_KEYS.bankAccountName, field: "bankAccountName", parse: v => readString(v, "") },
  { key: SETTING_KEYS.bankAccountNumber, field: "bankAccountNumber", parse: v => readString(v, "") },
  { key: SETTING_KEYS.bankIban, field: "bankIban", parse: v => readString(v, "") },
  { key: SETTING_KEYS.bankInstructions, field: "bankInstructions", parse: v => readString(v, "") },
  { key: SETTING_KEYS.requireMarketingConsent, field: "requireMarketingConsent", parse: v => readBoolean(v, DEFAULT_SETTINGS.requireMarketingConsent) },
  {
    key: SETTING_KEYS.batchSize,
    field: "batchSize",
    parse: v => Math.min(100, Math.max(1, Math.trunc(readNumber(v, DEFAULT_SETTINGS.batchSize)))),
  },
  {
    key: SETTING_KEYS.delayMs,
    field: "delayMs",
    parse: v => Math.min(60_000, Math.max(250, Math.trunc(readNumber(v, DEFAULT_SETTINGS.delayMs)))),
  },
  {
    key: SETTING_KEYS.retryLimit,
    field: "retryLimit",
    parse: v => Math.min(10, Math.max(0, Math.trunc(readNumber(v, DEFAULT_SETTINGS.retryLimit)))),
  },
  { key: SETTING_KEYS.paymentReminderTemplateName, field: "paymentReminderTemplateName", parse: v => readString(v, "") },
  { key: SETTING_KEYS.paymentReminderTemplateLanguage, field: "paymentReminderTemplateLanguage", parse: v => readString(v, "ar") || "ar" },
  { key: SETTING_KEYS.thankYouTemplateName, field: "thankYouTemplateName", parse: v => readString(v, "") },
  { key: SETTING_KEYS.thankYouTemplateLanguage, field: "thankYouTemplateLanguage", parse: v => readString(v, "ar") || "ar" },
];

let cache: { at: number; value: AppSettings } | null = null;
const CACHE_MS = 5_000;

export async function getSettings(options?: { fresh?: boolean }): Promise<AppSettings> {
  if (!options?.fresh && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.value;
  }
  const db = await getDb();
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  if (!db) return settings;
  const rows = await db.select().from(academySettings);
  const values = new Map(rows.map(row => [row.key, row.value]));
  for (const definition of DEFINITIONS) {
    const raw = values.get(definition.key);
    if (raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      (settings as Record<string, unknown>)[definition.field] = definition.parse(parsed);
    } catch {
      // A malformed row falls back to the neutral default rather than crashing
      // the accounts screen or the worker.
    }
  }
  cache = { at: Date.now(), value: settings };
  return settings;
}

export async function updateSettings(
  patch: Partial<AppSettings>,
  actorUserId: number | null,
): Promise<AppSettings> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const now = new Date();
  for (const definition of DEFINITIONS) {
    if (!(definition.field in patch)) continue;
    const raw = (patch as Record<string, unknown>)[definition.field];
    const parsed = definition.parse(raw);
    await db
      .insert(academySettings)
      .values({
        key: definition.key,
        value: JSON.stringify(parsed),
        updatedByUserId: actorUserId,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          value: JSON.stringify(parsed),
          updatedByUserId: actorUserId,
          updatedAt: now,
        },
      });
  }
  cache = null;
  return getSettings({ fresh: true });
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function getReminderOffsets(): Promise<number[]> {
  const settings = await getSettings();
  return settings.reminderOffsets.length
    ? settings.reminderOffsets
    : DEFAULT_SETTINGS.reminderOffsets;
}
