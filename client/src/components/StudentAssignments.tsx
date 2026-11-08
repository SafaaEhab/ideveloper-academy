import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Clock, Download, FileText, Loader2, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { API_BASE_URL } from "@/const";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ALLOWED_FILES = "PDF, PNG, JPEG, WebP, TXT or ZIP";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function StudentAssignments() {
  const utils = trpc.useUtils();
  const assignments = trpc.portal.assignments.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const submit = trpc.portal.submitAssignment.useMutation();

  const [openId, setOpenId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<{ name: string; mimeType: string; dataBase64: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => assignments.data ?? [], [assignments.data]);

  const openForm = (id: number) => {
    setOpenId(id);
    setText("");
    setCode("");
    setFile(null);
    setFileError(null);
  };

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (chosen.size > MAX_FILE_BYTES) {
      setFileError("That file is larger than 3 MB.");
      return;
    }
    const allowed = /^(application\/pdf|image\/(png|jpeg|webp)|text\/plain|application\/zip|application\/x-zip-compressed)$/i.test(chosen.type);
    if (!allowed) {
      setFileError(`That file type is not allowed. Use ${ALLOWED_FILES}.`);
      return;
    }
    try {
      setFile({
        name: chosen.name,
        mimeType: chosen.type,
        dataBase64: await readFile(chosen),
      });
      setFileError(null);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "That file could not be read.");
    }
  };

  const send = async (assignmentId: number) => {
    try {
      await submit.mutateAsync({
        assignmentId,
        textResponse: text.trim(),
        codeResponse: code.trim(),
        file,
      });
      toast.success("Assignment submitted");
      setOpenId(null);
      setText("");
      setCode("");
      setFile(null);
      await utils.portal.assignments.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assignment could not be submitted");
    }
  };

  if (assignments.isLoading) {
    return (
      <Card className="mb-6 rounded-3xl">
        <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل الواجبات…
        </CardContent>
      </Card>
    );
  }

  if (assignments.isError) {
    return (
      <Card className="mb-6 rounded-3xl border-destructive/30">
        <CardContent className="p-5 text-sm text-destructive">
          تعذّر تحميل الواجبات الآن. جرّب تحديث الصفحة.
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card className="mb-6 rounded-3xl" dir="rtl">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-primary" />
            الواجبات والتكليفات
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            سلّم الواجب هنا ليتحفظ في سجلك ويراه المدرّب. يمكنك كتابة إجابة، إضافة كود، أو رفع ملف.
          </p>
        </div>

        <div className="space-y-3">
          {rows.map(row => {
            const submission = row.submission;
            const status = submission?.status === "graded"
              ? "تم التصحيح"
              : submission
                ? submission.late
                  ? "تم التسليم متأخرًا"
                  : "تم التسليم"
                : "لم يتم التسليم";
            return (
              <div key={row.assignment.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{row.assignment.title}</h3>
                      <Badge variant={submission?.status === "graded" ? "default" : "secondary"}>
                        {status}
                      </Badge>
                      {submission?.late ? <Badge variant="destructive">Late</Badge> : null}
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {row.assignment.course}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {row.assignment.instructions}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {row.assignment.dueAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Due {new Date(row.assignment.dueAt).toLocaleString()}
                        </span>
                      ) : null}
                      <span>Max grade: {row.assignment.maxGrade}</span>
                    </div>
                    {submission?.status === "graded" ? (
                      <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm">
                        <span className="font-bold">الدرجة: {submission.grade} / {row.assignment.maxGrade}</span>
                        {submission.feedback ? (
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{submission.feedback}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {submission?.textResponse ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/40 px-3 py-2 text-sm">
                        {submission.textResponse}
                      </p>
                    ) : null}
                    {submission?.codeResponse ? (
                      <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted/40 p-3 text-xs" dir="ltr">
                        {submission.codeResponse}
                      </pre>
                    ) : null}
                    {submission?.fileId ? (
                      <a
                        href={`${API_BASE_URL}/api/assignment-files/${submission.fileId}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        {submission.fileName}
                      </a>
                    ) : null}
                  </div>
                  {submission?.status !== "graded" ? (
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() => openForm(row.assignment.id)}
                    >
                      {submission ? "Update submission" : "Submit work"}
                    </Button>
                  ) : null}
                </div>

                {openId === row.assignment.id ? (
                  <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                    <div>
                      <label htmlFor={`answer-${row.assignment.id}`} className="mb-1.5 block text-xs font-semibold">
                        إجابة مكتوبة (اختياري حسب نوع الواجب)
                      </label>
                      <Textarea
                        id={`answer-${row.assignment.id}`}
                        value={text}
                        onChange={event => setText(event.target.value)}
                        rows={3}
                        placeholder="اكتب إجابتك هنا"
                      />
                    </div>
                    <div>
                      <label htmlFor={`code-${row.assignment.id}`} className="mb-1.5 block text-xs font-semibold">
                        كود (اختياري)
                      </label>
                      <Textarea
                        id={`code-${row.assignment.id}`}
                        value={code}
                        onChange={event => setCode(event.target.value)}
                        rows={5}
                        dir="ltr"
                        className="font-mono text-xs"
                        placeholder="# اكتب الكود هنا"
                      />
                    </div>
                    <div className="rounded-xl border border-dashed border-border p-3">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip"
                        className="hidden"
                        onChange={pickFile}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
                          <Upload className="me-2 h-4 w-4" />
                          اختر ملفًا
                        </Button>
                        <span className="text-xs text-muted-foreground">{file ? file.name : `حتى 3 MB — ${ALLOWED_FILES}`}</span>
                        {file ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                            إزالة
                          </Button>
                        ) : null}
                      </div>
                      {fileError ? <p className="mt-2 text-xs text-destructive">{fileError}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-xl"
                        disabled={submit.isPending || (!text.trim() && !code.trim() && !file)}
                        onClick={() => send(row.assignment.id)}
                      >
                        {submit.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
                        {submit.isPending ? "جارٍ التسليم…" : "سلّم الواجب"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setOpenId(null)}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
