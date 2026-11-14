import { useState } from "react";
import { AlertTriangle, MessageCircle, Phone, Wallet } from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  invoiceStatusLabel,
  money,
  paymentMethodLabel,
  statusTone,
} from "@/lib/phase2";

function Metric({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: typeof Wallet;
}) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountsDashboard() {
  const [course, setCourse] = useState("all");
  const [method, setMethod] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");

  const employees = trpc.finance.employees.useQuery(undefined, { retry: false });
  const dashboard = trpc.finance.dashboard.useQuery(
    {
      course: course === "all" ? undefined : (course as never),
      method: method === "all" ? undefined : (method as never),
      employeeId: employeeId === "all" ? undefined : Number(employeeId),
      paymentStatus:
        paymentStatus === "all" ? undefined : (paymentStatus as never),
      fromKey: fromKey || undefined,
      toKey: toKey || undefined,
    },
    { retry: false, refetchInterval: 30_000 },
  );

  const data = dashboard.data;
  const rows = data?.overdue ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold">الحسابات</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          أرقام محسوبة من الدفعات المسجلة الفعلية. المتأخرات مرتبة من الأقدم
          استحقاقاً.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="المحصل هذا الشهر"
          value={money(data?.collectedThisMonthMinor ?? 0)}
          tone="admin-tone-navy"
          icon={Wallet}
        />
        <Metric
          label="إجمالي المتبقي"
          value={money(data?.outstandingMinor ?? 0)}
          tone="admin-tone-mist"
          icon={Wallet}
        />
        <Metric
          label="المتأخرات"
          value={money(data?.overdueMinor ?? 0)}
          tone="admin-tone-graphite"
          icon={AlertTriangle}
        />
        <Metric
          label="طلاب متأخرون"
          value={String(data?.overdueStudentCount ?? 0)}
          tone="admin-tone-azure"
          icon={AlertTriangle}
        />
      </div>

      {fromKey && toKey && data?.collectedInSelectedRangeMinor != null ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          المحصل في الفترة المحددة: <b>{money(data.collectedInSelectedRangeMinor)}</b>
        </div>
      ) : null}

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div><Label className="mb-1.5 block text-xs">من تاريخ</Label><Input type="date" value={fromKey} onChange={event => setFromKey(event.target.value)} /></div>
            <div><Label className="mb-1.5 block text-xs">إلى تاريخ</Label><Input type="date" value={toKey} onChange={event => setToKey(event.target.value)} /></div>
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
            <div>
              <Label className="mb-1.5 block text-xs">حالة الدفع</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="due">مستحق</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="partially_paid">مدفوع جزئياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>حتى تاريخ {data?.asOfKey ?? "—"}</span>
            <span>طلاب متأخرون: {data?.overdueStudentCount ?? 0}</span>
          </div>

          {dashboard.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />)}</div>
          ) : !rows.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              لا توجد متأخرات مطابقة. الأرقام أعلاه من الدفعات والاشتراكات
              الفعلية.
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الطالب</TableHead>
                    <TableHead className="text-start">هاتف ولي الأمر</TableHead>
                    <TableHead className="text-start">الكورس</TableHead>
                    <TableHead className="text-start">المتبقي</TableHead>
                    <TableHead className="text-start">الاستحقاق</TableHead>
                    <TableHead className="text-start">أيام التأخر</TableHead>
                    <TableHead className="text-start">طريقة الدفع</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">تواصل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => {
                    const digits = String(row.parentPhone ?? "").replace(/\D/g, "");
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-start font-medium">{row.studentName}</TableCell>
                        <TableCell dir="ltr" className="text-start text-xs">{row.parentPhone || "—"}</TableCell>
                        <TableCell className="text-xs">{row.course}</TableCell>
                        <TableCell className="text-sm font-semibold">{money(row.balance.remainingMinor)}</TableCell>
                        <TableCell className="text-xs" dir="ltr">{row.dueDateKey}</TableCell>
                        <TableCell className="text-xs">{row.balance.daysOverdue}</TableCell>
                        <TableCell className="text-xs">{paymentMethodLabel(row.paymentMethod)}</TableCell>
                        <TableCell><Badge className={statusTone(row.balance.status)}>{invoiceStatusLabel(row.balance.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="gap-1" disabled={!digits} onClick={() => window.open(`tel:${digits}`, "_self")}>
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" disabled={!digits} onClick={() => window.open(`https://wa.me/${digits}`, "_blank")}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
