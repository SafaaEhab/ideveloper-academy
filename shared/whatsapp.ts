/**
 * One rule for the WhatsApp group link, shared by the admin form, the group
 * router, and the instructor share flow.
 *
 * Only real group invitation links are accepted. The link is later opened with
 * `window.open`, so allowing arbitrary URLs would hand an admin-supplied string
 * the ability to navigate the instructor anywhere. Keeping the check here means
 * the client and the server quote the same message.
 */

const WHATSAPP_GROUP_HOST = "chat.whatsapp.com";

export type WhatsAppUrlResult = {
  /** Normalized `https://chat.whatsapp.com/...`, or null when left empty. */
  url: string | null;
  error?: string;
};

export function normalizeWhatsAppGroupUrl(
  raw: string | null | undefined,
): WhatsAppUrlResult {
  const value = (raw ?? "").trim();
  if (!value) return { url: null };

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      url: null,
      error: "Enter a valid WhatsApp group invite link (https://chat.whatsapp.com/...)",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      url: null,
      error: "The WhatsApp group link must start with https://",
    };
  }

  if (parsed.hostname.toLowerCase() !== WHATSAPP_GROUP_HOST) {
    return {
      url: null,
      error: "Use a WhatsApp group invite link from chat.whatsapp.com",
    };
  }

  const inviteCode = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (!inviteCode) {
    return {
      url: null,
      error: "The link needs the group invite code after chat.whatsapp.com/",
    };
  }

  return { url: parsed.toString() };
}
