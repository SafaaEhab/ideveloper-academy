import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Copy,
  Play,
  RotateCcw,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Bridge injected into every preview document. It stays completely inside the
 * sandboxed iframe and only ever talks to the parent through `postMessage`, so
 * a broken student snippet can never reach the app.
 */
const BRIDGE = `<script>(function(){
  var send=function(kind,payload){
    try{ parent.postMessage({__webRunner:true,kind:kind,payload:String(payload)},"*"); }catch(e){}
  };
  var show=function(v){
    try{
      if(typeof v==="string") return v;
      if(v instanceof Error) return v.message;
      return JSON.stringify(v);
    }catch(e){ return String(v); }
  };
  window.addEventListener("error",function(e){
    send("error",(e&&e.message)||"Script error");
  });
  window.addEventListener("unhandledrejection",function(e){
    var r=e&&e.reason;
    send("error",(r&&r.message)||r||"Promise rejected");
  });
  document.addEventListener("error",function(e){
    var el=e.target;
    if(!el||!el.tagName){return;}
    var tag=el.tagName.toLowerCase();
    if(tag!=="img"&&tag!=="audio"&&tag!=="video"&&tag!=="iframe"){return;}
    var what=el.getAttribute("src")||"";
    var box=document.createElement("div");
    box.className="preview-missing";
    box.textContent=tag.toUpperCase()+" \\u2014 preview cannot load \\""+what+"\\"";
    if(el.parentNode){el.parentNode.replaceChild(box,el);}
    send("warn","Local file \\""+what+"\\" is not available in the preview. Save it next to index.html to see it.");
  },true);
  ["log","info","warn","error"].forEach(function(level){
    var original=console[level];
    console[level]=function(){
      var parts=[];
      for(var i=0;i<arguments.length;i++) parts.push(show(arguments[i]));
      send(level,parts.join(" "));
      if(original) original.apply(console,arguments);
    };
  });
  var report=function(){
    var d=document.documentElement, b=document.body;
    send("height",Math.max(d?d.scrollHeight:0,b?b.scrollHeight:0));
  };
  window.addEventListener("load",report);
  setTimeout(report,50);
  setTimeout(report,250);
  if(typeof ResizeObserver!=="undefined"&&document.documentElement){
    try{ new ResizeObserver(report).observe(document.documentElement); }catch(e){}
  }
})();<\/script>`;

const HEAD = `<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Live preview</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 16px;
    background: #ffffff;
    color: #0f172a;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  img, video, canvas, svg { max-width: 100%; height: auto; }
  table { border-collapse: collapse; }
  hr { border: 0; border-top: 1px solid #cbd5e1; }
  a { color: #0891b2; }
  .preview-note {
    border: 1px dashed #94a3b8;
    border-radius: 8px;
    padding: 10px 12px;
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
  }
  .preview-missing {
    border: 1px dashed #f59e0b;
    border-radius: 8px;
    padding: 14px;
    background: #fffbeb;
    color: #b45309;
    font-size: 13px;
  }
  #output { white-space: pre-wrap; font-size: 13px; }
</style>`;

/** Guesses what kind of snippet we were handed so nothing ever renders blank. */
export function classifySnippet(
  code: string
): "document" | "markup" | "css" | "js" {
  // Comments carry no instructions, so they must not influence the guess —
  // "this note is for the team" would otherwise look like JavaScript.
  const src = code.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (/<html[\s>]/i.test(src)) return "document";
  if (
    /<(head|body|meta|title|link|script|style|div|h[1-6]|p|br|hr|img|a|ul|ol|li|table|thead|tbody|tr|td|th|form|input|button|select|option|textarea|label|span|section|header|footer|nav|main|article|aside|figure|figcaption|video|audio|iframe|pre|canvas|svg|strong|em|b|i|u|s|small|code|blockquote)\b/i.test(
      src
    )
  ) {
    return "markup";
  }
  if (/[.#]?[-\w]+\s*\{[^}]*[;{]/.test(src)) return "css";
  if (
    /\b(const|let|var|function|return|if|else|for|while|switch|console|document|window|alert|prompt|confirm|setTimeout|Math|JSON)\b|=>|=/.test(
      src
    )
  ) {
    return "js";
  }
  return "markup";
}

/** Ids a script reaches for, so the preview can supply the missing widgets. */
function referencedIds(code: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /getElementById\(\s*["']([\w-]+)["']\s*\)/g,
    /querySelector(?:All)?\(\s*["']#([\w-]+)["']\s*\)/g,
  ];
  for (let p = 0; p < patterns.length; p++) {
    const matches = code.matchAll(patterns[p]);
    for (let m = matches.next(); !m.done; m = matches.next()) {
      found.add(m.value[1]);
    }
  }
  return Array.from(found).slice(0, 6);
}

/** Variables a snippet declares, so the preview can show their final values. */
function declaredNames(code: string): string[] {
  const found = new Set<string>();
  const matches = code.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g
  );
  for (let m = matches.next(); !m.done; m = matches.next()) {
    found.add(m.value[1]);
  }
  return Array.from(found).slice(0, 8);
}

const BROWSER_GLOBALS = new Set([
  "document",
  "window",
  "console",
  "output",
  "print",
  "Math",
  "JSON",
  "Number",
  "String",
  "Object",
  "Array",
  "event",
]);

/**
 * Names a script drives as if they already exist — `button.addEventListener(...)`.
 * Lessons often split a demo across two steps, so the preview supplies whatever
 * the current step is missing instead of throwing "x is not defined".
 */
function impliedWidgets(code: string): string[] {
  const declared = new Set(declaredNames(code));
  const found = new Set<string>();
  const matches = code.matchAll(
    /\b([A-Za-z_$][\w$]*)\s*\.\s*(?:addEventListener|textContent|innerHTML|classList|style|setAttribute|value)\b/g
  );
  for (let m = matches.next(); !m.done; m = matches.next()) {
    const name = m.value[1];
    if (!declared.has(name) && !BROWSER_GLOBALS.has(name)) found.add(name);
  }
  return Array.from(found).slice(0, 6);
}

/** Turns any lesson snippet into a complete, renderable HTML5 document. */
export function buildPreviewDocument(code: string): string {
  const src = code.trim();
  const kind = classifySnippet(src);

  let doc: string;
  if (kind === "document") {
    doc = src;
  } else if (kind === "css") {
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n<style>\n${src}\n</style>\n</head>\n<body>\n<h1>Heading sample</h1>\n<p>Paragraph sample.</p>\n</body>\n</html>`;
  } else if (kind === "js") {
    const declared = new Set(declaredNames(src));
    // Widgets are what the DOM offers; bindings are only for names the snippet
    // does not define itself, otherwise `var x` would clash with its own `const x`.
    const widgetIds = Array.from(
      new Set(referencedIds(src).concat(impliedWidgets(src)))
    );
    const widgets = widgetIds
      .map(id => `<button type="button" id="${id}">${id}</button>`)
      .join(" ");
    const scaffold = widgets
      ? `<div class="preview-note"><strong>Demo widgets</strong> — your script finds and updates these:<br>${widgets}</div>\n`
      : "";
    const bindings = widgetIds
      .filter(id => !declared.has(id))
      .map(id => `var ${id} = document.getElementById("${id}");`)
      .join("\n");
    const dump = declaredNames(src)
      .map(name => `try { print("${name} = " + ${name}); } catch (e) {}`)
      .join("\n");
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n${scaffold}<pre id="output"></pre>\n<script>\nconst output = document.getElementById("output");\nconst print = (value) => {\n  const text = value && value.tagName ? "<" + value.tagName.toLowerCase() + ">" : String(value);\n  output.textContent += text + "\\n";\n};\ntry {\n${bindings}\n${src}\n${dump}\n} catch (error) { print("Error: " + error.message); }\n<\/script>\n</body>\n</html>`;
  } else if (src.replace(/<!--[\s\S]*?-->/g, "").trim().length === 0) {
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n${src}\n<div class="preview-note">This example is an HTML comment. Comments start with <code>&lt;!--</code> and end with <code>--&gt;</code> — the browser hides them, so the page looks empty on purpose.</div>\n</body>\n</html>`;
  } else {
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n${src}\n</body>\n</html>`;
  }

  if (/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<head[^>]*>/i, match => `${match}\n${BRIDGE}`);
  } else if (/<html[^>]*>/i.test(doc)) {
    doc = doc.replace(
      /<html[^>]*>/i,
      match => `${match}\n<head>\n${BRIDGE}\n</head>`
    );
  } else {
    doc = `<!doctype html>\n<html lang="en">\n<head>\n${BRIDGE}\n</head>\n<body>\n${doc}\n</body>\n</html>`;
  }

  if (!/<meta[^>]+charset/i.test(doc)) {
    doc = doc.replace(
      /<head[^>]*>/i,
      match => `${match}\n<meta charset="utf-8" />`
    );
  }

  return doc;
}

type LogLine = { level: string; text: string };

const LEVEL_STYLE: Record<string, string> = {
  error: "text-rose-300",
  warn: "text-amber-300",
  info: "text-cyan-300",
  log: "text-slate-300",
};

type Props = {
  code: string;
  lessonId: string;
  sectionIndex: number;
};

export default function WebCodeRunner({ code, lessonId, sectionIndex }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(code);
  const [doc, setDoc] = useState(() => buildPreviewDocument(code));
  const [height, setHeight] = useState(240);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const liveRef = useRef(false);

  // Keep the editor in step with the lesson when the student switches lessons.
  useEffect(() => {
    if (liveRef.current) return;
    setDraft(code);
    setDoc(buildPreviewDocument(code));
    setLogs([]);
  }, [code, lessonId, sectionIndex]);

  const accept = useCallback((message: MessageEvent) => {
    if (frameRef.current && message.source !== frameRef.current.contentWindow)
      return;
    const data = message.data as {
      __webRunner?: boolean;
      kind?: string;
      payload?: string;
    };
    if (!data || data.__webRunner !== true || typeof data.kind !== "string")
      return;
    if (data.kind === "height") {
      const next = Math.min(1400, Math.max(120, Number(data.payload) || 240));
      setHeight(current => (Math.abs(current - next) > 8 ? next : current));
      return;
    }
    setLogs(current =>
      [
        ...current,
        { level: data.kind ?? "log", text: data.payload ?? "" },
      ].slice(-40)
    );
  }, []);

  useEffect(() => {
    window.addEventListener("message", accept);
    return () => window.removeEventListener("message", accept);
  }, [accept]);

  const run = useCallback((next: string) => {
    liveRef.current = true;
    setLogs([]);
    setDoc(buildPreviewDocument(next));
    setReloadKey(value => value + 1);
  }, []);

  const reset = useCallback(() => {
    liveRef.current = false;
    setDraft(code);
    setLogs([]);
    setDoc(buildPreviewDocument(code));
    setReloadKey(value => value + 1);
  }, [code]);

  const frameKey = useMemo(
    () => `${lessonId}-${sectionIndex}-${reloadKey}`,
    [lessonId, sectionIndex, reloadKey]
  );

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/5">
      <div className="flex flex-wrap items-center gap-2 border-b border-emerald-500/20 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Code2 className="h-4 w-4" /> Live playground
        </span>
        <span className="ms-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(draft);
              toast.success("Code copied");
            }}
          >
            <Copy className="me-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="me-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setOpen(true);
              run(draft);
            }}
          >
            <Play className="me-2 h-4 w-4" />
            {open ? "Run again" : "Run example"}
          </Button>
        </span>
      </div>

      {open && (
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-slate-950">
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Terminal className="h-3.5 w-3.5" /> Edit the code
            </div>
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              spellCheck={false}
              aria-label="Editable code"
              className="block h-[240px] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-white">
            <div className="flex items-center gap-1.5 border-b border-border/70 bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ms-2 truncate">preview</span>
            </div>
            <iframe
              key={frameKey}
              ref={frameRef}
              title="Live code preview"
              srcDoc={doc}
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              style={{ height }}
              className="block w-full border-0 bg-white"
            />
          </div>

          {logs.length > 0 && (
            <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Console
              </div>
              <pre className="max-h-40 overflow-auto p-3 font-mono text-xs leading-6">
                {logs.map((line, index) => (
                  <div
                    key={index}
                    className={LEVEL_STYLE[line.level] ?? "text-slate-300"}
                  >
                    {line.level === "error"
                      ? "✖ "
                      : line.level === "warn"
                        ? "▲ "
                        : "› "}
                    {line.text || "(empty)"}
                  </div>
                ))}
              </pre>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground lg:col-span-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            The preview runs in a locked sandbox, so edits cannot reach the
            website. Save the code in VS Code to keep it.
          </p>
        </div>
      )}
    </div>
  );
}
