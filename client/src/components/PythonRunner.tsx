import { useState } from "react";
import { Copy, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (value: string) => void }) => void;
  setStdin: (options: { stdin: () => string }) => void;
};

type PyodideLoader = () => Promise<Pyodide>;

declare global {
  interface Window {
    loadPyodide?: PyodideLoader;
  }
}

let pyodidePromise: Promise<Pyodide> | null = null;

function loadPyodideRuntime() {
  if (window.loadPyodide) return Promise.resolve(window.loadPyodide());
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise<Pyodide>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pyodide="true"]');
    const script = existing ?? document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
    script.async = true;
    script.dataset.pyodide = "true";
    script.onload = () => window.loadPyodide ? window.loadPyodide().then(resolve).catch(reject) : reject(new Error("Python runtime did not load"));
    script.onerror = () => reject(new Error("Python runtime could not be loaded"));
    if (!existing) document.head.appendChild(script);
  });
  return pyodidePromise;
}

type Props = {
  code: string;
  exampleLabel: string;
  runLabel: string;
  copyLabel: string;
};

export default function PythonRunner({ code, exampleLabel, runLabel, copyLabel }: Props) {
  const [value, setValue] = useState(code);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(copyLabel);
  };

  const run = async () => {
    setRunning(true);
    setOutput("");
    try {
      const pyodide = await loadPyodideRuntime();
      let captured = "";
      pyodide.setStdout({ batched: (value) => { captured += `${value}\n`; } });
      pyodide.setStdin({ stdin: () => window.prompt("Enter a value:") ?? "" });
      await pyodide.runPythonAsync(value);
      setOutput(captured || "Ran successfully with no printed output.");
      toast.success("Code ran successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput(message);
      toast.error("Check the code and try again");
    } finally {
      setRunning(false);
    }
  };

  return <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-xl">
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><span className="font-mono text-cyan-300">&gt;_</span>{exampleLabel}</div>
      <Button type="button" variant="ghost" size="icon" onClick={copy} className="text-slate-400 hover:bg-white/10 hover:text-white" aria-label={copyLabel}><Copy className="h-4 w-4" /></Button>
    </div>
    <textarea value={value} onChange={(event) => setValue(event.target.value)} spellCheck={false} aria-label={exampleLabel} className="h-64 w-full resize-none overflow-y-auto border-0 bg-slate-950 p-5 font-mono text-sm leading-7 text-emerald-200 outline-none focus:ring-2 focus:ring-cyan-400" />
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-4">
      <Button type="button" size="sm" variant="secondary" onClick={run} disabled={running}><Play className="me-2 h-4 w-4" />{running ? "Loading..." : runLabel}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={copy} className="text-slate-300 hover:bg-white/10 hover:text-white"><Copy className="me-2 h-4 w-4" />{copyLabel}</Button>
      {running && <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
    </div>
    <pre aria-live="polite" className="h-64 overflow-auto border-t border-white/10 bg-slate-900 px-5 py-4 text-sm leading-7 whitespace-pre-wrap text-cyan-100">{output}</pre>
  </div>;
}
