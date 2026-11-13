import { jsPDF } from "jspdf";
import { CAIRO_FONT_BASE64 } from "./assets/cairoFont";
import { formatMinorPlain } from "../shared/money";
import { formatDateTimeInZone, formatDateKeyArabic } from "../shared/time";

/**
 * Arabic PDF receipt generated on the server.
 *
 * jsPDF's Arabic preprocessor plus the embedded OFL Cairo font handles shaping
 * and RTL. The receipt contains only data the caller has already authorized.
 */

export type ReceiptPdfInput = {
  academyName: string;
  academyPhone: string;
  academyAddress: string;
  receiptNumber: string;
  paymentDate: Date;
  studentName: string;
  course: string;
  subscriptionType: string;
  amountMinor: number;
  methodLabel: string;
  dueDateKey: string;
  remainingMinor: number;
  employeeName: string;
  transactionReference: string;
  isReversal: boolean;
  reversalReason?: string | null;
  timeZone: string;
};

function addCairoFont(doc: jsPDF): void {
  doc.addFileToVFS("Cairo.ttf", CAIRO_FONT_BASE64);
  doc.addFont("Cairo.ttf", "Cairo", "normal");
  doc.setFont("Cairo", "normal");
}

function line(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  margin: number,
  pageWidth: number,
): number {
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(label, pageWidth - margin, y, { align: "right" });
  doc.setTextColor(25, 25, 25);
  const lines = doc.splitTextToSize(value || "—", (pageWidth - margin * 2) * 0.62);
  doc.text(lines, pageWidth - margin - 48, y, { align: "right" });
  return y + Math.max(7, lines.length * 5.5);
}

export function generateReceiptPdf(input: ReceiptPdfInput): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addCairoFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  // Header band.
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(input.academyName || "iDeveloper Academy", pageWidth - margin, 15, {
    align: "right",
  });
  doc.setFontSize(12);
  doc.text(
    input.isReversal ? "إيصال قيد عكسي" : "إيصال استلام دفعة",
    pageWidth - margin,
    24,
    { align: "right" },
  );
  doc.setFontSize(10);
  doc.text(input.receiptNumber, margin, 15);

  let y = 47;
  doc.setTextColor(25, 25, 25);
  doc.setFontSize(11);
  doc.text("بيانات الإيصال", pageWidth - margin, y, { align: "right" });
  y += 8;

  y = line(doc, "رقم الإيصال", input.receiptNumber, y, margin, pageWidth);
  y = line(
    doc,
    "التاريخ",
    formatDateTimeInZone(input.paymentDate, input.timeZone),
    y,
    margin,
    pageWidth,
  );
  y = line(doc, "الطالب", input.studentName, y, margin, pageWidth);
  y = line(doc, "الكورس", input.course, y, margin, pageWidth);
  y = line(doc, "نوع الاشتراك", input.subscriptionType, y, margin, pageWidth);
  y = line(
    doc,
    "المبلغ",
    `${formatMinorPlain(input.amountMinor)} EGP`,
    y,
    margin,
    pageWidth,
  );
  y = line(doc, "طريقة الدفع", input.methodLabel, y, margin, pageWidth);
  y = line(
    doc,
    "تاريخ الاستحقاق",
    formatDateKeyArabic(input.dueDateKey),
    y,
    margin,
    pageWidth,
  );
  y = line(
    doc,
    "المتبقي على الاشتراك",
    `${formatMinorPlain(input.remainingMinor)} EGP`,
    y,
    margin,
    pageWidth,
  );
  y = line(doc, "الموظف المسؤول", input.employeeName || "—", y, margin, pageWidth);
  y = line(
    doc,
    "مرجع العملية",
    input.transactionReference,
    y,
    margin,
    pageWidth,
  );
  if (input.isReversal && input.reversalReason) {
    y = line(doc, "سبب العكس", input.reversalReason, y, margin, pageWidth);
  }

  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 9;
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "هذا الإيصال صادر إلكترونياً من نظام أكاديمية iDeveloper. لا يُعد الإيصال سارياً إذا تم تعديل بياناته.",
    pageWidth - margin,
    y,
    { align: "right", maxWidth: pageWidth - margin * 2 },
  );
  y += 7;
  const contact = [input.academyPhone, input.academyAddress].filter(Boolean).join(" — ");
  if (contact) {
    doc.text(contact, pageWidth - margin, y, {
      align: "right",
      maxWidth: pageWidth - margin * 2,
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `iDeveloper Academy · ${input.receiptNumber}`,
    margin,
    pageHeight - 12,
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export function generateReceiptBase64(input: ReceiptPdfInput): {
  base64: string;
  fileName: string;
} {
  const buffer = generateReceiptPdf(input);
  return {
    base64: buffer.toString("base64"),
    fileName: `${input.receiptNumber}.pdf`,
  };
}
