import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";

export default function NotFound() {
  useDocumentLocale("ar", "rtl");
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10"
    >
      <Card className="w-full max-w-lg border-border/70 bg-card/90 shadow-xl">
        <CardContent className="pb-8 pt-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/10" />
              <AlertCircle className="relative h-16 w-16 text-destructive" />
            </div>
          </div>

          <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-foreground">
            404
          </h1>

          <h2 className="mb-4 text-xl font-bold text-foreground">
            الصفحة غير موجودة
          </h2>

          <p className="mb-8 leading-8 text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
            <br />
            ربما تم نقلها أو حذفها.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button onClick={handleGoHome} className="rounded-xl px-6 py-2.5">
              <Home className="me-2 h-4 w-4" />
              العودة إلى الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
