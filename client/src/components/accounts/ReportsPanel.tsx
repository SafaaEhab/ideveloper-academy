import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadBase64File,
  money,
  paymentMethodLabel,
  todayDateKey,
} from "@/lib/phase2";

function monthBounds() {
  const today = todayDateKey();
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    fromKey: `${year}-${String(month).padStart(2, "0")}-01`,
    toKey: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function ReportsPanel() {
  const bounds = monthBounds();
  const [fromKey, setFromKey] = useState(bounds.fromKey);
  const [toKey, setToKey] = useState(bounds.toKey);
  const [course, setCourse] = useState("all");
  const [method, setMethod] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const employees = trpc.finance.employees.useQuery(undefined, { retry: false });
  const report = trpc.finance.reports.monthly.useQuery(
    {
      fromKey,
      toKey,
      course: course === "all" ? undefined : (course as never),
      method: method === "all" ? undefined : (method as never),
      employeeId: employeeId === "all" ? undefined : Number(employeeId),
    },
    { retry: false },
  );
  const exportExcel = trpc.finance.reports.exportExcel.useMutation({
    onSuccess: file => {
      downloadBase64File(file.fileName, file.base64, file.mime);
      toast.success("تم تنزيل تقرير Excel");
    },
    onError: error => toast.error(error.message),
  });

  const data = report.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-bold">التقارير المالية</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            الإيرادات من الدفعات المسجلة فقط، بعد استبعاد الدفعات الملغاة
            بالقيد العكسي. المصروفات من سجل المصروفات.
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={exportExcel.isPending}
          onClick={() =>
            exportExcel.mutate({
              fromKey,
              toKey,
              course: course === "all" ? undefined : (course as never),
              method: method === "all" ? undefined : (method as never),
              employeeId: employeeId === "all" ? undefined : Number(employeeId),
            })
          }
        >
          <FileSpreadsheet className="h-4 w-4" />
          {exportExcel.isPending ? "جاري التصدير…" : "تصدير Excel"}
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          <div><Label className="mb-1.5 block text-xs">من</Label><Input type="date" value={fromKey} onChange={event => setFromKey(event.target.value)} /></div>
          <div><Label className="mb-1.5 block text-xs">إلى</Label><Input type="date" value={toKey} onChange={event => setToKey(event.target.value)} /></div>
          <div>
            <Label className="mb-1.5 block text-xs">الكورس</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {["Scratch", "Robotics", "Web", "Python"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">طريقة الدفع</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {["cash", "instapay", "wallet", "bank_transfer"].map(value => <SelectItem key={value} value={value}>{paymentMethodLabel(value)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">الموظف</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(employees.data ?? []).map(employee => <SelectItem key={employee.userId} value={String(employee.userId)}>{employee.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full gap-1" onClick={() => report.refetch()}>
              <Download className="h-4 w-4" /> تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {report.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />)}</div>
      ) : report.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{report.error.message}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-emerald-500/5 p-5"><div className="text-sm text-muted-foreground">المحصل</div><div className="mt-1 text-2xl font-bold">{money(data.revenueMinor)}</div><div className="text-xs text-muted-foreground">{data.paymentCount} دفعة</div></div>
            <div className="rounded-3xl border bg-rose-500/5 p-5"><div className="text-sm text-muted-foreground">المصروفات</div><div className="mt-1 text-2xl font-bold">{money(data.expenseMinor)}</div></div>
            <div className={`rounded-3xl border p-5 ${data.netProfitMinor >= 0 ? "bg-primary/5" : "bg-rose-500/5"}`}><div className="text-sm text-muted-foreground">صافي الربح</div><div className={`mt-1 text-2xl font-bold ${data.netProfitMinor < 0 ? "text-rose-600" : ""}`}>{money(data.netProfitMinor)}</div></div>
            <div className="rounded-3xl border p-5"><div className="text-sm text-muted-foreground">الفترة</div><div className="mt-1 text-sm font-semibold" dir="ltr">{data.fromKey} → {data.toKey}</div></div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              { title: "حسب الكورس", rows: data.byCourse },
              { title: "حسب طريقة الدفع", rows: data.byMethod },
              { title: "حسب الموظف", rows: data.byEmployee },
            ].map(section => (
              <Card key={section.title} className="rounded-3xl">
                <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {section.rows.length ? section.rows.map(row => (
                    <div key={row.key} className="flex items-center justify-between gap-2 rounded-xl border p-2 text-sm">
                      <span>{row.label}</span>
                      <span className="text-xs text-muted-foreground">{row.count}</span>
                      <b>{money(row.collectedMinor)}</b>
                    </div>
                  )) : <div className="text-sm text-muted-foreground">لا توجد بيانات.</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-base">الدفعات</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-auto rounded-2xl border">
                <Table className="min-w-[900px]">
                  <TableHeader><TableRow><TableHead className="text-start">الإيصال</TableHead><TableHead className="text-start">التاريخ</TableHead><TableHead className="text-start">الطالب</TableHead><TableHead className="text-start">الكورس</TableHead><TableHead className="text-start">المبلغ</TableHead><TableHead className="text-start">الطريقة</TableHead><TableHead className="text-start">الموظف</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell dir="ltr" className="text-xs">{payment.receiptNumber}</TableCell>
                        <TableCell className="text-xs">{new Date(payment.paymentDate).toLocaleDateString("ar-EG")}</TableCell>
                        <TableCell className="text-sm">{payment.studentName}</TableCell>
                        <TableCell className="text-xs">{payment.course}</TableCell>
                        <TableCell className="text-sm font-semibold">{money(payment.amountMinor)}</TableCell>
                        <TableCell className="text-xs">{payment.methodLabel}</TableCell>
                        <TableCell className="text-xs">{payment.employeeName || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-base">المصروفات في الفترة</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.expenses.length ? data.expenses.map(expense => (
                <div key={expense.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <span>{expense.expenseDateKey}</span>
                  <span>{expense.categoryLabel}</span>
                  <span className="flex-1 text-muted-foreground">{expense.description}</span>
                  <span className="text-xs">{expense.employeeName || "—"}</span>
                  <b>{money(expense.amountMinor)}</b>
                </div>
              )) : <div className="text-sm text-muted-foreground">لا توجد مصروفات في الفترة.</div>}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
