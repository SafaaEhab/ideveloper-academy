// Company WhatsApp number in international format (country code, no "+" or
// separators) because wa.me requires that exact shape.
// 01039721472 -> +20 10 39721472 -> 201039721472
export const COMPANY_WHATSAPP_NUMBER = "201039721472";

export type ContactFormValues = {
  name: string;
  phone: string;
  message: string;
};

// Turns the contact form into a prefilled WhatsApp chat, so the enquiry lands in
// the company inbox as a normal message the team can reply to.
export function buildWhatsAppLink({ name, phone, message }: ContactFormValues) {
  const body = [
    "New enquiry from the website",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    "",
    "Message:",
    message,
  ].join("\n");

  return `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
}

/** The social rail shown on the home page. Each link opens in a new tab. */
export const SOCIAL_LINKS = {
  whatsapp: buildWhatsAppLink({ name: "", phone: "", message: "Hi iDeveloper, I have a question." }),
  facebook: "https://www.facebook.com/iDeveloperAcademy/",
  // The tracking parameters LinkedIn adds when a visitor shares a profile are
  // dropped so the public link stays clean.
  linkedin: "https://www.linkedin.com/in/ideveloper-academy-384864356/",
} as const;