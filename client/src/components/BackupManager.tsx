import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Download, FileSpreadsheet, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { COOKIE_NAME } from "@shared/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/const";

const BACKUP_API = `${API_BASE_URL}/api/admin/backups`;

/**
 * Cross-origin browsers can block the HttpOnly cookie (Safari ITP, private
 * mode). The login flow mirrors the same session into sessionStorage, so send
 * it as a Bearer token when present. The server accepts either.
 */
function authHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw?.split(";").find(item => item.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

type BackupFile = {
  name: string;
  bytes: number;
  createdAt: string;
};

type BackupList = {
  backups: BackupFile[];
  latest: BackupFile | null;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(date);
}

/**
 * Admin screen for the Excel safety copies. The actual work happens on the
 * server after every database write; this screen just lets the owner download
 * a copy or force one right now.
 */
export default function BackupManager() {
  const [data, setData] = useState<BackupList>({ backups: [], latest: null });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(BACKUP_API, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("تعذر تحميل قائمة النسخ الاحتياطية");
      setData((await response.json()) as BackupList);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحميل قائمة النسخ الاحتياطية",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runNow = async () => {
    setRunning(true);
    try {
      const response = await fetch(`${BACKUP_API}/run`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "تعذر إنشاء النسخة الاحتياطية");
      }
      toast.success("تم إنشاء نسخة Excel جديدة");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إنشاء النسخة الاحتياطية",
      );
    } finally {
      setRunning(false);
    }
  };

  const download = async (path: string, filename: string) => {
    try {
      const response = await fetch(path, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("تعذر تنزيل النسخة الاحتياطية");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تنزيل النسخة الاحتياطية",
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" />
            النسخة الاحتياطية من Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-3xl text-sm leading-8 text-muted-foreground">
            بعد كل تغيير ناجح في لوحة الإدارة تُنشأ نسخة Excel تلقائية من قاعدة
            البيانات، كما ينشئ السيرفر نسخة كل 30 دقيقة. إذا تعذر الوصول إلى
            MySQL أو تم إيقاف استضافة الحساب، يظل ملف النسخة موجوداً على القرص،
            وتُرسل أول نسخة من كل يوم إلى بريد المالك عند إعداد Gmail SMTP.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-2xl" onClick={runNow} disabled={running}>
              <RefreshCw className={`me-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "جارٍ الإنشاء…" : "إنشاء نسخة الآن"}
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={!data.latest}
              onClick={() => void download(`${BACKUP_API}/latest`, "ideveloper-data-latest.xlsx")}
            >
              <Download className="me-2 h-4 w-4" />
              تنزيل أحدث نسخة
            </Button>
            {data.latest ? (
              <Badge variant="secondary" className="rounded-full">
                الأحدث: {formatDate(data.latest.createdAt)} · {formatBytes(data.latest.bytes)}
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full">
                لا توجد نسخة بعد
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              يُخزَّن ملف النسخة في <code dir="ltr">App_Data/excel-backups</code> خارج
              مجلد الموقع العام، ويبقى محفوظاً بين عمليات النشر. يحتوي الملف على
              ورقة لكل جدول في قاعدة البيانات إضافة إلى ورقة ملخص.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            النسخ الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">جارٍ تحميل النسخ الاحتياطية…</p>
          ) : data.backups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد نسخ Excel بعد. اضغط «إنشاء نسخة الآن».
            </p>
          ) : (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pe-1">
              {data.backups.map(file => (
                <div
                  key={file.name}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold" dir="ltr">
                      {file.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(file.createdAt)} · {formatBytes(file.bytes)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      void download(`${BACKUP_API}/${encodeURIComponent(file.name)}`, file.name)
                    }
                  >
                    <Download className="me-2 h-4 w-4" />
                    تنزيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
