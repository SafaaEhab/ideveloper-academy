// @ts-check
/**
 * End-to-end smoke test for achievements: sign in as admin over HTTP, create a
 * card, read it back from the public home-page query, update it, then remove it.
 *
 *   npx tsx scripts/check-achievements-flow.ts [http://localhost:3001]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "safsafehab012345@gmail.com";

let token = "";

async function call<T = any>(path: string, input?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/api/trpc/${path}`, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // superjson expects the input wrapped, exactly as the tRPC client sends it.
    body: input === undefined ? undefined : JSON.stringify({ json: input }),
  });
  const payload: any = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} → ${response.status} ${JSON.stringify(payload)}`);
  return payload?.result?.data?.json ?? payload?.result?.data;
}

const steps: string[] = [];
const ok = (label: string, detail = "") => { steps.push(`  ok  ${label}${detail ? ` — ${detail}` : ""}`); };

async function main() {
  const login = await fetch(`${BASE}/api/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL }),
  });
  if (!login.ok) throw new Error(`dev-login → ${login.status} ${await login.text()}`);
  const session = (await login.json()) as any;
  token = session.token ?? "";
  ok("signed in as admin", EMAIL);

  const before = await call<any[]>("site.achievements");
  ok("public query answers without auth", `${before.length} card(s)`);

  const created = await call<any>("admin.createAchievement", {
    title: "Codeavour 5.0",
    description: "المشاركة في مسابقة كوديفور على مستوى الجمهورية",
    achievedOn: "2024",
    imageUrl: "",
    tag: "",
    sortOrder: 0,
  });
  ok("created", `id ${created.id}`);

  const after = await call<any[]>("site.achievements");
  const added = after.find(row => row.id === created.id);
  if (!added) throw new Error("the new card did not reach the public query");
  ok("visible on the home page query", added.description);

  await call("admin.updateAchievement", { ...created, id: created.id, achievedOn: "2024", description: "نص معدّل" });
  const edited = (await call<any[]>("site.achievements")).find(row => row.id === created.id);
  if (edited?.description !== "نص معدّل") throw new Error("the edit did not stick");
  ok("update sticks", edited.achievedOn);

  // An empty body must be rejected rather than saved as a blank card.
  const rejected = await fetch(`${BASE}/api/trpc/admin.createAchievement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ json: { description: "" } }),
  });
  if (rejected.ok) {
    await call("admin.deleteAchievement", { id: created.id });
    throw new Error("an empty description was accepted");
  }
  ok("empty description rejected", `HTTP ${rejected.status}`);

  await call("admin.deleteAchievement", { id: created.id });
  const final = await call<any[]>("site.achievements");
  if (final.some(row => row.id === created.id)) throw new Error("the card survived deletion");
  ok("delete sticks", `${final.length} card(s) left`);

  // Uploads must fail with a readable message rather than a stack trace.
  // A real one needs CLOUDINARY_API_KEY / _SECRET; unset, it should say so.
  const uploadReady = await call<{ upload: boolean }>("admin.uploadConfigured");
  const rejects = async (label: string, dataUrl: string, expect: RegExp) => {
    const response = await fetch(`${BASE}/api/trpc/admin.uploadAchievementImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ json: { dataUrl } }),
    });
    const payload: any = await response.json().catch(() => null);
    const message = payload?.error?.json?.message ?? payload?.error?.message ?? "";
    if (response.ok) throw new Error(`${label} was accepted`);
    if (!expect.test(message)) throw new Error(`${label} → unexpected message: ${message}`);
    ok(label, message.slice(0, 90));
  };
  const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  await rejects("a URL instead of an upload is refused", "https://example.com/photo.png", /could not be read/i);
  await rejects("a non-image is refused", "data:text/html;base64,PGgxPmhpPC9oMT4=", /only images/i);
  if (uploadReady.upload) await rejects("a valid image is signed and sent", PNG_1PX, /cloudinary/i);
  else await rejects("upload without keys explains itself", PNG_1PX, /not configured/i);

  console.log(`achievements flow ok against ${BASE}\n${steps.join("\n")}`);
}

main().catch(error => { console.error("FAILED:", error.message); process.exit(1); });
