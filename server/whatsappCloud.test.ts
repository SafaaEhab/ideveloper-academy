import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  arabicWhatsAppError,
  createCloudProvider,
  isOptOutMessage,
  parseWebhookPayload,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  whatsappConfigStatus,
  WhatsAppError,
  type WhatsAppConfig,
} from "./whatsappCloud";

const config: WhatsAppConfig = {
  accessToken: "test-token",
  phoneNumberId: "123456",
  businessAccountId: "987654",
  verifyToken: "verify-me",
  appSecret: "app-secret",
  apiVersion: "v21.0",
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("WhatsApp configuration", () => {
  it("reports every missing variable without exposing values", () => {
    const status = whatsappConfigStatus({
      ...config,
      accessToken: "",
      appSecret: "",
    });
    expect(status.configured).toBe(false);
    expect(status.missing).toEqual([
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_APP_SECRET",
    ]);
    expect(JSON.stringify(status)).not.toContain("test-token");
    expect(JSON.stringify(status)).not.toContain("app-secret");
  });

  it("is configured only when all required variables are present", () => {
    expect(whatsappConfigStatus(config).configured).toBe(true);
  });
});

describe("webhook security", () => {
  it("accepts a valid HMAC-SHA256 signature and rejects a tampered body", () => {
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature =
      "sha256=" +
      createHmac("sha256", config.appSecret).update(raw).digest("hex");
    expect(verifyWebhookSignature(raw, signature, config.appSecret)).toBe(true);
    expect(
      verifyWebhookSignature(Buffer.from("{\"object\":\"tampered\"}"), signature, config.appSecret),
    ).toBe(false);
    expect(verifyWebhookSignature(raw, undefined, config.appSecret)).toBe(false);
    expect(verifyWebhookSignature(raw, signature, "")).toBe(false);
  });

  it("verifies the subscription challenge only with the configured token", () => {
    expect(
      verifyWebhookChallenge({
        mode: "subscribe",
        token: "verify-me",
        challenge: "12345",
        config,
      }),
    ).toBe("12345");
    expect(
      verifyWebhookChallenge({
        mode: "subscribe",
        token: "wrong",
        challenge: "12345",
        config,
      }),
    ).toBeNull();
    expect(
      verifyWebhookChallenge({
        mode: "subscribe",
        token: "verify-me",
        challenge: "12345",
        config: { ...config, verifyToken: "" },
      }),
    ).toBeNull();
  });
});

describe("webhook payload parsing", () => {
  it("extracts delivery statuses and inbound text messages", () => {
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba",
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "wamid.1",
                    status: "delivered",
                    timestamp: "1760000000",
                    recipient_id: "201012345678",
                  },
                ],
                messages: [
                  {
                    id: "wamid.2",
                    from: "201012345678",
                    timestamp: "1760000001",
                    type: "text",
                    text: { body: "STOP" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.statuses).toHaveLength(1);
    expect(parsed.statuses[0]).toMatchObject({
      providerMessageId: "wamid.1",
      status: "delivered",
      recipientPhone: "201012345678",
    });
    expect(parsed.messages[0]).toMatchObject({
      providerMessageId: "wamid.2",
      from: "201012345678",
      type: "text",
      text: "STOP",
    });
  });

  it("ignores unknown status values", () => {
    const parsed = parseWebhookPayload({
      entry: [{ changes: [{ value: { statuses: [{ id: "x", status: "deleted" }] } }] }],
    });
    expect(parsed.statuses).toEqual([]);
  });

  it("recognizes Arabic and English opt-out keywords only as whole words", () => {
    for (const text of ["STOP", "stop", "إلغاء", "توقف", "لا ترسل"]) {
      expect(isOptOutMessage(text)).toBe(true);
    }
    expect(isOptOutMessage("من فضلك لا توقف الحصة")).toBe(false);
    expect(isOptOutMessage("")).toBe(false);
  });
});

describe("Cloud API provider", () => {
  it("sends an approved template with ordered parameters", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.messaging_product).toBe("whatsapp");
      expect(body.to).toBe("201012345678");
      expect(body.type).toBe("template");
      expect(body.template.name).toBe("welcome_ar");
      expect(body.template.language.code).toBe("ar");
      expect(body.template.components[0].parameters).toEqual([
        { type: "text", text: "ليلى" },
        { type: "text", text: "Python" },
      ]);
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer test-token",
      );
      return jsonResponse({ messages: [{ id: "wamid.ok" }] });
    });
    const provider = createCloudProvider(config, fetchMock as typeof fetch);
    const result = await provider.sendTemplate({
      to: "+201012345678",
      templateName: "welcome_ar",
      language: "ar",
      parameters: ["ليلى", "Python"],
    });
    expect(result.providerMessageId).toBe("wamid.ok");
  });

  it("maps 429 to a retryable rate-limit error", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: 130429, message: "Rate limit hit" } },
        429,
        { "retry-after": "2" },
      ),
    );
    const provider = createCloudProvider(config, fetchMock as typeof fetch);
    await expect(
      provider.sendText({ to: "201012345678", body: "hi" }),
    ).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
      retryAfterMs: 2000,
    });
  });

  it("refuses to treat a 200 response without a message id as sent", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [] }));
    const provider = createCloudProvider(config, fetchMock as typeof fetch);
    await expect(
      provider.sendText({ to: "201012345678", body: "hi" }),
    ).rejects.toBeInstanceOf(WhatsAppError);
  });

  it("looks up the template status and refuses a missing template", async () => {
    const approved = createCloudProvider(
      config,
      vi.fn(async () =>
        jsonResponse({
          data: [
            {
              name: "welcome_ar",
              language: "ar",
              status: "APPROVED",
              category: "UTILITY",
              components: [{ type: "BODY", text: "مرحباً {{1}} {{2}}" }],
            },
          ],
        }),
      ) as typeof fetch,
    );
    await expect(approved.getTemplate("welcome_ar", "ar")).resolves.toMatchObject({
      status: "APPROVED",
    });

    const missing = createCloudProvider(
      config,
      vi.fn(async () => jsonResponse({ data: [] })) as typeof fetch,
    );
    await expect(missing.getTemplate("missing", "ar")).rejects.toMatchObject({
      code: "template_missing",
    });
  });

  it("returns clear Arabic errors for the common Meta failures", () => {
    expect(arabicWhatsAppError({ code: "132000" })).toContain("القالب");
    expect(arabicWhatsAppError({ httpStatus: 401 })).toContain("بيانات اعتماد");
    expect(arabicWhatsAppError({ code: "130429" })).toContain("حد إرسال");
    expect(arabicWhatsAppError({ code: "131026" })).toContain("لا يستطيع");
  });
});
