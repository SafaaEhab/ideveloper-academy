import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LeadEmployeesDialog({ open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const employees = trpc.leads.employees.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const [email, setEmail] = useState("");
  const [canConvert, setCanConvert] = useState(false);

  const invalidate = () => {
    utils.leads.employees.invalidate();
    utils.leads.list.invalidate();
  };

  const add = trpc.leads.addEmployee.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الموظف إلى فريق المتابعة");
      setEmail("");
      setCanConvert(false);
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.leads.updateEmployee.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات الموظف");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.leads.removeEmployee.useMutation({
    onSuccess: () => {
      toast.success("تمت إزالة الموظف من فريق المتابعة");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>موظفو متابعة العملاء</DialogTitle>
          <DialogDescription>
            الموظف يستخدم حسابه الحالي في النظام. أضف بريده بعد إنشاء الحساب من
            صفحة الدخول، ثم فعّل له صلاحية التحويل إذا لزم.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-start">
          <div className="rounded-2xl border border-border/70 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4" />
              إضافة موظف
            </h3>
            <Label htmlFor="lead-employee-email" className="mb-2 block text-xs">
              بريد الموظف الإلكتروني
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="lead-employee-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="employee@example.com"
              />
              <Button
                onClick={() => add.mutate({ email: email.trim(), canConvert })}
                disabled={!email.trim() || add.isPending}
              >
                {add.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إضافة"
                )}
              </Button>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={canConvert} onCheckedChange={setCanConvert} />
              السماح بتحويل العملاء إلى طلاب
            </label>
          </div>

          <div className="space-y-2">
            {employees.isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                جارٍ التحميل…
              </p>
            ) : employees.isError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                تعذّر تحميل فريق المتابعة.
              </p>
            ) : (employees.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                لا يوجد موظفو متابعة بعد.
              </p>
            ) : (
              (employees.data ?? []).map(employee => (
                <div
                  key={employee.userId}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{employee.name}</span>
                      {employee.isAdmin ? (
                        <Badge variant="secondary">أدمن — وصول كامل</Badge>
                      ) : (
                        <Badge variant="outline">موظف متابعة</Badge>
                      )}
                    </div>
                    <div
                      className="mt-1 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {employee.email}
                    </div>
                  </div>
                  {employee.staffId ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={employee.canConvert}
                          disabled={update.isPending}
                          onCheckedChange={checked =>
                            update.mutate({
                              id: employee.staffId!,
                              canConvert: checked,
                            })
                          }
                        />
                        يحوّل إلى طالب
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label={`إزالة ${employee.name}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate({ id: employee.staffId! })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
