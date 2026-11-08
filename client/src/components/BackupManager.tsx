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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
      if (!response.ok) throw new Error("Could not load the backup list");
      setData((await response.json()) as BackupList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the backup list");
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
        throw new Error(payload?.error ?? "The backup could not be created");
      }
      toast.success("A fresh Excel copy was created");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The backup could not be created");
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
      if (!response.ok) throw new Error("The backup could not be downloaded");
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
      toast.error(error instanceof Error ? error.message : "The backup could not be downloaded");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5" />
            Excel safety copy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Every successful change in the panel is followed by an automatic Excel snapshot of the
            database. The server also takes one every 30 minutes. If MySQL is ever unavailable or a
            hosting account is suspended, the workbook is still on disk and the first copy of each
            day is emailed to the owner when Gmail SMTP is configured.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-2xl" onClick={runNow} disabled={running}>
              <RefreshCw className={`me-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Creating..." : "Create a copy now"}
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={!data.latest}
              onClick={() => void download(`${BACKUP_API}/latest`, "ideveloper-data-latest.xlsx")}
            >
              <Download className="me-2 h-4 w-4" />
              Download latest
            </Button>
            {data.latest ? (
              <Badge variant="secondary" className="rounded-full">
                Latest: {formatDate(data.latest.createdAt)} · {formatBytes(data.latest.bytes)}
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full">
                No copy yet
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The workbook is stored in <code>App_Data/excel-backups</code>, which is outside the
              public website folder and is kept across deployments. It contains one sheet per
              database table plus a summary sheet.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Recent copies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading backups...</p>
          ) : data.backups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No Excel copies yet. Press “Create a copy now”.
            </p>
          ) : (
            <div className="space-y-2">
              {data.backups.map(file => (
                <div
                  key={file.name}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold">{file.name}</div>
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
                    Download
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
