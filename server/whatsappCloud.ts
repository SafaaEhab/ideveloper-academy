import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Official Meta WhatsApp Business Cloud API client.
 *
 * No WhatsApp Web automation, no unofficial libraries, no browser automation.
 * Credentials come only from server-side environment variables and are never
 * returned to a client, logged, or written to the database.
 */

export const WHATSAPP_ENV_KEYS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_API_VERSION",
] as const;

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  appSecret: string;
  apiVersion: string;
};

export type WhatsAppConfigStatus = {
  configured: boolean;
  missing: string[];
  apiVersion: string;
  /** Only whether the ids exist — never the secret values. */
  hasPhoneNumberId: boolean;
  hasBusinessAccountId: boolean;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    accessToken: env("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    businessAccountId: env("WHATSAPP_BUSINESS_ACCOUNT_ID"),
    verifyToken: env("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
    appSecret: env("WHATSAPP_APP_SECRET"),
    apiVersion: env("WHATSAPP_API_VERSION") || "v21.0",
  };
}

export function whatsappConfigStatus(
  config: WhatsAppConfig = getWhatsAppConfig(),
): WhatsAppConfigStatus {
  const values: Record<string, string> = {
    WHATSAPP_ACCESS_TOKEN: config.accessToken,
    WHATSAPP_PHONE_NUMBER_ID: config.phoneNumberId,
    WHATSAPP_BUSINESS_ACCOUNT_ID: config.businessAccountId,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: config.verifyToken,
    WHATSAPP_APP_SECRET: config.appSecret,
    WHATSAPP_API_VERSION: config.apiVersion,
  };
  const missing = WHATSAPP_ENV_KEYS.filter(key => !values[key]);
  return {
    configured: missing.length === 0,
    missing,
    apiVersion: config.apiVersion,
    hasPhoneNumberId: Boolean(config.phoneNumberId),
    hasBusinessAccountId: Boolean(config.businessAccountId),
  };
}

export type WhatsAppApiErrorCode =
  | "not_configured"
  | "template_not_approved"
  | "template_missing"
  | "rate_limited"
  | "auth"
  | "invalid_recipient"
  | "service_window"
  | "provider"
  | "network";

export class WhatsAppError extends Error {
  code: WhatsAppApiErrorCode;
  httpStatus: number | null;
  retryable: boolean;
  retryAfterMs: number | null;
  providerCode: string | null;
  providerMessage: string | null;

  constructor(input: {
    code: WhatsAppApiErrorCode;
    message: string;
    httpStatus?: number | null;
    retryable?: boolean;
    retryAfterMs?: number | null;
    providerCode?: string | number | null;
    providerMessage?: string | null;
  }) {
    super(input.message);
    this.name = "WhatsAppError";
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? null;
    this.retryable = input.retryable ?? false;
    this.retryAfterMs = input.retryAfterMs ?? null;
    this.providerCode =
      input.providerCode == null ? null : String(input.providerCode);
    // Keep provider detail short and never include credentials.
    this.providerMessage = input.providerMessage
      ? String(input.providerMessage).slice(0, 500)
      : null;
  }
}

export type WhatsAppSendResult = {
  providerMessageId: string;
  acceptedAt: Date;
  rawStatus: string | null;
};

export type MetaTemplateLookup = {
  name: string;
  language: string;
  status: string;
  category: string | null;
  components: unknown;
};

export type SendTemplateInput = {
  to: string;
  templateName: string;
  language: string;
  parameters: string[];
};

export type SendTextInput = {
  to: string;
  body: string;
  previewUrl?: boolean;
};

export type WhatsAppProvider = {
  sendTemplate(input: SendTemplateInput): Promise<WhatsAppSendResult>;
  sendText(input: SendTextInput): Promise<WhatsAppSendResult>;
  getTemplate(name: string, language: string): Promise<MetaTemplateLookup>;
  configured: boolean;
};

const GRAPH_BASE = "https://graph.facebook.com";

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return null;
}

function providerErrorCode(payload: unknown): string | number | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: { code?: string | number } }).error;
  return error?.code ?? null;
}

function providerErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as {
    error?: { message?: string; error_data?: { details?: string } };
  }).error;
  return (
    error?.error_data?.details ??
    error?.message ??
    null
  );
}

/** Maps Meta/provider failures to a clear Arabic sentence for the UI. */
export function arabicWhatsAppError(input: {
  code?: string | number | null;
  httpStatus?: number | null;
  fallback?: string | null;
}): string {
  const code = String(input.code ?? "");
  if (code === "190" || input.httpStatus === 401) {
    return "بيانات اعتماد WhatsApp غير صحيحة أو منتهية. راجع إعدادات Meta على السيرفر.";
  }
  if (code === "132000" || code === "132001" || code === "132005") {
    return "القالب غير موجود أو غير معتمد أو أن متغيراته لا تطابق القالب المعتمد في Meta.";
  }
  if (code === "131047") {
    return "انتهت نافذة خدمة العميل (24 ساعة)؛ يجب استخدام قالب معتمد للرسائل الجديدة.";
  }
  if (code === "131026") {
    return "الرقم لا يستطيع استلام الرسالة عبر واتساب أو أنه غير مسجل.";
  }
  if (code === "130429" || input.httpStatus === 429) {
    return "تم تجاوز حد إرسال WhatsApp مؤقتاً. ستتم إعادة المحاولة تلقائياً مع تأخير.";
  }
  if (code === "131048" || code === "131056") {
    return "تم تقييد جودة رقم WhatsApp أو معدل الإرسال. أوقف الحملة وراجع جودة الرقم في Meta.";
  }
  if (code === "131031") {
    return "حساب WhatsApp Business موقوف أو مقيّد من Meta.";
  }
  if (input.httpStatus && input.httpStatus >= 500) {
    return "خدمة WhatsApp غير متاحة مؤقتاً. سيتم إعادة المحاولة.";
  }
  return (
    input.fallback?.trim() ||
    "تعذر إرسال الرسالة عبر WhatsApp. راجع سجل المحاولة في سجل الحملات."
  );
}

async function postMessage(
  config: WhatsAppConfig,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<WhatsAppSendResult> {
  const status = whatsappConfigStatus(config);
  if (!status.configured) {
    throw new WhatsAppError({
      code: "not_configured",
      message: `واتساب غير مهيأ. المتغيرات الناقصة: ${status.missing.join(", ")}`,
    });
  }

  let response: Response;
  try {
    response = await fetchImpl(
      `${GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (error) {
    throw new WhatsAppError({
      code: "network",
      message: `تعذر الاتصال بخدمة WhatsApp: ${error instanceof Error ? error.message : "network error"}`,
      retryable: true,
    });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerCode = providerErrorCode(payload);
    const retryAfter = parseRetryAfter(response);
    const rateLimited = response.status === 429 || String(providerCode) === "130429";
    throw new WhatsAppError({
      code: rateLimited
        ? "rate_limited"
        : String(providerCode) === "190" || response.status === 401
          ? "auth"
          : String(providerCode) === "131026"
            ? "invalid_recipient"
            : String(providerCode) === "131047"
              ? "service_window"
              : "provider",
      message: arabicWhatsAppError({
        code: providerCode,
        httpStatus: response.status,
        fallback: providerErrorMessage(payload),
      }),
      httpStatus: response.status,
      retryable: rateLimited || response.status >= 500,
      retryAfterMs: retryAfter,
      providerCode,
      providerMessage: providerErrorMessage(payload),
    });
  }

  const messages = (payload as { messages?: { id?: string }[] } | null)?.messages;
  const providerMessageId = messages?.[0]?.id;
  if (!providerMessageId) {
    throw new WhatsAppError({
      code: "provider",
      message: "رد WhatsApp لم يحتوِ على معرّف رسالة. لم يتم اعتبار الرسالة مرسلة.",
      httpStatus: response.status,
      retryable: false,
    });
  }
  return {
    providerMessageId,
    acceptedAt: new Date(),
    rawStatus: "accepted",
  };
}

export function createCloudProvider(
  config: WhatsAppConfig = getWhatsAppConfig(),
  fetchImpl: typeof fetch = fetch,
): WhatsAppProvider {
  return {
    configured: whatsappConfigStatus(config).configured,
    async sendTemplate(input) {
      return postMessage(
        config,
        {
          recipient_type: "individual",
          to: input.to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.language || "ar" },
            components: input.parameters.length
              ? [
                  {
                    type: "body",
                    parameters: input.parameters.map(text => ({
                      type: "text",
                      text,
                    })),
                  },
                ]
              : undefined,
          },
        },
        fetchImpl,
      );
    },
    async sendText(input) {
      return postMessage(
        config,
        {
          recipient_type: "individual",
          to: input.to.replace(/^\+/, ""),
          type: "text",
          text: {
            preview_url: Boolean(input.previewUrl),
            body: input.body,
          },
        },
        fetchImpl,
      );
    },
    async getTemplate(name, language) {
      if (!config.businessAccountId) {
        throw new WhatsAppError({
          code: "not_configured",
          message:
            "WHATSAPP_BUSINESS_ACCOUNT_ID غير مهيأ، ولا يمكن التحقق من اعتماد القالب لدى Meta.",
        });
      }
      const url = new URL(
        `${GRAPH_BASE}/${config.apiVersion}/${config.businessAccountId}/message_templates`,
      );
      url.searchParams.set("name", name);
      if (language) url.searchParams.set("language", language);
      url.searchParams.set(
        "fields",
        "name,status,language,category,components",
      );
      url.searchParams.set("limit", "10");

      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          headers: { Authorization: `Bearer ${config.accessToken}` },
          signal: AbortSignal.timeout(20_000),
        });
      } catch (error) {
        throw new WhatsAppError({
          code: "network",
          message: `تعذر التحقق من اعتماد القالب لدى Meta: ${
            error instanceof Error ? error.message : "network error"
          }`,
          retryable: true,
        });
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const providerCode = providerErrorCode(payload);
        throw new WhatsAppError({
          code:
            response.status === 401 || String(providerCode) === "190"
              ? "auth"
              : "provider",
          message: arabicWhatsAppError({
            code: providerCode,
            httpStatus: response.status,
            fallback: providerErrorMessage(payload),
          }),
          httpStatus: response.status,
          providerCode,
          providerMessage: providerErrorMessage(payload),
        });
      }
      const data = (payload as { data?: MetaTemplateLookup[] } | null)?.data ?? [];
      const match = data.find(
        item =>
          item.name === name &&
          (!language || String(item.language).toLowerCase() === language.toLowerCase()),
      );
      if (!match) {
        throw new WhatsAppError({
          code: "template_missing",
          message:
            "القالب غير موجود في حساب WhatsApp Business. لا يمكن اعتباره معتمداً لمجرد وجوده محلياً.",
        });
      }
      return match;
    },
  };
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return createCloudProvider();
}

export type ParsedWebhookStatus = {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  recipientPhone: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type ParsedWebhookMessage = {
  providerMessageId: string;
  from: string;
  timestamp: Date;
  type: string;
  text: string | null;
};

export type ParsedWebhook = {
  statuses: ParsedWebhookStatus[];
  messages: ParsedWebhookMessage[];
};

/**
 * Extracts delivery statuses and inbound messages from a Meta webhook payload.
 * Unknown shapes are ignored, never treated as success.
 */
export function parseWebhookPayload(payload: unknown): ParsedWebhook {
  const statuses: ParsedWebhookStatus[] = [];
  const messages: ParsedWebhookMessage[] = [];
  if (!payload || typeof payload !== "object") return { statuses, messages };
  const entries = (payload as { entry?: unknown[] }).entry;
  if (!Array.isArray(entries)) return { statuses, messages };

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const changes = (entry as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: unknown })?.value;
      if (!value || typeof value !== "object") continue;

      const rawStatuses = (value as { statuses?: unknown[] }).statuses;
      if (Array.isArray(rawStatuses)) {
        for (const raw of rawStatuses) {
          if (!raw || typeof raw !== "object") continue;
          const row = raw as {
            id?: unknown;
            status?: unknown;
            timestamp?: unknown;
            recipient_id?: unknown;
            errors?: { code?: unknown; title?: unknown; message?: unknown }[];
          };
          if (typeof row.id !== "string") continue;
          const rawStatus = String(row.status ?? "").toLowerCase();
          if (!["sent", "delivered", "read", "failed"].includes(rawStatus)) {
            continue;
          }
          const timestampSeconds = Number(row.timestamp);
          statuses.push({
            providerMessageId: row.id,
            status: rawStatus as ParsedWebhookStatus["status"],
            timestamp: Number.isFinite(timestampSeconds)
              ? new Date(timestampSeconds * 1000)
              : new Date(),
            recipientPhone:
              typeof row.recipient_id === "string" ? row.recipient_id : null,
            errorCode: row.errors?.[0]?.code
              ? String(row.errors[0].code)
              : null,
            errorMessage:
              (row.errors?.[0]?.title as string | undefined) ??
              (row.errors?.[0]?.message as string | undefined) ??
              null,
          });
        }
      }

      const rawMessages = (value as { messages?: unknown[] }).messages;
      if (Array.isArray(rawMessages)) {
        for (const raw of rawMessages) {
          if (!raw || typeof raw !== "object") continue;
          const row = raw as {
            id?: unknown;
            from?: unknown;
            timestamp?: unknown;
            type?: unknown;
            text?: { body?: unknown };
          };
          if (typeof row.id !== "string" || typeof row.from !== "string") continue;
          const timestampSeconds = Number(row.timestamp);
          messages.push({
            providerMessageId: row.id,
            from: row.from,
            timestamp: Number.isFinite(timestampSeconds)
              ? new Date(timestampSeconds * 1000)
              : new Date(),
            type: String(row.type ?? "unknown"),
            text:
              typeof row.text?.body === "string" ? row.text.body : null,
          });
        }
      }
    }
  }
  return { statuses, messages };
}

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;
  const provided = String(signatureHeader).trim();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Webhook verification handshake. Returns the challenge to echo, or null. */
export function verifyWebhookChallenge(input: {
  mode: string | null | undefined;
  token: string | null | undefined;
  challenge: string | null | undefined;
  config?: WhatsAppConfig;
}): string | null {
  const config = input.config ?? getWhatsAppConfig();
  if (!config.verifyToken) return null;
  if (input.mode !== "subscribe") return null;
  if (!input.token || input.token !== config.verifyToken) return null;
  return input.challenge ?? null;
}

/**
 * STOP-style inbound keywords. Arabic and English, trimmed and case-folded.
 * A recipient who sends any of these is opted out of all future marketing.
 */
export const OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "إلغاء",
  "الغاء",
  "توقف",
  "إيقاف",
  "ايقاف",
  "لا ترسل",
  "وقف الرسائل",
];

export function isOptOutMessage(text: string | null | undefined): boolean {
  const value = String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.!،,?؟]/g, "");
  return OPT_OUT_KEYWORDS.some(keyword => value === keyword.toLowerCase());
}

/** Test helper: wait helper used by the worker's injectable provider tests. */
export const __testing = { sleep };
