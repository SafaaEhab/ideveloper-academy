import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import type { Occurrence } from "@/lib/schedule";
import {
  buildReportRows,
  buildShareMessage,
  paginateReportRows,
  renderEvaluationReportPages,
  summarizeReportRows,
  type ReportInput,
  type ReportPage,
} from "@/lib/evaluationReport";
import {
  arabicDateLabel,
  arabicTimeRange,
  formatPercent,
  type EvaluationRecord,
  type InstructorGroupDetail,
  type InstructorStudent,
} from "./shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  group: InstructorGroupDetail["group"];
  students: InstructorStudent[];
  occurrence: Occurrence;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "حصل خطأ غير متوقع، جرّب تاني";
}

function trustedGroupUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "chat.whatsapp.com") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

/**
 * The report is built from a fresh read of the saved evaluations, not from the
 * drafts on screen. That is why the parent only lets this dialog open when no
 * unsaved draft exists — the shared image must never promise something the
 * database does not have yet.
 *
 * Delivery is never claimed: the native sheet and the fallback both hand the
 * files to the device, and the user still sends them inside WhatsApp.
 */
export default function EvaluationReportDialog({
  open,
  onOpenChange,
  groupId,
  group,
  students,
  occurrence,
}: Props) {
  const utils = trpc.useUtils();

  const [records, setRecords] = useState<EvaluationRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pages, setPages] = useState<ReportPage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"share" | "fallback" | null>(null);
  const [status, setStatus] = useState<
    "idle" | "native-done" | "native-cancelled" | "fallback-done"
  >("idle");

  const groupUrl = trustedGroupUrl(group.whatsappUrl);
  const dateLabel = arabicDateLabel(occurrence.dateKey);
  const timeLabel = arabicTimeRange(occurrence.startTime, occurrence.endTime);

  // A fresh read every time the dialog opens — the group-detail cache can be a
  // few seconds old, and the report is the moment accuracy matters most.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRecords(null);
    setLoadError(null);
    setPages([]);
    setRenderError(null);
    setStatus("idle");

    utils.instructor.evaluations
      .fetch({ groupId })
      .then(rows => {
        if (!cancelled) setRecords(rows as EvaluationRecord[]);
      })
      .catch(error => {
        if (!cancelled) setLoadError(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [open, groupId, reloadKey, utils]);

  const occurrenceRecords = useMemo(
    () =>
      (records ?? []).filter(
        record =>
          record.evaluation.sessionId === occurrence.sessionId &&
          record.evaluation.dateKey === occurrence.dateKey,
      ),
    [records, occurrence.sessionId, occurrence.dateKey],
  );

  const groupCourses = useMemo(
    () => Array.from(new Set(students.flatMap(student => student.courses))),
    [students],
  );

  const rows = useMemo(
    () =>
      buildReportRows(
        students.map(student => ({
          id: student.id,
          name: student.name,
          courses: student.courses,
        })),
        occurrenceRecords.map(record => record.evaluation),
      ),
    [students, occurrenceRecords],
  );
  const stats = useMemo(() => summarizeReportRows(rows), [rows]);
  const pageCount = useMemo(() => paginateReportRows(rows).length, [rows]);

  const reportInput: ReportInput | null = useMemo(() => {
    if (!records) return null;
    return {
      groupName: group.name,
      level: group.level,
      courses: groupCourses,
      instructorName: occurrence.instructorName,
      location: occurrence.location,
      dateKey: occurrence.dateKey,
      dateLabel,
      timeLabel,
      students: students.map(student => ({
        id: student.id,
        name: student.name,
        courses: student.courses,
      })),
      evaluations: occurrenceRecords.map(record => record.evaluation),
    };
  }, [
    records,
    group,
    groupCourses,
    occurrence,
    dateLabel,
    timeLabel,
    students,
    occurrenceRecords,
  ]);

  useEffect(() => {
    if (!open || !reportInput) return;
    let cancelled = false;
    setRendering(true);
    setRenderError(null);

    renderEvaluationReportPages(reportInput)
      .then(result => {
        if (!cancelled) setPages(result);
      })
      .catch(error => {
        if (!cancelled) setRenderError(messageOf(error));
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reportInput]);

  const previewUrls = useMemo(
    () => pages.map(page => URL.createObjectURL(page.blob)),
    [pages],
  );
  useEffect(
    () => () => previewUrls.forEach(url => URL.revokeObjectURL(url)),
    [previewUrls],
  );

  const shareFiles = useMemo(() => {
    if (pages.length === 0 || typeof File === "undefined") return [];
    return pages.map(
      page => new File([page.blob], page.fileName, { type: "image/png" }),
    );
  }, [pages]);

  const canNativeShare = useMemo(() => {
    if (
      shareFiles.length === 0 ||
      typeof navigator === "undefined" ||
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function"
    ) {
      return false;
    }
    try {
      return navigator.canShare({ files: shareFiles });
    } catch {
      return false;
    }
  }, [shareFiles]);

  const totalBytes = useMemo(
    () => pages.reduce((sum, page) => sum + page.blob.size, 0),
    [pages],
  );

  const message = useMemo(
    () =>
      buildShareMessage({
        groupName: group.name,
        dateLabel,
        timeLabel,
        location: occurrence.location,
        instructorName: occurrence.instructorName,
        studentCount: stats.studentCount,
        evaluatedCount: stats.evaluatedCount,
        missingCount: stats.missingCount,
        partialCount: stats.partialCount,
        pageCount,
      }),
    [
      group.name,
      dateLabel,
      timeLabel,
      occurrence.location,
      occurrence.instructorName,
      stats,
      pageCount,
    ],
  );

  const downloadAll = () => {
    pages.forEach(page => downloadBlob(page.blob, page.fileName));
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("تم نسخ رسالة التقرير");
      return true;
    } catch {
      toast.error("المتصفح منع النسخ — حدّد النص وانسخه يدويًا");
      return false;
    }
  };

  const nativeShare = async () => {
    setBusy("share");
    setStatus("idle");
    try {
      await navigator.share({
        files: shareFiles,
        title: `تقرير تقييم — ${group.name}`,
        text: message,
      });
      setStatus("native-done");
    } catch (error) {
      if (isAbort(error)) {
        setStatus("native-cancelled");
      } else {
        toast.error("تعذّر فتح نافذة المشاركة. جرّب طريقة التنزيل.");
        setStatus("idle");
      }
    } finally {
      setBusy(null);
    }
  };

  const fallbackShare = async () => {
    setBusy("fallback");
    setStatus("idle");

    // `window.open` must run before the first await so the browser still sees
    // a user gesture and does not treat it as a pop-up.
    if (groupUrl) {
      const opened = window.open(groupUrl, "_blank");
      if (opened) opened.opener = null;
    }

    downloadAll();
    const copied = await copyMessage();
    setStatus("fallback-done");
    setBusy(null);

    if (!copied) {
      toast.info("الصور اتنزلت. انسخ الرسالة من مربع النص تحت.");
    }
  };

  const primaryLabel = canNativeShare
    ? "مشاركة الصور عبر واتساب"
    : groupUrl
      ? "فتح واتساب وتنزيل الصور"
      : "تنزيل صور التقرير";

  const primary = canNativeShare
    ? nativeShare
    : groupUrl
      ? fallbackShare
      : downloadAll;

  const hasPages = pages.length > 0 && !rendering;
  const missingNote =
    stats.missingCount > 0
      ? `${stats.missingCount} طالب بدون تقييم محفوظ. سيظهرون داخل الصور بعلامة «بدون تقييم»، ومش هيتحسبوا غائبين.`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl">تقرير التقييم الكامل</DialogTitle>
          <DialogDescription className="leading-7">
            صور A4 لكل طلاب المجموعة في الحصة المختارة، جاهزة للإرسال في جروب
            واتساب. التقرير بيعرض التقييمات المحفوظة فقط.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{group.name}</span>
          {group.level ? <span>{group.level}</span> : null}
          <span>{dateLabel}</span>
          <span>{timeLabel}</span>
          <span>
            المدرّب: {occurrence.instructorName?.trim() || "غير مسند"}
          </span>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
            <div className="font-semibold text-destructive">
              تعذّر تحميل التقييمات المحفوظة
            </div>
            <p className="mt-1 leading-6 text-muted-foreground">{loadError}</p>
            <Button
              variant="outline"
              className="mt-3 rounded-2xl"
              onClick={() => setReloadKey(key => key + 1)}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        ) : records === null ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            جارٍ قراءة أحدث تقييمات محفوظة…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Metric label="طلاب الحصة" value={String(stats.studentCount)} />
              <Metric
                label="تقييم محفوظ"
                value={String(stats.evaluatedCount)}
                hint={formatPercent(
                  stats.studentCount > 0
                    ? (stats.evaluatedCount / stats.studentCount) * 100
                    : null,
                )}
              />
              <Metric
                label="بدون تقييم"
                value={String(stats.missingCount)}
                alert={stats.missingCount > 0}
              />
            </div>

            {missingNote ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{missingNote}</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>كل طلاب الحصة لديهم تقييم محفوظ.</p>
              </div>
            )}

            {stats.partialCount > 0 ? (
              <div className="flex items-start gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs leading-6 text-sky-800 dark:text-sky-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {stats.partialCount} تقييم محفوظ ناقص بعض الحقول. الحقول الفارغة
                  هتظهر «لم يُسجَّل»، وهي مختلفة عن «—» اللي معناها لا توجد قيمة.
                </p>
              </div>
            ) : null}

            {!groupUrl ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  الإدارة لسه ما حفظتش رابط مجموعة واتساب. تقدر تنزّل الصور
                  والرسالة وتشاركها بنفسك، أو تطلب منها تضيف الرابط من لوحة
                  الإدارة ← Groups.
                </p>
              </div>
            ) : null}

            {rendering ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                جارٍ تجهيز {pageCount}{" "}
                {pageCount === 1 ? "صفحة" : "صفحات"} بصيغة صور…
              </div>
            ) : renderError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
                <div className="font-semibold text-destructive">
                  تعذّر تجهيز صور التقرير
                </div>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {renderError}
                </p>
                <Button
                  variant="outline"
                  className="mt-3 rounded-2xl"
                  onClick={() => setReloadKey(key => key + 1)}
                >
                  <RefreshCw className="me-2 h-4 w-4" />
                  إعادة المحاولة
                </Button>
              </div>
            ) : hasPages ? (
              <>
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      معاينة الصور
                      <span className="text-xs font-normal text-muted-foreground">
                        {pages.length} {pages.length === 1 ? "صفحة" : "صفحات"} ·{" "}
                        {formatBytes(totalBytes)}
                      </span>
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pages.map((page, index) => (
                      <div
                        key={page.fileName}
                        className="overflow-hidden rounded-xl border border-border bg-muted/30"
                      >
                        <img
                          src={previewUrls[index]}
                          alt={`صفحة ${page.pageNumber} من تقرير ${group.name}`}
                          className="block w-full"
                          loading="lazy"
                        />
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            صفحة {page.pageNumber} من {page.totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadBlob(page.blob, page.fileName)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            تنزيل
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-[#128C7E] text-white hover:bg-[#0E7468]"
                    disabled={busy !== null}
                    onClick={primary}
                  >
                    {busy === "share" || busy === "fallback" ? (
                      <Loader2 className="me-2 h-5 w-5 animate-spin" />
                    ) : canNativeShare ? (
                      <Share2 className="me-2 h-5 w-5" />
                    ) : (
                      <MessageCircle className="me-2 h-5 w-5" />
                    )}
                    {busy === "share"
                      ? "جارٍ فتح نافذة المشاركة…"
                      : busy === "fallback"
                        ? "جارٍ فتح واتساب وتنزيل الصور…"
                        : primaryLabel}
                  </Button>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={downloadAll}
                    >
                      <Download className="me-2 h-4 w-4" />
                      تنزيل كل الصور
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => void copyMessage()}
                    >
                      <Copy className="me-2 h-4 w-4" />
                      نسخ رسالة التقرير
                    </Button>
                  </div>

                  {groupUrl ? (
                    <a
                      href={groupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#128C7E] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      فتح رابط مجموعة واتساب المحفوظ
                    </a>
                  ) : null}

                  {canNativeShare && groupUrl ? (
                    <button
                      type="button"
                      className="mt-2 block text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                      disabled={busy !== null}
                      onClick={() => void fallbackShare()}
                    >
                      أو استخدم التنزيل وفتح رابط المجموعة بدلًا من نافذة المشاركة
                    </button>
                  ) : null}

                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    {canNativeShare
                      ? "هتفتح نافذة مشاركة الجهاز. اختار واتساب ثم مجموعة المجموعة، وراجع الصور والرسالة قبل الإرسال."
                      : groupUrl
                        ? "المتصفح ده مش بيدعم مشاركة الصور مباشرة، فهنفتح مجموعة واتساب في تاب جديد وننزّل الصور وننسخ الرسالة. بعدين ارفق الصور من التنزيلات."
                        : "المتصفح مش بيدعم مشاركة الصور مباشرة. الصور هتتنزل على جهازك، وانسخ الرسالة وارفقها في جروب واتساب بنفسك."}
                  </p>

                  {status === "native-done" ? (
                    <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-800 dark:text-emerald-200">
                      تم تسليم الصور والرسالة لنافذة المشاركة. واتساب مش بيرجّع
                      لنا تأكيد الإرسال — راجع الجروب بنفسك للتأكد من الوصول.
                    </div>
                  ) : null}

                  {status === "native-cancelled" ? (
                    <div className="mt-3 rounded-xl bg-muted p-3 text-xs leading-6 text-muted-foreground">
                      اتلغت نافذة المشاركة. جرّب تاني، أو استخدم «تنزيل كل
                      الصور» وشاركها يدويًا.
                    </div>
                  ) : null}

                  {status === "fallback-done" ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-muted/70 p-3 text-xs leading-6">
                      <div className="font-semibold text-foreground">
                        الصور اتنزلت والرسالة اتنسخت. خطوات الإرسال:
                      </div>
                      <ol className="list-decimal space-y-1 pe-5 text-muted-foreground">
                        <li>
                          لو رابط المجموعة فتح: اختار واتساب (ولو مش عضو، اضغط
                          Join first).
                        </li>
                        <li>
                          من أيقونة المشبك (إرفاق) ارفق صور التقرير من مجلد
                          التنزيلات.
                        </li>
                        <li>الصق الرسالة اللي اتنسخت في الشات.</li>
                        <li>
                          راجع العدد والصور، وبعدين ابعت. إحنا مش بنقدر نأكد
                          وصول الرسالة — التأكيد النهائي منك.
                        </li>
                      </ol>
                    </div>
                  ) : null}

                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    الصور بتتعرض من غير أسماء هواتف أو إيميلات. التقرير بيعرض
                    التقييمات المحفوظة وقت الفتح فقط، وأي تعديل لازم يتحفظ قبل
                    المشاركة.
                  </p>
                </div>

                <details className="rounded-2xl border border-border bg-muted/20 p-3 text-xs leading-6">
                  <summary className="cursor-pointer font-semibold">
                    نص الرسالة الجاهزة
                  </summary>
                  <pre
                    dir="rtl"
                    className="mt-2 whitespace-pre-wrap rounded-xl bg-background p-3 font-sans text-muted-foreground"
                  >
                    {message}
                  </pre>
                </details>
              </>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        alert
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-border bg-card"
      }`}
    >
      <div className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {hint ? (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
