import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Copy,
  Paperclip,
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
  // A link the student typed is their problem to check; a bare file name is
  // waiting for them to hand it over. Saying which one saves the guessing.
  var isRemote=function(what){
    return /^(https?:|data:|blob:|\\/\\/)/i.test(String(what).trim());
  };
  var why=function(what){
    return isRemote(what)?"this file did not load":"no file added for this name";
  };
  var advice=function(what){
    return isRemote(what)
      ? "could not be opened. Check the address is right and still online."
      : "Add it with the Add media button above, picking the file with exactly that name. Anything already on the internet works without it.";
  };
  /**
   * Explains a missing file on a player, without taking the player away.
   *
   * The lesson is the <audio> or the <video>: a student being taught what the tag
   * does must still be able to see it. So the note goes beside the player and the
   * player is outlined, rather than the element being swapped for text the way a
   * broken picture is.
   */
  var explainPlayer=function(player,what,label){
    if(!player||!player.parentNode||!what){return;}
    var next=player.nextElementSibling;
    var box=(next&&next.className==="preview-missing")?next:null;
    var said=box?(box.getAttribute("data-files")||""):"";
    // Once per file, not once per player: a video whose poster and whose source
    // are both missing is two things to say, and a student told about only one
    // of them will look for the other and find nothing.
    if(said.split(" ").indexOf(what)>=0){return;}
    if(!box){
      box=document.createElement("div");
      box.className="preview-missing";
      player.parentNode.insertBefore(box,player.nextSibling);
      try{ player.style.outline="2px dashed #f59e0b"; }catch(e){}
    }
    box.setAttribute("data-files",(said+" "+what).trim());
    var line=document.createElement("div");
    line.textContent=(label?label.toUpperCase()+" ":"")+why(what)+": \\""+what+"\\"";
    box.appendChild(line);
    send("warn",(label?label+" ":"")+advice(what)+" \\""+what+"\\"");
  };
  document.addEventListener("error",function(e){
    var el=e.target;
    if(!el||!el.tagName){return;}
    var tag=el.tagName.toLowerCase();
    // An external script has no box of its own to point at, and the page it was
    // meant to change simply stays as it was — which reads to a student as their
    // own mistake. So the note goes at the end of the page instead.
    if(tag==="script"){
      var scriptSrc=el.getAttribute("src");
      if(!scriptSrc){return;}
      var said=document.querySelector('.preview-missing[data-file="'+scriptSrc+'"]');
      if(said){return;}
      var scriptNote=document.createElement("div");
      scriptNote.className="preview-missing";
      scriptNote.setAttribute("data-file",scriptSrc);
      scriptNote.textContent="SCRIPT \\u2014 "+why(scriptSrc)+": \\""+scriptSrc+"\\"";
      (document.body||document.documentElement).appendChild(scriptNote);
      send("warn",advice(scriptSrc)+" \\""+scriptSrc+"\\"");
      return;
    }
    // A <source> is where the file is named, so it is where the error lands —
    // but the visitor is looking at the player above it, and that is what has to
    // be explained.
    if(tag==="source"){
      explainPlayer(el.parentNode,el.getAttribute("src")||"","");
      return;
    }
    if(tag==="audio"||tag==="video"){
      // A poster is named on the player itself, and a missing one only costs the
      // picture before the video starts, so it is reported without any fuss.
      var poster=el.getAttribute("poster");
      if(poster){ explainPlayer(el,poster,"poster"); }
      var src=el.getAttribute("src");
      if(src){ explainPlayer(el,src,""); }
      return;
    }
    if(tag!=="img"&&tag!=="iframe"){return;}
    var what=el.getAttribute("src")||"";
    var box=document.createElement("div");
    box.className="preview-missing";
    box.textContent=tag.toUpperCase()+" \\u2014 "+why(what)+": \\""+what+"\\"";
    if(el.parentNode){el.parentNode.replaceChild(box,el);}
    send("warn",advice(what)+" \\""+what+"\\"");
  },true);
  /**
   * Asks the browser whether each poster picture exists.
   *
   * A poster is named in an attribute rather than in a <source>, and a missing
   * one raises no error event on the player at all — the video simply plays with
   * a black rectangle in front of it. So it has to be fetched to be found out,
   * and found out after the page is up.
   */
  var checkPoster=function(player){
    var poster=player.getAttribute("poster");
    if(!poster||/^(data:|blob:)/i.test(poster)){return;}
    var probe=new Image();
    probe.onerror=function(){ explainPlayer(player,poster,"poster"); };
    probe.src=poster;
  };
  var checkPosters=function(){
    var players=document.querySelectorAll("[poster]");
    for(var i=0;i<players.length;i++){ checkPoster(players[i]); }
  };
  if(document.readyState==="complete"){ checkPosters(); }
  else { window.addEventListener("load",checkPosters); }
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

/**
 * Words and shapes that only ever appear in a script, never in a stylesheet.
 * `if (age > 18) {` and `} else {` read like a rule set to a brace check, so the
 * script is decided before the stylesheet is.
 */
const JS_SHAPE =
  /(^|[^\w$.])(const|let|var|function|return|if|else|for|while|do|switch|throw|try|catch|console|document|window|alert|prompt|confirm|setTimeout|Math|JSON|Number|String|Array|Object)\b|=>|===|!==/;

/** A rule set: a selector, an opening brace, and `property: value` inside. */
const CSS_SHAPE = /[.#]?[-\w\s]*\{[^{}]*:[^{}]*[;}]/;

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
  if (JS_SHAPE.test(src)) return "js";
  if (CSS_SHAPE.test(src)) return "css";
  return "markup";
}

/**
 * Calls that put something outside the preview in front of the visitor.
 *
 * The sandbox allows modals and popups on purpose, so each of these really does
 * open. That is the whole lesson in the session that teaches it — and it is
 * exactly why such a snippet must not fire by itself.
 */
const BLOCKS_THE_BROWSER = /\b(?:window\s*\.)?(?:alert|confirm|prompt)\s*\(/;

/** Same, for a call that opens a tab rather than a box. */
const OPENS_A_TAB = /(?:^|[^\w$.])(?:window\s*\.\s*)?open\s*\(/g;

/**
 * How deep inside a block a point in the snippet sits, ignoring braces written
 * in a string.
 *
 * This is not a parser and does not need to be. The one question it has to
 * answer is whether a call is written on its own or tucked inside a function
 * body or an event listener, and walking the characters once answers that for
 * the kind of code a lesson holds.
 */
function depthAt(code: string, index: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < index; i++) {
    const char = code[i];
    if (quote) {
      // A backslash escapes whatever comes next, so this step skips the escaped
      // character instead of reading it as the end of the string.
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth++;
    else if (char === "}") depth--;
  }
  return depth;
}

/**
 * True when a snippet may be executed the moment it appears, with nobody
 * pressing anything.
 *
 * Every session in the Web course runs its own examples: the page a section is
 * about is on screen before the student touches it, and the Run button is there
 * for re-running after an edit. HTML and CSS can always do this, because their
 * code paints a page and stops there.
 *
 * A script has one way to be different. `alert`, `confirm` and `prompt` wait
 * for an answer, and a session that fired one unasked would interrupt a class
 * with a box nobody requested — so those snippets stay closed until Run is
 * pressed, which is the student saying "show me this one".
 *
 * A tab is the same problem with one difference: `window.open` written on its
 * own opens a new tab the moment it runs, while the same call inside a click
 * listener cannot happen until the student clicks. Only the first kind waits.
 */
export function runsByItself(code: string): boolean {
  // Comments are a note to the reader, not a call. An instruction that reads
  // "read the numbers with prompt()" must not close the editor.
  const instructions = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(line => !/^\s*\/\//.test(line))
    .join("\n");

  if (BLOCKS_THE_BROWSER.test(instructions)) return false;
  const tabs = instructions.matchAll(OPENS_A_TAB);
  for (let match = tabs.next(); !match.done; match = tabs.next()) {
    if (depthAt(instructions, match.value.index) === 0) return false;
  }
  return true;
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

/** A file the student added from their own disk, held as a data URL. */
export type MediaLibrary = Record<string, string>;

/**
 * How big a file may be before we refuse it. A data URL is a third larger than
 * the file it came from, and the whole thing lives in a string in memory for as
 * long as the tab is open, so there has to be a ceiling.
 */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

/**
 * `images/cake.png`, `.\cake.PNG` and `cake.png` are one file to a student, so
 * the library is keyed on the bare name in lower case.
 */
function mediaKey(name: string): string {
  return name
    .trim()
    .replace(/^.*[\\/]/, "")
    .toLowerCase();
}

/**
 * Points every `src` at a file the student added, so `<img src="cake.png">`
 * finds the `cake.png` they just picked.
 *
 * A src that is already a full link, a protocol-relative link, or a data URL is
 * left exactly as it is — the cloud works on its own, and nothing here is
 * allowed to rewrite a link the student typed.
 */
function applyMedia(doc: string, media: MediaLibrary): string {
  if (Object.keys(media).length === 0) return doc;
  return doc.replace(
    /(\ssrc\s*=\s*)(["'])([^"']*)\2/gi,
    (match, prefix: string, quote: string, src: string) => {
      const value = src.trim();
      if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return match;
      const hit = media[mediaKey(value)];
      return hit ? `${prefix}${quote}${hit}${quote}` : match;
    }
  );
}

/** Turns any lesson snippet into a complete, renderable HTML5 document. */
export function buildPreviewDocument(
  code: string,
  media: MediaLibrary = {}
): string {
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
  } else if (src.length === 0) {
    // The homework editor opens blank on purpose, so pressing Run on it has to
    // say what to do next rather than explain a comment that is not there.
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n<div class="preview-note"><strong>Nothing here yet.</strong> Write your code in the editor above, then press Run again. The page will appear here.</div>\n</body>\n</html>`;
  } else if (src.replace(/<!--[\s\S]*?-->/g, "").trim().length === 0) {
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n${src}\n<div class="preview-note">This example is an HTML comment. Comments start with <code>&lt;!--</code> and end with <code>--&gt;</code> — the browser hides them, so the page looks empty on purpose.</div>\n</body>\n</html>`;
  } else {
    doc = `<!doctype html>\n<html lang="en">\n${HEAD}\n</head>\n<body>\n${src}\n</body>\n</html>`;
  }

  // Student files are swapped in before the bridge goes in, so the rewrite can
  // never reach the bridge's own `getAttribute("src")` line.
  doc = applyMedia(doc, media);

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

/**
 * How tall the editor and the live preview both are.
 *
 * One number on purpose. They sat side by side at different heights before —
 * the editor was a fixed 240px and the preview grew to fit whatever the page
 * needed — so a short page left one pane hanging and a long one left the other
 * tiny. Fixed and equal, each scrolling its own overflow, they read as one tool.
 */
const PANE_HEIGHT = 240;

const LEVEL_STYLE: Record<string, string> = {
  error: "text-rose-300",
  warn: "text-amber-300",
  info: "text-cyan-300",
  log: "text-slate-300",
};

/** Mirrors `PythonRunner`'s API so both course pages share one call shape. */
type Props = {
  code: string;
  exampleLabel: string;
  runLabel: string;
  copyLabel: string;
  /** Words for the media button, so a course can say what a file is for. */
  addMediaLabel?: string;
  /**
   * Open the editor and show the preview the moment the block appears, instead
   * of waiting for the student to find the Run button: the rendered page is the
   * whole point of the section, and a student who has to press a button before
   * they can see the tag they just read has been slowed down for nothing. The
   * button stays, for re-running after an edit.
   *
   * The course decides this per snippet through `runsByItself`, so a script that
   * would put a dialog or a new tab in front of the student keeps waiting.
   */
  autoRun?: boolean;
};

export default function WebCodeRunner({
  code,
  exampleLabel,
  runLabel,
  copyLabel,
  addMediaLabel = "Add a picture, video or sound",
  autoRun = false,
}: Props) {
  const [open, setOpen] = useState(autoRun);
  const [draft, setDraft] = useState(code);
  const [doc, setDoc] = useState(() => buildPreviewDocument(code));
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const liveRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Refs, not state, so `run` and `addMedia` can read the current editor text
  // and the current library without being rebuilt on every keystroke.
  const draftRef = useRef(draft);
  const mediaRef = useRef<MediaLibrary>({});

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Keep the editor in step with the lesson when the student switches lessons.
  useEffect(() => {
    if (liveRef.current) return;
    setDraft(code);
    setDoc(buildPreviewDocument(code, mediaRef.current));
    setLogs([]);
  }, [code]);

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
    // The preview no longer resizes the frame, so it ignores the page's
    // measured height rather than storing a second height to keep in sync.
    if (data.kind === "height") return;
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
    setDoc(buildPreviewDocument(next, mediaRef.current));
    setReloadKey(value => value + 1);
  }, []);

  /**
   * Takes the files the student picked off their own disk and puts them where
   * the page is looking for them, then re-runs — a student who adds `cake.png`
   * to `<img src="cake.png">` sees the cake without pressing anything.
   *
   * The files are read as data URLs on purpose. The preview runs in a sandbox
   * with an opaque origin, which is what stops a broken snippet from reaching
   * this page, and a `blob:` URL created here would be refused by it. A data URL
   * needs no origin at all, so the sandbox stays exactly as tight as it was.
   */
  const addMedia = useCallback((files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const usable = list.filter(file => file.size <= MAX_MEDIA_BYTES);
    const refused = list.filter(file => file.size > MAX_MEDIA_BYTES);

    Promise.all(
      usable.map(
        file =>
          new Promise<[string, string]>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve([mediaKey(file.name), String(reader.result)]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    )
      .then(pairs => {
        const library = { ...mediaRef.current, ...Object.fromEntries(pairs) };
        mediaRef.current = library;
        setMediaCount(Object.keys(library).length);
        // Re-run on the spot: adding the file is the action, so the picture has
        // to appear without a second click on Run.
        liveRef.current = true;
        setLogs([]);
        setDoc(buildPreviewDocument(draftRef.current, library));
        setReloadKey(value => value + 1);
        toast.success(
          `${pairs.length} file${pairs.length === 1 ? "" : "s"} added — use the file name in your src`
        );
        if (refused.length > 0) {
          toast.error(
            `${refused.map(file => file.name).join(", ")} ${
              refused.length === 1 ? "is" : "are"
            } over ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)}MB. Make it smaller, or find it online and use the link.`
          );
        }
      })
      .catch(() => {
        toast.error("That file could not be read. Try a different one.");
      });
  }, []);

  const reset = useCallback(() => {
    liveRef.current = false;
    setDraft(code);
    setLogs([]);
    // The files stay: a student who picked a picture meant to keep it, and
    // Reset is about the code, not about the desk it was picked from.
    setDoc(buildPreviewDocument(code, mediaRef.current));
    setReloadKey(value => value + 1);
  }, [code]);

  const frameKey = useMemo(() => `frame-${reloadKey}`, [reloadKey]);

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-bold">
          <Code2 className="h-4 w-4 text-primary" />
          {exampleLabel}
        </span>
        <span className="ms-auto flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
            onChange={event => {
              addMedia(event.target.files);
              // Clearing lets the same file be picked again after an edit.
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="me-2 h-4 w-4" />
            {addMediaLabel}
            {mediaCount > 0 && (
              <span className="ms-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {mediaCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(draft);
              toast.success(copyLabel);
            }}
          >
            <Copy className="me-2 h-4 w-4" />
            {copyLabel}
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
            {runLabel}
          </Button>
        </span>
      </div>

      {open && (
        // The editor and the preview are the same size and always were: the
        // preview used to grow to whatever the page needed, which left the
        // editor a fixed 240px beside a column that could be twice that, and
        // the two panes read as unrelated. Both are PANE_HEIGHT now, each one
        // scrolls its own overflow, and the preview stops reporting a height.
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
              style={{ height: PANE_HEIGHT }}
              className="block w-full resize-none overflow-y-auto bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none"
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
              style={{ height: PANE_HEIGHT }}
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
            website. A picture or sound already on the internet loads straight
            away; a file from your own disk needs the{" "}
            {addMediaLabel.toLowerCase()} button, picked under the same name you
            wrote in the code. Save everything in VS Code to keep it.
          </p>
        </div>
      )}
    </div>
  );
}
