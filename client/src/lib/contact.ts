// Company WhatsApp number in international format (country code, no "+" or
// separators) because wa.me requires that exact shape.
// 01062302368 -> +20 10 62302368 -> 201062302368
//
// This is the same number the site prints in the footer and the one baked into
// the academy's own photos, so the WhatsApp buttons and the advertised number
// always agree.
export const COMPANY_WHATSAPP_NUMBER = "201062302368";

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

/**
 * Opens a WhatsApp chat that already says which course the visitor is asking
 * about, so the team does not have to work out what the enquiry is for. The
 * message is written in Arabic because that is the language of the page the
 * button sits on, and the parent who presses it is the one reading it.
 */
export function buildCourseEnquiryLink(courseTitle: string) {
  const body = `مرحباً iDeveloper Academy، عايز أتركّب في كورس ${courseTitle} وعايز أعرف تفاصيله ومواعيده.`;
  return `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
}

export type RegistrationValues = {
  fullName: string;
  phone: string;
  age: string;
  address: string;
  school: string;
  parentEmail: string;
  parentPhone: string;
  course: string;
  gender: string;
  siblingRegistered: string;
  siblingName?: string;
  siblingPhone?: string;
  notes?: string;
};

/**
 * Turns the registration form into one prefilled WhatsApp message that carries
 * every field the academy's form asks for, so the team can confirm the seat
 * without asking the parent to retype anything.
 */
export function buildRegistrationWhatsAppLink(values: RegistrationValues) {
  const gender = values.gender === "male" ? "ذكر" : values.gender === "female" ? "أنثى" : "";
  const lines = [
    "طلب تسجيل جديد — iDeveloper Academy",
    "",
    `الاسم الكامل: ${values.fullName}`,
    `رقم الهاتف: ${values.phone}`,
    `العمر: ${values.age}`,
    `العنوان: ${values.address}`,
    `المدرسة: ${values.school}`,
    `البريد الإلكتروني لولي الأمر: ${values.parentEmail}`,
    `رقم ولي الأمر: ${values.parentPhone}`,
    `الدورة: ${values.course}`,
    `الجنس: ${gender}`,
    `هل سبق تسجيل أخ أو أخت في نفس الكورس؟ ${values.siblingRegistered === "yes" ? "نعم" : "لا"}`,
  ];

  if (values.siblingRegistered === "yes") {
    lines.push(`اسم الأخ / الأخت: ${values.siblingName ?? ""}`);
    lines.push(`رقم هاتف الأخ / الأخت: ${values.siblingPhone ?? ""}`);
  }

  if (values.notes?.trim()) {
    lines.push(`ملاحظات إضافية: ${values.notes.trim()}`);
  }

  return `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** The social rail shown on the home page. Each link opens in a new tab. */
export const SOCIAL_LINKS = {
  whatsapp: buildWhatsAppLink({ name: "", phone: "", message: "Hi iDeveloper, I have a question." }),
  facebook: "https://www.facebook.com/iDeveloperAcademy/",
  // The tracking parameters LinkedIn adds when a visitor shares a profile are
  // dropped so the public link stays clean.
  linkedin: "https://www.linkedin.com/in/ideveloper-academy-384864356/",
  // The Banha branch, as a Google Maps short link. Kept short rather than expanded
  // to maps.google.com so it survives being copied into a chat message.
  map: "https://maps.app.goo.gl/Yt3MCdYWzoF6krM19",
} as const;