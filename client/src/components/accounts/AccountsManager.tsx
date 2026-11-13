import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart3,
  Bell,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  Settings2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountsDashboard from "./AccountsDashboard";
import SubscriptionsPanel from "./SubscriptionsPanel";
import PaymentsPanel from "./PaymentsPanel";
import RemindersPanel from "./RemindersPanel";
import ExpensesPanel from "./ExpensesPanel";
import ReportsPanel from "./ReportsPanel";
import FinanceSettingsPanel from "./FinanceSettingsPanel";

type Tab =
  | "dashboard"
  | "subscriptions"
  | "payments"
  | "reminders"
  | "expenses"
  | "reports"
  | "settings";

export default function AccountsManager() {
  const { user } = useAuth();
  const phase2 = user?.phase2;
  const [tab, setTab] = useState<Tab>(
    phase2?.reports ? "dashboard" : phase2?.payments ? "payments" : "subscriptions",
  );

  const tabs: { key: Tab; label: string; icon: typeof Wallet; allowed: boolean }[] = [
    { key: "dashboard", label: "لوحة الحسابات", icon: LayoutDashboard, allowed: Boolean(phase2?.reports) },
    { key: "subscriptions", label: "الاشتراكات", icon: Wallet, allowed: Boolean(phase2?.subscriptions) },
    { key: "payments", label: "المدفوعات", icon: Receipt, allowed: Boolean(phase2?.payments) },
    { key: "reminders", label: "التذكيرات", icon: Bell, allowed: Boolean(phase2?.payments) },
    { key: "expenses", label: "المصروفات", icon: BarChart3, allowed: Boolean(phase2?.expenses) },
    { key: "reports", label: "التقارير", icon: FileSpreadsheet, allowed: Boolean(phase2?.reports) },
    { key: "settings", label: "الإعدادات", icon: Settings2, allowed: Boolean(phase2?.financeSettings) },
  ];
  const visible = tabs.filter(item => item.allowed);

  if (!visible.length) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-xl font-bold">لا تملك صلاحية الوصول إلى الحسابات</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الحسابات والمدفوعات تحتاج صلاحية صريحة من الأدمن. لا يكفي تسجيل
          الدخول.
        </p>
      </div>
    );
  }

  const active = visible.some(item => item.key === tab) ? tab : visible[0].key;

  return (
    <div dir="rtl" className="space-y-5 text-start">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Wallet className="h-4 w-4" />
            الحسابات
          </div>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">
            الاشتراكات والمدفوعات والمصروفات
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            كل مبلغ محسوب من قيود فعلية. لا تُحذف الدفعات، والتصحيح بقيد عكسي
            موثق.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map(item => (
          <Button
            key={item.key}
            variant={active === item.key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTab(item.key)}
          >
            <item.icon className="me-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>

      {active === "dashboard" ? <AccountsDashboard /> : null}
      {active === "subscriptions" ? <SubscriptionsPanel /> : null}
      {active === "payments" ? <PaymentsPanel /> : null}
      {active === "reminders" ? <RemindersPanel /> : null}
      {active === "expenses" ? <ExpensesPanel /> : null}
      {active === "reports" ? <ReportsPanel /> : null}
      {active === "settings" ? <FinanceSettingsPanel /> : null}
    </div>
  );
}
