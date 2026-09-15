import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  code: string;
  label: string;
  copyLabel: string;
};

export default function ScratchBlocks({ code, label, copyLabel }: Props) {
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    toast.success(copyLabel);
  };

  return (
    <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="font-mono text-amber-300">🧱</span>
          {label}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copy}
          className="text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={copyLabel}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <pre className="whitespace-pre-wrap p-5 font-mono text-sm leading-7 text-amber-100">{code}</pre>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={copy}
          className="text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <Copy className="me-2 h-4 w-4" />
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}
