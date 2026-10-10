import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { ENV } from "./env";

/**
 * Outgoing mail over Gmail SMTP.
 *
 * Gmail refuses the account password here; it wants a 16-character App Password
 * from Google Account → Security → 2-Step Verification → App passwords. Both
 * settings live in the environment as GMAIL_USER / GMAIL_APP_PASSWORD and are
 * never exposed to the client.
 *
 * Every function reports whether the message actually went out instead of
 * throwing, because the caller still has the request saved in the database and
 * must not lose it just because a mail server was briefly unhappy.
 */

let cachedTransport: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(ENV.gmailUser && ENV.gmailAppPassword);
}

function getTransport(): Transporter | null {
  if (!isMailConfigured()) return null;
  cachedTransport ??= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: ENV.gmailUser,
      pass: ENV.gmailAppPassword,
    },
  });
  return cachedTransport;
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/** Returns false when mail is not configured or the send failed. */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn(
      `[Mail] GMAIL_USER / GMAIL_APP_PASSWORD are not set — "${message.subject}" was not sent.`,
    );
    return false;
  }

  try {
    await transport.sendMail({
      from: ENV.gmailUser,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return true;
  } catch (error) {
    console.error("[Mail] Failed to send:", error);
    return false;
  }
}

/** Every address that should hear about a new access request. */
export function notificationRecipients(): string[] {
  return [...new Set([...ENV.adminEmails, ENV.ownerEmail].filter(Boolean))];
}

export function notifyAdminAccessRequest(request: {
  email: string;
  name: string | null;
}): Promise<boolean[]> {
  const lines = [
    `${request.name || "Someone"} asked for access to the iDeveloper admin workspace.`,
    "",
    `Email: ${request.email}`,
    "",
    `Review it here: ${ENV.siteUrl}/admin?tab=admins`,
  ];

  return Promise.all(
    notificationRecipients().map(to => sendMail({
      to,
      subject: `Access request — ${request.email}`,
      text: lines.join("\n"),
    })),
  );
}