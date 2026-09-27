import { Award, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type CertificateClaimProps = {
  courseName: string;
  sessionCount: number;
  monthCount: number;
  complete: boolean;
  busy: boolean;
  issued: boolean;
  onDownload: () => void;
};

const TONES = {
  Python: {
    shell: "border-violet-500/30 bg-gradient-to-br from-violet-500/12 via-card to-card",
    icon: "bg-violet-500/12 text-violet-500",
    glow: "text-violet-500/25",
  },
  Scratch: {
    shell: "border-pink-500/30 bg-gradient-to-br from-pink-500/12 via-card to-card",
    icon: "bg-pink-500/12 text-pink-500",
    glow: "text-pink-500/25",
  },
  Web: {
    shell: "border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 via-card to-card",
    icon: "bg-cyan-500/10 text-cyan-500",
    glow: "text-cyan-500/25",
  },
} as const;

const TONE = TONES.Web;

/**
 * Certificate call-to-action. Rendered inside the course progress card and
 * revealed the moment the curriculum hits 100%.
 */
export default function CertificateClaim({
  courseName,
  sessionCount,
  monthCount,
  complete,
  busy,
  issued,
  onDownload,
}: CertificateClaimProps) {
  if (!complete) return null;

  return (
    <div className={`relative mt-6 overflow-hidden rounded-2xl border p-5 ${TONE.shell}`}>
      <Award className={`pointer-events-none absolute -bottom-4 -end-3 h-24 w-24 ${TONE.glow}`} />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE.icon}`}>
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {issued ? "Your certificate is ready" : "Curriculum complete!"}
          </div>
          <p className="text-sm text-muted-foreground">
            {issued
              ? `A signed ${courseName} certificate with your name and the iDeveloper logo.`
              : `All ${sessionCount} sessions are done. Your ${courseName} certificate is being prepared with your name on it.`}
          </p>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 rounded-2xl"
          onClick={onDownload}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="me-2 h-4 w-4" />
          )}
          {issued ? "Download again" : "Download certificate"}
        </Button>
      </div>
      {monthCount > 0 ? (
        <p className="relative mt-3 text-xs text-muted-foreground">
          {courseName} · {sessionCount} sessions · {monthCount} months · PDF, generated in your browser
        </p>
      ) : null}
    </div>
  );
}
