import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, Paperclip, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseAmountToMinor } from "@shared/money";
import {
  downloadBase64File,
  expenseCategoryLabel,
  money,
  todayDateKey,
} from "@/lib/phase2";

const CATEGORIES = ["rent", "trainer_salaries", "equipment", "other"] as const;

export default function ExpensesPanel() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canSalaries = Boolean(user?.phase2?.salaries);
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    amount: "",
    category: "rent",
    date: todayDateKey(),
    description: "",
  });
  const [attachment, setAttachment] = useState<{
    dataBase64: string;
    mime: string;
    name: string;
  } | null>(null);

  const list = trpc.finance.expenses.list.useQuery(
    {
      fromKey: fromKey || undefined,
      toKey: toKey || undefined,
      category: category === "all" ? undefined : (category as never),
      page,
      pageSize: 20,
    },
    { retry: false },
  );
  const create = trpc.finance.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل المصروف");
      setForm({ amount: "", category: "rent", date: todayDateKey(), description: "" });
      setAttachment(null);
      utils.finance.expenses.list.invalidate();
      utils.finance.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.finance.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المصروف");
      utils.finance.expenses.list.invalidate();
      utils.finance.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => setPage(1), [fromKey, toKey, category]);

  const submit = () => {
    const parsed = parseAmountToMinor(form.amount);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    if (!form.description.trim()) {
      toast.error("وصف المصروف مطلوب");
      return;
    }
    create.mutate({
      amountMinor: parsed.minor,
      category: form.category as never,
      expenseDateKey: form.date,
      description: form.description.trim(),
      attachment,
    });
  };

  const readFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم المرفق أكبر من 5 ميجابايت");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("نوع الملف غير مسموح");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      setAttachment({
        dataBase64: value.includes(",") ? value.split(",")[1] : value,
        mime: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));
  const pageTotal = (list.data?.items ?? []).reduce(
    (total, row) => total + row.amountMinor,
    0,
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">تسجيل مصروف</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-2 block text-xs">المبلغ (جنيه)</Label>
            <Input aria-label="مبلغ المصروف" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} inputMode="decimal" dir="ltr" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">التصنيف</Label>
            <Select value={form.category} onValueChange={value => setForm({ ...form, category: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter(value => value !== "trainer_salaries" || canSalaries).map(value => (
                  <SelectItem key={value} value={value}>{expenseCategoryLabel(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.category === "trainer_salaries" ? (
              <p className="mt-1 text-[10px] text-amber-600">رواتب المدربين لا تظهر إلا لمن لديه صلاحية الرواتب.</p>
            ) : null}
          </div>
          <div>
            <Label className="mb-2 block text-xs">التاريخ</Label>
            <Input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">الوصف</Label>
            <Textarea aria-label="وصف المصروف" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={3} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            {attachment ? attachment.name : "مرفق اختياري (حتى 5MB)"}
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => { const file = event.target.files?.[0]; if (file) readFile(file); }} />
          </label>
          <Button className="w-full gap-1" disabled={create.isPending} onClick={submit}>
            <Plus className="h-4 w-4" />
            {create.isPending ? "جاري الحفظ…" : "تسجيل المصروف"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label className="mb-1.5 block text-xs">من تاريخ</Label><Input type="date" value={fromKey} onChange={event => setFromKey(event.target.value)} /></div>
            <div><Label className="mb-1.5 block text-xs">إلى تاريخ</Label><Input type="date" value={toKey} onChange={event => setToKey(event.target.value)} /></div>
            <div>
              <Label className="mb-1.5 block text-xs">التصنيف</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {CATEGORIES.filter(value => value !== "trainer_salaries" || canSalaries).map(value => <SelectItem key={value} value={value}>{expenseCategoryLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-sm">
            إجمالي الصفحة الحالية: <b>{money(pageTotal)}</b> · عدد السجلات:{" "}
            {list.data?.total ?? 0}
          </div>

          {list.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />)}</div>
          ) : !list.data?.items.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">لا توجد مصروفات مطابقة.</div>
          ) : (
            <div className="space-y-2">
              {list.data.items.map(expense => (
                <div key={expense.id} className="flex flex-col justify-between gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{money(expense.amountMinor)}</span>
                      <Badge variant="secondary">{expense.categoryLabel}</Badge>
                      {expense.status === "archived" ? <Badge variant="outline">مؤرشف</Badge> : null}
                      {expense.hasAttachment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={async () => {
                            try {
                              const file = await utils.finance.expenses.attachment.fetch({
                                id: expense.id,
                              });
                              downloadBase64File(file.fileName, file.base64, file.mime);
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "تعذر تنزيل المرفق",
                              );
                            }
                          }}
                        >
                          <Paperclip className="h-3 w-3" /> المرفق
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm">{expense.description}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {expense.expenseDateKey} · سجّله {expense.employeeName || "—"}
                    </div>
                  </div>
                  {expense.status === "active" ? (
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" disabled={update.isPending} onClick={() => update.mutate({ id: expense.id, status: "archived" })}>
                      <Archive className="h-3.5 w-3.5" /> أرشفة
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span>صفحة {page} من {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>السابق</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>التالي</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
